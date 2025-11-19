import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const adminEmails = (process.env.SHEET_SETTINGS_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

  if (adminEmails.length === 0) {
    return NextResponse.json({ error: "管理者メールアドレスが設定されていません" }, { status: 500 })
  }

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
      console.error("Failed to parse Supabase auth cookie", error)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const requesterEmail = user.email.toLowerCase()
  if (!adminEmails.includes(requesterEmail)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let payload: { userId?: string; spreadsheetId?: string; worksheetTitle?: string } | null = null
  try {
    payload = await request.json()
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const userId = payload?.userId?.trim()
  const spreadsheetId = payload?.spreadsheetId?.trim()
  const worksheetTitle = payload?.worksheetTitle?.trim()

  if (!userId || !spreadsheetId || !worksheetTitle) {
    return NextResponse.json({ error: "userId / spreadsheetId / worksheetTitle は必須です" }, { status: 400 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase service role key が未設定です" }, { status: 500 })
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { error } = await serviceClient.from("sheet_settings").upsert({
    user_id: userId,
    spreadsheet_id: spreadsheetId,
    worksheet_title: worksheetTitle,
  })

  if (error) {
    console.error("Failed to upsert sheet_settings via service role", error)
    return NextResponse.json({ error: "シート設定の保存に失敗しました" }, { status: 500 })
  }

  return NextResponse.json({
    sheetSettings: { userId, spreadsheetId, worksheetTitle },
  })
}

const projectRefPattern = /https?:\/\/([a-z0-9-]+)\.supabase\.co/i

function extractProjectRef(url: string) {
  return url.match(projectRefPattern)?.[1]
}
