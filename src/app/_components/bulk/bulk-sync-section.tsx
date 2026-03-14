"use client"

import { useMemo, useState } from "react"
import { ExternalLink, History } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination } from "@/components/ui/table-pagination"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { Textarea } from "@/components/ui/textarea"
import { parsePayloadJson } from "@/lib/bulk-sync/ui-utils"
import { retry } from "@/lib/bulk-sync/retry"
import { supabaseClient } from "@/lib/supabase-client"

const MAX_ERRORS = 200
const MAX_ISSUES = 200
const RETRY_LIMIT = 2
const RETRY_DELAY_MS = 1200

type DiffItem = {
  entity: string
  operation: "create" | "update" | "delete"
  key: { id?: string; naturalKey: string }
  issues: { message: string }[]
}

type DiffResponse = {
  summary: { total: number; create: number; update: number; delete: number }
  items: DiffItem[]
}

type ApplyResponse = {
  jobId: string
  status: string
  summary: { total: number; create: number; update: number; delete: number; success: number; failed: number }
  errors: { entity: string; rowIndex?: number; message: string; code: string }[]
}

type HistoryLog = {
  id: string
  createdAt: string
  action: string
  summary: {
    total: number
    success: number
    failed: number
    create: number
    update: number
    delete: number
  } | null
  hasPreviousData: boolean
}

type DiffDetailItem = {
  entity: string
  operation: "create" | "update" | "delete"
  key: string
  changes?: { field: string; before: unknown; after: unknown }[]
}

type HistoryDetail = {
  id: string
  createdAt: string
  action: string
  summary: HistoryLog["summary"]
  diffItems: DiffDetailItem[]
}

type BulkSyncSectionProps = {
  title: string
  description: string
  placeholder: string
  target: "master" | "products"
}
const filterDiffByTarget = (diff: DiffResponse, target: "master" | "products") => {
  const items =
    target === "products"
      ? diff.items.filter((item) => item.entity === "products")
      : diff.items.filter((item) => item.entity !== "products")
  const summary = items.reduce(
    (acc, item) => {
      acc.total += 1
      acc[item.operation] += 1
      return acc
    },
    { total: 0, create: 0, update: 0, delete: 0 }
  )
  return { summary, items }
}

export function BulkSyncSection({ title, description, placeholder, target }: BulkSyncSectionProps) {
  const [payloadInput, setPayloadInput] = useState("")
  const [diffResult, setDiffResult] = useState<DiffResponse | null>(null)
  const [applyResult, setApplyResult] = useState<ApplyResponse | null>(null)
  const [rollbackResult, setRollbackResult] = useState<ApplyResponse | null>(null)
  const [busy, setBusy] = useState<"diff" | "apply" | "rollback" | "export" | "import" | "history" | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[] | null>(null)
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [exportMode, setExportMode] = useState<"overwrite" | "append">("overwrite")
  const [useManualJson, setUseManualJson] = useState(false)
  const [openingSheet, setOpeningSheet] = useState(false)
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false)
  const [importConfirmOpen, setImportConfirmOpen] = useState(false)
  const [historyDetail, setHistoryDetail] = useState<HistoryDetail | null>(null)
  const [loadingHistoryDetail, setLoadingHistoryDetail] = useState(false)

  const parsedPayload = useMemo(() => parsePayloadJson(payloadInput), [payloadInput])

  const historyPagination = useTablePagination(historyLogs ?? [])

  const resolveAccessToken = async () => {
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession()
      if (sessionData.session?.access_token) return sessionData.session.access_token
      const { data: refreshed } = await supabaseClient.auth.refreshSession()
      return refreshed.session?.access_token
    } catch {
      return undefined
    }
  }

  const buildAuthHeaders = async (includeJson: boolean) => {
    const accessToken = await resolveAccessToken()
    return {
      ...(includeJson ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }
  }

  const issueItems = useMemo(() => {
    if (!diffResult) return []
    return diffResult.items.filter((item) => item.issues.length > 0).slice(0, MAX_ISSUES)
  }, [diffResult])

  const handleDiff = async () => {
    setErrorMessage(null)
    setApplyResult(null)
    setRollbackResult(null)

    setBusy("diff")
    try {
      const trimmedInput = payloadInput.trim()
      const headers = await buildAuthHeaders(useManualJson && trimmedInput.length > 0)
      const requestInit: RequestInit =
        useManualJson && trimmedInput.length > 0
          ? {
              method: "POST",
              headers,
              credentials: "include",
              body: JSON.stringify({ payload: parsedPayload.payload, options: { includeDetails: true } }),
            }
          : { method: "POST", headers, credentials: "include" }

      if (useManualJson && trimmedInput.length > 0 && !parsedPayload.payload) {
        setErrorMessage(parsedPayload.error ?? "JSON を確認してください")
        setBusy(null)
        return
      }

      const response = await fetch("/api/bulk-sync/diff", requestInit)

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error ?? "差分取得に失敗しました")
      }

      const data = (await response.json()) as DiffResponse
      setDiffResult(filterDiffByTarget(data, target))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "差分取得に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const handleApply = async () => {
    setErrorMessage(null)

    if (useManualJson && !parsedPayload.payload) {
      setErrorMessage(parsedPayload.error ?? "JSON を確認してください")
      return
    }

    const busyState: "apply" | "import" = useManualJson ? "apply" : "import"
    setBusy(busyState)
    try {
      const response = await retry(
        async () => {
          if (useManualJson) {
            const headers = await buildAuthHeaders(true)
            const result = await fetch("/api/bulk-sync/apply", {
              method: "POST",
              headers,
              credentials: "include",
              body: JSON.stringify({ payload: parsedPayload.payload, options: { dryRun: false, recordAuditLog: true } }),
            })
            if (!result.ok) {
              const error = await result.json().catch(() => ({}))
              throw new Error(error.error ?? "反映に失敗しました")
            }
            return result
          }

          const headers = await buildAuthHeaders(true)
          const result = await fetch("/api/bulk-sync/import", {
            method: "POST",
            headers,
            credentials: "include",
            body: JSON.stringify({ target, options: { dryRun: false, recordAuditLog: true } }),
          })
          if (!result.ok) {
            const error = await result.json().catch(() => ({}))
            throw new Error(error.error ?? "読み込みに失敗しました")
          }
          return result
        },
        {
          retries: RETRY_LIMIT,
          delayMs: RETRY_DELAY_MS,
          onRetry: (attempt) => {
            toast.message(`一括反映に失敗しました。再試行します (${attempt}/${RETRY_LIMIT})`)
          },
        }
      )

      const data = (await response.json()) as ApplyResponse
      setApplyResult(data)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "反映に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const handleRollback = async (logId?: string) => {
    setErrorMessage(null)
    setRollbackResult(null)
    setBusy("rollback")

    try {
      const response = await retry(
        async () => {
          const headers = await buildAuthHeaders(true)
          const result = await fetch("/api/bulk-sync/rollback", {
            method: "POST",
            headers,
            credentials: "include",
            body: JSON.stringify(logId ? { logId } : {}),
          })
          if (!result.ok) {
            const error = await result.json().catch(() => ({}))
            throw new Error(error.error ?? "ロールバックに失敗しました")
          }
          return result
        },
        {
          retries: RETRY_LIMIT,
          delayMs: RETRY_DELAY_MS,
          onRetry: (attempt) => {
            toast.message(`ロールバックに失敗しました。再試行します (${attempt}/${RETRY_LIMIT})`)
          },
        }
      )
      const data = (await response.json()) as ApplyResponse
      setRollbackResult(data)
      setShowHistory(false)
      setSelectedLogId(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "ロールバックに失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const handleLoadHistory = async () => {
    setErrorMessage(null)
    setBusy("history")
    try {
      const headers = await buildAuthHeaders(false)
      const response = await fetch("/api/bulk-sync/history", {
        method: "GET",
        headers,
        credentials: "include",
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error ?? "履歴の取得に失敗しました")
      }
      const data = (await response.json()) as { history: HistoryLog[] }
      setHistoryLogs(data.history)
      setShowHistory(true)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "履歴の取得に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const handleLoadHistoryDetail = async (logId: string) => {
    setLoadingHistoryDetail(true)
    try {
      const headers = await buildAuthHeaders(false)
      const response = await fetch(`/api/bulk-sync/history?logId=${encodeURIComponent(logId)}`, {
        method: "GET",
        headers,
        credentials: "include",
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error ?? "詳細の取得に失敗しました")
      }
      const data = (await response.json()) as HistoryDetail
      setHistoryDetail(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "詳細の取得に失敗しました")
    } finally {
      setLoadingHistoryDetail(false)
    }
  }

  const handleExport = async () => {
    setErrorMessage(null)
    setBusy("export")
    try {
      const headers = await buildAuthHeaders(true)
      const response = await fetch("/api/bulk-sync/export", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ target, mode: exportMode }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error ?? "書き出しに失敗しました")
      }
      toast.success("スプレッドシートへ書き出しました。")
    } catch (error) {
      const message = error instanceof Error ? error.message : "書き出しに失敗しました"
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setBusy(null)
    }
  }

  const handleOpenSpreadsheet = async () => {
    setOpeningSheet(true)
    try {
      const headers = await buildAuthHeaders(false)
      const response = await fetch("/api/bulk-sync/spreadsheet", {
        method: "GET",
        headers,
        credentials: "include",
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error ?? "スプレッドシート情報の取得に失敗しました")
      }

      const data = (await response.json()) as { spreadsheetId?: string }
      if (!data.spreadsheetId) {
        throw new Error("スプレッドシートIDが未設定です")
      }

      const url = `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "スプレッドシートを開けませんでした")
    } finally {
      setOpeningSheet(false)
    }
  }

  const statusText =
    busy === "diff"
      ? "差分を確認中..."
      : busy === "export"
        ? "書き出し中..."
        : busy === "import"
          ? "読み込み中..."
          : busy === "apply"
            ? "反映中..."
            : busy === "rollback"
              ? "ロールバック中..."
              : busy === "history"
                ? "履歴を取得中..."
                : "準備完了"

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleOpenSpreadsheet} disabled={openingSheet}>
          <ExternalLink className="mr-1 h-4 w-4" />
          {openingSheet ? "シート確認中..." : "スプレッドシートを開く"}
        </Button>
      </div>
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>スプレッドシート連携</Label>
            <Badge variant={busy ? "default" : "secondary"}>{statusText}</Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border border-dashed p-3">
            <p className="text-sm font-medium">実行オプション</p>
            <label className="flex items-center gap-2 text-sm">
              <span className="w-20">書き出し</span>
              <select
                className="h-8 rounded border px-2 text-sm"
                value={exportMode}
                onChange={(event) => setExportMode(event.target.value as "overwrite" | "append")}
              >
                <option value="overwrite">上書き</option>
                <option value="append">追記</option>
              </select>
            </label>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={handleDiff} disabled={busy !== null}>
              差分を確認
            </Button>
            <Button onClick={() => setExportConfirmOpen(true)} disabled={busy !== null} variant="outline">
              シートへ書き出し
            </Button>
            <Button onClick={() => setImportConfirmOpen(true)} disabled={busy !== null} variant="default">
              シートから読み込み
            </Button>
            <Button onClick={() => handleRollback()} disabled={busy !== null} variant="outline">
              直前の反映をロールバック
            </Button>
            <Button onClick={handleLoadHistory} disabled={busy !== null} variant="outline">
              <History className="mr-1 h-4 w-4" />
              履歴から選択してロールバック
            </Button>
            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
          </div>
        </div>

        <Dialog open={exportConfirmOpen} onOpenChange={setExportConfirmOpen}>
          <DialogContent className="border-sky-200">
            <DialogHeader>
              <DialogTitle className="text-sky-700">シートへ書き出しを実行しますか？</DialogTitle>
              <DialogDescription>
                現在のアプリデータをスプレッドシートへ書き出します。書き出しモードは
                「{exportMode === "overwrite" ? "上書き" : "追記"}」です。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExportConfirmOpen(false)} disabled={busy !== null}>
                キャンセル
              </Button>
              <Button
                className="bg-sky-600 hover:bg-sky-700"
                onClick={async () => {
                  setExportConfirmOpen(false)
                  await handleExport()
                }}
                disabled={busy !== null}
              >
                書き出しを実行
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen}>
          <DialogContent className="border-amber-200">
            <DialogHeader>
              <DialogTitle className="text-amber-700">シートから読み込みを実行しますか？</DialogTitle>
              <DialogDescription>
                スプレッドシートの内容を読み込み、アプリデータへ反映します。既存データが更新される可能性があります。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportConfirmOpen(false)} disabled={busy !== null}>
                キャンセル
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700"
                onClick={async () => {
                  setImportConfirmOpen(false)
                  await handleApply()
                }}
                disabled={busy !== null}
              >
                読み込みを実行
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useManualJson}
              onChange={(event) => setUseManualJson(event.target.checked)}
            />
            JSON を手動で指定する（高度な操作）
          </label>
          {useManualJson && (
            <>
              <Textarea
                id="bulk-sync-payload"
                rows={10}
                placeholder={placeholder}
                value={payloadInput}
                onChange={(event) => setPayloadInput(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">JSON を指定した場合のみ /api/bulk-sync/apply を使用します。</p>
            </>
          )}
        </div>

        {showHistory && historyLogs !== null && (
          <div className="space-y-3 rounded-lg border border-dashed p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">一括反映履歴（最大50件）</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowHistory(false)
                  setSelectedLogId(null)
                }}
              >
                閉じる
              </Button>
            </div>
            {historyLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">履歴がありません。</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日時</TableHead>
                      <TableHead>操作</TableHead>
                      <TableHead>合計</TableHead>
                      <TableHead>復元可</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyPagination.pagedRows.map((log) => (
                      <TableRow
                        key={log.id}
                        className={selectedLogId === log.id ? "bg-muted" : undefined}
                        onClick={() => log.hasPreviousData && setSelectedLogId(log.id)}
                        style={{ cursor: log.hasPreviousData ? "pointer" : "default" }}
                      >
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("ja-JP")}
                        </TableCell>
                        <TableCell className="text-xs">
                          {log.action === "bulk_sync_apply" ? "手動反映" : "シート読込"}
                        </TableCell>
                        <TableCell className="text-xs">{log.summary?.total ?? "-"}</TableCell>
                        <TableCell className="text-xs">
                          {log.hasPreviousData ? (
                            <Badge variant="secondary">あり</Badge>
                          ) : (
                            <Badge variant="outline">なし</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={loadingHistoryDetail}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleLoadHistoryDetail(log.id)
                              }}
                            >
                              詳細
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!log.hasPreviousData || busy !== null}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRollback(log.id)
                              }}
                            >
                              復元
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination currentPage={historyPagination.currentPage} totalPages={historyPagination.totalPages} onPageChange={historyPagination.onPageChange} />
              </>
            )}

            {/* 履歴詳細表示 */}
            {historyDetail && (
              <div className="mt-4 space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    差分詳細 ({new Date(historyDetail.createdAt).toLocaleString("ja-JP")})
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setHistoryDetail(null)}
                  >
                    閉じる
                  </Button>
                </div>
                {historyDetail.summary && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300">
                      追加: {historyDetail.summary.create}
                    </Badge>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                      更新: {historyDetail.summary.update}
                    </Badge>
                    <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300">
                      削除: {historyDetail.summary.delete}
                    </Badge>
                  </div>
                )}
                {historyDetail.diffItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">差分の詳細情報がありません。</p>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">操作</TableHead>
                          <TableHead>対象</TableHead>
                          <TableHead>キー</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyDetail.diffItems.slice(0, 100).map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  item.operation === "create"
                                    ? "bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300"
                                    : item.operation === "update"
                                      ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                                      : "bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300"
                                }
                              >
                                {item.operation === "create" ? "追加" : item.operation === "update" ? "更新" : "削除"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{item.entity}</TableCell>
                            <TableCell className="text-xs font-mono">{item.key}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {historyDetail.diffItems.length > 100 && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        他 {historyDetail.diffItems.length - 100} 件は省略されています
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {diffResult && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Badge variant="secondary">差分合計: {diffResult.summary.total}</Badge>
              <Badge variant="outline">新規: {diffResult.summary.create}</Badge>
              <Badge variant="outline">更新: {diffResult.summary.update}</Badge>
              <Badge variant="outline">削除: {diffResult.summary.delete}</Badge>
              <Badge variant={issueItems.length > 0 ? "destructive" : "secondary"}>
                指摘件数: {issueItems.length}
              </Badge>
            </div>
            {issueItems.length > 0 && (
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">差分検証の指摘（最大 {MAX_ISSUES} 件）</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>対象</TableHead>
                      <TableHead>操作</TableHead>
                      <TableHead>メッセージ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issueItems.map((item, index) => (
                      <TableRow key={`${item.entity}-${item.operation}-${index}`}>
                        <TableCell className="text-xs">{item.entity}</TableCell>
                        <TableCell className="text-xs">{item.operation}</TableCell>
                        <TableCell className="text-xs">{item.issues.map((issue) => issue.message).join(" / ")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {applyResult && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Badge variant="secondary">反映合計: {applyResult.summary.total}</Badge>
              <Badge variant="outline">成功: {applyResult.summary.success}</Badge>
              <Badge variant={applyResult.summary.failed > 0 ? "destructive" : "secondary"}>
                失敗: {applyResult.summary.failed}
              </Badge>
              <Badge variant="outline">新規: {applyResult.summary.create}</Badge>
              <Badge variant="outline">更新: {applyResult.summary.update}</Badge>
              <Badge variant="outline">削除: {applyResult.summary.delete}</Badge>
            </div>
            {applyResult.errors.length > 0 && (
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">エラー詳細（最大 {MAX_ERRORS} 件）</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>対象</TableHead>
                      <TableHead>行</TableHead>
                      <TableHead>コード</TableHead>
                      <TableHead>メッセージ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applyResult.errors.slice(0, MAX_ERRORS).map((error, index) => (
                      <TableRow key={`${error.entity}-${error.rowIndex ?? "-"}-${index}`}>
                        <TableCell className="text-xs">{error.entity}</TableCell>
                        <TableCell className="text-xs">{error.rowIndex ?? "-"}</TableCell>
                        <TableCell className="text-xs">{error.code}</TableCell>
                        <TableCell className="text-xs">{error.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {rollbackResult && (
          <div className="space-y-3 rounded-lg border border-dashed p-3">
            <p className="text-sm font-medium">ロールバック結果</p>
            <div className="flex flex-wrap gap-3">
              <Badge variant="secondary">反映合計: {rollbackResult.summary.total}</Badge>
              <Badge variant="outline">成功: {rollbackResult.summary.success}</Badge>
              <Badge variant={rollbackResult.summary.failed > 0 ? "destructive" : "secondary"}>
                失敗: {rollbackResult.summary.failed}
              </Badge>
              <Badge variant="outline">更新: {rollbackResult.summary.update}</Badge>
              <Badge variant="outline">削除: {rollbackResult.summary.delete}</Badge>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
