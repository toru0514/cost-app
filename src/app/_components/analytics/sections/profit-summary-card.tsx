"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/calculations"

import type { CostTotals } from "../utils"

interface ProfitSummaryCardProps {
  currentTotals: CostTotals
  previousTotals: CostTotals
}

export function ProfitSummaryCard({ currentTotals, previousTotals }: ProfitSummaryCardProps) {
  const currentProfit = currentTotals.totalRevenue - currentTotals.total
  const currentMargin = currentTotals.totalRevenue > 0 ? (currentProfit / currentTotals.totalRevenue) * 100 : 0
  const previousProfit = previousTotals.totalRevenue - previousTotals.total
  const previousMargin = previousTotals.totalRevenue > 0 ? (previousProfit / previousTotals.totalRevenue) * 100 : 0
  const profitDelta = currentProfit - previousProfit
  const marginDelta = currentMargin - previousMargin

  const hasRevenue = currentTotals.totalRevenue > 0 || previousTotals.totalRevenue > 0

  if (!hasRevenue) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>利益サマリー</CardTitle>
        <CardDescription>売上・粗利・粗利率の前期比較です。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">売上合計</p>
            <p className="text-2xl font-semibold">{formatCurrency(currentTotals.totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">前期 {formatCurrency(previousTotals.totalRevenue)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">コスト合計</p>
            <p className="text-2xl font-semibold">{formatCurrency(currentTotals.total)}</p>
            <p className="text-xs text-muted-foreground">前期 {formatCurrency(previousTotals.total)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">粗利合計</p>
            <p className={`text-2xl font-semibold ${currentProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(currentProfit)}
            </p>
            <p className="text-xs text-muted-foreground">
              前期比 {profitDelta >= 0 ? "+" : ""}{formatCurrency(profitDelta)}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">粗利率</p>
            <p className={`text-2xl font-semibold ${currentMargin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {currentMargin.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              前期比 {marginDelta >= 0 ? "+" : ""}{marginDelta.toFixed(1)}pt
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
