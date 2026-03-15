"use client"

import { useMemo, useState, useCallback } from "react"

export type FilterDefinition =
  | {
      type: "select"
      key: string
      label: string
      options: { value: string; label: string }[]
      allLabel?: string
    }
  | {
      type: "date-range"
      key: string
      label: string
    }

export type FilterValues = Record<string, unknown>

export function useTableFilter<T>(
  items: T[],
  filters: FilterDefinition[],
  filterFn?: (item: T, activeFilters: FilterValues) => boolean
) {
  const [filterValues, setFilterValues] = useState<FilterValues>({})

  const setFilter = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => {
      const next = { ...prev }
      if (value === undefined || value === null || value === "" || value === "all") {
        delete next[key]
      } else {
        next[key] = value
      }
      return next
    })
  }, [])

  const clearFilter = useCallback((key: string) => {
    setFilterValues((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const clearFilters = useCallback(() => {
    setFilterValues({})
  }, [])

  const hasActiveFilters = useMemo(
    () => Object.keys(filterValues).length > 0,
    [filterValues]
  )

  const filteredItems = useMemo(() => {
    if (!hasActiveFilters) return items
    if (filterFn) {
      return items.filter((item) => filterFn(item, filterValues))
    }
    return items
  }, [items, filterValues, hasActiveFilters, filterFn])

  return {
    filteredItems,
    filterValues,
    setFilter,
    clearFilter,
    clearFilters,
    hasActiveFilters,
    filterDefinitions: filters,
  }
}
