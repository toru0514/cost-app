"use client"

import { Button } from "@/components/ui/button"

interface TablePaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function TablePagination({ currentPage, totalPages, onPageChange }: TablePaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between px-2 py-2">
      <p className="text-xs text-muted-foreground">
        {currentPage} / {totalPages} ページ
      </p>
      <div className="flex gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          前へ
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          次へ
        </Button>
      </div>
    </div>
  )
}
