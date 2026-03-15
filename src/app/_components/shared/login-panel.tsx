"use client"

import { useCallback, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth"
import { toast } from "sonner"

export type LoginPanelProps = {
  onClose: () => void
  isStandalonePage?: boolean
}

export function LoginPanel({ onClose, isStandalonePage = false }: LoginPanelProps) {
  const { login, signup, resetPassword } = useAuth()
  const [loginForm, setLoginForm] = useState({ name: "", email: "", password: "" })
  const [authMode, setAuthMode] = useState<"login" | "signup">("login")
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)

  const handleLoginSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const email = loginForm.email.trim()
      const password = loginForm.password
      if (!email || !password) {
        toast.error("メールアドレスとパスワードを入力してください。")
        return
      }
      try {
        if (authMode === "signup") {
          const name = loginForm.name.trim()
          if (!name) {
            toast.error("氏名を入力してください。")
            return
          }
          await signup({ email, password, name })
          toast.success("登録しました", { description: `${email} でログインしました。` })
        } else {
          await login({ email, password })
          toast.success("ログインしました", { description: `${email} として利用中です。` })
        }
        onClose()
        setLoginForm({ name: "", email: "", password: "" })
      } catch (error) {
        const message = error instanceof Error ? error.message : "認証に失敗しました。"
        toast.error(message)
      }
    },
    [authMode, loginForm, login, signup, onClose]
  )

  const handlePasswordReset = useCallback(async () => {
    if (isSendingReset) return
    const email = loginForm.email.trim()
    if (!email) {
      toast.error("パスワードリセット用のメールアドレスを入力してください。")
      return
    }
    setIsSendingReset(true)
    try {
      await resetPassword(email)
      toast.success("パスワードリセットメールを送信しました。", {
        description: `${email} を確認してください。`,
      })
      setResetPasswordOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "リセットメール送信に失敗しました。"
      toast.error(message)
    } finally {
      setIsSendingReset(false)
    }
  }, [isSendingReset, loginForm.email, resetPassword])

  return (
    <Card className="mb-6 border-primary/50 bg-background/95 shadow-lg">
      <CardHeader>
        <CardTitle className="text-base">ログインして保存を共有</CardTitle>
        <CardDescription>
          {authMode === "login" ? "登録済みのメール・パスワードでログインします。" : "新規登録して Supabase 上にデータを保存します。"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={handleLoginSubmit}>
          {authMode === "signup" && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">氏名</label>
              <Input
                value={loginForm.name}
                onChange={(event) => setLoginForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="例: コスト太郎"
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">メールアドレス</label>
            <Input
              type="email"
              value={loginForm.email}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="example@example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">パスワード</label>
            <Input
              type="password"
              value={loginForm.password}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="8文字以上"
            />
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              className={`rounded border px-2 py-1 ${authMode === "login" ? "border-primary text-primary" : "border-transparent"}`}
              onClick={() => {
                setAuthMode("login")
                setResetPasswordOpen(false)
              }}
            >
              ログイン
            </button>
            <button
              type="button"
              className={`rounded border px-2 py-1 ${authMode === "signup" ? "border-primary text-primary" : "border-transparent"}`}
              onClick={() => {
                setAuthMode("signup")
                setResetPasswordOpen(false)
              }}
            >
              新規登録
            </button>
          </div>
          {authMode === "login" && (
            <div className="space-y-2">
              <button
                type="button"
                className="text-xs text-primary underline underline-offset-2"
                onClick={() => setResetPasswordOpen((prev) => !prev)}
              >
                パスワードを忘れた方はこちら
              </button>
              {resetPasswordOpen && (
                <div className="rounded-md border border-dashed p-3">
                  <p className="mb-2 text-xs text-muted-foreground">
                    入力したメールアドレス宛に、パスワードリセットメールを送信します。
                  </p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    上のメールアドレス欄を入力してから送信してください。
                  </p>
                  <Button type="button" size="sm" variant="outline" onClick={handlePasswordReset} disabled={isSendingReset}>
                    {isSendingReset ? "送信中..." : "リセットメールを送信"}
                  </Button>
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm">
              {authMode === "login" ? "ログイン" : "登録してログイン"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onClose}>
              {isStandalonePage ? "ゲストとして続ける" : "キャンセル"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
