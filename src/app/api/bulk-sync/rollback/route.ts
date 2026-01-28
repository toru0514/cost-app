import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"

import { buildSyncPayloadFromAppData, normalizeAppData } from "@/lib/bulk-sync/snapshot"
import { loadUserAppDataServer } from "@/lib/server/load-app-data"
import type { AppData } from "@/lib/types"

export const runtime = "nodejs"

type RollbackResult = {
  jobId: string
  status: string
  summary: {
    total: number
    success: number
    failed: number
    create: number
    update: number
    delete: number
  }
  errors: { message: string }[]
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 })
  }

  let accessToken: string | undefined
  const authHeader = request.headers.get("authorization")
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    accessToken = authHeader.slice(7)
  }

  const cookieStore = await cookies()
  if (!accessToken) {
    const projectRef = extractProjectRef(supabaseUrl)
    const cookieName = projectRef ? `sb-${projectRef}-auth-token` : undefined
    const tokenCookie = cookieName ? cookieStore.get(cookieName) : undefined
    if (!tokenCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      const [access] = JSON.parse(tokenCookie.value)
      accessToken = access
    } catch (error) {
      console.error("Failed to parse Supabase auth cookie", { cookieName, error })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
    },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { data: log, error: logError } = await supabase
      .from("sync_audit_logs")
      .select("id, metadata, created_at")
      .in("metadata->>action", ["bulk_sync_apply", "bulk_sync_import"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (logError) {
      console.error("Failed to load bulk sync audit log", logError)
      return NextResponse.json({ error: "Failed to load rollback source" }, { status: 500 })
    }

    if (!log?.metadata || !(log.metadata as { previousData?: unknown }).previousData) {
      return NextResponse.json({ error: "Rollback source not found" }, { status: 404 })
    }

    const previousData = (log.metadata as { previousData?: unknown }).previousData
    if (!previousData || typeof previousData !== "object") {
      return NextResponse.json({ error: "Rollback source is invalid" }, { status: 400 })
    }

    const snapshot = normalizeAppData(previousData as Partial<AppData>)
    const current = await loadUserAppDataServer(supabase, user.id)

    const payload = buildSyncPayloadFromAppData(snapshot, current)
    const summary = buildSummary(payload)

    const { error } = await supabase.rpc("sync_app_data", {
      p_user_id: user.id,
      p_payload: payload,
    })
    if (error) {
      console.error("Failed to rollback bulk sync", error)
      return NextResponse.json({ error: "Failed to rollback" }, { status: 500 })
    }

    const { error: auditError } = await supabase.from("sync_audit_logs").insert({
      user_id: user.id,
      device_info: request.headers.get("user-agent") ?? undefined,
      metadata: {
        action: "bulk_sync_rollback",
        summary,
        sourceLogId: log.id,
      },
    })
    if (auditError) {
      console.warn("Failed to record rollback audit log", auditError)
    }

    const result: RollbackResult = {
      jobId: "rollback",
      status: "completed",
      summary,
      errors: [],
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Failed to rollback bulk sync", error)
    return NextResponse.json({ error: "Failed to rollback" }, { status: 500 })
  }
}

const countEntries = (value: unknown) => (Array.isArray(value) ? value.length : 0)

const buildSummary = (payload: Record<string, unknown>) => {
  const keys = Object.keys(payload)
  const total = keys.reduce((sum, key) => sum + countEntries(payload[key]), 0)
  const deleted = keys.filter((key) => key.endsWith("_deleted")).reduce((sum, key) => sum + countEntries(payload[key]), 0)
  const nonDeleted = total - deleted
  return {
    total,
    success: total,
    failed: 0,
    create: 0,
    update: nonDeleted,
    delete: deleted,
  }
}

const projectRefPattern = /https?:\/\/([a-z0-9-]+)\.supabase\.co/i

function extractProjectRef(url: string) {
  return url.match(projectRefPattern)?.[1]
}
