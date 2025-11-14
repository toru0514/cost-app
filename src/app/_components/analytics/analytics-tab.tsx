"use client"

import { useMemo, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

type ProductSummary = {
  product: AppData["products"][number]
  costs: ReturnType<typeof calculateProductUnitCosts>
  registeredAt: number
}

type CostTotals = Record<(typeof costKeyConfig)[number]["key"] | "total" | "totalQuantity" | "productCount", number>

const monthsRangeOptions = [
  { value: "3", label: "直近3ヶ月" },
  { value: "6", label: "直近6ヶ月" },
  { value: "12", label: "直近12ヶ月" },
  { value: "24", label: "直近24ヶ月" },
]

const createEmptyTotals = (): CostTotals => ({
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
  productCount: 0,
})

const aggregateCostTotals = (entries: ProductSummary[]): CostTotals => {
  return entries.reduce((acc, entry) => {
    const { product, costs } = entry
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
    acc.productCount += 1
    return acc
  }, createEmptyTotals())
}

const formatDateLabel = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}/${month}/${day}`
}

const formatRangeLabel = (start: Date, end: Date) => `${formatDateLabel(start)} 〜 ${formatDateLabel(end)}`

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
  const [monthsRange, setMonthsRange] = useState("6")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  const productSummaries = useMemo<ProductSummary[]>(() => {
    return data.products.map((product) => {
      const timestamp = product.registeredAt ? Date.parse(product.registeredAt) : NaN
      return {
        product,
        costs: calculateProductUnitCosts(product.id, data),
        registeredAt: Number.isNaN(timestamp) ? NaN : timestamp,
      }
    })
  }, [data])

  const rangeBoundaries = useMemo(() => {
    const months = Math.max(Number(monthsRange) || 6, 1)
    const today = new Date()
    const currentEnd = new Date(today)
    currentEnd.setHours(23, 59, 59, 999)
    const currentStart = new Date(today.getFullYear(), today.getMonth(), 1)
    currentStart.setMonth(currentStart.getMonth() - months + 1)
    const previousEnd = new Date(currentStart)
    previousEnd.setDate(previousEnd.getDate() - 1)
    previousEnd.setHours(23, 59, 59, 999)
    const previousStart = new Date(previousEnd.getFullYear(), previousEnd.getMonth(), 1)
    previousStart.setMonth(previousStart.getMonth() - months + 1)
    previousStart.setHours(0, 0, 0, 0)
    currentStart.setHours(0, 0, 0, 0)
    return { months, currentStart, currentEnd, previousStart, previousEnd }
  }, [monthsRange])

  const filteredEntries = useMemo(() => {
    const startTime = rangeBoundaries.currentStart.getTime()
    const endTime = rangeBoundaries.currentEnd.getTime()
    return productSummaries.filter(({ product, registeredAt }) => {
      if (Number.isNaN(registeredAt)) return false
      if (registeredAt < startTime || registeredAt > endTime) return false
      if (categoryFilter && product.categoryLargeId !== categoryFilter) return false
      return true
    })
  }, [categoryFilter, productSummaries, rangeBoundaries])

  const previousEntries = useMemo(() => {
    const startTime = rangeBoundaries.previousStart.getTime()
    const endTime = rangeBoundaries.previousEnd.getTime()
    return productSummaries.filter(({ product, registeredAt }) => {
      if (Number.isNaN(registeredAt)) return false
      if (registeredAt < startTime || registeredAt > endTime) return false
      if (categoryFilter && product.categoryLargeId !== categoryFilter) return false
      return true
    })
  }, [categoryFilter, productSummaries, rangeBoundaries])

  const aggregatedCostTotals = useMemo(() => aggregateCostTotals(filteredEntries), [filteredEntries])
  const previousCostTotals = useMemo(() => aggregateCostTotals(previousEntries), [previousEntries])

  const rankings = useMemo(() => {
    return categoryLevels.map((level) => {
      const overall = new Map<
        string,
        { name: string; totalCost: number; productCount: number; quantity: number }
      >()

      filteredEntries.forEach(({ product, costs }) => {
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
  }, [data, filteredEntries])

  const hasCostData = aggregatedCostTotals.total > 0
  const currentRangeLabel = useMemo(
    () => formatRangeLabel(rangeBoundaries.currentStart, rangeBoundaries.currentEnd),
    [rangeBoundaries]
  )
  const previousRangeLabel = useMemo(
    () => formatRangeLabel(rangeBoundaries.previousStart, rangeBoundaries.previousEnd),
    [rangeBoundaries]
  )
  const monthlyTrend = useMemo(() => {
    const months = rangeBoundaries.months
    const series: { key: string; label: string; total: number }[] = []
    const monthMap = new Map<string, { key: string; label: string; total: number }>()
    for (let i = months - 1; i >= 0; i--) {
      const reference = new Date(rangeBoundaries.currentEnd)
      reference.setDate(1)
      reference.setMonth(reference.getMonth() - i)
      const key = `${reference.getFullYear()}-${reference.getMonth()}`
      const label = `${reference.getFullYear()}年${reference.getMonth() + 1}月`
      const bucket = { key, label, total: 0 }
      monthMap.set(key, bucket)
      series.push(bucket)
    }
    filteredEntries.forEach(({ product, costs, registeredAt }) => {
      if (Number.isNaN(registeredAt)) return
      const date = new Date(registeredAt)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      const bucket = monthMap.get(key)
      if (!bucket) return
      const quantity = product.expectedProduction.quantity || 1
      bucket.total += costs.total * quantity
    })
    return series
  }, [filteredEntries, rangeBoundaries])

  const maxTrendValue = useMemo(
    () => Math.max(1, ...monthlyTrend.map((item) => item.total)),
    [monthlyTrend]
  )
  const deltaTotal = aggregatedCostTotals.total - previousCostTotals.total
  const deltaPercent =
    previousCostTotals.total > 0 ? (deltaTotal / previousCostTotals.total) * 100 : null
  const averageUnitCost =
    aggregatedCostTotals.totalQuantity > 0
      ? aggregatedCostTotals.total / aggregatedCostTotals.totalQuantity
      : 0
  const previousAverageUnitCost =
    previousCostTotals.totalQuantity > 0
      ? previousCostTotals.total / previousCostTotals.totalQuantity
      : 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>可視化フィルタ</CardTitle>
          <CardDescription>期間とカテゴリを切り替えてグラフを更新します。</CardDescription>
          <p className="text-xs text-muted-foreground">対象期間: {currentRangeLabel}</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <div className="w-full md:w-48">
              <p className="text-xs text-muted-foreground">期間</p>
              <Select value={monthsRange} onValueChange={setMonthsRange}>
                <SelectTrigger>
                  <SelectValue placeholder="期間を選択" />
                </SelectTrigger>
                <SelectContent>
                  {monthsRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-64">
              <p className="text-xs text-muted-foreground">大カテゴリフィルタ</p>
              <Select
                value={categoryFilter ?? "all"}
                onValueChange={(value) => setCategoryFilter(value === "all" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="カテゴリを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべてのカテゴリ</SelectItem>
                  {data.categories.large.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>期間比較</CardTitle>
          <CardDescription>前期間とのコスト合計と平均を比較します。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">現在期間 ({currentRangeLabel})</p>
              <p className="text-2xl font-semibold">{formatCurrency(aggregatedCostTotals.total)}</p>
              <p className="text-xs text-muted-foreground">
                平均単価 {formatCurrency(averageUnitCost)} / {aggregatedCostTotals.productCount} 商品
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">比較期間 ({previousRangeLabel})</p>
              <p className="text-2xl font-semibold">{formatCurrency(previousCostTotals.total)}</p>
              <p className="text-xs text-muted-foreground">
                平均単価 {formatCurrency(previousAverageUnitCost)} / {previousCostTotals.productCount} 商品
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

      <Card>
        <CardHeader>
          <CardTitle>月次コストトレンド</CardTitle>
          <CardDescription>期間内の登録月別合計を可視化します。</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyTrend.every((bucket) => bucket.total === 0) ? (
            <p className="text-sm text-muted-foreground">該当期間に登録された商品がありません。</p>
          ) : (
            <div className="space-y-3">
              {monthlyTrend.map((bucket) => {
                const ratio = maxTrendValue > 0 ? (bucket.total / maxTrendValue) * 100 : 0
                return (
                  <div key={bucket.key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{bucket.label}</span>
                      <span className="text-xs text-muted-foreground">{formatCurrency(bucket.total)}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${Math.max(ratio, 4)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
