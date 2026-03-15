import { NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/server/api-auth"
import { createClient } from "@supabase/supabase-js"

// POST: 招待を受諾
export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params

    // ユーザー認証
    const auth = await authenticateApiRequest(request)
    if ("error" in auth) return auth.error
    const { user } = auth

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
    const { data: invitation, error: fetchError } = await supabase
      .from("team_invitations")
      .select("*")
      .eq("token", token)
      .single()

    if (fetchError || !invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

    // 有効期限チェック
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invitation has expired" }, { status: 400 })
    }

    // すでにメンバーかチェック
    const { data: existingMember } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", invitation.team_id)
      .eq("user_id", user.id)
      .single()

    if (existingMember) {
      // すでにメンバーの場合、招待を削除して成功を返す
      await supabase
        .from("team_invitations")
        .delete()
        .eq("id", invitation.id)

      return NextResponse.json({
        success: true,
        message: "Already a member of this team",
        team_id: invitation.team_id,
      })
    }

    // チームメンバーとして追加
    const { error: insertError } = await supabase
      .from("team_members")
      .insert({
        team_id: invitation.team_id,
        user_id: user.id,
        role: invitation.role,
      })

    if (insertError) {
      console.error("Failed to add team member:", insertError)
      return NextResponse.json({ error: "Failed to join team" }, { status: 500 })
    }

    // 招待を削除
    const { error: deleteError } = await supabase
      .from("team_invitations")
      .delete()
      .eq("id", invitation.id)

    if (deleteError) {
      console.error("Failed to delete invitation:", deleteError)
      // 招待の削除に失敗してもメンバー追加は成功しているので続行
    }

    return NextResponse.json({
      success: true,
      team_id: invitation.team_id,
    })
  } catch (error) {
    console.error("Error in POST /api/teams/invite/[token]/accept:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
