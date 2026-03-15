"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { LoginPanel } from "@/app/_components/shared/login-panel"
import { ThemeToggle } from "@/components/theme-toggle"

export default function LoginPage() {
  const { state: authState } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (authState.status === "authenticated") {
      router.push("/cost")
    }
  }, [authState.status, router])

  if (authState.status === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-10 text-muted-foreground">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-transparent" />
        <p>読み込み中...</p>
      </main>
    )
  }

  if (authState.status === "authenticated") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-10 text-muted-foreground">
        <p>リダイレクト中...</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Cost App</h1>
          <p className="mt-1 text-muted-foreground">ログインしてデータを同期</p>
        </div>
        <LoginPanel onClose={() => router.push("/cost")} isStandalonePage />
      </div>
    </main>
  )
}
