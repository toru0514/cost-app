import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// GET: チーム詳細を取得
export async function GET(
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

    // チームを取得
    const { data: team, error } = await supabase
      .from("teams")
      .select("*")
      .eq("id", teamId)
      .single()

    if (error || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
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

    return NextResponse.json({
      team: {
        ...team,
        role: membership.role,
      },
    })
  } catch (error) {
    console.error("Error in GET /api/teams/[teamId]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT: チーム情報を更新
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
    const { name, description } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null

    const { data, error } = await supabase
      .from("teams")
      .update(updateData)
      .eq("id", teamId)
      .select()
      .single()

    if (error) {
      console.error("Failed to update team:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ team: data })
  } catch (error) {
    console.error("Error in PUT /api/teams/[teamId]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE: チームを削除
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

    // オーナーのみ削除可能
    const { data: team } = await supabase
      .from("teams")
      .select("owner_id")
      .eq("id", teamId)
      .single()

    if (!team || team.owner_id !== user.id) {
      return NextResponse.json({ error: "Only owner can delete team" }, { status: 403 })
    }

    const { error } = await supabase
      .from("teams")
      .delete()
      .eq("id", teamId)

    if (error) {
      console.error("Failed to delete team:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/teams/[teamId]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
