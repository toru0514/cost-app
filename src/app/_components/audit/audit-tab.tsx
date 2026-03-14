"use client"

import { FileDown, RefreshCw, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AuditFilters, AuditLog, ChangeSummary } from "@/lib/types"
import { toast } from "sonner"

type AuditTabProps = {
  logs: AuditLog[]
  loading: boolean
  onRefresh: () => void
  onLoadMore: () => void
  hasMore?: boolean
  filters: AuditFilters
  onFiltersChange: (next: AuditFilters) => void
}

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(value))
  } catch {
    return value
  }
}

const describeClient = (log: AuditLog) => {
  const client = log.metadata?.client
  if (!client) return log.deviceInfo ?? "-"
  const parts = [client.platform, client.language]
  if (client.location?.host) {
    parts.push(client.location.host)
  }
  const summary = parts.filter(Boolean).join(" / ")
  return summary || log.deviceInfo || client.userAgent || "-"
}

const renderChangeList = (label: string, summary?: ChangeSummary) => {
  if (!summary) return null
  if (
    (summary.added ?? []).length === 0 &&
    (summary.removed ?? []).length === 0 &&
    (summary.updated ?? []).length === 0
  ) {
    return null
  }
  return (
    <div>
      <p className="font-medium text-foreground">{label}</p>
      {summary.added.length > 0 && (
        <p className="text-xs text-emerald-600">追加: {summary.added.join(", ")}</p>
      )}
      {summary.updated && summary.updated.length > 0 && (
        <p className="text-xs text-sky-600">更新: {summary.updated.join(", ")}</p>
      )}
      {summary.removed.length > 0 && (
        <p className="text-xs text-rose-600">削除: {summary.removed.join(", ")}</p>
      )}
    </div>
  )
}

const describePayload = (log: AuditLog) => {
  const stats = log.metadata?.payloadStats
  if (!stats) return "-"
  const masterSummary = `マスタ 材料${stats.materials}・梱包${stats.packaging}・配送${stats.shippingMethods}・人件${stats.laborRoles}・設備${stats.equipments}・手数料${stats.fees}・オプション${stats.optionPresets}`
  const costSummary = `コスト 材${stats.costEntries.materials}・梱${stats.costEntries.packaging}・人件${stats.costEntries.labor}・外注${stats.costEntries.outsourcing}・開発${stats.costEntries.development}・設備${stats.costEntries.equipment}・物流${stats.costEntries.logistics}・電力${stats.costEntries.electricity}・手数料${stats.costEntries.fees}`
  const categorySummary = `カテゴリ 大${stats.categories.large} / 中${stats.categories.medium} / 小${stats.categories.small}`
  const total = stats.summary?.totalRecords
  const payloadChanges = log.metadata?.changes
  return (
    <div className="space-y-2 text-sm">
      <div className="grid gap-2 rounded-md border border-dashed p-2 text-xs">
        {renderChangeList("商品", payloadChanges?.products)}
        {renderChangeList("材料", payloadChanges?.materials)}
        {renderChangeList("梱包材", payloadChanges?.packaging)}
        {renderChangeList("配送方法", payloadChanges?.shippingMethods)}
        {renderChangeList("人件費マスタ", payloadChanges?.laborRoles)}
        {renderChangeList("設備", payloadChanges?.equipments)}
        {renderChangeList("手数料", payloadChanges?.fees)}
        {renderChangeList("オプションプリセット", payloadChanges?.optionPresets)}
        {renderChangeList("大カテゴリ", payloadChanges?.categoriesLarge)}
        {renderChangeList("中カテゴリ", payloadChanges?.categoriesMedium)}
        {renderChangeList("小カテゴリ", payloadChanges?.categoriesSmall)}
      </div>
      <div className="space-y-1 text-muted-foreground">
        <p className="text-foreground">{categorySummary}</p>
        <p>{`商品 ${stats.products}・総レコード ${total ?? "-"}`}</p>
        <p>{masterSummary}</p>
        <p>{costSummary}</p>
      </div>
    </div>
  )
}

export function AuditTab({ logs, loading, onRefresh, onLoadMore, hasMore, filters, onFiltersChange }: AuditTabProps) {
  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.from) params.set("from", filters.from)
      if (filters.to) params.set("to", filters.to)
      const response = await fetch(`/api/audit/export${params.toString() ? `?${params.toString()}` : ""}`)
      if (!response.ok) {
        throw new Error(await response.text())
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export audit logs", error)
      toast.error("監査ログのエクスポートに失敗しました")
    }
  }

  return (
    <div className="min-w-0 space-y-4 overflow-hidden">
      {/* ページヘッダー */}
      <div>
        <h1 className="text-2xl font-semibold">監査ログ</h1>
        <p className="text-muted-foreground">保存操作の履歴を確認できます</p>
      </div>

      {/* ツールバー */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.from ?? ""}
              onChange={(event) => onFiltersChange({ ...filters, from: event.target.value || undefined })}
              className="h-9 rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-sm text-muted-foreground">〜</span>
            <input
              type="date"
              value={filters.to ?? ""}
              onChange={(event) => onFiltersChange({ ...filters, to: event.target.value || undefined })}
              className="h-9 rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="button"
            className="h-9 rounded-md border px-3 text-sm text-muted-foreground hover:bg-muted"
            onClick={() => onFiltersChange({})}
          >
            クリア
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "読込中" : "更新"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onLoadMore} disabled={loading || !hasMore}>
            {hasMore ? "さらに読み込む" : "末尾まで表示"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handleExportCsv}>
            <FileDown className="mr-1.5 h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* テーブル */}
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">まだ監査ログがありません。</p>
      ) : (
        <div className="max-h-[600px] w-full min-w-0 max-w-full overflow-auto overscroll-x-contain touch-manipulation rounded-lg border">
          <Table className="w-full min-w-[840px]">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">記録概要</TableHead>
                <TableHead className="font-semibold">日時</TableHead>
                <TableHead className="font-semibold">端末</TableHead>
              </TableRow>
            </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{describePayload(log)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{formatDate(log.createdAt)}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{describeClient(log)}</span>
                          {log.metadata?.client?.userAgent && (
                            <span className="text-xs text-muted-foreground">{log.metadata.client.userAgent}</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* フッター */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{logs.length} 件表示中</span>
          </div>
    </div>
  )
}
