"use client"

import { useMemo, useState } from "react"

import type { AppData } from "@/lib/types"
import { calculateProductUnitCosts } from "@/lib/calculations"

import { aggregateCostTotals, categoryLevels, formatRangeLabel, type ProductSummary } from "./utils"
import { FilterPanel } from "./sections/filter-panel"
import { PeriodComparisonCard } from "./sections/period-comparison-card"
import { ProfitSummaryCard } from "./sections/profit-summary-card"
import { ProductRankingSection } from "./sections/product-ranking-section"
import { CategoryRankingsSection } from "./sections/category-rankings-section"
import { CostCompositionSection } from "./sections/cost-composition-section"
import { MonthlyTrendSection } from "./sections/monthly-trend-section"

export function AnalyticsTab({ data, exchangeRateMap }: { data: AppData; exchangeRateMap?: Map<string, number> }) {
  const [monthsRange, setMonthsRange] = useState("6")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  const productSummaries = useMemo<ProductSummary[]>(() => {
    return data.products.map((product) => {
      const timestamp = product.registeredAt ? Date.parse(product.registeredAt) : NaN
      return {
        product,
        costs: calculateProductUnitCosts(product.id, data, exchangeRateMap),
        registeredAt: Number.isNaN(timestamp) ? NaN : timestamp,
      }
    })
  }, [data, exchangeRateMap])

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

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div>
        <h1 className="text-2xl font-semibold">集計データ</h1>
        <p className="text-muted-foreground">コスト構成と推移をグラフで分析</p>
      </div>

      <FilterPanel
        monthsRange={monthsRange}
        onMonthsRangeChange={setMonthsRange}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        currentRangeLabel={currentRangeLabel}
        categories={data.categories.large}
      />

      <PeriodComparisonCard
        currentTotals={aggregatedCostTotals}
        previousTotals={previousCostTotals}
        currentRangeLabel={currentRangeLabel}
        previousRangeLabel={previousRangeLabel}
      />

      <ProfitSummaryCard
        currentTotals={aggregatedCostTotals}
        previousTotals={previousCostTotals}
      />

      <ProductRankingSection entries={filteredEntries} data={data} />

      <CategoryRankingsSection rankings={rankings} />

      <CostCompositionSection totals={aggregatedCostTotals} previousTotals={previousCostTotals} />

      <MonthlyTrendSection trend={monthlyTrend} maxValue={maxTrendValue} />
    </div>
  )
}
