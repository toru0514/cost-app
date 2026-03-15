import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// GET: トークンで招待情報を取得（認証不要）
export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params

    // service roleキーを使用してRLSをバイパス
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase env vars missing")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

    // トークンで招待を検索
    const { data: invitation, error } = await supabase
      .from("team_invitations")
      .select(`
        id,
        team_id,
        email,
        role,
        expires_at,
        teams (
          name
        )
      `)
      .eq("token", token)
      .single()

    if (error || !invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

    const isExpired = new Date(invitation.expires_at) < new Date()
    // Supabaseのリレーションは単一レコードの場合オブジェクト、配列の場合配列で返る
    const teamsData = invitation.teams as unknown
    let teamName = "チーム"
    if (teamsData && typeof teamsData === "object" && "name" in teamsData) {
      teamName = (teamsData as { name: string }).name
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        team_id: invitation.team_id,
        team_name: teamName,
        role: invitation.role,
        email: invitation.email,
        expires_at: invitation.expires_at,
        expired: isExpired,
      },
    })
  } catch (error) {
    console.error("Error in GET /api/teams/invite/[token]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
