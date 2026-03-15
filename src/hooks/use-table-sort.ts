"use client"

import { useMemo, useState, useCallback } from "react"

const jaCollator = new Intl.Collator("ja-JP")

export type SortOption<T> = {
  key: string
  label: string
  compareFn?: (a: T, b: T) => number
}

export type SortDirection = "asc" | "desc"

export function useTableSort<T>(
  items: T[],
  sortOptions: SortOption<T>[],
  defaultSortKey?: string,
  defaultDirection: SortDirection = "asc"
) {
  const [sortKey, setSortKey] = useState(defaultSortKey ?? sortOptions[0]?.key ?? "")
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection)

  const toggleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
      } else {
        setSortKey(key)
        setSortDirection("asc")
      }
    },
    [sortKey]
  )

  const sortedItems = useMemo(() => {
    const option = sortOptions.find((o) => o.key === sortKey)
    if (!option) return items

    const multiplier = sortDirection === "asc" ? 1 : -1

    return [...items].sort((a, b) => {
      if (option.compareFn) {
        return option.compareFn(a, b) * multiplier
      }
      // Default: compare by key as string with Japanese collator
      const aVal = (a as Record<string, unknown>)[option.key]
      const bVal = (b as Record<string, unknown>)[option.key]

      if (typeof aVal === "number" && typeof bVal === "number") {
        return (aVal - bVal) * multiplier
      }

      return jaCollator.compare(String(aVal ?? ""), String(bVal ?? "")) * multiplier
    })
  }, [items, sortOptions, sortKey, sortDirection])

  const renderSortMark = useCallback(
    (key: string) => {
      if (sortKey !== key) return ""
      return sortDirection === "asc" ? " ↑" : " ↓"
    },
    [sortKey, sortDirection]
  )

  return {
    sortedItems,
    sortKey,
    sortDirection,
    setSortKey,
    setSortDirection,
    toggleSort,
    renderSortMark,
    sortOptions,
  }
}
