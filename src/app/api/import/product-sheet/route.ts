import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"

import { fetchGoogleSheetRows } from "@/lib/google-sheets"

export const runtime = "nodejs"

export async function GET(request: Request) {
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
      console.warn("Supabase auth cookie missing", {
        cookieName,
        present: cookieStore.getAll().map((cookie) => cookie.name),
      })
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
      console.warn("Supabase auth access token is empty", { cookieName })
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

  try {
    const url = new URL(request.url)
    const range = url.searchParams.get("range") ?? undefined
    const result = await fetchGoogleSheetRows({ range })
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

const projectRefPattern = /https?:\/\/([a-z0-9-]+)\.supabase\.co/i

function extractProjectRef(url: string) {
  return url.match(projectRefPattern)?.[1]
}
