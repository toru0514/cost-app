import { NextResponse } from "next/server"

import { authenticateApiRequest } from "@/lib/server/api-auth"
import { fetchGoogleSheetRows } from "@/lib/google-sheets"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request)
  if ("error" in auth) return auth.error
  const { user, supabase } = auth

  const { data: sheetSetting, error: sheetError } = await supabase
    .from("sheet_settings")
    .select("spreadsheet_id, worksheet_title")
    .eq("user_id", user.id)
    .maybeSingle()

  if (sheetError && sheetError.code !== "PGRST116") {
    console.error("Failed to load sheet_settings", sheetError)
    return NextResponse.json({ error: "Failed to load sheet settings" }, { status: 500 })
  }

  const spreadsheetId = sheetSetting?.spreadsheet_id ?? process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  const worksheetTitle = sheetSetting?.worksheet_title ?? process.env.GOOGLE_SHEETS_WORKSHEET_TITLE

  if (!spreadsheetId || !worksheetTitle) {
    return NextResponse.json({ error: "Sheet settings not found" }, { status: 400 })
  }

  try {
    const url = new URL(request.url)
    const range = url.searchParams.get("range") ?? undefined
    const result = await fetchGoogleSheetRows({ range, spreadsheetId, worksheetTitle })
    const deviceInfo = request.headers.get("user-agent") ?? undefined
    const metadata = {
      action: "google_sheets_import",
      rows: result.rows.length,
      range: result.range,
    }
    const { error: auditError } = await supabase.from("sync_audit_logs").insert({
      user_id: user.id,
      device_info: deviceInfo,
      metadata,
    })
    if (auditError) {
      console.warn("Failed to record sheet audit log", auditError)
    }
    return NextResponse.json({ ...result })
  } catch (error) {
    console.error("Failed to fetch Google Sheet", error)
    const message = error instanceof Error ? error.message : "Google Sheets fetch failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
