"use client"

import { Copy, Edit3, ImageOff, Trash2 } from "lucide-react"
import type { PackagingItem } from "@/lib/types"
import { formatCurrency } from "@/lib/calculations"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { TablePagination } from "@/components/ui/table-pagination"

interface PackagingCardGridProps {
  items: PackagingItem[]
  onEdit: (item: PackagingItem) => void
  onCopy: (item: PackagingItem) => void
  onDelete: (item: PackagingItem) => void
}

export function PackagingCardGrid({ items, onEdit, onCopy, onDelete }: PackagingCardGridProps) {
  const { pagedRows, currentPage, totalPages, onPageChange } = useTablePagination(items, 20)

  return (
    <div className="space-y-3">
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {pagedRows.map((item) => (
        <div
          key={item.id}
          className="group relative flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md"
        >
          {/* 画像エリア */}
          <div className="relative aspect-square w-full overflow-hidden bg-muted">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageOff className="h-10 w-10 text-muted-foreground/40" />
              </div>
            )}
            {/* ホバーでアクションボタン */}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-800 hover:bg-white"
                title="編集"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onCopy(item)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-800 hover:bg-white"
                title="コピー"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-600 hover:bg-white"
                title="削除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* カード情報 */}
          <div className="flex flex-1 flex-col gap-1 p-2">
            <p className="line-clamp-2 text-sm font-medium leading-tight">{item.name}</p>
            <p className="text-sm font-semibold">{formatCurrency(item.unitCost, item.currency)}</p>
            <p className="text-xs text-muted-foreground">
              {item.unit}{item.unitsPerBatch && item.unitsPerBatch > 1 ? ` / ${item.unitsPerBatch}単位` : ""}
            </p>
            {item.sizeDescription && (
              <p className="truncate text-xs text-muted-foreground">{item.sizeDescription}</p>
            )}
          </div>
        </div>
      ))}
    </div>
    <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  )
}
