"use client"

import { useMemo, useState } from "react"
import { Bell, BellOff, Copy, Edit3, GripVertical, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination } from "@/components/ui/table-pagination"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { formatCurrency } from "@/lib/calculations"
import type { Product, StockAlertSetting } from "@/lib/types"
import { toast } from "sonner"
import {
  SearchWithScope,
  filterRowsBySearch,
  useSearchWithScope,
  type SearchField,
} from "@/app/_components/shared/search-with-scope"

export const CUSTOMIZABLE_PRODUCT_COLUMNS = [
  "stock",
  "stockAlert",
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
  stockAlertSettings: Map<string, StockAlertSetting>
  stockAlertSettingsLoaded: boolean
  onUpdateStockAlertSetting: (
    itemType: StockAlertSetting["itemType"],
    itemId: string,
    enabled: boolean,
    threshold: number
  ) => Promise<void>
  onCheckAndNotifyLowStock: (
    itemType: StockAlertSetting["itemType"],
    itemId: string,
    itemName: string,
    newQuantity: number
  ) => void
}

const COLUMN_LABELS: Record<CustomizableProductColumnKey, string> = {
  stock: "在庫",
  stockAlert: "通知",
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
  stockAlertSettings,
  stockAlertSettingsLoaded,
  onUpdateStockAlertSetting,
  onCheckAndNotifyLowStock,
}: Props) {
  const [draggingColumn, setDraggingColumn] = useState<CustomizableProductColumnKey | null>(null)
  const [showHiddenColumns, setShowHiddenColumns] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [thresholdInputs, setThresholdInputs] = useState<Map<string, string>>(new Map())
  const [adjustAmounts, setAdjustAmounts] = useState<Map<string, string>>(new Map())

  const searchFields: SearchField[] = useMemo(
    () => [
      { key: "name", label: "商品名" },
      { key: "notes", label: "備考" },
    ],
    []
  )
  const { query, setQuery, checkedFields, setCheckedFields, allFieldKeys } = useSearchWithScope(searchFields)

  const entryRows = useMemo(
    () =>
      entries.map((e) => ({
        id: e.product.id,
        name: e.product.name,
        notes: e.product.notes ?? "",
      })),
    [entries]
  )

  const filteredEntries = useMemo(() => {
    const filtered = filterRowsBySearch(entryRows, query, checkedFields, allFieldKeys)
    const filteredIds = new Set(filtered.map((r) => r.id as string))
    return entries.filter((e) => filteredIds.has(e.product.id))
  }, [entries, entryRows, query, checkedFields, allFieldKeys])

  const pagination = useTablePagination(filteredEntries)

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

  const getAlertSetting = (productId: string) =>
    stockAlertSettings.get(`product:${productId}`)

  const getThresholdValue = (productId: string) => {
    const inputVal = thresholdInputs.get(productId)
    if (inputVal !== undefined) return inputVal
    const setting = getAlertSetting(productId)
    return String(setting?.threshold ?? 5)
  }

  const handleToggleAlert = async (productId: string, enabled: boolean) => {
    const threshold = parseInt(getThresholdValue(productId), 10) || 5
    try {
      await onUpdateStockAlertSetting("product", productId, enabled, threshold)
      toast.success(enabled ? "在庫通知をONにしました" : "在庫通知をOFFにしました")
    } catch {
      toast.error("通知設定の更新に失敗しました")
    }
  }

  const handleThresholdBlur = async (productId: string) => {
    const setting = getAlertSetting(productId)
    if (!setting?.enabled) return
    const threshold = Math.max(1, parseInt(getThresholdValue(productId), 10) || 5)
    if (threshold === setting.threshold) return
    try {
      await onUpdateStockAlertSetting("product", productId, setting.enabled, threshold)
    } catch {
      toast.error("閾値の更新に失敗しました")
    }
  }

  const getAdjustAmount = (productId: string) =>
    Math.max(1, parseInt(adjustAmounts.get(productId) ?? "1", 10) || 1)

  const adjustStock = async (productId: string, productName: string, delta: number) => {
    setBusyKey(`${productId}:${delta > 0 ? "add" : "use"}`)
    try {
      await onAdjustStock(productId, delta)
      const currentQty = stocks.get(productId) ?? 0
      const newQty = Math.max(0, currentQty + delta)
      onCheckAndNotifyLowStock("product", productId, productName, newQty)
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
      case "stock": {
        // 在庫数に応じた色分け
        const stockColorClass =
          stockQuantity < 5
            ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
            : stockQuantity < 10
              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
              : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
        return (
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              stocksLoaded ? (
                <span className={`inline-flex min-w-[2rem] justify-center rounded px-1.5 py-0.5 text-xs font-medium ${stockColorClass}`}>
                  {stockQuantity}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">読込中...</span>
              )
            ) : (
              <span className="text-xs text-muted-foreground">-</span>
            )}
            <Input
              type="number"
              min={1}
              value={adjustAmounts.get(product.id) ?? "1"}
              onChange={(e) =>
                setAdjustAmounts((prev) => {
                  const next = new Map(prev)
                  next.set(product.id, e.target.value)
                  return next
                })
              }
              className="h-6 w-12 text-xs"
              disabled={!isAuthenticated || !stocksLoaded}
            />
            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 w-6 px-0"
                onClick={() => adjustStock(product.id, product.name, getAdjustAmount(product.id))}
                disabled={!isAuthenticated || !stocksLoaded || isBusy}
              >
                +
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 w-6 px-0"
                onClick={() => adjustStock(product.id, product.name, -getAdjustAmount(product.id))}
                disabled={!isAuthenticated || !stocksLoaded || isBusy || stockQuantity === 0}
              >
                -
              </Button>
            </div>
          </div>
        )
      }
      case "stockAlert": {
        if (!isAuthenticated || !stockAlertSettingsLoaded) {
          return <span className="text-xs text-muted-foreground">-</span>
        }
        const alertSetting = getAlertSetting(product.id)
        const alertEnabled = alertSetting?.enabled ?? false
        return (
          <div className="flex items-center gap-1">
            <Switch
              checked={alertEnabled}
              onCheckedChange={(checked) => handleToggleAlert(product.id, checked)}
              aria-label="在庫通知"
              className="scale-75"
            />
            {alertEnabled ? <Bell className="h-3 w-3 text-amber-500" /> : <BellOff className="h-3 w-3 text-muted-foreground" />}
            {alertEnabled && (
              <Input
                type="number"
                min={1}
                value={getThresholdValue(product.id)}
                onChange={(e) =>
                  setThresholdInputs((prev) => {
                    const next = new Map(prev)
                    next.set(product.id, e.target.value)
                    return next
                  })
                }
                onBlur={() => handleThresholdBlur(product.id)}
                className="h-6 w-12 text-xs"
                title="通知閾値"
              />
            )}
          </div>
        )
      }
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
    <div className="min-w-0 space-y-3 overflow-hidden">
      {entries.length > 0 && (
        <SearchWithScope
          fields={searchFields}
          query={query}
          onQueryChange={setQuery}
          checkedFields={checkedFields}
          onCheckedFieldsChange={setCheckedFields}
          placeholder="商品を検索..."
        />
      )}
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

      <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">商品</TableHead>
              {visibleColumns.map((key) => (
                <TableHead
                  key={key}
                  className="font-semibold"
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
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.pagedRows.map((entry) => (
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
                <TableCell>
                  {/* 行ホバーでアクション表示 */}
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => onEdit(entry.product.id)}
                      title="編集"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => onCopy(entry.product.id)}
                      title="コピー"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                      onClick={() => onDelete(entry.product)}
                      title="削除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={pagination.onPageChange} />
      </div>

      {/* フッター: 件数表示 */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{filteredEntries.length} 件表示中</span>
      </div>
    </div>
  )
}
