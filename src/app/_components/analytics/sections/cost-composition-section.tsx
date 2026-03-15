"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/calculations"

import type { CostTotals } from "../utils"
import { costKeyConfig } from "../utils"

interface CostCompositionSectionProps {
  totals: CostTotals
  previousTotals?: CostTotals
}

export function CostCompositionSection({ totals, previousTotals }: CostCompositionSectionProps) {
  const hasCostData = totals.total > 0
  return (
    <Card>
      <CardHeader>
        <CardTitle>コスト構成グラフ</CardTitle>
        <CardDescription>全商品合計に対するカテゴリ構成比です。</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasCostData ? (
          <p className="text-sm text-muted-foreground">原価データが登録されると表示されます。</p>
        ) : (
          <div className="space-y-4">
            <div className="flex h-4 overflow-hidden rounded-full border">
              {costKeyConfig.map((entry) => {
                const amount = totals[entry.key]
                const share = totals.total > 0 ? (amount / totals.total) * 100 : 0
                if (share <= 0) return null
                return <div key={`cost-segment-${entry.key}`} className={entry.color} style={{ width: `${share}%` }} />
              })}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {costKeyConfig.map((entry) => {
                const amount = totals[entry.key]
                const share = totals.total > 0 ? (amount / totals.total) * 100 : 0
                const prevAmount = previousTotals?.[entry.key] ?? 0
                const delta = amount - prevAmount
                const deltaPercent = prevAmount > 0 ? (delta / prevAmount) * 100 : null
                return (
                  <div key={`cost-legend-${entry.key}`} className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-sm ${entry.color}`} />
                      <span>{entry.label}</span>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{formatCurrency(amount)}</p>
                      <p>{share.toFixed(1)}%</p>
                      {previousTotals && (
                        <p className={delta > 0 ? "text-red-500" : delta < 0 ? "text-emerald-500" : ""}>
                          {delta >= 0 ? "+" : ""}{formatCurrency(delta)}
                          {deltaPercent !== null && ` (${delta >= 0 ? "+" : ""}${deltaPercent.toFixed(1)}%)`}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
