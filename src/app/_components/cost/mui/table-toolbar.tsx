"use client"

import type { ReactNode } from "react"
import Box from "@mui/material/Box"
import FormControl from "@mui/material/FormControl"
import Select from "@mui/material/Select"
import MenuItem from "@mui/material/MenuItem"
import Chip from "@mui/material/Chip"
import Typography from "@mui/material/Typography"
import SortIcon from "@mui/icons-material/SwapVert"

import {
  MuiSearchWithScope,
  type SearchField,
} from "@/app/_components/cost/mui/search-with-scope"
import type { SortDirection } from "@/hooks/use-table-sort"
import type { FilterDefinition, FilterValues } from "@/hooks/use-table-filter"

type TableToolbarProps = {
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
  sort?: {
    sortKey: string
    sortDirection: SortDirection
    setSortKey: (key: string) => void
    setSortDirection: (dir: SortDirection) => void
    sortOptions: { key: string; label: string }[]
  }
  filter?: {
    filterDefinitions: FilterDefinition[]
    filterValues: FilterValues
    setFilter: (key: string, value: unknown) => void
    clearFilter: (key: string) => void
    clearFilters: () => void
    hasActiveFilters: boolean
  }
  children?: ReactNode
}

export function MuiTableToolbar({ search, sort, filter, children }: TableToolbarProps) {
  const sortValue = sort ? `${sort.sortKey}-${sort.sortDirection}` : ""

  const handleSortChange = (compositeValue: string) => {
    if (!sort) return
    const lastDash = compositeValue.lastIndexOf("-")
    const key = compositeValue.slice(0, lastDash)
    const dir = compositeValue.slice(lastDash + 1) as SortDirection
    sort.setSortKey(key)
    sort.setSortDirection(dir)
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
          {search && (
            <MuiSearchWithScope
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
                  <FormControl key={def.key} size="small" sx={{ minWidth: 140 }}>
                    <Select
                      value={(filter.filterValues[def.key] as string) ?? "all"}
                      onChange={(e) => filter.setFilter(def.key, e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="all">{def.allLabel ?? `すべての${def.label}`}</MenuItem>
                      {def.options.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )
              }
              return null
            })}
          {sort && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={sortValue}
                onChange={(e) => handleSortChange(e.target.value)}
                startAdornment={<SortIcon fontSize="small" sx={{ mr: 0.5 }} />}
                displayEmpty
              >
                {sort.sortOptions.map((option) => (
                  <MenuItem key={`${option.key}-asc`} value={`${option.key}-asc`}>
                    {option.label} (昇順)
                  </MenuItem>
                ))}
                {sort.sortOptions.map((option) => (
                  <MenuItem key={`${option.key}-desc`} value={`${option.key}-desc`}>
                    {option.label} (降順)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
        {children && <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>{children}</Box>}
      </Box>
      {filter && filter.hasActiveFilters && (
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.5 }}>
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
              <Chip
                key={def.key}
                label={chipLabel}
                size="small"
                onDelete={() => filter.clearFilter(def.key)}
              />
            )
          })}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
            onClick={filter.clearFilters}
          >
            クリア
          </Typography>
        </Box>
      )}
    </Box>
  )
}
