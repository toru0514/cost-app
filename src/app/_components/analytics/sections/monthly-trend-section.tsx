"use client"

import { useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/calculations"

export type TrendBucket = {
  key: string
  label: string
  total: number
  quantity: number
}

interface MonthlyTrendSectionProps {
  trend: TrendBucket[]
  maxValue: number
}

type ViewMode = "total" | "average"

export function MonthlyTrendSection({ trend, maxValue }: MonthlyTrendSectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("total")

  const hasData = trend.some((bucket) => bucket.total > 0)

  const displayData = trend.map((bucket) => ({
    ...bucket,
    displayValue:
      viewMode === "total"
        ? bucket.total
        : bucket.quantity > 0
          ? bucket.total / bucket.quantity
          : 0,
  }))

  const maxDisplayValue =
    viewMode === "total"
      ? maxValue
      : Math.max(1, ...displayData.map((d) => d.displayValue))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>月次コストトレンド</CardTitle>
            <CardDescription>期間内の登録月別合計を可視化します。</CardDescription>
          </div>
          <div className="flex gap-1 rounded-lg border p-1">
            <button
              type="button"
              onClick={() => setViewMode("total")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === "total" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              合計
            </button>
            <button
              type="button"
              onClick={() => setViewMode("average")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === "average" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              平均単価
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-sm text-muted-foreground">該当期間に登録された商品がありません。</p>
        ) : (
          <div className="space-y-3">
            {displayData.map((bucket) => {
              const ratio = maxDisplayValue > 0 ? (bucket.displayValue / maxDisplayValue) * 100 : 0
              return (
                <div key={bucket.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{bucket.label}</span>
                    <span className="text-xs text-muted-foreground">{formatCurrency(bucket.displayValue)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(ratio, 4)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
