"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { fetchWithAuth } from "@/lib/fetch-with-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Users, CheckCircle, XCircle, LogIn } from "lucide-react"

type InvitationInfo = {
  id: string
  team_id: string
  team_name: string
  role: string
  email: string
  expires_at: string
  expired: boolean
}

export default function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const { state: authState } = useAuth()
  const router = useRouter()
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const response = await fetch(`/api/teams/invite/${token}`)
        if (!response.ok) {
          const data = await response.json()
          setError(data.error || "招待情報の取得に失敗しました")
          return
        }
        const data = await response.json()
        setInvitation(data.invitation)
      } catch {
        setError("招待情報の取得に失敗しました")
      } finally {
        setLoading(false)
      }
    }

    fetchInvitation()
  }, [token])

  const handleAccept = async () => {
    if (!invitation) return

    setAccepting(true)
    try {
      const response = await fetchWithAuth(`/api/teams/invite/${token}/accept`, {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "招待の受諾に失敗しました")
      }

      toast.success(`${invitation.team_name} に参加しました`)
      router.push("/teams")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "招待の受諾に失敗しました")
    } finally {
      setAccepting(false)
    }
  }

  const handleLogin = () => {
    // 現在のURLをreturnUrlとして保持してログインページへ
    const returnUrl = encodeURIComponent(`/teams/invite/${token}`)
    router.push(`/?returnUrl=${returnUrl}`)
  }

  const roleLabel: Record<string, string> = {
    admin: "管理者",
    member: "メンバー",
    viewer: "閲覧者",
  }

  if (loading || authState.status === "loading") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="mt-4 text-muted-foreground">読み込み中...</p>
      </main>
    )
  }

  if (error || !invitation) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <CardTitle>招待が見つかりません</CardTitle>
            <CardDescription>
              {error || "この招待リンクは無効か、期限切れです。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push("/")} variant="outline">
              ホームに戻る
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (invitation.expired) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <XCircle className="h-8 w-8 text-yellow-500" />
            </div>
            <CardTitle>招待の期限切れ</CardTitle>
            <CardDescription>
              この招待リンクは期限切れです。チーム管理者に再度招待を依頼してください。
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push("/")} variant="outline">
              ホームに戻る
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  // 未ログイン
  if (authState.status === "guest") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>{invitation.team_name} への招待</CardTitle>
            <CardDescription>
              {roleLabel[invitation.role] || invitation.role} として招待されています
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              招待を受け入れるにはログインが必要です。
            </p>
            <Button onClick={handleLogin} className="w-full">
              <LogIn className="mr-2 h-4 w-4" />
              ログインして続行
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  // ログイン済み
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>{invitation.team_name} への招待</CardTitle>
          <CardDescription>
            {roleLabel[invitation.role] || invitation.role} として招待されています
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">招待先メールアドレス</p>
            <p className="font-medium">{invitation.email}</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push("/")}
              disabled={accepting}
            >
              キャンセル
            </Button>
            <Button
              className="flex-1"
              onClick={handleAccept}
              disabled={accepting}
            >
              {accepting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  処理中...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  参加する
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
