"use client"

import { useCallback, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAppData } from "@/lib/app-data"
import { tabOptions, tabPathMap } from "@/lib/constants"
import type { AppData } from "@/lib/types"
import type { ProductProcess } from "@/lib/types/process"
import { Stopwatch, type LapData, formatTime } from "../_components/timetrack/stopwatch"
import { RecordHistory } from "../_components/timetrack/record-history"
import { ProcessGrid } from "../_components/timetrack/process-grid"
import {
  LapConversionPanel,
  type LapConversion,
} from "../_components/timetrack/lap-conversion"
import { Sidebar } from "../_components/shared/sidebar"
import { useBackup } from "../_components/shared/use-backup"
import { LogIn, Menu, Timer, Clock, Zap, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { createTempId } from "@/lib/utils"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"

type TimeTrackPageProps = {
  initialData: AppData | null
}

export function TimeTrackPage({ initialData }: TimeTrackPageProps) {
  const { data, actions } = useAppData(initialData)
  const { state: authState, logout } = useAuth()
  const router = useRouter()
  const isAuthenticated = authState.status === "authenticated"

  // Product & process selection
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [activeProcess, setActiveProcess] = useState<ProductProcess | null>(null)
  const [isFreeTiming, setIsFreeTiming] = useState(false)

  // Task name / note (for free timer or fallback)
  const [taskName, setTaskName] = useState("")
  const [note, setNote] = useState("")
  const [showNoteInput, setShowNoteInput] = useState(false)

  // Pending result from stopwatch
  const [pendingResult, setPendingResult] = useState<{
    totalDuration: number
    laps: LapData[]
  } | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const backup = useBackup({ data, isAuthenticated, importGuestData: actions.importGuestData })

  // Fix #1: モバイルナビを閉じる処理を追加
  const handleTabChange = useCallback((value: string) => {
    const path = tabPathMap[value as keyof typeof tabPathMap]
    if (path) {
      setMobileNavOpen(false)
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

  // Flow B: lap-to-process conversion
  const [showLapConversion, setShowLapConversion] = useState(false)
  const [lapConversions, setLapConversions] = useState<LapConversion[]>([])
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)

  // Timer is active when we have an activeProcess or isFreeTiming, and no pendingResult yet
  const isTimerActive = (activeProcess !== null || isFreeTiming) && !pendingResult

  // Get processes for selected product
  const productProcesses = useMemo(() => {
    if (!selectedProductId) return []
    return data.productProcesses
      .filter((pp) => pp.productId === selectedProductId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [data.productProcesses, selectedProductId])

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
    setShowNoteInput(false)
  }, [])

  const handleStartFreeTimer = useCallback(() => {
    setActiveProcess(null)
    setIsFreeTiming(true)
    setShowLapConversion(false)
    setPendingResult(null)
    setShowNoteInput(false)
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

  const resetTimerState = useCallback(() => {
    setPendingResult(null)
    setActiveProcess(null)
    setIsFreeTiming(false)
    setShowLapConversion(false)
    setLapConversions([])
    setSaveAsTemplate(false)
    setTaskName("")
    setNote("")
  }, [])

  const handleSave = useCallback(() => {
    if (!pendingResult) return

    try {
      const name = activeProcess ? activeProcess.name : (taskName.trim() || "無名の作業")
      const now = new Date().toISOString()
      actions.addTimeRecord({
        taskName: name,
        totalDuration: pendingResult.totalDuration,
        laps: pendingResult.laps,
        note: note.trim() || undefined,
        productId: selectedProductId || undefined,
        productProcessId: activeProcess?.id,
        createdAt: now,
        updatedAt: now,
      })
      toast.success("記録を保存しました", {
        description: `「${name}」を保存しました。`,
      })
      resetTimerState()
    } catch (error) {
      console.error("Failed to save time record", error)
      toast.error("保存に失敗しました")
    }
  }, [actions, activeProcess, note, pendingResult, resetTimerState, selectedProductId, taskName])

  const handleSaveWithConversion = useCallback(() => {
    if (!pendingResult) return

    try {
      const now = new Date().toISOString()

      // Create ProductProcess entries for each lap conversion (if product selected)
      const processIdMap = new Map<string, string>()
      const baseSortOrder = selectedProductId
        ? data.productProcesses.filter((pp) => pp.productId === selectedProductId).length
        : 0
      let sortOffset = 0

      for (const conv of lapConversions) {
        if (!conv.processName.trim()) continue

        if (selectedProductId) {
          const processId = createTempId()
          processIdMap.set(conv.lapId, processId)
          actions.addProductProcess({
            id: processId,
            productId: selectedProductId,
            name: conv.processName.trim(),
            hourlyRate: conv.hourlyRate,
            sortOrder: baseSortOrder + sortOffset,
          })
          sortOffset++
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
      resetTimerState()
    } catch (error) {
      console.error("Failed to save with conversion", error)
      toast.error("保存に失敗しました")
    }
  }, [
    actions,
    data.processTemplates,
    data.productProcesses,
    lapConversions,
    note,
    pendingResult,
    resetTimerState,
    saveAsTemplate,
    selectedProductId,
  ])

  const handleSkipConversion = useCallback(() => {
    setShowLapConversion(false)
    // Fall through to normal save
  }, [])

  const handleDiscard = useCallback(() => {
    resetTimerState()
  }, [resetTimerState])

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
            <div className="flex h-14 items-center justify-between gap-2 px-3 md:px-6">
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="icon" className="md:hidden h-10 w-10" onClick={() => setMobileNavOpen(true)}>
                  <Menu className="h-7 w-7" />
                </Button>
                <div className="flex items-center gap-1.5">
                  <span className="hidden text-xs text-muted-foreground sm:inline">Cost App</span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">/</span>
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-semibold md:text-sm">時間計測</span>
                </div>
                {isTimerActive && (
                  <Badge
                    variant="destructive"
                    className="animate-pulse gap-1.5"
                  >
                    <span className="inline-block h-2 w-2 rounded-full bg-white" />
                    計測中
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isAuthenticated ? (
                  <Button type="button" size="sm" onClick={() => router.push("/login")}>
                    <LogIn className="mr-1.5 h-4 w-4" />
                    ログイン
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">ログイン中<span className="hidden sm:inline">: {authState.user.email}</span></span>
                )}
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6">

            {/* ===== 開始画面 (タブ型) ===== */}
            {!isTimerActive && !pendingResult && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">計測を開始</CardTitle>
                  {/* 商品選択 */}
                  <div className="pt-2">
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
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="process" className="w-full">
                    <TabsList className="w-full">
                      <TabsTrigger value="process" className="gap-1.5">
                        <Zap className="h-3.5 w-3.5" />
                        工程タイマー
                      </TabsTrigger>
                      <TabsTrigger value="free" className="gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        フリータイマー
                      </TabsTrigger>
                    </TabsList>

                    {/* 工程タイマータブ */}
                    <TabsContent value="process" className="mt-4">
                      {selectedProductId && productProcesses.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs text-muted-foreground">
                            工程をタップすると計測を開始します
                          </p>
                          <ProcessGrid
                            productProcesses={productProcesses}
                            onStart={handleStartWithProcess}
                          />
                        </div>
                      )}

                      {selectedProductId && productProcesses.length === 0 && (
                        <div className="rounded-lg border border-dashed p-6 text-center">
                          <p className="text-sm text-muted-foreground">
                            この商品にはまだ工程が登録されていません。
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            商品登録画面で工程を追加するか、フリータイマーで計測してください。
                          </p>
                        </div>
                      )}

                      {!selectedProductId && (
                        <div className="rounded-lg border border-dashed p-6 text-center">
                          <p className="text-sm text-muted-foreground">
                            商品を選択すると、登録済みの工程が表示されます。
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    {/* フリータイマータブ */}
                    <TabsContent value="free" className="mt-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="freeTaskName">作業名</Label>
                          <Input
                            id="freeTaskName"
                            placeholder="例: 梱包作業"
                            value={taskName}
                            onChange={(e) => setTaskName(e.target.value)}
                          />
                        </div>
                        <Button
                          onClick={handleStartFreeTimer}
                          size="lg"
                          className="w-full gap-2"
                        >
                          <Clock className="h-5 w-5" />
                          フリータイマーを開始
                        </Button>
                        <p className="text-center text-xs text-muted-foreground">
                          ラップを記録して、後から工程に割り当てることができます
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* ===== アクティブタイマー表示 ===== */}
            {isTimerActive && (
              <Card className="border-primary/30">
                <CardContent className="space-y-6 pt-6">
                  {/* Status + context info */}
                  <div className="text-center">
                    {activeProcess ? (
                      <>
                        <h2 className="text-2xl font-bold">
                          {activeProcess.name}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedProduct && (
                            <span>{selectedProduct.name} · </span>
                          )}
                          ¥{activeProcess.hourlyRate.toLocaleString()}/h
                        </p>
                      </>
                    ) : (
                      <>
                        <h2 className="text-2xl font-bold">
                          {taskName || "フリータイマー"}
                        </h2>
                        {selectedProduct && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {selectedProduct.name}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Stopwatch */}
                  <Stopwatch onComplete={handleStopwatchComplete} />

                  {/* Collapsible note input */}
                  <div className="mx-auto w-full max-w-md">
                    <button
                      type="button"
                      onClick={() => setShowNoteInput(!showNoteInput)}
                      className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {showNoteInput ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      メモを{showNoteInput ? "閉じる" : "追加"}
                    </button>
                    {showNoteInput && (
                      <div className="mt-2">
                        <Textarea
                          placeholder="メモを入力..."
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ===== 保存確認 (Flow A or free timer without conversion) ===== */}
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

            {/* ===== Flow B: ラップ→工程変換 ===== */}
            {pendingResult && showLapConversion && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    ラップを工程に変換
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <LapConversionPanel
                    lapConversions={lapConversions}
                    onUpdate={updateLapConversion}
                    onProcessNameChange={handleProcessNameChange}
                    processTemplates={data.processTemplates}
                    note={note}
                    onNoteChange={setNote}
                    saveAsTemplate={saveAsTemplate}
                    onSaveAsTemplateChange={setSaveAsTemplate}
                    onSave={handleSaveWithConversion}
                    onSkip={handleSkipConversion}
                    onDiscard={handleDiscard}
                  />
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
      </div>

      {/* バックアップ復元の確認ダイアログ */}
      <Dialog
        open={backup.pendingBackupRestore !== null}
        onOpenChange={(open) => { if (!open) backup.closeBackupRestoreDialog() }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>バックアップを復元</DialogTitle>
            <DialogDescription>
              「{backup.pendingBackupRestore?.fileName}」からデータを復元します。現在のデータは上書きされます。よろしいですか？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={backup.closeBackupRestoreDialog}>キャンセル</Button>
            <Button onClick={backup.confirmBackupRestore}>復元する</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
