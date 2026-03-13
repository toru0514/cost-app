"use client"

import { useState, useMemo, useCallback, type ReactNode } from "react"
import { Search, SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export type SearchField = {
  key: string
  label: string
}

/** Highlight all matching occurrences of query within text. */
export function HighlightText({ text, query }: { text: string; query: string }): ReactNode {
  const trimmed = query.trim()
  if (!trimmed) return text

  const lowerText = text.toLowerCase()
  const lowerQuery = trimmed.toLowerCase()
  const parts: ReactNode[] = []
  let lastIndex = 0
  let matchIndex = lowerText.indexOf(lowerQuery, lastIndex)

  if (matchIndex < 0) return text

  while (matchIndex >= 0) {
    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex))
    }
    parts.push(
      <mark
        key={matchIndex}
        className="rounded-sm bg-yellow-200 px-0.5 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100"
      >
        {text.slice(matchIndex, matchIndex + trimmed.length)}
      </mark>
    )
    lastIndex = matchIndex + trimmed.length
    matchIndex = lowerText.indexOf(lowerQuery, lastIndex)
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <>{parts}</>
}

type SearchWithScopeProps = {
  fields: SearchField[]
  query: string
  onQueryChange: (query: string) => void
  checkedFields: Set<string>
  onCheckedFieldsChange: (fields: Set<string>) => void
  placeholder?: string
  resultCount?: number
  totalCount?: number
}

export function SearchWithScope({
  fields,
  query,
  onQueryChange,
  checkedFields,
  onCheckedFieldsChange,
  placeholder = "検索...",
  resultCount,
  totalCount,
}: SearchWithScopeProps) {
  const allChecked = checkedFields.size === fields.length
  const noneChecked = checkedFields.size === 0

  const handleToggleField = useCallback(
    (key: string) => {
      const next = new Set(checkedFields)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      onCheckedFieldsChange(next)
    },
    [checkedFields, onCheckedFieldsChange]
  )

  const handleToggleAll = useCallback(() => {
    if (allChecked) {
      onCheckedFieldsChange(new Set())
    } else {
      onCheckedFieldsChange(new Set(fields.map((f) => f.key)))
    }
  }, [allChecked, fields, onCheckedFieldsChange])

  const scopeLabel = allChecked || noneChecked ? "すべて" : `${checkedFields.size}項目`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 w-64 rounded-md border bg-transparent pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          data-search-input
        />
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">検索範囲</span>
            <span className="text-xs text-muted-foreground">({scopeLabel})</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56" align="start">
          <div className="space-y-3">
            <p className="text-sm font-medium">検索対象の項目</p>
            <div className="flex items-center gap-2">
              <Checkbox
                id="scope-all"
                checked={allChecked}
                onCheckedChange={handleToggleAll}
              />
              <Label htmlFor="scope-all" className="text-sm font-normal cursor-pointer">
                すべて選択
              </Label>
            </div>
            <div className="border-t pt-2 space-y-2">
              {fields.map((field) => (
                <div key={field.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`scope-${field.key}`}
                    checked={checkedFields.has(field.key)}
                    onCheckedChange={() => handleToggleField(field.key)}
                  />
                  <Label htmlFor={`scope-${field.key}`} className="text-sm font-normal cursor-pointer">
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {query.trim() && resultCount !== undefined && (
        <span className="text-xs text-muted-foreground">
          {resultCount}{totalCount !== undefined ? `/${totalCount}` : ""}件ヒット
        </span>
      )}
    </div>
  )
}

/** Utility: filter rows based on search query and checked fields */
export function filterRowsBySearch<T extends Record<string, unknown>>(
  rows: T[],
  query: string,
  checkedFields: Set<string>,
  allFieldKeys: string[]
): T[] {
  const normalized = query.trim().toLowerCase()
  if (normalized.length === 0) return rows

  // If no fields checked, treat as "all fields"
  const activeFields = checkedFields.size === 0 ? allFieldKeys : Array.from(checkedFields)

  return rows.filter((row) =>
    activeFields.some((key) => {
      const value = row[key]
      if (value === null || value === undefined) return false
      return String(value).toLowerCase().includes(normalized)
    })
  )
}

/** Hook for managing search state */
export function useSearchWithScope(fields: SearchField[]) {
  const [query, setQuery] = useState("")
  const [checkedFields, setCheckedFields] = useState<Set<string>>(
    () => new Set(fields.map((f) => f.key))
  )
  const allFieldKeys = useMemo(() => fields.map((f) => f.key), [fields])

  return { query, setQuery, checkedFields, setCheckedFields, allFieldKeys }
}
