"use client"

import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { fetchWithAuth } from "@/lib/fetch-with-auth"
import { toast } from "sonner"
import { Bell, ExternalLink, Loader2, Mail, MessageSquare, RefreshCw, Send } from "lucide-react"

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
  const [webhookUrl, setWebhookUrl] = useState("")
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [testingWebhook, setTestingWebhook] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetchWithAuth("/api/notifications/settings")
      if (!response.ok) {
        throw new Error("Failed to fetch settings")
      }
      const data = await response.json()
      setSettings(data.settings)

      // Slack設定からwebhook_urlを読み込み
      const slackSetting = data.settings.find(
        (s: NotificationSetting) => s.notification_type === "slack"
      )
      if (slackSetting?.config?.webhook_url) {
        setWebhookUrl(slackSetting.config.webhook_url as string)
      }
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
      // Slack設定の場合、既存のconfigを保持
      const existingSetting = settings.find((s) => s.notification_type === type)
      const config = type === "slack" ? (existingSetting?.config || {}) : {}

      const response = await fetchWithAuth("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification_type: type,
          enabled,
          config,
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

  const handleSaveWebhook = async () => {
    if (webhookUrl && !webhookUrl.startsWith("https://hooks.slack.com/services/")) {
      toast.error("Webhook URLはhttps://hooks.slack.com/services/で始まる必要があります")
      return
    }

    setSavingWebhook(true)
    try {
      const response = await fetchWithAuth("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification_type: "slack",
          enabled: true,
          config: { webhook_url: webhookUrl || undefined },
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save webhook URL")
      }

      setSettings((prev) =>
        prev.map((s) =>
          s.notification_type === "slack"
            ? { ...s, config: { ...s.config, webhook_url: webhookUrl || undefined } }
            : s
        )
      )

      toast.success("Webhook URLを保存しました")
    } catch (error) {
      console.error("Failed to save webhook URL:", error)
      toast.error(error instanceof Error ? error.message : "Webhook URLの保存に失敗しました")
    } finally {
      setSavingWebhook(false)
    }
  }

  const handleTestWebhook = async () => {
    if (!webhookUrl) {
      toast.error("Webhook URLを入力してください")
      return
    }
    if (!webhookUrl.startsWith("https://hooks.slack.com/services/")) {
      toast.error("Webhook URLはhttps://hooks.slack.com/services/で始まる必要があります")
      return
    }

    setTestingWebhook(true)
    try {
      // テスト送信前に自動保存
      const saveResponse = await fetchWithAuth("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification_type: "slack",
          enabled: true,
          config: { webhook_url: webhookUrl },
        }),
      })
      if (!saveResponse.ok) {
        const saveData = await saveResponse.json()
        throw new Error(saveData.error || "Webhook URLの保存に失敗しました")
      }

      setSettings((prev) =>
        prev.map((s) =>
          s.notification_type === "slack"
            ? { ...s, config: { ...s.config, webhook_url: webhookUrl } }
            : s
        )
      )

      const response = await fetchWithAuth("/api/slack/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhook_url: webhookUrl }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "テスト送信に失敗しました")
      }

      toast.success("保存してテストメッセージを送信しました。Slackチャンネルを確認してください。")
    } catch (error) {
      console.error("Failed to test webhook:", error)
      toast.error(error instanceof Error ? error.message : "テスト送信に失敗しました")
    } finally {
      setTestingWebhook(false)
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
            <div key={config.type} className="space-y-0">
              <div className="flex items-center justify-between rounded-lg border p-4">
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

              {/* Slack Webhook URL設定セクション */}
              {config.type === "slack" && isEnabled && (
                <div className="ml-4 rounded-b-lg border border-t-0 bg-muted/30 p-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="webhook-url" className="text-sm font-medium">
                      Webhook URL
                    </Label>
                    <Input
                      id="webhook-url"
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      <a
                        href="https://api.slack.com/messaging/webhooks"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        SlackアプリのIncoming Webhooksから取得できます
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Webhook URLが未設定の場合、システムのデフォルト設定が使用されます。
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveWebhook}
                      disabled={savingWebhook}
                    >
                      {savingWebhook && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                      保存
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleTestWebhook}
                      disabled={testingWebhook || !webhookUrl}
                    >
                      {testingWebhook ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-1.5 h-4 w-4" />
                      )}
                      テスト送信
                    </Button>
                  </div>
                </div>
              )}
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
