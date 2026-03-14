"use client"

import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Bell, Mail, MessageSquare, RefreshCw } from "lucide-react"

type NotificationType = "email" | "slack" | "in_app"

type NotificationSetting = {
  notification_type: NotificationType
  enabled: boolean
  config: Record<string, unknown>
}

const notificationTypeConfig = [
  {
    type: "in_app" as const,
    label: "アプリ内通知",
    description: "アプリ内で通知を受け取ります",
    icon: Bell,
  },
  {
    type: "email" as const,
    label: "メール通知",
    description: "登録メールアドレスに通知を送信します",
    icon: Mail,
  },
  {
    type: "slack" as const,
    label: "Slack通知",
    description: "Slackチャンネルに通知を送信します",
    icon: MessageSquare,
  },
]

export function NotificationSettingsSection() {
  const [settings, setSettings] = useState<NotificationSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<NotificationType | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/notifications/settings", {
        credentials: "include",
      })
      if (!response.ok) {
        throw new Error("Failed to fetch settings")
      }
      const data = await response.json()
      setSettings(data.settings)
    } catch (error) {
      console.error("Failed to fetch notification settings:", error)
      toast.error("通知設定の取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleToggle = async (type: NotificationType, enabled: boolean) => {
    setUpdating(type)
    try {
      const response = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          notification_type: type,
          enabled,
          config: {},
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update setting")
      }

      setSettings((prev) =>
        prev.map((s) =>
          s.notification_type === type ? { ...s, enabled } : s
        )
      )

      toast.success(`${notificationTypeConfig.find((c) => c.type === type)?.label}を${enabled ? "有効" : "無効"}にしました`)
    } catch (error) {
      console.error("Failed to update notification setting:", error)
      toast.error("設定の更新に失敗しました")
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">通知設定</h2>
        <p className="text-sm text-muted-foreground">
          通知の受け取り方法を設定します。
        </p>
      </div>

      <div className="space-y-4">
        {notificationTypeConfig.map((config) => {
          const setting = settings.find((s) => s.notification_type === config.type)
          const isEnabled = setting?.enabled ?? false
          const Icon = config.icon

          return (
            <div
              key={config.type}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <Label className="text-base font-medium">{config.label}</Label>
                  <p className="text-sm text-muted-foreground">{config.description}</p>
                </div>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked) => handleToggle(config.type, checked)}
                disabled={updating === config.type}
              />
            </div>
          )
        })}
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="outline" size="sm" onClick={fetchSettings} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          再読み込み
        </Button>
      </div>
    </section>
  )
}
