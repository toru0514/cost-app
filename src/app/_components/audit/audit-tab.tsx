"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AuditLog, ChangeSummary } from "@/lib/types"

type AuditTabProps = {
  logs: AuditLog[]
  loading: boolean
  onRefresh: () => void
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
  if ((summary.added ?? []).length === 0 && (summary.removed ?? []).length === 0) return null
  return (
    <div>
      <p className="font-medium text-foreground">{label}</p>
      {summary.added.length > 0 && (
        <p className="text-xs text-emerald-600">追加: {summary.added.join(", ")}</p>
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
  const masterSummary = `マスタ 材料${stats.materials}・梱包${stats.packaging}・配送${stats.shippingMethods}・人件${stats.laborRoles}・設備${stats.equipments}・オプション${stats.optionPresets}`
  const costSummary = `コスト 材${stats.costEntries.materials}・梱${stats.costEntries.packaging}・人件${stats.costEntries.labor}・外注${stats.costEntries.outsourcing}・開発${stats.costEntries.development}・設備${stats.costEntries.equipment}・物流${stats.costEntries.logistics}・電力${stats.costEntries.electricity}`
  const categorySummary = `カテゴリ 大${stats.categories.large} / 中${stats.categories.medium} / 小${stats.categories.small}`
  const total = stats.summary?.totalRecords
  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      <p className="text-foreground">{categorySummary}</p>
      <p>{`商品 ${stats.products}・総レコード ${total ?? "-"}`}</p>
      <p>{masterSummary}</p>
      <p>{costSummary}</p>
      <div className="grid gap-2 pt-1 text-xs">
        {renderChangeList("商品", log.metadata?.changes?.products)}
        {renderChangeList("材料", log.metadata?.changes?.materials)}
        {renderChangeList("梱包材", log.metadata?.changes?.packaging)}
        {renderChangeList("配送方法", log.metadata?.changes?.shippingMethods)}
        {renderChangeList("人件費マスタ", log.metadata?.changes?.laborRoles)}
        {renderChangeList("設備", log.metadata?.changes?.equipments)}
        {renderChangeList("オプションプリセット", log.metadata?.changes?.optionPresets)}
        {renderChangeList("大カテゴリ", log.metadata?.changes?.categoriesLarge)}
        {renderChangeList("中カテゴリ", log.metadata?.changes?.categoriesMedium)}
        {renderChangeList("小カテゴリ", log.metadata?.changes?.categoriesSmall)}
      </div>
    </div>
  )
}

export function AuditTab({ logs, loading, onRefresh }: AuditTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>保存操作の監査ログ</CardTitle>
            <CardDescription>直近 {logs.length} 件の保存履歴を表示します。</CardDescription>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={onRefresh} disabled={loading}>
            {loading ? "読込中" : "最新を取得"}
          </Button>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ監査ログがありません。</p>
          ) : (
            <div className="max-h-[520px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>記録概要</TableHead>
                    <TableHead>日時</TableHead>
                    <TableHead>端末</TableHead>
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
                      <TableCell className="text-sm text-muted-foreground">{describePayload(log)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
