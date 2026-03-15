"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

import type { ProductSummary } from "../utils"

interface ProductRankingSectionProps {
  entries: ProductSummary[]
  data: AppData
}

export function ProductRankingSection({ entries, data }: ProductRankingSectionProps) {
  const ranked = entries
    .map(({ product, costs }) => {
      const quantity = product.expectedProduction.quantity || 1
      const totalCost = costs.total * quantity
      const categoryName =
        data.categories.large.find((c) => c.id === product.categoryLargeId)?.name ?? "未分類"
      return {
        id: product.id,
        name: product.name,
        unitCost: costs.total,
        totalCost,
        quantity,
        categoryName,
      }
    })
    .filter((item) => item.totalCost > 0)
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 10)

  const maxCost = ranked.length > 0 ? ranked[0].totalCost : 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>商品別コストランキング</CardTitle>
        <CardDescription>コスト合計の上位10商品を表示します。</CardDescription>
      </CardHeader>
      <CardContent>
        {ranked.length === 0 ? (
          <p className="text-sm text-muted-foreground">該当データがありません。</p>
        ) : (
          <div className="space-y-4">
            {ranked.map((item, index) => {
              const ratio = maxCost > 0 ? (item.totalCost / maxCost) * 100 : 0
              return (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">#{index + 1}</span>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.categoryName}</span>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{formatCurrency(item.totalCost)}</p>
                      <p>単価 {formatCurrency(item.unitCost)}</p>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(ratio, 100)}%` }} />
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
