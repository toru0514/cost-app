"use client"

import type { ReactNode } from "react"
import { ArrowUpDown, X } from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  SearchWithScope,
  type SearchField,
} from "@/app/_components/shared/search-with-scope"
import type { SortDirection } from "@/hooks/use-table-sort"
import type { FilterDefinition, FilterValues } from "@/hooks/use-table-filter"

type TableToolbarProps = {
  // Search (optional)
  search?: {
    fields: SearchField[]
    query: string
    onQueryChange: (query: string) => void
    checkedFields: Set<string>
    onCheckedFieldsChange: (fields: Set<string>) => void
    placeholder?: string
    resultCount?: number
    totalCount?: number
  }
  // Sort (optional)
  sort?: {
    sortKey: string
    sortDirection: SortDirection
    setSortKey: (key: string) => void
    setSortDirection: (dir: SortDirection) => void
    sortOptions: { key: string; label: string }[]
  }
  // Filter (optional)
  filter?: {
    filterDefinitions: FilterDefinition[]
    filterValues: FilterValues
    setFilter: (key: string, value: unknown) => void
    clearFilter: (key: string) => void
    clearFilters: () => void
    hasActiveFilters: boolean
  }
  // Extra controls (right side)
  children?: ReactNode
}

export function TableToolbar({ search, sort, filter, children }: TableToolbarProps) {
  const sortValue = sort ? `${sort.sortKey}-${sort.sortDirection}` : undefined

  const handleSortChange = (compositeValue: string) => {
    if (!sort) return
    const lastDash = compositeValue.lastIndexOf("-")
    const key = compositeValue.slice(0, lastDash)
    const dir = compositeValue.slice(lastDash + 1) as SortDirection
    sort.setSortKey(key)
    sort.setSortDirection(dir)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {search && (
            <SearchWithScope
              fields={search.fields}
              query={search.query}
              onQueryChange={search.onQueryChange}
              checkedFields={search.checkedFields}
              onCheckedFieldsChange={search.onCheckedFieldsChange}
              placeholder={search.placeholder}
              resultCount={search.resultCount}
              totalCount={search.totalCount}
            />
          )}
          {filter &&
            filter.filterDefinitions.map((def) => {
              if (def.type === "select") {
                return (
                  <Select
                    key={def.key}
                    value={(filter.filterValues[def.key] as string) ?? "all"}
                    onValueChange={(value) => filter.setFilter(def.key, value)}
                  >
                    <SelectTrigger className="h-9 w-auto gap-1.5 border px-3">
                      <SelectValue placeholder={def.label} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{def.allLabel ?? `すべての${def.label}`}</SelectItem>
                      {def.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              }
              if (def.type === "date-range") {
                const rangeValue = (filter.filterValues[def.key] as { from?: string; to?: string }) ?? {}
                return (
                  <div key={def.key} className="flex items-center gap-2">
                    <input
                      type="date"
                      value={rangeValue.from ?? ""}
                      onChange={(e) =>
                        filter.setFilter(def.key, { ...rangeValue, from: e.target.value || undefined })
                      }
                      className="h-9 rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="text-sm text-muted-foreground">〜</span>
                    <input
                      type="date"
                      value={rangeValue.to ?? ""}
                      onChange={(e) =>
                        filter.setFilter(def.key, { ...rangeValue, to: e.target.value || undefined })
                      }
                      className="h-9 rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                )
              }
              return null
            })}
          {sort && (
            <Select value={sortValue} onValueChange={handleSortChange}>
              <SelectTrigger className="h-9 w-auto gap-1.5 border px-3">
                <ArrowUpDown className="h-4 w-4" />
                <SelectValue placeholder="並び替え" />
              </SelectTrigger>
              <SelectContent>
                {sort.sortOptions.map((option) => (
                  <SelectItem key={`${option.key}-asc`} value={`${option.key}-asc`}>
                    {option.label} (昇順)
                  </SelectItem>
                ))}
                {sort.sortOptions.map((option) => (
                  <SelectItem key={`${option.key}-desc`} value={`${option.key}-desc`}>
                    {option.label} (降順)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
      {/* Active filter chips */}
      {filter && filter.hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filter.filterDefinitions.map((def) => {
            const value = filter.filterValues[def.key]
            if (value === undefined || value === null) return null

            let chipLabel = ""
            if (def.type === "select") {
              const option = def.options.find((o) => o.value === value)
              chipLabel = `${def.label}: ${option?.label ?? String(value)}`
            } else if (def.type === "date-range") {
              const range = value as { from?: string; to?: string }
              if (!range.from && !range.to) return null
              chipLabel = `${def.label}: ${range.from ?? ""}〜${range.to ?? ""}`
            }

            return (
              <button
                key={def.key}
                type="button"
                className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                onClick={() => filter.clearFilter(def.key)}
              >
                {chipLabel}
                <X className="h-3 w-3" />
              </button>
            )
          })}
          <button
            type="button"
            className="text-xs text-muted-foreground hover:underline"
            onClick={filter.clearFilters}
          >
            クリア
          </button>
        </div>
      )}
    </div>
  )
}
