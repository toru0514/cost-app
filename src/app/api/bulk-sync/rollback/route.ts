import { NextResponse } from "next/server"

import { authenticateApiRequest } from "@/lib/server/api-auth"
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
  const auth = await authenticateApiRequest(request)
  if ("error" in auth) return auth.error
  const { user, supabase } = auth

  const body = (await request.json().catch(() => ({}))) as { logId?: string }
  const logId = body.logId

  try {
    const query = supabase
      .from("sync_audit_logs")
      .select("id, metadata, created_at")
      .in("metadata->>action", ["bulk_sync_apply", "bulk_sync_import"])

    const { data: log, error: logError } = logId
      ? await query.eq("id", logId).maybeSingle()
      : await query.order("created_at", { ascending: false }).limit(1).maybeSingle()

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
