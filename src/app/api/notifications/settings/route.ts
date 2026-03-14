import { NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/server/api-auth"

export type NotificationType = "email" | "slack" | "in_app"

export type NotificationSetting = {
  notification_type: NotificationType
  enabled: boolean
  config: Record<string, unknown>
}

// GET: 通知設定を取得
export async function GET(request: Request) {
  try {
    const auth = await authenticateApiRequest(request)
    if ("error" in auth) {
      return auth.error
    }
    const { user, supabase } = auth

    const { data, error } = await supabase
      .from("notification_settings")
      .select("notification_type, enabled, config")
      .eq("user_id", user.id)

    if (error) {
      console.error("Failed to fetch notification settings:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // デフォルト設定をマージ
    const defaults: NotificationSetting[] = [
      { notification_type: "email", enabled: false, config: {} },
      { notification_type: "slack", enabled: false, config: {} },
      { notification_type: "in_app", enabled: true, config: {} },
    ]

    const settings = defaults.map((defaultSetting) => {
      const existing = data?.find((s) => s.notification_type === defaultSetting.notification_type)
      return existing || defaultSetting
    })

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Error in GET /api/notifications/settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT: 通知設定を更新
export async function PUT(request: Request) {
  try {
    const auth = await authenticateApiRequest(request)
    if ("error" in auth) {
      return auth.error
    }
    const { user, supabase } = auth

    const body = await request.json()
    const { notification_type, enabled, config } = body as NotificationSetting

    if (!notification_type || !["email", "slack", "in_app"].includes(notification_type)) {
      return NextResponse.json({ error: "Invalid notification type" }, { status: 400 })
    }

    const { error } = await supabase
      .from("notification_settings")
      .upsert({
        user_id: user.id,
        notification_type,
        enabled: Boolean(enabled),
        config: config || {},
      }, {
        onConflict: "user_id,notification_type",
      })

    if (error) {
      console.error("Failed to update notification settings:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in PUT /api/notifications/settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
