"use client"

import { Copy, Edit3, ImageOff, Trash2 } from "lucide-react"
import type { Product } from "@/lib/types"
import { formatCurrency, type EffectiveProfitResult } from "@/lib/calculations"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { TablePagination } from "@/components/ui/table-pagination"

type ProductCardEntry = {
  product: Product
  salePrice: number
  profit: number
  categoryPath: string
  effectiveResult?: EffectiveProfitResult
}

interface ProductCardGridProps {
  entries: ProductCardEntry[]
  onEdit: (productId: string) => void
  onCopy: (productId: string) => void
  onDelete: (product: Product) => void
}

export function ProductCardGrid({ entries, onEdit, onCopy, onDelete }: ProductCardGridProps) {
  const { pagedRows, currentPage, totalPages, onPageChange } = useTablePagination(entries, 20)

  return (
    <div className="space-y-3">
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {pagedRows.map(({ product, salePrice, profit, effectiveResult }) => (
        <div
          key={product.id}
          className="group relative flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md"
        >
          {/* 画像エリア */}
          <div className="relative aspect-square w-full overflow-hidden bg-muted">
            {product.imageUrl ? (
              // ユーザー入力URLをそのまま使用。将来的に next/image + remotePatterns での制限を検討
              <img
                src={product.imageUrl}
                alt={product.name}
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
                onClick={() => onEdit(product.id)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-800 hover:bg-white"
                title="編集"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onCopy(product.id)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-800 hover:bg-white"
                title="コピー"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(product)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-600 hover:bg-white"
                title="削除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* カード情報 */}
          <div className="flex flex-1 flex-col gap-1 p-2">
            <p className="line-clamp-2 text-sm font-medium leading-tight">{product.name}</p>
            <p className="text-sm font-semibold">{formatCurrency(salePrice, "JPY")}</p>
            <p className={`text-xs ${profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              粗利 {formatCurrency(profit, "JPY")}
            </p>
            {effectiveResult && effectiveResult.minRecordCount > 0 && (
              <p className="text-xs text-muted-foreground">
                実質利益率 {effectiveResult.effectiveProfitRate != null ? `${effectiveResult.effectiveProfitRate.toFixed(1)}%` : "-"}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
    <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  )
}
