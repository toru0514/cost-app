"use client"

import { useMemo, useState, useCallback } from "react"

const DEFAULT_PAGE_SIZE = 10

export function useTablePagination<T>(rows: T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)

  const totalPages = Math.ceil(rows.length / pageSize)
  const safePage = Math.min(page, Math.max(totalPages, 1))

  const pagedRows = useMemo(
    () => rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [rows, safePage, pageSize]
  )

  const onPageChange = useCallback((p: number) => setPage(p), [])
  const resetPage = useCallback(() => setPage(1), [])

  return { pagedRows, currentPage: safePage, totalPages, onPageChange, resetPage }
}
