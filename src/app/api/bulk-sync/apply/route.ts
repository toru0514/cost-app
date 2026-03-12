import { NextResponse } from "next/server"

import { authenticateApiRequest } from "@/lib/server/api-auth"
import { prepareBulkSyncApply } from "@/lib/bulk-sync/apply"
import { validateBulkSyncPayload, buildBulkSyncDiff } from "@/lib/bulk-sync"
import { loadUserAppDataServer } from "@/lib/server/load-app-data"
import type { BulkSyncPayload } from "@/lib/bulk-sync"
import { buildBulkSyncAuditChanges } from "@/lib/bulk-sync/audit"
import { applyStockUpserts } from "@/lib/server/apply-stock-upserts"

export const runtime = "nodejs"

type ApplyOptions = {
  dryRun?: boolean
  recordAuditLog?: boolean
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request)
  if ("error" in auth) return auth.error
  const { user, supabase } = auth

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

      const materialModes = (prepared.payload.materials as Array<{ id?: string; use_percentage_mode?: boolean }> | undefined)
        ?.flatMap((item) =>
          item.id ? [{ id: item.id, use_percentage_mode: Boolean(item.use_percentage_mode ?? false) }] : []
        ) ?? []
      if (materialModes.length > 0) {
        for (const item of materialModes) {
          const { error: modeError } = await supabase
            .from("materials")
            .update({ use_percentage_mode: item.use_percentage_mode })
            .eq("user_id", user.id)
            .eq("id", item.id)
          if (modeError) {
            console.error("Failed to apply material mode flags", modeError)
            return NextResponse.json({ error: "Failed to apply material mode flags" }, { status: 500 })
          }
        }
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
