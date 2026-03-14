import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export type TeamMember = {
  user_id: string
  role: string
  joined_at: string
  email?: string
}

// GET: チームメンバー一覧を取得
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

    // メンバーシップ確認
    const { data: membership } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: "Not a team member" }, { status: 403 })
    }

    // メンバー一覧を取得
    const { data, error } = await supabase
      .from("team_members")
      .select(`
        user_id,
        role,
        joined_at
      `)
      .eq("team_id", teamId)
      .order("joined_at", { ascending: true })

    if (error) {
      console.error("Failed to fetch team members:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ members: data || [] })
  } catch (error) {
    console.error("Error in GET /api/teams/[teamId]/members:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT: メンバーのロールを更新
export async function PUT(
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
    const { user_id, role } = body

    if (!user_id || !role) {
      return NextResponse.json({ error: "user_id and role are required" }, { status: 400 })
    }

    if (!["admin", "member", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // オーナーのロールは変更不可
    const { data: targetMember } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user_id)
      .single()

    if (targetMember?.role === "owner") {
      return NextResponse.json({ error: "Cannot change owner role" }, { status: 403 })
    }

    const { error } = await supabase
      .from("team_members")
      .update({ role })
      .eq("team_id", teamId)
      .eq("user_id", user_id)

    if (error) {
      console.error("Failed to update member role:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in PUT /api/teams/[teamId]/members:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE: メンバーを削除
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

    const body = await request.json()
    const { user_id } = body

    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 })
    }

    // 自分自身を削除する場合（脱退）
    if (user_id === user.id) {
      const { data: membership } = await supabase
        .from("team_members")
        .select("role")
        .eq("team_id", teamId)
        .eq("user_id", user.id)
        .single()

      if (membership?.role === "owner") {
        return NextResponse.json({ error: "Owner cannot leave team" }, { status: 403 })
      }
    } else {
      // 他のメンバーを削除する場合、権限確認
      const { data: membership } = await supabase
        .from("team_members")
        .select("role")
        .eq("team_id", teamId)
        .eq("user_id", user.id)
        .single()

      if (!membership || !["owner", "admin"].includes(membership.role)) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 })
      }

      // オーナーは削除不可
      const { data: targetMember } = await supabase
        .from("team_members")
        .select("role")
        .eq("team_id", teamId)
        .eq("user_id", user_id)
        .single()

      if (targetMember?.role === "owner") {
        return NextResponse.json({ error: "Cannot remove owner" }, { status: 403 })
      }
    }

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", user_id)

    if (error) {
      console.error("Failed to remove member:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/teams/[teamId]/members:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
