"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/calculations"

export type ProductCostSummary = {
  salePrice: number
  totalCost: number
  grossProfit: number
  profitMargin: number
  breakdown: { key: string; label: string; value: number }[]
}

interface ProductRealtimeSummaryProps {
  summary: ProductCostSummary
}

const percentFormatter = new Intl.NumberFormat("ja-JP", {
  maximumFractionDigits: 1,
})

export function ProductRealtimeSummary({ summary }: ProductRealtimeSummaryProps) {
  const marginValue = Number.isFinite(summary.profitMargin) ? summary.profitMargin : 0
  const marginColor = summary.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"

  return (
    <Card className="lg:sticky lg:top-6">
      <CardHeader>
        <CardTitle>リアルタイムサマリ</CardTitle>
        <CardDescription>入力値から原価・粗利・利益率を随時計算します。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">想定販売価格</p>
          <p className="text-2xl font-semibold tracking-tight">{formatCurrency(summary.salePrice)}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">見込み原価</p>
            <p className="text-lg font-semibold">{formatCurrency(summary.totalCost)}</p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">粗利</p>
            <p className={`text-lg font-semibold ${summary.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(summary.grossProfit)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border px-3 py-2">
          <p className="text-xs text-muted-foreground">利益率</p>
          <p className={`text-2xl font-semibold tracking-tight ${marginColor}`}>
            {percentFormatter.format(marginValue)}%
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">内訳</p>
          <ul className="divide-y rounded-lg border text-sm">
            {summary.breakdown.map((item) => (
              <li key={item.key} className="flex items-center justify-between px-3 py-2">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">{formatCurrency(item.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

