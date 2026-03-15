"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/calculations"

import type { ProductSummary } from "../utils"

const statusConfig = [
  { key: "active", label: "有効", color: "bg-emerald-500" },
  { key: "draft", label: "下書き", color: "bg-amber-500" },
  { key: "discontinued", label: "廃止", color: "bg-stone-400" },
  { key: "unknown", label: "未設定", color: "bg-muted-foreground" },
] as const

interface StatusBreakdownCardProps {
  entries: ProductSummary[]
}

export function StatusBreakdownCard({ entries }: StatusBreakdownCardProps) {
  const breakdown = statusConfig.map((config) => {
    const matching = entries.filter(({ product }) => {
      const status = product.status ?? "unknown"
      return status === config.key || (!product.status && config.key === "unknown")
    })
    const totalCost = matching.reduce((sum, { product, costs }) => {
      const quantity = product.expectedProduction.quantity || 1
      return sum + costs.total * quantity
    }, 0)
    return {
      ...config,
      count: matching.length,
      totalCost,
    }
  }).filter((item) => item.count > 0)

  const grandTotal = breakdown.reduce((sum, item) => sum + item.totalCost, 0)

  if (breakdown.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>ステータス別集計</CardTitle>
        <CardDescription>商品ステータスごとの件数とコスト合計です。</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Stacked bar */}
        <div className="mb-4 flex h-4 w-full overflow-hidden rounded-full">
          {breakdown.map((item) => {
            const ratio = grandTotal > 0 ? (item.totalCost / grandTotal) * 100 : 0
            return (
              <div
                key={item.key}
                className={`${item.color} transition-all`}
                style={{ width: `${Math.max(ratio, 1)}%` }}
              />
            )
          })}
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {breakdown.map((item) => {
            const share = grandTotal > 0 ? (item.totalCost / grandTotal) * 100 : 0
            return (
              <div key={item.key} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <p className="mt-1 text-lg font-semibold">{item.count}件</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(item.totalCost)} ({share.toFixed(1)}%)
                </p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
