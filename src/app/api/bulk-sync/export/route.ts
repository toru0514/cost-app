import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"

import { loadUserAppDataServer } from "@/lib/server/load-app-data"
import { buildBulkSyncSheetRows } from "@/lib/bulk-sync/sheet-export"
import { appendGoogleSheetValues, clearGoogleSheetRange, updateGoogleSheetValues } from "@/lib/google-sheets"

export const runtime = "nodejs"

type ExportTarget = "master" | "products"
type ExportMode = "overwrite" | "append"

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

  let body: { target?: ExportTarget; mode?: ExportMode } | null = null
  try {
    body = (await request.json()) as { target?: ExportTarget; mode?: ExportMode }
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body?.target) {
    return NextResponse.json({ error: "target is required" }, { status: 400 })
  }

  const mode: ExportMode = body.mode ?? "overwrite"

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
    const appData = await loadUserAppDataServer(supabase, user.id)
    const sheetRows = buildBulkSyncSheetRows(appData)

    const targets: (keyof typeof sheetRows)[] =
      body.target === "master"
        ? [
            "categories_large",
            "categories_medium",
            "categories_small",
            "materials",
            "packaging_items",
            "shipping_methods",
            "labor_roles",
            "equipments",
            "fees",
            "option_presets",
          ]
        : ["products"]

    for (const sheetName of targets) {
      const values = sheetRows[sheetName]
      if (!values) continue

      const range = `${sheetName}!A1:Z`
      if (mode === "overwrite") {
        await clearGoogleSheetRange(spreadsheetId, range)
        await updateGoogleSheetValues(spreadsheetId, range, values)
      } else {
        const [, ...dataRows] = values
        if (dataRows.length > 0) {
          await appendGoogleSheetValues(spreadsheetId, range, dataRows)
        }
      }
    }

    return NextResponse.json({ status: "ok", target: body.target, mode })
  } catch (error) {
    console.error("Failed to export bulk sync sheet", error)
    return NextResponse.json({ error: "Failed to export sheet" }, { status: 500 })
  }
}

const projectRefPattern = /https?:\/\/([a-z0-9-]+)\.supabase\.co/i

function extractProjectRef(url: string) {
  return url.match(projectRefPattern)?.[1]
}
