"use client"

import { useMemo, useState } from "react"

import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { parsePayloadJson } from "@/lib/bulk-sync/ui-utils"
import { retry } from "@/lib/bulk-sync/retry"

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

type BulkSyncSectionProps = {
  title: string
  description: string
  placeholder: string
  helpText: string
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

export function BulkSyncSection({ title, description, placeholder, helpText, target }: BulkSyncSectionProps) {
  const [payloadInput, setPayloadInput] = useState("")
  const [diffResult, setDiffResult] = useState<DiffResponse | null>(null)
  const [applyResult, setApplyResult] = useState<ApplyResponse | null>(null)
  const [rollbackResult, setRollbackResult] = useState<ApplyResponse | null>(null)
  const [busy, setBusy] = useState<"diff" | "apply" | "rollback" | "export" | "import" | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [dryRun, setDryRun] = useState(false)
  const [recordAuditLog, setRecordAuditLog] = useState(true)
  const [exportMode, setExportMode] = useState<"overwrite" | "append">("overwrite")
  const [useManualJson, setUseManualJson] = useState(false)

  const parsedPayload = useMemo(() => parsePayloadJson(payloadInput), [payloadInput])

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
      const requestInit: RequestInit =
        useManualJson && trimmedInput.length > 0
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ payload: parsedPayload.payload, options: { includeDetails: true } }),
            }
          : { method: "POST" }

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
            const result = await fetch("/api/bulk-sync/apply", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ payload: parsedPayload.payload, options: { dryRun, recordAuditLog } }),
            })
            if (!result.ok) {
              const error = await result.json().catch(() => ({}))
              throw new Error(error.error ?? "反映に失敗しました")
            }
            return result
          }

          const result = await fetch("/api/bulk-sync/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target, options: { dryRun, recordAuditLog } }),
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

  const handleRollback = async () => {
    setErrorMessage(null)
    setRollbackResult(null)
    setBusy("rollback")

    try {
      const response = await retry(
        async () => {
          const result = await fetch("/api/bulk-sync/rollback", { method: "POST" })
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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "ロールバックに失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const handleExport = async () => {
    setErrorMessage(null)
    setBusy("export")
    try {
      const response = await fetch("/api/bulk-sync/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, mode: exportMode }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error ?? "書き出しに失敗しました")
      }
      toast.message("スプレッドシートへ書き出しました。")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "書き出しに失敗しました")
    } finally {
      setBusy(null)
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
              : "待機中"

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>スプレッドシート連携</Label>
            <Badge variant={busy ? "default" : "secondary"}>{statusText}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{helpText}</p>
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
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={dryRun} onChange={(event) => setDryRun(event.target.checked)} />
              Dry Run（反映せず検証のみ）
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={recordAuditLog}
                onChange={(event) => setRecordAuditLog(event.target.checked)}
              />
              監査ログを記録する
            </label>
            <p className="text-xs text-muted-foreground">失敗時は最大 {RETRY_LIMIT} 回まで自動リトライします。</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={handleDiff} disabled={busy !== null}>
              差分を確認
            </Button>
            <Button onClick={handleExport} disabled={busy !== null} variant="outline">
              シートへ書き出し
            </Button>
            <Button onClick={handleApply} disabled={busy !== null} variant="default">
              シートから読み込み
            </Button>
            <Button onClick={handleRollback} disabled={busy !== null} variant="outline">
              直前の反映をロールバック
            </Button>
            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
          </div>
        </div>

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
      </CardContent>
    </Card>
  )
}
