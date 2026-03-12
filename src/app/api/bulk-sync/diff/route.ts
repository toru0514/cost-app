import { NextResponse } from "next/server"

import { authenticateApiRequest } from "@/lib/server/api-auth"
import { buildBulkSyncDiff, validateBulkSyncPayload } from "@/lib/bulk-sync"
import { loadUserAppDataServer } from "@/lib/server/load-app-data"
import type { BulkSyncPayload } from "@/lib/bulk-sync"
import { fetchBulkSyncSheetPayload } from "@/lib/bulk-sync/sheet-payload"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request)
  if ("error" in auth) return auth.error
  const { user, supabase } = auth

  let payload: BulkSyncPayload | undefined
  try {
    const raw = await request.text()
    if (raw.trim()) {
      const body = JSON.parse(raw) as { payload?: BulkSyncPayload }
      payload = body.payload
    }
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  try {
    if (!payload) {
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

      const sheetPayload = await fetchBulkSyncSheetPayload(spreadsheetId)
      payload = sheetPayload.payload
    }

    const existing = await loadUserAppDataServer(supabase, user.id)
    const { normalized, issues } = validateBulkSyncPayload(payload, existing)
    const diff = buildBulkSyncDiff(normalized, existing, issues)
    return NextResponse.json({ summary: diff.summary, items: diff.items })
  } catch (error) {
    console.error("Failed to compute bulk sync diff", error)
    return NextResponse.json({ error: "Failed to compute diff" }, { status: 500 })
  }
}
