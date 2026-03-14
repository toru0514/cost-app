import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export type InAppNotification = {
  id: string
  title: string
  message: string
  notification_category: string
  read: boolean
  created_at: string
}

// GET: 通知一覧を取得
export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unread_only") === "true"
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100)

    let query = supabase
      .from("in_app_notifications")
      .select("id, title, message, notification_category, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq("read", false)
    }

    const { data, error } = await query

    if (error) {
      console.error("Failed to fetch notifications:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 未読数を取得
    const { count: unreadCount } = await supabase
      .from("in_app_notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false)

    return NextResponse.json({
      notifications: data || [],
      unread_count: unreadCount || 0,
    })
  } catch (error) {
    console.error("Error in GET /api/notifications/list:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT: 通知を既読にする
export async function PUT(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { notification_ids, mark_all_read } = body as {
      notification_ids?: string[]
      mark_all_read?: boolean
    }

    if (mark_all_read) {
      const { error } = await supabase
        .from("in_app_notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false)

      if (error) {
        console.error("Failed to mark all as read:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else if (notification_ids && notification_ids.length > 0) {
      const { error } = await supabase
        .from("in_app_notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .in("id", notification_ids)

      if (error) {
        console.error("Failed to mark notifications as read:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: "No notification IDs provided" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in PUT /api/notifications/list:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE: 通知を削除
export async function DELETE(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { notification_ids } = body as { notification_ids: string[] }

    if (!notification_ids || notification_ids.length === 0) {
      return NextResponse.json({ error: "No notification IDs provided" }, { status: 400 })
    }

    const { error } = await supabase
      .from("in_app_notifications")
      .delete()
      .eq("user_id", user.id)
      .in("id", notification_ids)

    if (error) {
      console.error("Failed to delete notifications:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/notifications/list:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
