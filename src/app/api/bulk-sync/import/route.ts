import { NextResponse } from "next/server"

import { authenticateApiRequest } from "@/lib/server/api-auth"
import { prepareBulkSyncApply } from "@/lib/bulk-sync/apply"
import { validateBulkSyncPayload, buildBulkSyncDiff } from "@/lib/bulk-sync"
import { buildBulkSyncAuditChanges } from "@/lib/bulk-sync/audit"
import { loadUserAppDataServer } from "@/lib/server/load-app-data"
import { applyStockUpserts } from "@/lib/server/apply-stock-upserts"
import { fetchBulkSyncSheetPayload } from "@/lib/bulk-sync/sheet-payload"

export const runtime = "nodejs"

type ApplyOptions = {
  dryRun?: boolean
  recordAuditLog?: boolean
}

type ImportTarget = "master" | "products"

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request)
  if ("error" in auth) return auth.error
  const { user, supabase } = auth

  let options: ApplyOptions = {}
  let target: ImportTarget | undefined
  try {
    const raw = await request.text()
    if (raw.trim()) {
      const body = JSON.parse(raw) as { options?: ApplyOptions; target?: ImportTarget }
      options = body.options ?? {}
      target = body.target
    }
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { data: sheetSetting, error: sheetError } = await supabase
    .from("sheet_settings")
    .select("spreadsheet_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (sheetError && sheetError.code !== "PGRST116") {
    console.error("Failed to load sheet_settings", sheetError)
    return NextResponse.json({ error: "Failed to load sheet settings" }, { status: 500 })
  }

  const spreadsheetId = sheetSetting?.spreadsheet_id ?? process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  if (!spreadsheetId) {
    return NextResponse.json({ error: "Sheet settings not found" }, { status: 400 })
  }

  try {
    const sheetPayload = await fetchBulkSyncSheetPayload(spreadsheetId)
    if (target === "master") {
      delete sheetPayload.payload.products
    } else if (target === "products") {
      delete sheetPayload.payload.categories_large
      delete sheetPayload.payload.categories_medium
      delete sheetPayload.payload.categories_small
      delete sheetPayload.payload.materials
      delete sheetPayload.payload.packaging_items
      delete sheetPayload.payload.shipping_methods
      delete sheetPayload.payload.labor_roles
      delete sheetPayload.payload.equipments
      delete sheetPayload.payload.fees
      delete sheetPayload.payload.option_presets
    }
    const existing = await loadUserAppDataServer(supabase, user.id)
    const { normalized, issues } = validateBulkSyncPayload(sheetPayload.payload, existing)
    const prepared = prepareBulkSyncApply(normalized, existing, issues)
    const diff = buildBulkSyncDiff(normalized, existing, issues)

    if (!options.dryRun) {
      const { error } = await supabase.rpc("sync_app_data", {
        p_user_id: user.id,
        p_payload: prepared.payload,
      })
      if (error) {
        console.error("Failed to apply bulk sync import", error)
        return NextResponse.json({ error: "Failed to apply bulk sync import" }, { status: 500 })
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
            console.error("Failed to apply material mode flags (import)", modeError)
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
            action: "bulk_sync_import",
            summary: prepared.summary,
            errorCount: prepared.errors.length,
            changes: buildBulkSyncAuditChanges(diff.items, existing),
            previousData: existing,
          },
        })
        if (auditError) {
          console.warn("Failed to record bulk sync import audit log", auditError)
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
    console.error("Failed to process bulk sync import", error)
    return NextResponse.json({ error: "Failed to import sheet" }, { status: 500 })
  }
}
