"use client"

import { useState, useMemo, useCallback, type ReactNode } from "react"
import TextField from "@mui/material/TextField"
import InputAdornment from "@mui/material/InputAdornment"
import Button from "@mui/material/Button"
import Popover from "@mui/material/Popover"
import Checkbox from "@mui/material/Checkbox"
import FormControlLabel from "@mui/material/FormControlLabel"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import SearchIcon from "@mui/icons-material/Search"
import TuneIcon from "@mui/icons-material/Tune"

export type SearchField = {
  key: string
  label: string
}

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
        style={{
          borderRadius: 2,
          backgroundColor: "#fef08a",
          padding: "0 2px",
          color: "#713f12",
        }}
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

export function MuiSearchWithScope({
  fields,
  query,
  onQueryChange,
  checkedFields,
  onCheckedFieldsChange,
  placeholder = "検索...",
  resultCount,
  totalCount,
}: SearchWithScopeProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
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
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
      <TextField
        size="small"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={placeholder}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
        sx={{ width: 256 }}
      />
      <Button
        variant="outlined"
        size="small"
        startIcon={<TuneIcon />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ textTransform: "none" }}
      >
        検索範囲 ({scopeLabel})
      </Button>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 2, minWidth: 200 }}>
          <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
            検索対象の項目
          </Typography>
          <FormControlLabel
            control={<Checkbox size="small" checked={allChecked} onChange={handleToggleAll} />}
            label="すべて選択"
            slotProps={{ typography: { variant: "body2" } }}
          />
          <Box sx={{ borderTop: 1, borderColor: "divider", pt: 1, mt: 1 }}>
            {fields.map((field) => (
              <FormControlLabel
                key={field.key}
                control={
                  <Checkbox
                    size="small"
                    checked={checkedFields.has(field.key)}
                    onChange={() => handleToggleField(field.key)}
                  />
                }
                label={field.label}
                slotProps={{ typography: { variant: "body2" } }}
                sx={{ display: "block" }}
              />
            ))}
          </Box>
        </Box>
      </Popover>
      {query.trim() && resultCount !== undefined && (
        <Typography variant="caption" color="text.secondary">
          {resultCount}
          {totalCount !== undefined ? `/${totalCount}` : ""}件ヒット
        </Typography>
      )}
    </Box>
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
