import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let cachedClient: SupabaseClient | null = null

export const getSupabaseClient = (): SupabaseClient => {
  if (cachedClient) return cachedClient
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL または Anon Key が設定されていません。")
  }
  cachedClient = createClient(supabaseUrl, supabaseAnonKey)
  return cachedClient
}

export const supabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient()
    const value = client[prop as keyof SupabaseClient]
    return typeof value === "function" ? value.bind(client) : value
  },
})
