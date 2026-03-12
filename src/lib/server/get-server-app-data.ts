import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import type { AppData } from "../types"
import { loadUserAppDataServer } from "./load-app-data"

const projectRefPattern = /https?:\/\/([a-z0-9-]+)\.supabase\.co/i

function extractProjectRef(url: string) {
  return url.match(projectRefPattern)?.[1]
}

export async function getServerAppData(): Promise<AppData | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return null

  const cookieStore = await cookies()
  const projectRef = extractProjectRef(supabaseUrl)
  const cookieName = projectRef ? `sb-${projectRef}-auth-token` : undefined
  const tokenCookie = cookieName ? cookieStore.get(cookieName) : undefined

  if (!tokenCookie?.value) return null

  let accessToken: string
  try {
    const [access] = JSON.parse(tokenCookie.value)
    accessToken = access
  } catch {
    return null
  }

  if (!accessToken) return null

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: { persistSession: false },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return null

  try {
    return await loadUserAppDataServer(supabase, user.id)
  } catch (error) {
    console.error("Failed to load server app data", error)
    return null
  }
}
