"use client"

import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchWithAuth } from "@/lib/fetch-with-auth"
import { toast } from "sonner"
import { Crown, RefreshCw, Shield, Trash2, User, Eye } from "lucide-react"

type TeamMember = {
  user_id: string
  role: string
  joined_at: string
}

interface TeamMembersSectionProps {
  teamId: string
  currentUserRole: string
}

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown className="h-4 w-4 text-yellow-500" />,
  admin: <Shield className="h-4 w-4 text-blue-500" />,
  member: <User className="h-4 w-4 text-green-500" />,
  viewer: <Eye className="h-4 w-4 text-gray-500" />,
}

const roleLabels: Record<string, string> = {
  owner: "オーナー",
  admin: "管理者",
  member: "メンバー",
  viewer: "閲覧者",
}

export function TeamMembersSection({ teamId, currentUserRole }: TeamMembersSectionProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const canManageMembers = ["owner", "admin"].includes(currentUserRole)

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetchWithAuth(`/api/teams/${teamId}/members`)
      if (!response.ok) throw new Error("Failed to fetch members")
      const data = await response.json()
      setMembers(data.members || [])
    } catch (error) {
      console.error("Failed to fetch members:", error)
      toast.error("メンバー一覧の取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId)
    try {
      const response = await fetchWithAuth(`/api/teams/${teamId}/members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, role: newRole }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update role")
      }

      setMembers((prev) =>
        prev.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m))
      )
      toast.success("ロールを更新しました")
    } catch (error) {
      console.error("Failed to update role:", error)
      toast.error(error instanceof Error ? error.message : "ロールの更新に失敗しました")
    } finally {
      setUpdating(null)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("このメンバーをチームから削除しますか？")) return

    setUpdating(userId)
    try {
      const response = await fetchWithAuth(`/api/teams/${teamId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to remove member")
      }

      setMembers((prev) => prev.filter((m) => m.user_id !== userId))
      toast.success("メンバーを削除しました")
    } catch (error) {
      console.error("Failed to remove member:", error)
      toast.error(error instanceof Error ? error.message : "メンバーの削除に失敗しました")
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">メンバー ({members.length})</h3>
        <Button variant="ghost" size="sm" onClick={fetchMembers}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.user_id}
            className="flex items-center justify-between rounded-md border p-3"
          >
            <div className="flex items-center gap-3">
              {roleIcons[member.role]}
              <div>
                <p className="text-sm font-medium">{member.user_id.slice(0, 8)}...</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(member.joined_at).toLocaleDateString("ja-JP")}に参加
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canManageMembers && member.role !== "owner" ? (
                <>
                  <Select
                    value={member.role}
                    onValueChange={(value) => handleRoleChange(member.user_id, value)}
                    disabled={updating === member.user_id}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">管理者</SelectItem>
                      <SelectItem value="member">メンバー</SelectItem>
                      <SelectItem value="viewer">閲覧者</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMember(member.user_id)}
                    disabled={updating === member.user_id}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {roleLabels[member.role]}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          メンバーがいません
        </p>
      )}
    </div>
  )
}
