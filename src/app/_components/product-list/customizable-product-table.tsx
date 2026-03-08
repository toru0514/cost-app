"use client"

import { useMemo, useState } from "react"
import { Copy, Edit3, GripVertical, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/calculations"
import type { Product } from "@/lib/types"
import { toast } from "sonner"

export const CUSTOMIZABLE_PRODUCT_COLUMNS = [
  "stock",
  "category",
  "options",
  "shipping",
  "equipment",
  "productionLotSize",
  "expectedProduction",
  "salePrice",
  "profit",
  "notes",
] as const

export type CustomizableProductColumnKey = (typeof CUSTOMIZABLE_PRODUCT_COLUMNS)[number]

type ProductListEntry = {
  product: Product
  salePrice: number
  profit: number
  categoryPath: string
  shippingText: string
  equipmentText: string
}

export type ProductTableColumnSettings = {
  columnOrder: CustomizableProductColumnKey[]
  hiddenColumns: CustomizableProductColumnKey[]
}

type Props = {
  entries: ProductListEntry[]
  isAuthenticated: boolean
  stocks: Map<string, number>
  stocksLoaded: boolean
  columnSettings: ProductTableColumnSettings
  onColumnSettingsChange: (next: ProductTableColumnSettings) => void
  onAdjustStock: (productId: string, delta: number) => Promise<void>
  onEdit: (productId: string) => void
  onCopy: (productId: string) => void
  onDelete: (product: Product) => void
}

const COLUMN_LABELS: Record<CustomizableProductColumnKey, string> = {
  stock: "在庫",
  category: "カテゴリ",
  options: "オプション/個数",
  shipping: "配送方法",
  equipment: "使用設備",
  productionLotSize: "制作ロット数",
  expectedProduction: "想定生産数",
  salePrice: "販売価格",
  profit: "利益",
  notes: "備考",
}

const moveBefore = (
  source: CustomizableProductColumnKey,
  target: CustomizableProductColumnKey,
  order: CustomizableProductColumnKey[]
) => {
  if (source === target) return order
  const without = order.filter((key) => key !== source)
  const index = without.indexOf(target)
  if (index < 0) return order
  return [...without.slice(0, index), source, ...without.slice(index)]
}

export function normalizeProductTableColumnSettings(raw: {
  columnOrder?: string[] | null
  hiddenColumns?: string[] | null
}): ProductTableColumnSettings {
  const validSet = new Set<string>(CUSTOMIZABLE_PRODUCT_COLUMNS)
  const orderInput = Array.isArray(raw.columnOrder) ? raw.columnOrder : []
  const hiddenInput = Array.isArray(raw.hiddenColumns) ? raw.hiddenColumns : []

  const columnOrder = orderInput
    .filter((key): key is CustomizableProductColumnKey => validSet.has(key))
    .filter((key, index, arr) => arr.indexOf(key) === index)

  CUSTOMIZABLE_PRODUCT_COLUMNS.forEach((key) => {
    if (!columnOrder.includes(key)) {
      columnOrder.push(key)
    }
  })

  const hiddenColumns = hiddenInput
    .filter((key): key is CustomizableProductColumnKey => validSet.has(key))
    .filter((key, index, arr) => arr.indexOf(key) === index)

  return { columnOrder, hiddenColumns }
}

export function defaultProductTableColumnSettings(): ProductTableColumnSettings {
  return {
    columnOrder: [...CUSTOMIZABLE_PRODUCT_COLUMNS],
    hiddenColumns: [],
  }
}

export function CustomizableProductTable({
  entries,
  isAuthenticated,
  stocks,
  stocksLoaded,
  columnSettings,
  onColumnSettingsChange,
  onAdjustStock,
  onEdit,
  onCopy,
  onDelete,
}: Props) {
  const [draggingColumn, setDraggingColumn] = useState<CustomizableProductColumnKey | null>(null)
  const [showHiddenColumns, setShowHiddenColumns] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const hiddenSet = useMemo(() => new Set(columnSettings.hiddenColumns), [columnSettings.hiddenColumns])
  const visibleColumns = useMemo(
    () => columnSettings.columnOrder.filter((key) => !hiddenSet.has(key)),
    [columnSettings.columnOrder, hiddenSet]
  )

  const updateOrder = (nextOrder: CustomizableProductColumnKey[]) => {
    onColumnSettingsChange({
      ...columnSettings,
      columnOrder: nextOrder,
    })
  }

  const hideColumn = (key: CustomizableProductColumnKey) => {
    if (columnSettings.hiddenColumns.includes(key)) return
    onColumnSettingsChange({
      ...columnSettings,
      hiddenColumns: [...columnSettings.hiddenColumns, key],
    })
  }

  const showColumn = (key: CustomizableProductColumnKey) => {
    onColumnSettingsChange({
      ...columnSettings,
      hiddenColumns: columnSettings.hiddenColumns.filter((item) => item !== key),
      columnOrder: columnSettings.columnOrder.includes(key)
        ? columnSettings.columnOrder
        : [...columnSettings.columnOrder, key],
    })
  }

  const adjustStock = async (productId: string, delta: number) => {
    setBusyKey(`${productId}:${delta > 0 ? "add" : "use"}`)
    try {
      await onAdjustStock(productId, delta)
    } catch {
      toast.error("在庫の更新に失敗しました")
    } finally {
      setBusyKey(null)
    }
  }

  const renderColumnCell = (key: CustomizableProductColumnKey, entry: ProductListEntry) => {
    const { product, salePrice, profit, categoryPath, shippingText, equipmentText } = entry
    const stockQuantity = stocks.get(product.id) ?? 0
    const isBusy = busyKey?.startsWith(`${product.id}:`) ?? false
    switch (key) {
      case "stock":
        return (
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              stocksLoaded ? (
                <Badge variant={stockQuantity === 0 ? "outline" : "secondary"} className="min-w-10 justify-center text-sm">
                  {stockQuantity}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">読込中...</span>
              )
            ) : (
              <span className="text-xs text-muted-foreground">-</span>
            )}
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 w-7 px-0"
                onClick={() => adjustStock(product.id, 1)}
                disabled={!isAuthenticated || !stocksLoaded || isBusy}
              >
                +
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 w-7 px-0"
                onClick={() => adjustStock(product.id, -1)}
                disabled={!isAuthenticated || !stocksLoaded || isBusy || stockQuantity === 0}
              >
                -
              </Button>
            </div>
          </div>
        )
      case "category":
        return categoryPath
      case "options": {
        const optionText =
          (product.sizeVariants ?? [])
            .filter((variant) => variant.label?.trim())
            .map((variant) => `${variant.label}: ${variant.quantity}個`)
            .join(" / ") || "-"
        return optionText
      }
      case "shipping":
        return shippingText
      case "equipment":
        return equipmentText
      case "productionLotSize":
        return product.productionLotSize ?? 0
      case "expectedProduction":
        return product.expectedProduction?.quantity ?? 0
      case "salePrice":
        return formatCurrency(salePrice)
      case "profit":
        return formatCurrency(profit)
      case "notes": {
        const notesText = product.notes?.trim() || "-"
        return notesText
      }
      default:
        return "-"
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 rounded-md border border-dashed p-3 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-muted-foreground">
          {isAuthenticated
            ? "「商品」列は固定です。その他の列はヘッダーをドラッグして並び替え、右側ドロップで非表示にできます。"
            : "カラムカスタマイズはログイン中のみ利用できます。"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowHiddenColumns((prev) => !prev)}
            disabled={!isAuthenticated}
          >
            非表示列 ({columnSettings.hiddenColumns.length})
          </Button>
          <div
            className="rounded-md border border-dashed px-3 py-1.5 text-xs text-muted-foreground"
            onDragOver={(event) => {
              if (!isAuthenticated || !draggingColumn) return
              event.preventDefault()
            }}
            onDrop={(event) => {
              if (!isAuthenticated || !draggingColumn) return
              event.preventDefault()
              hideColumn(draggingColumn)
              setDraggingColumn(null)
            }}
          >
            非表示エリアへドロップ
          </div>
        </div>
      </div>

      {showHiddenColumns && (
        <div className="rounded-md border p-3">
          {columnSettings.hiddenColumns.length === 0 ? (
            <p className="text-xs text-muted-foreground">非表示の列はありません。</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {columnSettings.hiddenColumns.map((key) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => showColumn(key)}
                  disabled={!isAuthenticated}
                >
                  {COLUMN_LABELS[key]} を表示
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>商品</TableHead>
              {visibleColumns.map((key) => (
                <TableHead
                  key={key}
                  onDragOver={(event) => {
                    if (!isAuthenticated || !draggingColumn) return
                    event.preventDefault()
                  }}
                  onDrop={(event) => {
                    if (!isAuthenticated || !draggingColumn) return
                    event.preventDefault()
                    updateOrder(moveBefore(draggingColumn, key, columnSettings.columnOrder))
                    setDraggingColumn(null)
                  }}
                >
                  <div
                    className={`inline-flex items-center gap-1 rounded px-1 py-0.5 ${
                      isAuthenticated ? "cursor-move hover:bg-muted" : ""
                    }`}
                    draggable={isAuthenticated}
                    onDragStart={() => setDraggingColumn(key)}
                    onDragEnd={() => setDraggingColumn(null)}
                    title={isAuthenticated ? "ドラッグして並び替え/非表示" : undefined}
                  >
                    {isAuthenticated && <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />}
                    {COLUMN_LABELS[key]}
                  </div>
                </TableHead>
              ))}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.product.id} className="group">
                <TableCell className="font-medium">{entry.product.name}</TableCell>
                {visibleColumns.map((key) => (
                  <TableCell
                    key={`${entry.product.id}-${key}`}
                    className={
                      key === "profit"
                        ? entry.profit >= 0
                          ? "text-green-600"
                          : "text-red-600"
                        : key === "options" || key === "shipping" || key === "equipment" || key === "notes" || key === "productionLotSize" || key === "expectedProduction"
                          ? "text-xs text-muted-foreground"
                          : undefined
                    }
                  >
                    {renderColumnCell(key, entry)}
                  </TableCell>
                ))}
                <TableCell className="w-48 text-right">
                  <div className="flex flex-wrap justify-end gap-2 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => onEdit(entry.product.id)}
                    >
                      <Edit3 className="mr-1 h-4 w-4" />
                      編集
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="w-full sm:w-auto"
                      onClick={() => onCopy(entry.product.id)}
                    >
                      <Copy className="mr-1 h-4 w-4" />
                      コピー
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="w-full sm:w-auto"
                      onClick={() => onDelete(entry.product)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      削除
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
