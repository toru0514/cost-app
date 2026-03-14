import { supabaseClient } from "./supabase-client"

/**
 * 認証付きfetchヘルパー
 * Supabaseセッションからアクセストークンを取得し、Authorizationヘッダーに付与する
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession()
  const headers = new Headers(options.headers)

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`)
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  })
}
