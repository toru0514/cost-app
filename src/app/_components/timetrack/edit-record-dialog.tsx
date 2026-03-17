"use client"

import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { TimeRecord, TimeRecordLap } from "@/lib/types"
import { formatTime } from "./stopwatch"

type EditRecordDialogProps = {
  record: TimeRecord
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (updated: TimeRecord) => void
}

function parseDuration(value: string): number | null {
  // HH:MM:SS or MM:SS or SS
  const parts = value.split(":").map((p) => Number(p.trim()))
  if (parts.some((p) => Number.isNaN(p) || p < 0)) return null
  if (parts.length === 3) {
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000
  }
  if (parts.length === 2) {
    return (parts[0] * 60 + parts[1]) * 1000
  }
  if (parts.length === 1) {
    return parts[0] * 1000
  }
  return null
}

function durationToInput(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function EditRecordDialog({ record, open, onOpenChange, onSave }: EditRecordDialogProps) {
  const [taskName, setTaskName] = useState(record.taskName)
  const [note, setNote] = useState(record.note ?? "")
  const [lapInputs, setLapInputs] = useState<{ id: string; label: string; value: string }[]>(
    record.laps.map((lap) => ({
      id: lap.id,
      label: lap.label,
      value: durationToInput(lap.duration),
    }))
  )

  const handleLapChange = useCallback((index: number, value: string) => {
    setLapInputs((prev) => prev.map((lap, i) => (i === index ? { ...lap, value } : lap)))
  }, [])

  const handleLapLabelChange = useCallback((index: number, label: string) => {
    setLapInputs((prev) => prev.map((lap, i) => (i === index ? { ...lap, label } : lap)))
  }, [])

  const handleSave = useCallback(() => {
    const newLaps: TimeRecordLap[] = lapInputs.map((input) => {
      const duration = parseDuration(input.value)
      return {
        id: input.id,
        label: input.label,
        duration: duration ?? 0,
      }
    })
    const totalDuration = newLaps.reduce((sum, lap) => sum + lap.duration, 0)
    onSave({
      ...record,
      taskName: taskName.trim() || record.taskName,
      note: note.trim() || undefined,
      laps: newLaps,
      totalDuration,
      updatedAt: new Date().toISOString(),
    })
  }, [lapInputs, note, onSave, record, taskName])

  const totalMs = lapInputs.reduce((sum, input) => {
    const d = parseDuration(input.value)
    return sum + (d ?? 0)
  }, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>記録を編集</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>作業名</Label>
            <Input value={taskName} onChange={(e) => setTaskName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>メモ</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>

          <div className="space-y-2">
            <Label>ラップ時間（HH:MM:SS）</Label>
            <div className="space-y-2 rounded-md border p-3">
              {lapInputs.map((lap, i) => (
                <div key={lap.id} className="flex items-center gap-2">
                  <Input
                    value={lap.label}
                    onChange={(e) => handleLapLabelChange(i, e.target.value)}
                    className="w-28 text-sm"
                  />
                  <Input
                    value={lap.value}
                    onChange={(e) => handleLapChange(i, e.target.value)}
                    placeholder="00:00:00"
                    className="w-28 font-mono text-sm"
                  />
                  <span className="text-xs text-muted-foreground">
                    {parseDuration(lap.value) !== null
                      ? formatTime(parseDuration(lap.value)!)
                      : "無効な形式"}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-right text-sm text-muted-foreground">
              合計: <span className="font-mono tabular-nums">{formatTime(totalMs)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
