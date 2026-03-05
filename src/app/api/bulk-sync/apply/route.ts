import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"

import { prepareBulkSyncApply, type BulkSyncApplyResult } from "@/lib/bulk-sync/apply"
import { validateBulkSyncPayload, buildBulkSyncDiff } from "@/lib/bulk-sync"
import { loadUserAppDataServer } from "@/lib/server/load-app-data"
import type { BulkSyncPayload } from "@/lib/bulk-sync"
import { buildBulkSyncAuditChanges } from "@/lib/bulk-sync/audit"

export const runtime = "nodejs"

type ApplyOptions = {
  dryRun?: boolean
  recordAuditLog?: boolean
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

  let body: { payload?: BulkSyncPayload; options?: ApplyOptions } | null = null
  try {
    body = (await request.json()) as { payload?: BulkSyncPayload; options?: ApplyOptions }
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body?.payload) {
    return NextResponse.json({ error: "payload is required" }, { status: 400 })
  }

  const options = body.options ?? {}

  try {
    const existing = await loadUserAppDataServer(supabase, user.id)
    const { normalized, issues } = validateBulkSyncPayload(body.payload, existing)
    const prepared = prepareBulkSyncApply(normalized, existing, issues)
    const diff = buildBulkSyncDiff(normalized, existing, issues)

    if (!options.dryRun) {
      const { error } = await supabase.rpc("sync_app_data", {
        p_user_id: user.id,
        p_payload: prepared.payload,
      })
      if (error) {
        console.error("Failed to apply bulk sync", error)
        return NextResponse.json({ error: "Failed to apply bulk sync" }, { status: 500 })
      }

      await applyStockUpserts(supabase, user.id, prepared.stockUpserts)

      if (options.recordAuditLog) {
        const { error: auditError } = await supabase.from("sync_audit_logs").insert({
          user_id: user.id,
          device_info: request.headers.get("user-agent") ?? undefined,
          metadata: {
            action: "bulk_sync_apply",
            summary: prepared.summary,
            errorCount: prepared.errors.length,
            changes: buildBulkSyncAuditChanges(diff.items, existing),
            previousData: existing,
          },
        })
        if (auditError) {
          console.warn("Failed to record bulk sync audit log", auditError)
        }
      }
    }

    return NextResponse.json({
      jobId: "local",
      status: "completed",
      summary: prepared.summary,
      errors: prepared.errors,
    })
  } catch (error) {
    console.error("Failed to process bulk sync apply", error)
    return NextResponse.json({ error: "Failed to apply bulk sync" }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function applyStockUpserts(supabase: any, userId: string, stockUpserts: BulkSyncApplyResult["stockUpserts"]) {
  const now = new Date().toISOString()
  const results = await Promise.allSettled([
    ...stockUpserts.materials.map(({ id, quantity }) =>
      supabase
        .from("material_stock")
        .upsert({ user_id: userId, material_id: id, quantity, updated_at: now }, { onConflict: "user_id,material_id" })
    ),
    ...stockUpserts.packagingItems.map(({ id, quantity }) =>
      supabase
        .from("packaging_stock")
        .upsert(
          { user_id: userId, packaging_item_id: id, quantity, updated_at: now },
          { onConflict: "user_id,packaging_item_id" }
        )
    ),
    ...stockUpserts.products.map(({ id, quantity }) =>
      supabase
        .from("product_stock")
        .upsert({ user_id: userId, product_id: id, quantity, updated_at: now }, { onConflict: "user_id,product_id" })
    ),
  ])
  results.forEach((result) => {
    if (result.status === "rejected") {
      console.warn("Failed to upsert stock during bulk sync", result.reason)
    }
  })
}

const projectRefPattern = /https?:\/\/([a-z0-9-]+)\.supabase\.co/i

function extractProjectRef(url: string) {
  return url.match(projectRefPattern)?.[1]
}
