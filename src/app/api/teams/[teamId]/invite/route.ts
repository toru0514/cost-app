import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import crypto from "crypto"

// POST: 招待を作成
export async function POST(
  request: Request,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await context.params
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 権限確認
    const { data: membership } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single()

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    const body = await request.json()
    const { email, role } = body

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    if (!role || !["admin", "member", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // 既存のメンバーかチェック
    const { data: existingUsers } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .single()

    if (existingUsers) {
      const { data: existingMember } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", teamId)
        .eq("user_id", existingUsers.id)
        .single()

      if (existingMember) {
        return NextResponse.json({ error: "User is already a member" }, { status: 400 })
      }
    }

    // 既存の招待を削除
    await supabase
      .from("team_invitations")
      .delete()
      .eq("team_id", teamId)
      .eq("email", email.toLowerCase())

    // 招待トークンを生成
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7日間有効

    const { data, error } = await supabase
      .from("team_invitations")
      .insert({
        team_id: teamId,
        email: email.toLowerCase(),
        role,
        token,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Failed to create invitation:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 招待リンクを生成
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/teams/invite/${token}`

    return NextResponse.json({
      invitation: data,
      invite_url: inviteUrl,
    })
  } catch (error) {
    console.error("Error in POST /api/teams/[teamId]/invite:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET: 招待一覧を取得
export async function GET(
  _request: Request,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await context.params
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 権限確認
    const { data: membership } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single()

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    const { data, error } = await supabase
      .from("team_invitations")
      .select("*")
      .eq("team_id", teamId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Failed to fetch invitations:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ invitations: data || [] })
  } catch (error) {
    console.error("Error in GET /api/teams/[teamId]/invite:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE: 招待を削除
export async function DELETE(
  request: Request,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await context.params
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 権限確認
    const { data: membership } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single()

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    const body = await request.json()
    const { invitation_id } = body

    if (!invitation_id) {
      return NextResponse.json({ error: "invitation_id is required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("team_invitations")
      .delete()
      .eq("id", invitation_id)
      .eq("team_id", teamId)

    if (error) {
      console.error("Failed to delete invitation:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/teams/[teamId]/invite:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
