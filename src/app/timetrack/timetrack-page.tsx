"use client"

import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAppData } from "@/lib/app-data"
import type { AppData } from "@/lib/types"
import { Stopwatch, type LapData } from "../_components/timetrack/stopwatch"
import { RecordHistory } from "../_components/timetrack/record-history"
import { Sidebar } from "../_components/shared/sidebar"
import { useBackup } from "../_components/shared/use-backup"
import { LoginPanel } from "../_components/shared/login-panel"
import { BarChart3, Box, Boxes, ClipboardList, FileText, LayoutDashboard, Menu, Package, Timer } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"

const tabOptions = [
  { value: "cost", label: "原価サマリ", icon: LayoutDashboard },
  { value: "analytics", label: "集計データ", icon: BarChart3 },
  { value: "product", label: "商品登録", icon: Package },
  { value: "master", label: "マスタ登録", icon: Boxes },
  { value: "list", label: "商品/在庫一覧", icon: ClipboardList },
  { value: "bulk", label: "一括処理", icon: Box },
  { value: "audit", label: "監査ログ", icon: FileText },
] as const

const tabPathMap: Record<string, string> = {
  cost: "/cost",
  analytics: "/analytics",
  product: "/product",
  master: "/master",
  list: "/list",
  bulk: "/bulk",
  audit: "/audit",
}

type TimeTrackPageProps = {
  initialData: AppData | null
}

export function TimeTrackPage({ initialData }: TimeTrackPageProps) {
  const { data, actions } = useAppData(initialData)
  const { state: authState, logout } = useAuth()
  const router = useRouter()
  const isAuthenticated = authState.status === "authenticated"

  const [taskName, setTaskName] = useState("")
  const [note, setNote] = useState("")
  const [pendingResult, setPendingResult] = useState<{
    totalDuration: number
    laps: LapData[]
  } | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [loginPanelOpen, setLoginPanelOpen] = useState(false)

  const backup = useBackup({ data, isAuthenticated, importGuestData: actions.importGuestData })

  const handleTabChange = useCallback((value: string) => {
    const path = tabPathMap[value]
    if (path) {
      router.push(path)
    }
  }, [router])

  const handleResetLocalStorage = useCallback(() => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("ローカル保存を完全にクリアします。よろしいですか？")
      if (!confirmed) return
    }
    actions.resetAll()
  }, [actions])

  const handleLogout = useCallback(() => {
    logout()
    toast.message("ゲストモードに戻りました")
  }, [logout])

  const handleStopwatchComplete = useCallback(
    (totalDuration: number, laps: LapData[]) => {
      setPendingResult({ totalDuration, laps })
    },
    []
  )

  const handleSave = useCallback(() => {
    if (!pendingResult) return
    const name = taskName.trim() || "無名の作業"
    const now = new Date().toISOString()
    actions.addTimeRecord({
      taskName: name,
      totalDuration: pendingResult.totalDuration,
      laps: pendingResult.laps,
      note: note.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    })
    toast.success("記録を保存しました", { description: `「${name}」を保存しました。` })
    setPendingResult(null)
    setTaskName("")
    setNote("")
  }, [actions, note, pendingResult, taskName])

  const handleDiscard = useCallback(() => {
    setPendingResult(null)
  }, [])

  return (
    <div className="bg-background">
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          activeTab=""
          onTabChange={handleTabChange}
          isAuthenticated={isAuthenticated}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
          mobileNavOpen={mobileNavOpen}
          onMobileNavOpenChange={setMobileNavOpen}
          onSeedSample={actions.seedSample}
          onExportBackup={backup.handleExportBackupJson}
          onOpenBackupImport={backup.handleOpenBackupImport}
          onResetLocalStorage={handleResetLocalStorage}
          onLoginOpen={() => setLoginPanelOpen(true)}
          onLogout={handleLogout}
          tabOptions={tabOptions}
        />

        <input
          ref={backup.backupImportInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={backup.handleImportBackupJson}
        />

        <div className="flex flex-1 flex-col overflow-y-auto min-w-0">
          {/* ヘッダー */}
          <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
            <div className="flex h-14 items-center gap-2 px-3 md:px-6">
              <Button type="button" variant="ghost" size="icon" className="md:hidden h-10 w-10" onClick={() => setMobileNavOpen(true)}>
                <Menu className="h-7 w-7" />
              </Button>
              <div className="flex items-center gap-1.5">
                <span className="hidden text-xs text-muted-foreground sm:inline">Cost App</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">/</span>
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold md:text-sm">時間計測</span>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-3xl space-y-8 p-4 md:p-6">
            {/* タスク名入力 + ストップウォッチ */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ストップウォッチ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="taskName">作業名</Label>
                    <Input
                      id="taskName"
                      placeholder="例: 梱包作業"
                      value={taskName}
                      onChange={(e) => setTaskName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="note">メモ（任意）</Label>
                    <Textarea
                      id="note"
                      placeholder="メモを入力..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={1}
                    />
                  </div>
                </div>

                <Stopwatch onComplete={handleStopwatchComplete} />

                {/* 保存確認 */}
                {pendingResult && (
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <p className="mb-3 text-sm font-medium">
                      計測完了 — この記録を保存しますか？
                    </p>
                    <div className="flex items-center gap-3">
                      <Button onClick={handleSave}>保存</Button>
                      <Button variant="outline" onClick={handleDiscard}>
                        破棄
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 記録履歴 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">記録履歴</CardTitle>
              </CardHeader>
              <CardContent>
                <RecordHistory
                  records={data.timeRecords}
                  onUpdate={actions.updateTimeRecord}
                  onRemove={actions.removeTimeRecord}
                />
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      {/* ログインパネル */}
      {loginPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <LoginPanel onClose={() => setLoginPanelOpen(false)} />
        </div>
      )}
    </div>
  )
}
