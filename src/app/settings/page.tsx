"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { NotificationSettingsSection } from "@/app/_components/settings/notification-settings-section"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function SettingsPage() {
  const { state: authState } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (authState.status === "guest") {
      router.push("/cost")
    }
  }, [authState.status, router])

  if (authState.status === "loading") {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-4 p-10 text-muted-foreground">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-transparent" />
        <p>読み込み中...</p>
      </main>
    )
  }

  if (authState.status === "guest") {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-4 p-10 text-muted-foreground">
        <p>ログインが必要です</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl p-6">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            戻る
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">設定</h1>
            <p className="text-muted-foreground">アカウントと通知の設定を管理します。</p>
          </div>

          <div className="rounded-lg border p-6">
            <NotificationSettingsSection />
          </div>
        </div>
      </div>
    </main>
  )
}
