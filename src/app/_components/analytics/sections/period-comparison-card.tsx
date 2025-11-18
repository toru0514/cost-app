"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/calculations"

import type { CostTotals } from "../utils"

interface PeriodComparisonCardProps {
  currentTotals: CostTotals
  previousTotals: CostTotals
  currentRangeLabel: string
  previousRangeLabel: string
}

export function PeriodComparisonCard({
  currentTotals,
  previousTotals,
  currentRangeLabel,
  previousRangeLabel,
}: PeriodComparisonCardProps) {
  const deltaTotal = currentTotals.total - previousTotals.total
  const deltaPercent = previousTotals.total > 0 ? (deltaTotal / previousTotals.total) * 100 : null
  const averageUnitCost =
    currentTotals.totalQuantity > 0 ? currentTotals.total / currentTotals.totalQuantity : 0
  const previousAverageUnitCost =
    previousTotals.totalQuantity > 0 ? previousTotals.total / previousTotals.totalQuantity : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>期間比較</CardTitle>
        <CardDescription>前期間とのコスト合計と平均を比較します。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">現在期間 ({currentRangeLabel})</p>
            <p className="text-2xl font-semibold">{formatCurrency(currentTotals.total)}</p>
            <p className="text-xs text-muted-foreground">
              平均単価 {formatCurrency(averageUnitCost)} / {currentTotals.productCount} 商品
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">比較期間 ({previousRangeLabel})</p>
            <p className="text-2xl font-semibold">{formatCurrency(previousTotals.total)}</p>
            <p className="text-xs text-muted-foreground">
              平均単価 {formatCurrency(previousAverageUnitCost)} / {previousTotals.productCount} 商品
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">差分</p>
            <p className={`text-2xl font-semibold ${deltaTotal >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(deltaTotal)}
            </p>
            <p className="text-xs text-muted-foreground">
              {deltaPercent === null ? "比較不可" : `${deltaPercent >= 0 ? "+" : ""}${deltaPercent.toFixed(1)}%`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
