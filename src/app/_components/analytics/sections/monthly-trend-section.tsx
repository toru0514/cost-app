"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/calculations"

interface MonthlyTrendSectionProps {
  trend: { key: string; label: string; total: number }[]
  maxValue: number
}

export function MonthlyTrendSection({ trend, maxValue }: MonthlyTrendSectionProps) {
  const hasData = trend.some((bucket) => bucket.total > 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle>月次コストトレンド</CardTitle>
        <CardDescription>期間内の登録月別合計を可視化します。</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-sm text-muted-foreground">該当期間に登録された商品がありません。</p>
        ) : (
          <div className="space-y-3">
            {trend.map((bucket) => {
              const ratio = maxValue > 0 ? (bucket.total / maxValue) * 100 : 0
              return (
                <div key={bucket.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{bucket.label}</span>
                    <span className="text-xs text-muted-foreground">{formatCurrency(bucket.total)}</span>
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
