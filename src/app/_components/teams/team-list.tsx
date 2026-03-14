"use client"

import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus, Users, RefreshCw, Crown, Shield, User, Eye } from "lucide-react"

type Team = {
  id: string
  name: string
  description: string | null
  owner_id: string
  created_at: string
  role: string
}

interface TeamListProps {
  onSelectTeam: (teamId: string | null) => void
  selectedTeamId: string | null
}

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown className="h-3.5 w-3.5 text-yellow-500" />,
  admin: <Shield className="h-3.5 w-3.5 text-blue-500" />,
  member: <User className="h-3.5 w-3.5 text-green-500" />,
  viewer: <Eye className="h-3.5 w-3.5 text-gray-500" />,
}

const roleLabels: Record<string, string> = {
  owner: "オーナー",
  admin: "管理者",
  member: "メンバー",
  viewer: "閲覧者",
}

export function TeamList({ onSelectTeam, selectedTeamId }: TeamListProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamDescription, setNewTeamDescription] = useState("")
  const [creating, setCreating] = useState(false)

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/teams", {
        credentials: "include",
      })
      if (!response.ok) throw new Error("Failed to fetch teams")
      const data = await response.json()
      setTeams(data.teams || [])
    } catch (error) {
      console.error("Failed to fetch teams:", error)
      toast.error("チーム一覧の取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error("チーム名を入力してください")
      return
    }

    setCreating(true)
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newTeamName.trim(),
          description: newTeamDescription.trim() || null,
        }),
      })

      if (!response.ok) throw new Error("Failed to create team")

      const data = await response.json()
      setTeams((prev) => [...prev, { ...data.team, role: "owner" }])
      setCreateDialogOpen(false)
      setNewTeamName("")
      setNewTeamDescription("")
      toast.success("チームを作成しました")
    } catch (error) {
      console.error("Failed to create team:", error)
      toast.error("チームの作成に失敗しました")
    } finally {
      setCreating(false)
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
        <h3 className="text-sm font-semibold">チーム</h3>
        <Button variant="ghost" size="sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-1">
        {/* 個人データ */}
        <button
          type="button"
          onClick={() => onSelectTeam(null)}
          className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
            selectedTeamId === null
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <User className="h-4 w-4" />
          <span>個人</span>
        </button>

        {/* チーム一覧 */}
        {teams.map((team) => (
          <button
            key={team.id}
            type="button"
            onClick={() => onSelectTeam(team.id)}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
              selectedTeamId === team.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            <span className="flex-1 truncate">{team.name}</span>
            <span title={roleLabels[team.role]}>{roleIcons[team.role]}</span>
          </button>
        ))}
      </div>

      {teams.length === 0 && (
        <p className="text-center text-xs text-muted-foreground">
          チームがありません
        </p>
      )}

      {/* チーム作成ダイアログ */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新しいチームを作成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">チーム名</Label>
              <Input
                id="team-name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="チーム名を入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-description">説明（任意）</Label>
              <Input
                id="team-description"
                value={newTeamDescription}
                onChange={(e) => setNewTeamDescription(e.target.value)}
                placeholder="チームの説明"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={creating}
              >
                キャンセル
              </Button>
              <Button onClick={handleCreateTeam} disabled={creating || !newTeamName.trim()}>
                {creating ? "作成中..." : "作成"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
