import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export type Team = {
  id: string
  name: string
  description: string | null
  owner_id: string
  created_at: string
  role?: string
}

// GET: ユーザーが所属するチーム一覧を取得
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // チームメンバーシップ経由でチーム情報を取得
    const { data, error } = await supabase
      .from("team_members")
      .select(`
        role,
        teams (
          id,
          name,
          description,
          owner_id,
          created_at
        )
      `)
      .eq("user_id", user.id)

    if (error) {
      console.error("Failed to fetch teams:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const teams = (data || []).map((membership) => {
      const team = membership.teams as unknown as Team
      return {
        ...team,
        role: membership.role,
      }
    })

    return NextResponse.json({ teams })
  } catch (error) {
    console.error("Error in GET /api/teams:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST: 新しいチームを作成
export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("teams")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        owner_id: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error("Failed to create team:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ team: data })
  } catch (error) {
    console.error("Error in POST /api/teams:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
