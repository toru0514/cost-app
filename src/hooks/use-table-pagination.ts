"use client"

import { useMemo, useState, useCallback } from "react"

const PAGE_SIZE = 10

export function useTablePagination<T>(rows: T[]) {
  const [page, setPage] = useState(1)

  const totalPages = Math.ceil(rows.length / PAGE_SIZE)
  const safePage = Math.min(page, Math.max(totalPages, 1))

  const pagedRows = useMemo(
    () => rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [rows, safePage]
  )

  const onPageChange = useCallback((p: number) => setPage(p), [])
  const resetPage = useCallback(() => setPage(1), [])

  return { pagedRows, currentPage: safePage, totalPages, onPageChange, resetPage }
}
