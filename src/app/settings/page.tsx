"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { AuthPageLayout } from "@/app/_components/shared/auth-page-layout"
import { AccountInfoSection } from "@/app/_components/settings/account-info-section"
import { NotificationSettingsSection } from "@/app/_components/settings/notification-settings-section"

export default function SettingsPage() {
  const { state: authState } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (authState.status === "guest") {
      router.push("/login")
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
    <AuthPageLayout title="設定" activeMenu="settings">
      <div className="mx-auto max-w-2xl p-6">
        <div className="space-y-6">
          <div>
            <p className="text-muted-foreground">アカウントと通知の設定を管理します。</p>
          </div>

          <div className="rounded-lg border p-6">
            <AccountInfoSection />
          </div>

          <div className="rounded-lg border p-6">
            <NotificationSettingsSection />
          </div>
        </div>
      </div>
    </AuthPageLayout>
  )
}
