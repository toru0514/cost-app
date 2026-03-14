"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { fetchWithAuth } from "@/lib/fetch-with-auth"
import { TeamList } from "@/app/_components/teams/team-list"
import { TeamMembersSection } from "@/app/_components/teams/team-members-section"
import { InviteMemberDialog } from "@/app/_components/teams/invite-member-dialog"
import { ArrowLeft, Settings, Trash2 } from "lucide-react"
import { toast } from "sonner"

type Team = {
  id: string
  name: string
  description: string | null
  owner_id: string
  role: string
}

export default function TeamsPage() {
  const { state: authState } = useAuth()
  const router = useRouter()
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (authState.status === "guest") {
      router.push("/cost")
    }
  }, [authState.status, router])

  const fetchTeamDetails = useCallback(async (teamId: string) => {
    setLoading(true)
    try {
      const response = await fetchWithAuth(`/api/teams/${teamId}`)
      if (!response.ok) throw new Error("Failed to fetch team")
      const data = await response.json()
      setSelectedTeam(data.team)
    } catch (error) {
      console.error("Failed to fetch team details:", error)
      toast.error("チーム情報の取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedTeamId) {
      fetchTeamDetails(selectedTeamId)
    } else {
      setSelectedTeam(null)
    }
  }, [selectedTeamId, fetchTeamDetails])

  const handleDeleteTeam = async () => {
    if (!selectedTeam) return
    if (!confirm(`チーム「${selectedTeam.name}」を削除しますか？この操作は取り消せません。`)) return

    try {
      const response = await fetchWithAuth(`/api/teams/${selectedTeam.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete team")
      }

      toast.success("チームを削除しました")
      setSelectedTeamId(null)
      setSelectedTeam(null)
    } catch (error) {
      console.error("Failed to delete team:", error)
      toast.error(error instanceof Error ? error.message : "チームの削除に失敗しました")
    }
  }

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

  const canManageMembers = selectedTeam && ["owner", "admin"].includes(selectedTeam.role)
  const isOwner = selectedTeam?.role === "owner"

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            戻る
          </Button>
        </div>

        <div className="flex gap-6">
          {/* 左サイドバー: チーム一覧 */}
          <div className="w-64 shrink-0 rounded-lg border p-4">
            <TeamList
              onSelectTeam={setSelectedTeamId}
              selectedTeamId={selectedTeamId}
            />
          </div>

          {/* 右メイン: チーム詳細 */}
          <div className="flex-1">
            {selectedTeam ? (
              <div className="space-y-6">
                {/* チーム情報 */}
                <div className="rounded-lg border p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-2xl font-bold">{selectedTeam.name}</h1>
                      {selectedTeam.description && (
                        <p className="mt-1 text-muted-foreground">{selectedTeam.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {canManageMembers && (
                        <InviteMemberDialog teamId={selectedTeam.id} />
                      )}
                      {isOwner && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={handleDeleteTeam}
                        >
                          <Trash2 className="mr-1.5 h-4 w-4" />
                          削除
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* メンバー一覧 */}
                <div className="rounded-lg border p-6">
                  <TeamMembersSection
                    teamId={selectedTeam.id}
                    currentUserRole={selectedTeam.role}
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg border">
                <div className="text-center">
                  <Settings className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2 text-muted-foreground">
                    {selectedTeamId === null
                      ? "個人モードで作業中です"
                      : "チームを選択してください"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
