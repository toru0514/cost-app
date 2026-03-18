"use client"

import { useCallback, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAppData } from "@/lib/app-data"
import type { AppData } from "@/lib/types"
import type { ProductProcess } from "@/lib/types/process"
import { Stopwatch, type LapData, formatTime } from "../_components/timetrack/stopwatch"
import { RecordHistory } from "../_components/timetrack/record-history"
import { ArrowLeft, Timer, Clock, Zap } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

type TimeTrackPageProps = {
  initialData: AppData | null
}

type LapConversion = {
  lapId: string
  lapLabel: string
  duration: number
  processName: string
  hourlyRate: number
}

export function TimeTrackPage({ initialData }: TimeTrackPageProps) {
  const { data, actions } = useAppData(initialData)

  // Product & process selection
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [activeProcess, setActiveProcess] = useState<ProductProcess | null>(null)
  const [isFreeTiming, setIsFreeTiming] = useState(false)

  // Task name / note (for free timer or fallback)
  const [taskName, setTaskName] = useState("")
  const [note, setNote] = useState("")

  // Pending result from stopwatch
  const [pendingResult, setPendingResult] = useState<{
    totalDuration: number
    laps: LapData[]
  } | null>(null)

  // Flow B: lap-to-process conversion
  const [showLapConversion, setShowLapConversion] = useState(false)
  const [lapConversions, setLapConversions] = useState<LapConversion[]>([])
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)

  // Timer is active when we have an activeProcess or isFreeTiming, and no pendingResult yet
  const isTimerActive = (activeProcess !== null || isFreeTiming) && !pendingResult

  // Get processes for selected product, organized by parent/child
  const productProcesses = useMemo(() => {
    if (!selectedProductId) return []
    return data.productProcesses
      .filter((pp) => pp.productId === selectedProductId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [data.productProcesses, selectedProductId])

  const parentProcesses = useMemo(() => {
    return productProcesses.filter((pp) => !pp.parentId)
  }, [productProcesses])

  const childProcessesMap = useMemo(() => {
    const map = new Map<string, ProductProcess[]>()
    for (const pp of productProcesses) {
      if (pp.parentId) {
        const children = map.get(pp.parentId) ?? []
        children.push(pp)
        map.set(pp.parentId, children)
      }
    }
    return map
  }, [productProcesses])

  // Process template names for autocomplete
  const templateNames = useMemo(() => {
    return data.processTemplates.map((t) => t.name)
  }, [data.processTemplates])

  // Selected product name
  const selectedProduct = useMemo(() => {
    return data.products.find((p) => p.id === selectedProductId)
  }, [data.products, selectedProductId])

  // --- Handlers ---

  const handleStartWithProcess = useCallback((process: ProductProcess) => {
    setActiveProcess(process)
    setIsFreeTiming(false)
    setShowLapConversion(false)
    setPendingResult(null)
    setTaskName(process.name)
  }, [])

  const handleStartFreeTimer = useCallback(() => {
    setActiveProcess(null)
    setIsFreeTiming(true)
    setShowLapConversion(false)
    setPendingResult(null)
  }, [])

  const handleStopwatchComplete = useCallback(
    (totalDuration: number, laps: LapData[]) => {
      setPendingResult({ totalDuration, laps })

      // If free timer with laps, show lap conversion UI (Flow B)
      if (!activeProcess && isFreeTiming && laps.length > 0) {
        setLapConversions(
          laps.map((lap) => ({
            lapId: lap.id,
            lapLabel: lap.label,
            duration: lap.duration,
            processName: "",
            hourlyRate: 0,
          }))
        )
        setShowLapConversion(true)
      }
    },
    [activeProcess, isFreeTiming]
  )

  const handleSave = useCallback(() => {
    if (!pendingResult) return

    if (activeProcess) {
      // Flow A: save with productId and productProcessId
      const name = activeProcess.name
      const now = new Date().toISOString()
      actions.addTimeRecord({
        taskName: name,
        totalDuration: pendingResult.totalDuration,
        laps: pendingResult.laps,
        note: note.trim() || undefined,
        productId: selectedProductId || undefined,
        productProcessId: activeProcess.id,
        createdAt: now,
        updatedAt: now,
      })
      toast.success("記録を保存しました", {
        description: `「${name}」を保存しました。`,
      })
    } else {
      // Free timer without conversion: save as before (taskName only)
      const name = taskName.trim() || "無名の作業"
      const now = new Date().toISOString()
      actions.addTimeRecord({
        taskName: name,
        totalDuration: pendingResult.totalDuration,
        laps: pendingResult.laps,
        note: note.trim() || undefined,
        productId: selectedProductId || undefined,
        createdAt: now,
        updatedAt: now,
      })
      toast.success("記録を保存しました", {
        description: `「${name}」を保存しました。`,
      })
    }

    setPendingResult(null)
    setActiveProcess(null)
    setIsFreeTiming(false)
    setShowLapConversion(false)
    setTaskName("")
    setNote("")
  }, [actions, activeProcess, note, pendingResult, selectedProductId, taskName])

  const handleSaveWithConversion = useCallback(() => {
    if (!pendingResult) return

    const now = new Date().toISOString()

    // Create ProductProcess entries for each lap conversion (if product selected)
    const processIdMap = new Map<string, string>()

    for (const conv of lapConversions) {
      if (!conv.processName.trim()) continue

      if (selectedProductId) {
        // Create a ProductProcess for the product
        const processId = crypto.randomUUID()
        processIdMap.set(conv.lapId, processId)
        actions.addProductProcess({
          id: processId,
          productId: selectedProductId,
          name: conv.processName.trim(),
          hourlyRate: conv.hourlyRate,
          sortOrder: data.productProcesses.filter(
            (pp) => pp.productId === selectedProductId
          ).length,
        })
      }

      // Create a TimeRecord for each lap
      actions.addTimeRecord({
        taskName: conv.processName.trim(),
        totalDuration: conv.duration,
        laps: [
          {
            id: conv.lapId,
            label: conv.lapLabel,
            duration: conv.duration,
          },
        ],
        note: note.trim() || undefined,
        productId: selectedProductId || undefined,
        productProcessId: processIdMap.get(conv.lapId) || undefined,
        createdAt: now,
        updatedAt: now,
      })
    }

    // Optionally save as process templates
    if (saveAsTemplate) {
      const existingNames = new Set(data.processTemplates.map((t) => t.name))
      for (const conv of lapConversions) {
        const name = conv.processName.trim()
        if (name && !existingNames.has(name)) {
          actions.addProcessTemplate({
            name,
            defaultHourlyRate: conv.hourlyRate,
            sortOrder: data.processTemplates.length,
          })
          existingNames.add(name)
        }
      }
    }

    toast.success("工程として記録を保存しました", {
      description: `${lapConversions.filter((c) => c.processName.trim()).length}件の工程を登録しました。`,
    })

    setPendingResult(null)
    setActiveProcess(null)
    setIsFreeTiming(false)
    setShowLapConversion(false)
    setLapConversions([])
    setSaveAsTemplate(false)
    setTaskName("")
    setNote("")
  }, [
    actions,
    data.processTemplates,
    data.productProcesses,
    lapConversions,
    note,
    pendingResult,
    saveAsTemplate,
    selectedProductId,
  ])

  const handleSkipConversion = useCallback(() => {
    setShowLapConversion(false)
    // Fall through to normal save
  }, [])

  const handleDiscard = useCallback(() => {
    setPendingResult(null)
    setActiveProcess(null)
    setIsFreeTiming(false)
    setShowLapConversion(false)
    setLapConversions([])
    setTaskName("")
    setNote("")
  }, [])

  const updateLapConversion = useCallback(
    (lapId: string, field: keyof LapConversion, value: string | number) => {
      setLapConversions((prev) =>
        prev.map((c) => (c.lapId === lapId ? { ...c, [field]: value } : c))
      )
    },
    []
  )

  // Apply template rate when process name matches a template
  const handleProcessNameChange = useCallback(
    (lapId: string, name: string) => {
      const template = data.processTemplates.find(
        (t) => t.name === name
      )
      setLapConversions((prev) =>
        prev.map((c) =>
          c.lapId === lapId
            ? {
                ...c,
                processName: name,
                hourlyRate: template
                  ? template.defaultHourlyRate
                  : c.hourlyRate,
              }
            : c
        )
      )
    },
    [data.processTemplates]
  )

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
        {/* 商品選択 + 工程ボタン */}
        {!isTimerActive && !pendingResult && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">計測を開始</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 商品選択 */}
              <div className="space-y-2">
                <Label>商品を選択</Label>
                <Select
                  value={selectedProductId}
                  onValueChange={setSelectedProductId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="商品を選択してください（任意）" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 工程ボタン (Flow A) */}
              {selectedProductId && productProcesses.length > 0 && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    ワンタップで工程計測を開始
                  </Label>
                  <div className="space-y-4">
                    {parentProcesses.map((parent) => {
                      const children = childProcessesMap.get(parent.id) ?? []
                      return (
                        <div key={parent.id} className="space-y-2">
                          <Button
                            onClick={() => handleStartWithProcess(parent)}
                            variant="outline"
                            className="flex flex-col items-center gap-1 h-auto py-3 px-4"
                          >
                            <span className="font-medium">{parent.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ¥{parent.hourlyRate.toLocaleString()}/h
                            </span>
                          </Button>
                          {children.length > 0 && (
                            <div className="ml-6 flex flex-wrap gap-2">
                              {children.map((child) => (
                                <Button
                                  key={child.id}
                                  onClick={() =>
                                    handleStartWithProcess(child)
                                  }
                                  variant="outline"
                                  size="sm"
                                  className="flex flex-col items-center gap-0.5 h-auto py-2 px-3"
                                >
                                  <span className="text-sm">
                                    {child.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ¥{child.hourlyRate.toLocaleString()}/h
                                  </span>
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {selectedProductId && productProcesses.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  この商品にはまだ工程が登録されていません。フリータイマーで計測し、後から工程を割り当てることができます。
                </p>
              )}

              {/* フリータイマー (Flow B) */}
              <div className="border-t pt-4">
                <Button
                  variant="secondary"
                  onClick={handleStartFreeTimer}
                  className="gap-2"
                >
                  <Clock className="h-4 w-4" />
                  フリータイマー（工程なし）
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* アクティブタイマー表示 */}
        {isTimerActive && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {activeProcess
                  ? `${activeProcess.name}${selectedProduct ? ` - ${selectedProduct.name}` : ""}`
                  : "フリータイマー"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Active process info */}
              {activeProcess && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <span className="text-muted-foreground">工程: </span>
                  <span className="font-medium">{activeProcess.name}</span>
                  <span className="ml-3 text-muted-foreground">
                    ¥{activeProcess.hourlyRate.toLocaleString()}/h
                  </span>
                </div>
              )}

              {/* Free timer: show task name input */}
              {isFreeTiming && (
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
              )}

              {/* Note for process timer */}
              {activeProcess && (
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
              )}

              <Stopwatch onComplete={handleStopwatchComplete} />
            </CardContent>
          </Card>
        )}

        {/* 保存確認 (Flow A or free timer without conversion) */}
        {pendingResult && !showLapConversion && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">計測完了</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">合計時間: </span>
                  <span className="font-mono font-medium">
                    {formatTime(pendingResult.totalDuration)}
                  </span>
                </p>
                {activeProcess && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">工程: </span>
                    <span className="font-medium">{activeProcess.name}</span>
                  </p>
                )}
                {selectedProduct && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">商品: </span>
                    <span className="font-medium">{selectedProduct.name}</span>
                  </p>
                )}
                <p className="text-sm">
                  <span className="text-muted-foreground">ラップ数: </span>
                  <span>{pendingResult.laps.length}</span>
                </p>
              </div>

              {/* Free timer: allow editing task name before save */}
              {isFreeTiming && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="taskNameSave">作業名</Label>
                    <Input
                      id="taskNameSave"
                      placeholder="例: 梱包作業"
                      value={taskName}
                      onChange={(e) => setTaskName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="noteSave">メモ（任意）</Label>
                    <Textarea
                      id="noteSave"
                      placeholder="メモを入力..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={1}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button onClick={handleSave}>保存</Button>
                <Button variant="outline" onClick={handleDiscard}>
                  破棄
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Flow B: Lap-to-Process Conversion UI */}
        {pendingResult && showLapConversion && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                ラップを工程に変換
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">
                各ラップに工程名と時給を設定して、個別の工程記録として保存できます。
              </p>

              <div className="space-y-4">
                {lapConversions.map((conv) => (
                  <div
                    key={conv.lapId}
                    className="rounded-lg border p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {conv.lapLabel}
                      </span>
                      <span className="font-mono text-sm tabular-nums text-muted-foreground">
                        {formatTime(conv.duration)}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">工程名</Label>
                        <Input
                          placeholder="例: 裁断"
                          value={conv.processName}
                          onChange={(e) =>
                            handleProcessNameChange(
                              conv.lapId,
                              e.target.value
                            )
                          }
                          list={`templates-${conv.lapId}`}
                        />
                        <datalist id={`templates-${conv.lapId}`}>
                          {templateNames.map((name) => (
                            <option key={name} value={name} />
                          ))}
                        </datalist>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">時給 (¥/h)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={conv.hourlyRate || ""}
                          onChange={(e) =>
                            updateLapConversion(
                              conv.lapId,
                              "hourlyRate",
                              Number(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Save as template checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="saveAsTemplate"
                  checked={saveAsTemplate}
                  onCheckedChange={(checked) =>
                    setSaveAsTemplate(checked === true)
                  }
                />
                <Label htmlFor="saveAsTemplate" className="text-sm">
                  この工程セットをテンプレートとして保存
                </Label>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label htmlFor="noteConversion">メモ（任意）</Label>
                <Textarea
                  id="noteConversion"
                  placeholder="メモを入力..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={1}
                />
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Button onClick={handleSaveWithConversion}>
                  工程として登録
                </Button>
                <Button variant="outline" onClick={handleSkipConversion}>
                  スキップ（工程なしで保存）
                </Button>
                <Button variant="ghost" onClick={handleDiscard}>
                  破棄
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
              products={data.products}
              productProcesses={data.productProcesses}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
