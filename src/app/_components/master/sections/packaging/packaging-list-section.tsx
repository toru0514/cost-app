"use client"

import { useCallback, useMemo, useState } from "react"

import { Copy, Edit3, Trash2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { useBulkSelection } from "@/hooks/use-bulk-selection"

import {
  filterRowsBySearch,
  useSearchWithScope,
  type SearchField,
} from "@/app/_components/shared/search-with-scope"
import { ImageUrlField } from "@/app/_components/shared/image-url-field"
import { TableToolbar } from "@/app/_components/shared/table-toolbar"
import { useTableSort, type SortOption } from "@/hooks/use-table-sort"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination } from "@/components/ui/table-pagination"
import { Textarea } from "@/components/ui/textarea"
import { useTablePagination } from "@/hooks/use-table-pagination"
import type { AppActions } from "@/lib/app-data"
import { formatCurrency } from "@/lib/calculations"
import { currencyOptions } from "@/lib/constants"
import type { AppData, PackagingItem } from "@/lib/types"
import { toast } from "sonner"

interface PackagingListSectionProps {
  data: AppData
  actions: AppActions
  createTempId: () => string
  isAuthenticated: boolean
  packagingStocks: Map<string, number>
  packagingStockUnits: Map<string, string>
  masterStocksLoaded: boolean
  onSetPackagingStock: (id: string, quantity: number, stockUnit?: string) => Promise<void>
  onAdjustPackagingStock: (id: string, delta: number) => Promise<void>
}

const formatStockQuantity = (quantity: number) => {
  const rounded = Math.round((quantity + Number.EPSILON) * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

const stockBadgeClass = (quantity: number) => {
  if (quantity < 5) return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
  if (quantity < 10) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
  return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
}

export function PackagingListSection({ data, actions, createTempId, isAuthenticated, packagingStocks, packagingStockUnits, masterStocksLoaded, onSetPackagingStock, onAdjustPackagingStock }: PackagingListSectionProps) {
  const [editingPackaging, setEditingPackaging] = useState<Omit<PackagingItem, "id"> & { id: string | null }>({
    id: null,
    name: "",
    unit: "set",
    sizeDescription: "",
    currency: "JPY",
    unitCost: 0,
    unitsPerBatch: 1,
    note: "",
    imageUrl: "",
  })

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [editingStock, setEditingStock] = useState<{ id: string; value: string; unit: string } | null>(null)
  const [savingStockId, setSavingStockId] = useState<string | null>(null)
  const [adjustAmounts, setAdjustAmounts] = useState<Map<string, string>>(new Map())
  const [busy, setBusy] = useState<string | null>(null)

  const searchFields = useMemo<SearchField[]>(() => [{ key: "name", label: "名称" }, { key: "note", label: "備考" }], [])
  const { query, setQuery, checkedFields, setCheckedFields, allFieldKeys } = useSearchWithScope(searchFields)
  const filteredRows = useMemo(() => filterRowsBySearch(data.packagingItems, query, checkedFields, allFieldKeys), [data.packagingItems, query, checkedFields, allFieldKeys])
  const sortOptions = useMemo<SortOption<(typeof filteredRows)[number]>[]>(() => [
    { key: "name", label: "名称" },
    { key: "unitCost", label: "単価", compareFn: (a, b) => a.unitCost - b.unitCost },
  ], [])
  const { sortedItems, sortKey, sortDirection, setSortKey, setSortDirection, sortOptions: sortOpts } = useTableSort(filteredRows, sortOptions, "name", "asc")
  const { pagedRows, currentPage, totalPages, onPageChange } = useTablePagination(sortedItems)

  const { selectedIds, handleSelectAll: bulkSelectAll, handleSelectOne, clearSelection, isAllSelected, isSomeSelected, getOtherPageCount } = useBulkSelection()
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false)
  const [bulkEditFields, setBulkEditFields] = useState<{
    currency: { enabled: boolean; value: string }
    unit: { enabled: boolean; value: string }
  }>({
    currency: { enabled: false, value: "JPY" },
    unit: { enabled: false, value: "" },
  })

  const currentPageIds = useMemo(() => pagedRows.map((item) => item.id), [pagedRows])
  const allCurrentPageSelected = isAllSelected(currentPageIds)
  const someCurrentPageSelected = isSomeSelected(currentPageIds)
  const handleSelectAllPage = useCallback(() => { bulkSelectAll(currentPageIds) }, [bulkSelectAll, currentPageIds])

  const selectedItems = useMemo(
    () => data.packagingItems.filter((item) => selectedIds.has(item.id)),
    [data.packagingItems, selectedIds]
  )

  const handleBulkDelete = useCallback(() => {
    if (selectedItems.length === 0) return
    actions.bulkRemovePackagingItems(selectedItems.map((item) => item.id))
    toast.success(`${selectedItems.length}件の梱包材を削除しました`)
    clearSelection()
    setShowBulkDeleteDialog(false)
  }, [selectedItems, actions, clearSelection])

  const handleBulkEdit = useCallback(() => {
    const updates: Partial<Pick<PackagingItem, "currency" | "unit">> = {}
    if (bulkEditFields.currency.enabled) updates.currency = bulkEditFields.currency.value
    if (bulkEditFields.unit.enabled) updates.unit = bulkEditFields.unit.value
    if (Object.keys(updates).length === 0) return
    actions.bulkUpdatePackagingItems(selectedItems.map((item) => item.id), updates)
    toast.success(`${selectedItems.length}件の梱包材を更新しました`)
    clearSelection()
    setShowBulkEditDialog(false)
  }, [selectedItems, actions, bulkEditFields, clearSelection])

  const resetBulkEditFields = useCallback(() => {
    setBulkEditFields({
      currency: { enabled: false, value: "JPY" },
      unit: { enabled: false, value: "" },
    })
  }, [])

  const { updatePackagingItem, removePackagingItem, addPackagingItem } = actions

  const handleStockSave = async (item: PackagingItem) => {
    if (!editingStock || editingStock.id !== item.id) return
    const quantity = Math.max(0, parseFloat(editingStock.value) || 0)
    const stockUnit = editingStock.unit.trim()
    const displayUnit = stockUnit || item.unit
    setSavingStockId(item.id)
    try {
      await onSetPackagingStock(item.id, quantity, stockUnit)
      toast.success("残数を保存しました", { description: `${item.name}: ${quantity} ${displayUnit}` })
      setEditingStock(null)
    } catch {
      toast.error("残数の保存に失敗しました")
    } finally {
      setSavingStockId(null)
    }
  }

  const getAdjustAmount = (id: string) => Math.max(1, parseInt(adjustAmounts.get(id) ?? "1", 10) || 1)

  const handleAdd = async (item: PackagingItem) => {
    setBusy(item.id + "_add")
    try {
      await onAdjustPackagingStock(item.id, getAdjustAmount(item.id))
    } catch {
      toast.error("残数の追加に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const handleUse = async (item: PackagingItem) => {
    setBusy(item.id + "_use")
    try {
      await onAdjustPackagingStock(item.id, -getAdjustAmount(item.id))
    } catch {
      toast.error("残数の使用に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const resetPackaging = () =>
    setEditingPackaging({
      id: null,
      name: "",
      unit: "set",
      sizeDescription: "",
      currency: "JPY",
      unitCost: 0,
      unitsPerBatch: 1,
      note: "",
      imageUrl: "",
    })

  const renderActionButtons = (onSave: () => void, onCancel: () => void, onDelete?: () => void) => (
    <div className="flex gap-2">
      <Button type="button" size="sm" onClick={onSave}>
        保存
      </Button>
      {onDelete && (
        <Button type="button" size="sm" variant="destructive" onClick={onDelete}>
          削除
        </Button>
      )}
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        キャンセル
      </Button>
    </div>
  )

  const handlePackagingSave = () => {
    const { id, ...rest } = editingPackaging
    if (!id) return
    const name = editingPackaging.name.trim()
    if (!name) return
    updatePackagingItem({ id, ...rest, name })
    toast.success("梱包材を更新しました", {
      description: `${name} / ${formatCurrency(editingPackaging.unitCost, editingPackaging.currency)}`,
    })
    resetPackaging()
  }

  const handlePackagingDelete = () => {
    const { id } = editingPackaging
    if (!id) return
    const name = editingPackaging.name.trim() || "梱包材"
    setDeleteTarget({ id, name })
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    removePackagingItem(deleteTarget.id)
    toast.success("梱包材を削除しました", { description: `「${deleteTarget.name}」を削除しました。` })
    resetPackaging()
    setDeleteTarget(null)
  }

  const handlePackagingCopy = (item: PackagingItem) => {
    const newId = createTempId()
    const name = `${item.name} (コピー)`
    addPackagingItem({
      id: newId,
      name,
      unit: item.unit,
      sizeDescription: item.sizeDescription,
      currency: item.currency,
      unitCost: item.unitCost,
      unitsPerBatch: item.unitsPerBatch ?? 1,
      note: item.note,
      imageUrl: item.imageUrl,
    })
    toast.success("梱包材をコピーしました", { description: `「${name}」を作成しました。` })
    setEditingPackaging({
      id: newId,
      name,
      unit: item.unit,
      sizeDescription: item.sizeDescription ?? "",
      currency: item.currency,
      unitCost: item.unitCost,
      unitsPerBatch: item.unitsPerBatch ?? 1,
      note: item.note ?? "",
      imageUrl: item.imageUrl ?? "",
    })
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>梱包材一覧</CardTitle>
      </CardHeader>
      <CardContent>
        {data.packagingItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
        ) : (
          <div className="space-y-2">
          <TableToolbar
            search={{ fields: searchFields, query, onQueryChange: setQuery, checkedFields, onCheckedFieldsChange: setCheckedFields }}
            sort={{ sortKey, sortDirection, setSortKey, setSortDirection, sortOptions: sortOpts }}
          />
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
              <span className="text-sm font-medium">{selectedIds.size}件選択中</span>
              {(() => {
                const otherCount = getOtherPageCount(currentPageIds)
                return otherCount > 0 ? (
                  <span className="text-xs text-amber-600 dark:text-amber-400">（他のページに{otherCount}件の選択あり）</span>
                ) : null
              })()}
              <Button type="button" size="sm" variant="outline" onClick={() => { resetBulkEditFields(); setShowBulkEditDialog(true) }}>
                一括編集
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => setShowBulkDeleteDialog(true)}>
                一括削除
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
                選択解除
              </Button>
            </div>
          )}
          <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
            <Table className="min-w-[1120px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allCurrentPageSelected ? true : someCurrentPageSelected ? "indeterminate" : false}
                      onCheckedChange={handleSelectAllPage}
                      aria-label="全選択"
                    />
                  </TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>単位</TableHead>
                  <TableHead>単価</TableHead>
                  <TableHead>セット数</TableHead>
                  <TableHead>仕様</TableHead>
                  <TableHead>備考</TableHead>
                  <TableHead>画像</TableHead>
                  <TableHead>現在残数</TableHead>
                  <TableHead>増減量</TableHead>
                  <TableHead></TableHead>
                  <TableHead className="w-40 text-right">
                    <span className="sr-only">操作</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.map((item) => {
                  const isEditing = editingPackaging.id === item.id
                  const displayStockUnit = packagingStockUnits.get(item.id)?.trim() || item.unit
                  return (
                    <TableRow key={item.id} className="group">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={(checked) => handleSelectOne(item.id, !!checked)}
                          aria-label={`${item.name}を選択`}
                        />
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingPackaging.name}
                            onChange={(event) => setEditingPackaging((prev) => ({ ...prev, name: event.target.value }))}
                          />
                        ) : (
                          <span className="block max-w-[140px] truncate" title={item.name}>
                            {item.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingPackaging.unit}
                            onChange={(event) => setEditingPackaging((prev) => ({ ...prev, unit: event.target.value }))}
                          />
                        ) : (
                          item.unit
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <NumberInput
                              value={editingPackaging.unitCost}
                              onValueChange={(next) => setEditingPackaging((prev) => ({ ...prev, unitCost: next === "" ? 0 : next }))}
                            />
                            <Select
                              value={editingPackaging.currency}
                              onValueChange={(value) => setEditingPackaging((prev) => ({ ...prev, currency: value }))}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue placeholder="通貨" />
                              </SelectTrigger>
                              <SelectContent>
                                {currencyOptions.map((currency) => (
                                  <SelectItem key={currency} value={currency}>
                                    {currency}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          formatCurrency(item.unitCost, item.currency)
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <NumberInput
                            value={editingPackaging.unitsPerBatch ?? 1}
                            min={1}
                            onValueChange={(next) =>
                              setEditingPackaging((prev) => ({ ...prev, unitsPerBatch: next === "" ? 1 : Number(next) }))
                            }
                          />
                        ) : item.unitsPerBatch && item.unitsPerBatch > 0 ? (
                          `${item.unitsPerBatch}単位/セット`
                        ) : (
                          "1単位/セット"
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingPackaging.sizeDescription}
                            onChange={(event) => setEditingPackaging((prev) => ({ ...prev, sizeDescription: event.target.value }))}
                          />
                        ) : (
                          item.sizeDescription ? (
                            <span className="block max-w-[120px] truncate" title={item.sizeDescription}>
                              {item.sizeDescription}
                            </span>
                          ) : (
                            "-"
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Textarea
                            value={editingPackaging.note}
                            onChange={(event) => setEditingPackaging((prev) => ({ ...prev, note: event.target.value }))}
                          />
                        ) : (
                          item.note ? (
                            <span className="block max-w-[120px] truncate" title={item.note}>
                              {item.note}
                            </span>
                          ) : (
                            "-"
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <ImageUrlField
                            value={editingPackaging.imageUrl ?? ""}
                            onChange={(url) => setEditingPackaging((prev) => ({ ...prev, imageUrl: url }))}
                            placeholder="https://..."
                            inputClassName="w-40"
                          />
                        ) : item.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={item.imageUrl} alt={item.name} className="h-6 w-6 rounded object-cover" />
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {!isAuthenticated ? (
                          <span className="text-xs text-muted-foreground">-</span>
                        ) : editingStock?.id === item.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              step="any"
                              value={editingStock.value}
                              onChange={(e) =>
                                setEditingStock((prev) =>
                                  prev && prev.id === item.id
                                    ? { ...prev, value: e.target.value }
                                    : { id: item.id, value: e.target.value, unit: displayStockUnit }
                                )
                              }
                              className="h-8 w-20"
                            />
                            <Input
                              value={editingStock.unit}
                              onChange={(e) =>
                                setEditingStock((prev) =>
                                  prev && prev.id === item.id
                                    ? { ...prev, unit: e.target.value }
                                    : { id: item.id, value: String(packagingStocks.get(item.id) ?? 0), unit: e.target.value }
                                )
                              }
                              className="h-8 w-16"
                              placeholder="単位"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleStockSave(item)}
                              disabled={savingStockId === item.id}
                            >
                              保存
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingStock(null)}>
                              ×
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${stockBadgeClass(
                              packagingStocks.get(item.id) ?? 0
                            )} hover:opacity-80`}
                            onClick={() => {
                              resetPackaging()
                              setEditingStock({
                                id: item.id,
                                value: String(packagingStocks.get(item.id) ?? 0),
                                unit: displayStockUnit,
                              })
                            }}
                          >
                            {!masterStocksLoaded
                              ? <span className="text-muted-foreground">-</span>
                              : packagingStocks.has(item.id)
                                ? `${formatStockQuantity(packagingStocks.get(item.id) ?? 0)} ${displayStockUnit}`
                                : <span className="text-muted-foreground">-</span>}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {isAuthenticated && (
                          <Input
                            type="number"
                            min={1}
                            value={adjustAmounts.get(item.id) ?? "1"}
                            onChange={(e) =>
                              setAdjustAmounts((prev) => {
                                const next = new Map(prev)
                                next.set(item.id, e.target.value)
                                return next
                              })
                            }
                            className="h-8 w-16"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {isAuthenticated && (
                          <div className="master-row-actions flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 px-0"
                              title="追加"
                              onClick={() => handleAdd(item)}
                              disabled={(busy?.startsWith(item.id) ?? false) || editingStock?.id === item.id || editingPackaging.id === item.id}
                            >
                              +
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 px-0"
                              title="使用（減算）"
                              onClick={() => handleUse(item)}
                              disabled={(busy?.startsWith(item.id) ?? false) || editingStock?.id === item.id || editingPackaging.id === item.id || (packagingStocks.get(item.id) ?? 0) === 0}
                            >
                              −
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          renderActionButtons(handlePackagingSave, resetPackaging, handlePackagingDelete)
                        ) : (
                          <div className="master-row-actions flex items-center justify-end gap-1">
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() => {
                                setEditingStock(null)
                                setEditingPackaging({
                                  id: item.id,
                                  name: item.name,
                                  unit: item.unit,
                                  sizeDescription: item.sizeDescription ?? "",
                                  currency: item.currency,
                                  unitCost: item.unitCost,
                                  unitsPerBatch: item.unitsPerBatch ?? 1,
                                  note: item.note ?? "",
                                  imageUrl: item.imageUrl ?? "",
                                })
                              }}
                              title="編集"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() => handlePackagingCopy(item)}
                              title="コピー"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                              onClick={() => setDeleteTarget({ id: item.id, name: item.name })}
                              title="削除"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
          </div>
        )}
      </CardContent>
    </Card>
    <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>梱包材を削除しますか？</DialogTitle>
          <DialogDescription>
            「{deleteTarget?.name}」を削除します。この操作は取り消せません。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
            キャンセル
          </Button>
          <Button type="button" variant="destructive" onClick={confirmDelete}>
            削除する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{selectedItems.length}件の梱包材を削除しますか？</DialogTitle>
          <DialogDescription>
            以下の梱包材を削除します。この操作は取り消せません。
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-40 overflow-y-auto rounded border p-2">
          <ul className="space-y-1 text-sm">
            {selectedItems.map((item) => (
              <li key={item.id}>・{item.name}</li>
            ))}
          </ul>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setShowBulkDeleteDialog(false)}>キャンセル</Button>
          <Button type="button" variant="destructive" onClick={handleBulkDelete}>削除する</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={showBulkEditDialog} onOpenChange={setShowBulkEditDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>一括編集（{selectedItems.length}件の梱包材）</DialogTitle>
          <DialogDescription>チェックを入れた項目のみ更新されます。</DialogDescription>
        </DialogHeader>
        <div className="max-h-32 overflow-y-auto rounded border p-2 mb-2">
          <ul className="space-y-1 text-sm">
            {selectedItems.map((item) => (
              <li key={item.id}>・{item.name}</li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={bulkEditFields.currency.enabled}
              onCheckedChange={(checked) => setBulkEditFields((prev) => ({ ...prev, currency: { ...prev.currency, enabled: !!checked } }))}
            />
            <span className="text-sm w-16">通貨</span>
            <Select
              value={bulkEditFields.currency.value}
              onValueChange={(value) => setBulkEditFields((prev) => ({ ...prev, currency: { ...prev.currency, value } }))}
              disabled={!bulkEditFields.currency.enabled}
            >
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {currencyOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={bulkEditFields.unit.enabled}
              onCheckedChange={(checked) => setBulkEditFields((prev) => ({ ...prev, unit: { ...prev.unit, enabled: !!checked } }))}
            />
            <span className="text-sm w-16">単位</span>
            <Input
              value={bulkEditFields.unit.value}
              onChange={(e) => setBulkEditFields((prev) => ({ ...prev, unit: { ...prev.unit, value: e.target.value } }))}
              disabled={!bulkEditFields.unit.enabled}
              className="w-40"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setShowBulkEditDialog(false)}>キャンセル</Button>
          <Button type="button" onClick={handleBulkEdit} disabled={!bulkEditFields.currency.enabled && !bulkEditFields.unit.enabled}>更新する</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
