import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

import { createSpreadsheetFromTemplate, getTemplateSpreadsheetId } from "@/lib/google-drive"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const defaultWorksheetTitle = process.env.GOOGLE_SHEETS_WORKSHEET_TITLE

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 })
  }
  if (!defaultWorksheetTitle) {
    return NextResponse.json({ error: "Worksheet title env missing" }, { status: 500 })
  }

  const authHeader = request.headers.get("authorization")
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const accessToken = authHeader.slice(7)
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

  const { data: existing } = await supabase
    .from("sheet_settings")
    .select("spreadsheet_id, worksheet_title")
    .eq("user_id", user.id)
    .maybeSingle()

  if (existing?.spreadsheet_id && existing?.worksheet_title) {
    return NextResponse.json({ spreadsheetId: existing.spreadsheet_id, worksheetTitle: existing.worksheet_title })
  }

  try {
    const templateId = getTemplateSpreadsheetId()
    const title = `${user.email ?? user.id} シート (${new Date().toLocaleDateString("ja-JP")})`
    const { spreadsheetId } = await createSpreadsheetFromTemplate({
      templateId,
      title,
      shareWithEmail: user.email ?? undefined,
    })

    const { error: insertError } = await supabase.from("sheet_settings").upsert({
      user_id: user.id,
      spreadsheet_id: spreadsheetId,
      worksheet_title: defaultWorksheetTitle,
    })

    if (insertError) {
      console.error("Failed to save sheet settings", insertError)
      return NextResponse.json({ error: "Failed to save sheet settings" }, { status: 500 })
    }

    return NextResponse.json({ spreadsheetId, worksheetTitle: defaultWorksheetTitle })
  } catch (error) {
    console.error("Failed to create sheet", error)
    const message = error instanceof Error ? error.message : "Unable to create sheet"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
