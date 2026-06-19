import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase-client"

// Supabase無料プランは7日間アクセスが無いとプロジェクトが一時停止する。
// Vercel Cron から毎日1回このルートを叩き、軽量クエリ（件数のみ）を投げて停止を回避する。
//
// CRON_SECRET が設定されている場合は Authorization: Bearer <CRON_SECRET> を検証する。
// （Vercel Cron はこのヘッダーを自動付与する）

// 常に動的実行（キャッシュさせない）
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  // CRON_SECRET が設定されている場合のみ認証を要求する
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const supabase = getSupabaseClient()

    // 件数のみを取得する軽量クエリ（行データは取得しない）
    const { error, count } = await supabase
      .from("exchange_rates")
      .select("*", { count: "exact", head: true })

    if (error) {
      console.error("keep-alive query failed:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, count: count ?? null })
  } catch (error) {
    console.error("keep-alive error:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
