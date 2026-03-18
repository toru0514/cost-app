"use client"

import { useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { formatTime } from "./stopwatch"
import type { ProcessTemplate } from "@/lib/types/process"

export type LapConversion = {
  lapId: string
  lapLabel: string
  duration: number
  processName: string
  hourlyRate: number
}

type LapConversionPanelProps = {
  lapConversions: LapConversion[]
  onUpdate: (lapId: string, field: keyof LapConversion, value: string | number) => void
  onProcessNameChange: (lapId: string, name: string) => void
  processTemplates: ProcessTemplate[]
  note: string
  onNoteChange: (note: string) => void
  saveAsTemplate: boolean
  onSaveAsTemplateChange: (checked: boolean) => void
  onSave: () => void
  onSkip: () => void
  onDiscard: () => void
}

export function LapConversionPanel({
  lapConversions,
  onUpdate,
  onProcessNameChange,
  processTemplates,
  note,
  onNoteChange,
  saveAsTemplate,
  onSaveAsTemplateChange,
  onSave,
  onSkip,
  onDiscard,
}: LapConversionPanelProps) {
  const templateNames = useMemo(
    () => processTemplates.map((t) => t.name),
    [processTemplates]
  )

  const totalDuration = useMemo(
    () => lapConversions.reduce((sum, c) => sum + c.duration, 0),
    [lapConversions]
  )

  const filledCount = useMemo(
    () => lapConversions.filter((c) => c.processName.trim()).length,
    [lapConversions]
  )

  const handleNameChange = useCallback(
    (lapId: string, name: string) => {
      onProcessNameChange(lapId, name)
    },
    [onProcessNameChange]
  )

  return (
    <div className="space-y-5">
      {/* Header summary */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {lapConversions.length}件のラップ · 合計{" "}
          <span className="font-mono tabular-nums">
            {formatTime(totalDuration)}
          </span>
        </span>
        <span className="text-muted-foreground">
          {filledCount}/{lapConversions.length} 工程設定済み
        </span>
      </div>

      {/* Compact lap list */}
      <div className="divide-y rounded-lg border">
        {lapConversions.map((conv) => (
          <div
            key={conv.lapId}
            className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3"
          >
            {/* Lap label + duration */}
            <div className="flex shrink-0 items-center gap-2 sm:w-44">
              <span className="text-xs font-medium text-muted-foreground">
                {conv.lapLabel}
              </span>
              <span className="font-mono text-xs tabular-nums">
                {formatTime(conv.duration)}
              </span>
            </div>

            {/* Process name input with datalist */}
            <div className="flex flex-1 items-center gap-2">
              <span className="text-muted-foreground sm:hidden">→</span>
              <Input
                placeholder="工程名（テンプレートから選択可）"
                value={conv.processName}
                onChange={(e) =>
                  handleNameChange(conv.lapId, e.target.value)
                }
                list={`tpl-${conv.lapId}`}
                className="h-8 text-sm"
              />
              <datalist id={`tpl-${conv.lapId}`}>
                {templateNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>

              {/* Hourly rate - compact */}
              <div className="relative shrink-0">
                <Input
                  type="number"
                  placeholder="時給"
                  value={conv.hourlyRate || ""}
                  onChange={(e) =>
                    onUpdate(
                      conv.lapId,
                      "hourlyRate",
                      Math.max(0, Number(e.target.value) || 0)
                    )
                  }
                  className="h-8 w-24 pr-7 text-sm"
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  /h
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Options */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="saveAsTemplate"
          checked={saveAsTemplate}
          onCheckedChange={(checked) =>
            onSaveAsTemplateChange(checked === true)
          }
        />
        <Label htmlFor="saveAsTemplate" className="text-sm">
          この工程セットをテンプレートとして保存
        </Label>
      </div>

      {/* Note */}
      <div className="space-y-1.5">
        <Label htmlFor="noteConversion" className="text-xs">
          メモ（任意）
        </Label>
        <Textarea
          id="noteConversion"
          placeholder="メモを入力..."
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={1}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={onSave} disabled={filledCount === 0}>
          工程として登録
          {filledCount > 0 && (
            <span className="ml-1 text-xs opacity-75">
              ({filledCount}件)
            </span>
          )}
        </Button>
        <Button variant="outline" onClick={onSkip}>
          そのまま保存
        </Button>
        <Button variant="ghost" onClick={onDiscard}>
          破棄
        </Button>
      </div>
    </div>
  )
}
