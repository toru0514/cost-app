import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log("SUPABASE_URL in prod:", supabaseUrl)
console.log("SUPABASE_ANON_KEY in prod:", supabaseAnonKey ? "存在します" : "undefined")

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL または Anon Key が設定されていません。")
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

