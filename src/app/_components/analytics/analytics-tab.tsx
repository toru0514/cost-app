"use client"

import { useMemo } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { AppData } from "@/lib/types"
import { calculateProductUnitCosts, formatCurrency } from "@/lib/calculations"

const costKeyConfig = [
  { key: "material", label: "材料", color: "bg-emerald-500" },
  { key: "packaging", label: "梱包", color: "bg-lime-500" },
  { key: "labor", label: "人件費", color: "bg-sky-500" },
  { key: "outsourcing", label: "外注", color: "bg-indigo-500" },
  { key: "development", label: "開発", color: "bg-purple-500" },
  { key: "equipment", label: "設備", color: "bg-amber-500" },
  { key: "logistics", label: "物流", color: "bg-rose-500" },
  { key: "electricity", label: "電気", color: "bg-stone-500" },
] as const

const categoryLevels = [
  {
    level: "large" as const,
    label: "大カテゴリ",
    getId: (product: AppData["products"][number]) => product.categoryLargeId,
    getName: (data: AppData, id?: string | null) =>
      id ? data.categories.large.find((c) => c.id === id)?.name ?? "未分類" : "未分類",
  },
  {
    level: "medium" as const,
    label: "中カテゴリ",
    getId: (product: AppData["products"][number]) => product.categoryMediumId,
    getName: (data: AppData, id?: string | null) =>
      id ? data.categories.medium.find((c) => c.id === id)?.name ?? "未分類" : "未分類",
  },
  {
    level: "small" as const,
    label: "小カテゴリ",
    getId: (product: AppData["products"][number]) => product.categorySmallId,
    getName: (data: AppData, id?: string | null) =>
      id ? data.categories.small.find((c) => c.id === id)?.name ?? "未分類" : "未分類",
  },
]

export function AnalyticsTab({ data }: { data: AppData }) {
  const productSummaries = useMemo(() => {
    return data.products.map((product) => ({
      product,
      costs: calculateProductUnitCosts(product.id, data),
    }))
  }, [data])

  const aggregatedCostTotals = useMemo(() => {
    const initial: Record<(typeof costKeyConfig)[number]["key"] | "total" | "totalQuantity", number> = {
      material: 0,
      packaging: 0,
      labor: 0,
      outsourcing: 0,
      development: 0,
      equipment: 0,
      logistics: 0,
      electricity: 0,
      total: 0,
      totalQuantity: 0,
    }
    return productSummaries.reduce((acc, { product, costs }) => {
      const quantity = product.expectedProduction.quantity || 1
      acc.material += costs.material * quantity
      acc.packaging += costs.packaging * quantity
      acc.labor += costs.labor * quantity
      acc.outsourcing += costs.outsourcing * quantity
      acc.development += costs.development * quantity
      acc.equipment += costs.equipment * quantity
      acc.logistics += costs.logistics * quantity
      acc.electricity += costs.electricity * quantity
      acc.total += costs.total * quantity
      acc.totalQuantity += quantity
      return acc
    }, initial)
  }, [productSummaries])

  const rankings = useMemo(() => {
    return categoryLevels.map((level) => {
      const overall = new Map<
        string,
        { name: string; totalCost: number; productCount: number; quantity: number }
      >()

      productSummaries.forEach(({ product, costs }) => {
        const categoryId = level.getId(product) ?? "__uncategorized__"
        const categoryName = level.getName(data, level.getId(product))
        const quantity = product.expectedProduction.quantity || 1
        const totalCost = costs.total * quantity
        const current = overall.get(categoryId) ?? {
          name: categoryName,
          totalCost: 0,
          productCount: 0,
          quantity: 0,
        }
        current.totalCost += totalCost
        current.productCount += 1
        current.quantity += quantity
        overall.set(categoryId, current)
      })

      const grandTotal = Array.from(overall.values()).reduce((sum, item) => sum + item.totalCost, 0)
      const rows = Array.from(overall.entries())
        .map(([id, item]) => ({
          id,
          ...item,
          share: grandTotal > 0 ? (item.totalCost / grandTotal) * 100 : 0,
        }))
        .filter((item) => item.totalCost > 0)
        .sort((a, b) => b.totalCost - a.totalCost)
        .slice(0, 6)

      return { level: level.level, label: level.label, rows }
    })
  }, [data, productSummaries])

  const hasCostData = aggregatedCostTotals.total > 0

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {rankings.map((ranking) => (
          <Card key={`ranking-${ranking.level}`}>
            <CardHeader>
              <CardTitle>{ranking.label}別コストランキング</CardTitle>
              <CardDescription>カテゴリ単位で累計コストを比較します。</CardDescription>
            </CardHeader>
            <CardContent>
              {ranking.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">該当データがありません。</p>
              ) : (
                <div className="space-y-4">
                  {ranking.rows.map((item, index) => (
                    <div key={`${ranking.level}-${item.id}`} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">#{index + 1}</span>
                          <span className="font-medium">{item.name}</span>
                          <span className="text-xs text-muted-foreground">{item.productCount}商品</span>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>{formatCurrency(item.totalCost)}</p>
                          <p>{item.share.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${Math.min(item.share, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

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
                  const amount = aggregatedCostTotals[entry.key]
                  const share = aggregatedCostTotals.total > 0 ? (amount / aggregatedCostTotals.total) * 100 : 0
                  if (share <= 0) return null
                  return (
                    <div
                      key={`cost-segment-${entry.key}`}
                      className={entry.color}
                      style={{ width: `${share}%` }}
                    />
                  )
                })}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {costKeyConfig.map((entry) => {
                  const amount = aggregatedCostTotals[entry.key]
                  const share = aggregatedCostTotals.total > 0 ? (amount / aggregatedCostTotals.total) * 100 : 0
                  return (
                    <div key={`cost-legend-${entry.key}`} className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-sm ${entry.color}`} />
                        <span>{entry.label}</span>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{formatCurrency(amount)}</p>
                        <p>{share.toFixed(1)}%</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
