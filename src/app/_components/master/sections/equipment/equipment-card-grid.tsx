"use client"

import { Copy, Edit3, ImageOff, Trash2 } from "lucide-react"
import type { Equipment } from "@/lib/types"
import { formatCurrency } from "@/lib/calculations"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { TablePagination } from "@/components/ui/table-pagination"

interface EquipmentCardGridProps {
  items: Equipment[]
  onEdit: (item: Equipment) => void
  onCopy: (item: Equipment) => void
  onDelete: (item: Equipment) => void
}

export function EquipmentCardGrid({ items, onEdit, onCopy, onDelete }: EquipmentCardGridProps) {
  const { pagedRows, currentPage, totalPages, onPageChange } = useTablePagination(items, 20)

  return (
    <div className="space-y-3">
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {pagedRows.map((equipment) => (
        <div
          key={equipment.id}
          className="group relative flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md"
        >
          {/* 画像エリア */}
          <div className="relative aspect-square w-full overflow-hidden bg-muted">
            {equipment.imageUrl ? (
              <img
                src={equipment.imageUrl}
                alt={equipment.name}
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
                onClick={() => onEdit(equipment)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-800 hover:bg-white"
                title="編集"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onCopy(equipment)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-800 hover:bg-white"
                title="コピー"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(equipment)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-600 hover:bg-white"
                title="削除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* カード情報 */}
          <div className="flex flex-1 flex-col gap-1 p-2">
            <p className="line-clamp-2 text-sm font-medium leading-tight">{equipment.name}</p>
            <p className="text-sm font-semibold">{formatCurrency(equipment.acquisitionCost, equipment.currency)}</p>
            <p className="text-xs text-muted-foreground">
              {equipment.amortizationYears}年償却
            </p>
            <p className="text-xs text-muted-foreground">
              稼働率{equipment.utilizationRate ?? 100}%
            </p>
          </div>
        </div>
      ))}
    </div>
    <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  )
}
