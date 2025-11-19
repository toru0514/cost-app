import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"

import { fetchGoogleSheetRows } from "@/lib/google-sheets"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient(
    { cookies: () => cookieStore } as unknown as { cookies: () => ReturnType<typeof cookies> }
  )
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session?.user) {
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
      user_id: session.user.id,
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
