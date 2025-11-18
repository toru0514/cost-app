"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AuditLog } from "@/lib/types"

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

const describePayload = (log: AuditLog) => {
  const stats = log.metadata?.payloadStats
  if (!stats) return "-"
  return `カテゴリ ${stats.categories.large}/${stats.categories.medium}/${stats.categories.small} ・ 商品 ${stats.products}`
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
                    <TableHead>日時</TableHead>
                    <TableHead>端末</TableHead>
                    <TableHead>記録概要</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
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
