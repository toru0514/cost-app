import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"

const projectRefPattern = /https?:\/\/([a-z0-9-]+)\.supabase\.co/i

function extractProjectRef(url: string) {
  return url.match(projectRefPattern)?.[1]
}

type AuthSuccess = { user: User; supabase: SupabaseClient }
type AuthFailure = { error: NextResponse }

export async function authenticateApiRequest(
  request: Request
): Promise<AuthSuccess | AuthFailure> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 }) }
  }

  let accessToken: string | undefined
  const authHeader = request.headers.get("authorization")
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    accessToken = authHeader.slice(7)
  }

  if (!accessToken) {
    const cookieStore = await cookies()
    const projectRef = extractProjectRef(supabaseUrl)
    const cookieName = projectRef ? `sb-${projectRef}-auth-token` : undefined
    const tokenCookie = cookieName ? cookieStore.get(cookieName) : undefined
    if (!tokenCookie?.value) {
      return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
    }

    try {
      const [access] = JSON.parse(tokenCookie.value)
      accessToken = access
    } catch (e) {
      console.error("Failed to parse Supabase auth cookie", { cookieName, error: e })
      return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
    }

    if (!accessToken) {
      return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
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
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  return { user, supabase }
}
