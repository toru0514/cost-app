"use client"

import { Edit3, ImageOff } from "lucide-react"
import { formatCurrency } from "@/lib/calculations"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { TablePagination } from "@/components/ui/table-pagination"

const formatRoundedQuantity = (quantity: number) => {
  const rounded = Math.round((quantity + Number.EPSILON) * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

const formatStock = (quantity: number | undefined, unit: string) => {
  if (quantity === undefined) return "未設定"
  return `${formatRoundedQuantity(quantity)} ${unit}`.trim()
}

const stockColorClass = (quantity: number | undefined) => {
  if (quantity === undefined) return "bg-muted text-muted-foreground"
  if (quantity < 5) return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
  if (quantity < 10) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
  return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
}

// --- Material Stock Card Grid ---

type MaterialStockRow = {
  id: string
  name: string
  imageUrl?: string
  unit: string
  unitCost: number
  currency: string
  supplier?: string
  stock: number | undefined
  stockUnit: string
}

interface MaterialStockCardGridProps {
  rows: MaterialStockRow[]
  onEditMaster?: () => void
}

export function MaterialStockCardGrid({ rows, onEditMaster }: MaterialStockCardGridProps) {
  const { pagedRows, currentPage, totalPages, onPageChange } = useTablePagination(rows, 20)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {pagedRows.map((row) => (
          <div
            key={row.id}
            className="group relative flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-muted">
              {row.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={row.imageUrl}
                  alt={row.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageOff className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}
            </div>
            {onEditMaster && (
              <button
                type="button"
                className="absolute right-1.5 top-1.5 rounded bg-background/80 p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                onClick={onEditMaster}
                title="マスタ編集"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="flex flex-1 flex-col gap-1 p-2">
              <p className="line-clamp-2 text-sm font-medium leading-tight">{row.name}</p>
              <p className="text-sm font-semibold">{formatCurrency(row.unitCost, row.currency)}</p>
              <p className="text-xs text-muted-foreground">{row.unit}</p>
              {row.supplier && (
                <p className="truncate text-xs text-muted-foreground">{row.supplier}</p>
              )}
              <span className={`mt-auto inline-flex self-start rounded px-2 py-0.5 text-xs font-medium ${stockColorClass(row.stock)}`}>
                {formatStock(row.stock, row.stockUnit)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  )
}

// --- Packaging Stock Card Grid ---

type PackagingStockRow = {
  id: string
  name: string
  imageUrl?: string
  unit: string
  unitCost: number
  currency: string
  sizeDescription?: string
  stock: number | undefined
  stockUnit: string
}

interface PackagingStockCardGridProps {
  rows: PackagingStockRow[]
  onEditMaster?: () => void
}

export function PackagingStockCardGrid({ rows, onEditMaster }: PackagingStockCardGridProps) {
  const { pagedRows, currentPage, totalPages, onPageChange } = useTablePagination(rows, 20)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {pagedRows.map((row) => (
          <div
            key={row.id}
            className="group relative flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-muted">
              {row.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={row.imageUrl}
                  alt={row.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageOff className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}
            </div>
            {onEditMaster && (
              <button
                type="button"
                className="absolute right-1.5 top-1.5 rounded bg-background/80 p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                onClick={onEditMaster}
                title="マスタ編集"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="flex flex-1 flex-col gap-1 p-2">
              <p className="line-clamp-2 text-sm font-medium leading-tight">{row.name}</p>
              <p className="text-sm font-semibold">{formatCurrency(row.unitCost, row.currency)}</p>
              <p className="text-xs text-muted-foreground">{row.unit}</p>
              {row.sizeDescription && (
                <p className="truncate text-xs text-muted-foreground">{row.sizeDescription}</p>
              )}
              <span className={`mt-auto inline-flex self-start rounded px-2 py-0.5 text-xs font-medium ${stockColorClass(row.stock)}`}>
                {formatStock(row.stock, row.stockUnit)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  )
}

// --- Equipment Card Grid ---

type EquipmentRow = {
  id: string
  name: string
  imageUrl?: string
  acquisitionCost: number
  currency: string
  amortizationYears: number
  utilizationRate: number
}

interface EquipmentCardGridProps {
  rows: EquipmentRow[]
  onEditMaster?: () => void
}

export function EquipmentCardGrid({ rows, onEditMaster }: EquipmentCardGridProps) {
  const { pagedRows, currentPage, totalPages, onPageChange } = useTablePagination(rows, 20)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {pagedRows.map((row) => (
          <div
            key={row.id}
            className="group relative flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-muted">
              {row.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={row.imageUrl}
                  alt={row.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageOff className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}
            </div>
            {onEditMaster && (
              <button
                type="button"
                className="absolute right-1.5 top-1.5 rounded bg-background/80 p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                onClick={onEditMaster}
                title="マスタ編集"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="flex flex-1 flex-col gap-1 p-2">
              <p className="line-clamp-2 text-sm font-medium leading-tight">{row.name}</p>
              <p className="text-sm font-semibold">{formatCurrency(row.acquisitionCost, row.currency)}</p>
              <p className="text-xs text-muted-foreground">{row.amortizationYears}年償却</p>
              <p className="text-xs text-muted-foreground">使用率 {row.utilizationRate}%</p>
            </div>
          </div>
        ))}
      </div>
      <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  )
}
