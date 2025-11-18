"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { AppData } from "@/lib/types"

import { monthsRangeOptions } from "../utils"

interface FilterPanelProps {
  monthsRange: string
  onMonthsRangeChange: (value: string) => void
  categoryFilter: string | null
  onCategoryFilterChange: (value: string | null) => void
  currentRangeLabel: string
  categories: AppData["categories"]["large"]
}

export function FilterPanel({
  monthsRange,
  onMonthsRangeChange,
  categoryFilter,
  onCategoryFilterChange,
  currentRangeLabel,
  categories,
}: FilterPanelProps) {
  return (
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
            <Select value={monthsRange} onValueChange={onMonthsRangeChange}>
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
              onValueChange={(value) => onCategoryFilterChange(value === "all" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのカテゴリ</SelectItem>
                {categories.map((category) => (
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
  )
}
