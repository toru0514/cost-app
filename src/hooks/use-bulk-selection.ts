"use client"

import { useCallback, useState } from "react"

export function useBulkSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const handleSelectAll = useCallback((currentPageIds: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = currentPageIds.length > 0 && currentPageIds.every((id) => prev.has(id))
      const next = new Set(prev)
      if (allSelected) {
        currentPageIds.forEach((id) => next.delete(id))
      } else {
        currentPageIds.forEach((id) => next.add(id))
      }
      return next
    })
  }, [])

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isAllSelected = useCallback(
    (currentPageIds: string[]) =>
      currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.has(id)),
    [selectedIds]
  )

  const isSomeSelected = useCallback(
    (currentPageIds: string[]) => currentPageIds.some((id) => selectedIds.has(id)),
    [selectedIds]
  )

  const getOtherPageCount = useCallback(
    (currentPageIds: string[]) =>
      selectedIds.size - currentPageIds.filter((id) => selectedIds.has(id)).length,
    [selectedIds]
  )

  return {
    selectedIds,
    handleSelectAll,
    handleSelectOne,
    clearSelection,
    isAllSelected,
    isSomeSelected,
    getOtherPageCount,
  }
}
