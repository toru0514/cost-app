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
import { ArrowLeft, Timer } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

type TimeTrackPageProps = {
  initialData: AppData | null
}

export function TimeTrackPage({ initialData }: TimeTrackPageProps) {
  const { data, actions } = useAppData(initialData)
  const [taskName, setTaskName] = useState("")
  const [note, setNote] = useState("")
  const [pendingResult, setPendingResult] = useState<{
    totalDuration: number
    laps: LapData[]
  } | null>(null)

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
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4 md:px-6">
          <Link href="/cost">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-sm font-semibold md:text-base">時間計測</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 p-4 md:p-6">
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
  )
}
