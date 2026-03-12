import { NextResponse } from "next/server"

import { authenticateApiRequest } from "@/lib/server/api-auth"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request)
  if ("error" in auth) return auth.error
  const { user, supabase } = auth

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
    return NextResponse.json({ error: "Sheet settings not found" }, { status: 404 })
  }

  return NextResponse.json({
    spreadsheetId,
    source: sheetSetting?.spreadsheet_id ? "user" : "env",
  })
}
