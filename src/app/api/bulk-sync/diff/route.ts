import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"

import { buildBulkSyncDiff, validateBulkSyncPayload } from "@/lib/bulk-sync"
import { loadUserAppDataServer } from "@/lib/server/load-app-data"
import type { BulkSyncPayload } from "@/lib/bulk-sync"

export const runtime = "nodejs"

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

  let body: { payload?: BulkSyncPayload } | null = null
  try {
    body = (await request.json()) as { payload?: BulkSyncPayload }
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body?.payload) {
    return NextResponse.json({ error: "payload is required" }, { status: 400 })
  }

  try {
    const existing = await loadUserAppDataServer(supabase, user.id)
    const { normalized, issues } = validateBulkSyncPayload(body.payload, existing)
    const diff = buildBulkSyncDiff(normalized, existing, issues)
    return NextResponse.json({ summary: diff.summary, items: diff.items })
  } catch (error) {
    console.error("Failed to compute bulk sync diff", error)
    return NextResponse.json({ error: "Failed to compute diff" }, { status: 500 })
  }
}

const projectRefPattern = /https?:\/\/([a-z0-9-]+)\.supabase\.co/i

function extractProjectRef(url: string) {
  return url.match(projectRefPattern)?.[1]
}
