"use client"

import { Copy, Edit3, ImageOff, Trash2 } from "lucide-react"
import type { Material } from "@/lib/types"
import { formatCurrency } from "@/lib/calculations"

interface MaterialCardGridProps {
  items: Material[]
  onEdit: (material: Material) => void
  onCopy: (material: Material) => void
  onDelete: (material: Material) => void
}

export function MaterialCardGrid({ items, onEdit, onCopy, onDelete }: MaterialCardGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {items.map((material) => (
        <div
          key={material.id}
          className="group relative flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md"
        >
          {/* 画像エリア */}
          <div className="relative aspect-square w-full overflow-hidden bg-muted">
            {material.imageUrl ? (
              <img
                src={material.imageUrl}
                alt={material.name}
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
                onClick={() => onEdit(material)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-800 hover:bg-white"
                title="編集"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onCopy(material)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-800 hover:bg-white"
                title="コピー"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(material)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-600 hover:bg-white"
                title="削除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* カード情報 */}
          <div className="flex flex-1 flex-col gap-1 p-2">
            <p className="line-clamp-2 text-sm font-medium leading-tight">{material.name}</p>
            <p className="text-sm font-semibold">{formatCurrency(material.unitCost, material.currency)}</p>
            <p className="text-xs text-muted-foreground">
              {material.unit}{material.unitsPerBatch && material.unitsPerBatch > 1 ? ` / ${material.unitsPerBatch}単位` : ""}
            </p>
            {material.supplier && (
              <p className="truncate text-xs text-muted-foreground">{material.supplier}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
