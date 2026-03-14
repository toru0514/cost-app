"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Copy, Mail, UserPlus } from "lucide-react"

interface InviteMemberDialogProps {
  teamId: string
  disabled?: boolean
}

export function InviteMemberDialog({ teamId, disabled }: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<string>("member")
  const [inviting, setInviting] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)

  const handleInvite = async () => {
    if (!email.trim()) {
      toast.error("メールアドレスを入力してください")
      return
    }

    setInviting(true)
    try {
      const response = await fetch(`/api/teams/${teamId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create invitation")
      }

      const data = await response.json()
      setInviteUrl(data.invite_url)
      toast.success("招待を作成しました")
    } catch (error) {
      console.error("Failed to invite:", error)
      toast.error(error instanceof Error ? error.message : "招待の作成に失敗しました")
    } finally {
      setInviting(false)
    }
  }

  const handleCopyLink = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl)
      toast.success("招待リンクをコピーしました")
    }
  }

  const handleClose = () => {
    setOpen(false)
    setEmail("")
    setRole("member")
    setInviteUrl(null)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <UserPlus className="mr-1.5 h-4 w-4" />
          招待
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>メンバーを招待</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {!inviteUrl ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="invite-email">メールアドレス</Label>
                <div className="flex gap-2">
                  <Mail className="mt-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="invite-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>ロール</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">管理者</SelectItem>
                    <SelectItem value="member">メンバー</SelectItem>
                    <SelectItem value="viewer">閲覧者</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  管理者: メンバー管理可能 / メンバー: データ編集可能 / 閲覧者: 閲覧のみ
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose} disabled={inviting}>
                  キャンセル
                </Button>
                <Button onClick={handleInvite} disabled={inviting || !email.trim()}>
                  {inviting ? "送信中..." : "招待を送信"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>招待リンク</Label>
                <div className="flex gap-2">
                  <Input value={inviteUrl} readOnly className="text-xs" />
                  <Button variant="outline" size="icon" onClick={handleCopyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  このリンクを招待する人に共有してください。リンクは7日間有効です。
                </p>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleClose}>閉じる</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
