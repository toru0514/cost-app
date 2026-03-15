"use client"

import { useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/calculations"

import { costKeyConfig, type ProductSummary } from "../utils"

interface CategoryTrendSectionProps {
  entries: ProductSummary[]
  months: number
  currentEnd: Date
}

export function CategoryTrendSection({ entries, months, currentEnd }: CategoryTrendSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("material")

  // Build monthly buckets per category
  const series = (() => {
    const buckets: { key: string; label: string; values: Record<string, number> }[] = []
    const monthMap = new Map<string, Record<string, number>>()

    for (let i = months - 1; i >= 0; i--) {
      const ref = new Date(currentEnd)
      ref.setDate(1)
      ref.setMonth(ref.getMonth() - i)
      const key = `${ref.getFullYear()}-${ref.getMonth()}`
      const label = `${ref.getFullYear()}年${ref.getMonth() + 1}月`
      const values: Record<string, number> = {}
      for (const c of costKeyConfig) values[c.key] = 0
      monthMap.set(key, values)
      buckets.push({ key, label, values })
    }

    entries.forEach(({ product, costs, registeredAt }) => {
      if (Number.isNaN(registeredAt)) return
      const date = new Date(registeredAt)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      const values = monthMap.get(key)
      if (!values) return
      const quantity = product.expectedProduction.quantity || 1
      for (const c of costKeyConfig) {
        const costValue = c.key === "fees" ? (costs[c.key] ?? 0) : costs[c.key]
        values[c.key] += costValue * quantity
      }
    })

    return buckets
  })()

  const config = costKeyConfig.find((c) => c.key === selectedCategory)
  const displayData = series.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    value: bucket.values[selectedCategory] ?? 0,
  }))
  const maxVal = Math.max(1, ...displayData.map((d) => d.value))
  const hasData = displayData.some((d) => d.value > 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>コストカテゴリ別月次トレンド</CardTitle>
            <CardDescription>カテゴリを選択して月次推移を確認できます。</CardDescription>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-md border px-2 py-1 text-sm"
          >
            {costKeyConfig.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-sm text-muted-foreground">該当期間にデータがありません。</p>
        ) : (
          <div className="space-y-3">
            {displayData.map((bucket) => {
              const ratio = maxVal > 0 ? (bucket.value / maxVal) * 100 : 0
              return (
                <div key={bucket.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{bucket.label}</span>
                    <span className="text-xs text-muted-foreground">{formatCurrency(bucket.value)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={`h-2 rounded-full ${config?.color ?? "bg-primary"}`}
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
  )
}
