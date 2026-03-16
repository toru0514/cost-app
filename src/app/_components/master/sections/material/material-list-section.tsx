"use client"

import { useCallback, useMemo, useState } from "react"

import { Copy, Edit3, Trash2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { ViewToggle } from "@/app/_components/shared/view-toggle"
import { MaterialCardGrid } from "@/app/_components/master/sections/material/material-card-grid"

import {
  filterRowsBySearch,
  useSearchWithScope,
  type SearchField,
} from "@/app/_components/shared/search-with-scope"
import { TableToolbar } from "@/app/_components/shared/table-toolbar"
import { useTableSort, type SortOption } from "@/hooks/use-table-sort"
import { useBulkSelection } from "@/hooks/use-bulk-selection"
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
import type { AppData, Material } from "@/lib/types"
import { toast } from "sonner"

interface MaterialListSectionProps {
  data: AppData
  actions: AppActions
  createTempId: () => string
  isAuthenticated: boolean
  materialStocks: Map<string, number>
  materialStockUnits: Map<string, string>
  masterStocksLoaded: boolean
  onSetMaterialStock: (id: string, quantity: number, stockUnit?: string) => Promise<void>
  onAdjustMaterialStock: (id: string, delta: number) => Promise<void>
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

export function MaterialListSection({ data, actions, createTempId, isAuthenticated, materialStocks, materialStockUnits, masterStocksLoaded, onSetMaterialStock, onAdjustMaterialStock }: MaterialListSectionProps) {
  const [editingMaterial, setEditingMaterial] = useState<Omit<Material, "id"> & { id: string | null }>({
    id: null,
    name: "",
    unit: "kg",
    sizeDescription: "",
    currency: "JPY",
    unitCost: 0,
    unitsPerBatch: 1,
    usePercentageMode: false,
    supplier: "",
    note: "",
    imageUrl: "",
  })
  const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
    if (typeof window === "undefined") return "table"
    const stored = localStorage.getItem("view-mode-materials")
    return stored === "grid" ? "grid" : "table"
  })

  const handleViewModeChange = (next: "table" | "grid") => {
    setViewMode(next)
    localStorage.setItem("view-mode-materials", next)
  }

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [editingStock, setEditingStock] = useState<{ id: string; value: string; unit: string } | null>(null)
  const [savingStockId, setSavingStockId] = useState<string | null>(null)
  const [adjustAmounts, setAdjustAmounts] = useState<Map<string, string>>(new Map())
  const [busy, setBusy] = useState<string | null>(null)
  const { selectedIds, handleSelectAll: bulkSelectAll, handleSelectOne, clearSelection, isAllSelected, isSomeSelected, getOtherPageCount } = useBulkSelection()
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false)
  const [bulkEditFields, setBulkEditFields] = useState<{
    supplier: { enabled: boolean; value: string }
    currency: { enabled: boolean; value: string }
    unit: { enabled: boolean; value: string }
    usePercentageMode: { enabled: boolean; value: boolean }
  }>({
    supplier: { enabled: false, value: "" },
    currency: { enabled: false, value: "JPY" },
    unit: { enabled: false, value: "" },
    usePercentageMode: { enabled: false, value: false },
  })

  const searchFields = useMemo<SearchField[]>(() => [{ key: "name", label: "名称" }, { key: "supplier", label: "仕入先" }, { key: "note", label: "備考" }], [])
  const { query, setQuery, checkedFields, setCheckedFields, allFieldKeys } = useSearchWithScope(searchFields)
  const filteredRows = useMemo(() => filterRowsBySearch(data.materials, query, checkedFields, allFieldKeys), [data.materials, query, checkedFields, allFieldKeys])
  const sortOptions = useMemo<SortOption<(typeof filteredRows)[number]>[]>(() => [
    { key: "name", label: "名称" },
    { key: "unitCost", label: "単価", compareFn: (a, b) => a.unitCost - b.unitCost },
  ], [])
  const { sortedItems, sortKey, sortDirection, setSortKey, setSortDirection, sortOptions: sortOpts } = useTableSort(filteredRows, sortOptions, "name", "asc")
  const { pagedRows, currentPage, totalPages, onPageChange } = useTablePagination(sortedItems)

  const currentPageIds = useMemo(() => pagedRows.map((m) => m.id), [pagedRows])
  const allCurrentPageSelected = isAllSelected(currentPageIds)
  const someCurrentPageSelected = isSomeSelected(currentPageIds)

  const handleSelectAll = useCallback(() => {
    bulkSelectAll(currentPageIds)
  }, [bulkSelectAll, currentPageIds])

  const selectedMaterials = useMemo(
    () => data.materials.filter((m) => selectedIds.has(m.id)),
    [data.materials, selectedIds]
  )

  const handleBulkDelete = useCallback(() => {
    if (selectedMaterials.length === 0) return
    actions.bulkRemoveMaterials(selectedMaterials.map((m) => m.id))
    toast.success(`${selectedMaterials.length}件の材料を削除しました`)
    clearSelection()
    setShowBulkDeleteDialog(false)
  }, [selectedMaterials, actions, clearSelection])

  const handleBulkEdit = useCallback(() => {
    const updates: Partial<Pick<Material, "supplier" | "currency" | "unit" | "usePercentageMode">> = {}
    if (bulkEditFields.supplier.enabled) updates.supplier = bulkEditFields.supplier.value
    if (bulkEditFields.currency.enabled) updates.currency = bulkEditFields.currency.value
    if (bulkEditFields.unit.enabled) updates.unit = bulkEditFields.unit.value
    if (bulkEditFields.usePercentageMode.enabled) updates.usePercentageMode = bulkEditFields.usePercentageMode.value
    if (Object.keys(updates).length === 0) return
    actions.bulkUpdateMaterials(selectedMaterials.map((m) => m.id), updates)
    toast.success(`${selectedMaterials.length}件の材料を更新しました`)
    clearSelection()
    setShowBulkEditDialog(false)
  }, [selectedMaterials, actions, bulkEditFields, clearSelection])

  const resetBulkEditFields = useCallback(() => {
    setBulkEditFields({
      supplier: { enabled: false, value: "" },
      currency: { enabled: false, value: "JPY" },
      unit: { enabled: false, value: "" },
      usePercentageMode: { enabled: false, value: false },
    })
  }, [])

  const { updateMaterial, removeMaterial, addMaterial } = actions

  const handleStockSave = async (material: Material) => {
    if (!editingStock || editingStock.id !== material.id) return
    const quantity = Math.max(0, parseFloat(editingStock.value) || 0)
    const stockUnit = editingStock.unit.trim()
    const displayUnit = stockUnit || material.unit
    setSavingStockId(material.id)
    try {
      await onSetMaterialStock(material.id, quantity, stockUnit)
      toast.success("残数を保存しました", { description: `${material.name}: ${quantity} ${displayUnit}` })
      setEditingStock(null)
    } catch {
      toast.error("残数の保存に失敗しました")
    } finally {
      setSavingStockId(null)
    }
  }

  const getAdjustAmount = (id: string) => Math.max(1, parseInt(adjustAmounts.get(id) ?? "1", 10) || 1)

  const handleAdd = async (material: Material) => {
    setBusy(material.id + "_add")
    try {
      await onAdjustMaterialStock(material.id, getAdjustAmount(material.id))
    } catch {
      toast.error("残数の追加に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const handleUse = async (material: Material) => {
    setBusy(material.id + "_use")
    try {
      await onAdjustMaterialStock(material.id, -getAdjustAmount(material.id))
    } catch {
      toast.error("残数の使用に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const resetMaterial = () =>
    setEditingMaterial({
      id: null,
      name: "",
      unit: "kg",
      sizeDescription: "",
      currency: "JPY",
      unitCost: 0,
      unitsPerBatch: 1,
      usePercentageMode: false,
      supplier: "",
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

  const handleMaterialSave = () => {
    const { id, ...rest } = editingMaterial
    if (!id) return
    const name = editingMaterial.name.trim()
    if (!name) return
    updateMaterial({ id, ...rest, name })
    toast.success("材料を更新しました", {
      description: `${name} / ${formatCurrency(editingMaterial.unitCost, editingMaterial.currency)}`,
    })
    resetMaterial()
  }

  const handleMaterialDelete = () => {
    const { id } = editingMaterial
    if (!id) return
    const name = editingMaterial.name.trim() || "材料"
    setDeleteTarget({ id, name })
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    removeMaterial(deleteTarget.id)
    toast.success("材料を削除しました", { description: `「${deleteTarget.name}」を削除しました。` })
    resetMaterial()
    setDeleteTarget(null)
  }

  const handleMaterialCopy = (material: Material) => {
    const newId = createTempId()
    const name = `${material.name} (コピー)`
    addMaterial({
      id: newId,
      name,
      unit: material.unit,
      sizeDescription: material.sizeDescription,
      currency: material.currency,
      unitCost: material.unitCost,
      unitsPerBatch: material.unitsPerBatch ?? 1,
      usePercentageMode: material.usePercentageMode ?? false,
      supplier: material.supplier,
      note: material.note,
      imageUrl: material.imageUrl,
    })
    toast.success("材料をコピーしました", { description: `「${name}」を作成しました。` })
    setEditingMaterial({
      id: newId,
      name,
      unit: material.unit,
      sizeDescription: material.sizeDescription ?? "",
      currency: material.currency,
      unitCost: material.unitCost,
      unitsPerBatch: material.unitsPerBatch ?? 1,
      usePercentageMode: material.usePercentageMode ?? false,
      supplier: material.supplier ?? "",
      note: material.note ?? "",
      imageUrl: material.imageUrl ?? "",
    })
  }

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>材料一覧</CardTitle>
        <ViewToggle value={viewMode} onChange={handleViewModeChange} />
      </CardHeader>
      <CardContent>
        {data.materials.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
        ) : viewMode === "grid" ? (
          <MaterialCardGrid
            items={data.materials}
            onEdit={(material) => {
              setEditingStock(null)
              setEditingMaterial({
                id: material.id,
                name: material.name,
                unit: material.unit,
                sizeDescription: material.sizeDescription ?? "",
                currency: material.currency,
                unitCost: material.unitCost,
                unitsPerBatch: material.unitsPerBatch ?? 1,
                usePercentageMode: material.usePercentageMode ?? false,
                supplier: material.supplier ?? "",
                note: material.note ?? "",
                imageUrl: material.imageUrl ?? "",
              })
            }}
            onCopy={handleMaterialCopy}
            onDelete={(material) => setDeleteTarget({ id: material.id, name: material.name })}
          />
        ) : (
          <div className="space-y-2">
          <TableToolbar
            search={{
              fields: searchFields,
              query,
              onQueryChange: setQuery,
              checkedFields,
              onCheckedFieldsChange: setCheckedFields,
            }}
            sort={{
              sortKey,
              sortDirection,
              setSortKey,
              setSortDirection,
              sortOptions: sortOpts,
            }}
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
            <Table className="min-w-[1080px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allCurrentPageSelected ? true : someCurrentPageSelected ? "indeterminate" : false}
                      onCheckedChange={handleSelectAll}
                      aria-label="全選択"
                    />
                  </TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>単位</TableHead>
                  <TableHead>単価</TableHead>
                  <TableHead>セット数</TableHead>
                  <TableHead>入力モード</TableHead>
                  <TableHead>仕入先</TableHead>
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
                {pagedRows.map((material) => {
                  const isEditing = editingMaterial.id === material.id
                  const displayStockUnit = materialStockUnits.get(material.id)?.trim() || material.unit
                  return (
                    <TableRow key={material.id} className="group">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(material.id)}
                          onCheckedChange={(checked) => handleSelectOne(material.id, !!checked)}
                          aria-label={`${material.name}を選択`}
                        />
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingMaterial.name}
                            onChange={(event) => setEditingMaterial((prev) => ({ ...prev, name: event.target.value }))}
                          />
                        ) : (
                          <span className="block max-w-[140px] truncate" title={material.name}>
                            {material.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingMaterial.unit}
                            onChange={(event) => setEditingMaterial((prev) => ({ ...prev, unit: event.target.value }))}
                          />
                        ) : (
                          material.unit
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <NumberInput
                              value={editingMaterial.unitCost}
                              onValueChange={(next) => setEditingMaterial((prev) => ({ ...prev, unitCost: next === "" ? 0 : next }))}
                            />
                            <Select
                              value={editingMaterial.currency}
                              onValueChange={(value) => setEditingMaterial((prev) => ({ ...prev, currency: value }))}
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
                          formatCurrency(material.unitCost, material.currency)
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <NumberInput
                            value={editingMaterial.unitsPerBatch ?? 1}
                            min={1}
                            onValueChange={(next) =>
                              setEditingMaterial((prev) => ({ ...prev, unitsPerBatch: next === "" ? 1 : Number(next) }))
                            }
                          />
                        ) : material.unitsPerBatch && material.unitsPerBatch > 0 ? (
                          `${material.unitsPerBatch}単位/セット`
                        ) : (
                          "1単位/セット"
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <label className="inline-flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={Boolean(editingMaterial.usePercentageMode)}
                              onChange={(event) =>
                                setEditingMaterial((prev) => ({ ...prev, usePercentageMode: event.target.checked }))
                              }
                            />
                            %入力
                          </label>
                        ) : material.usePercentageMode ? (
                          "%入力"
                        ) : (
                          "単位数"
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingMaterial.supplier}
                            onChange={(event) => setEditingMaterial((prev) => ({ ...prev, supplier: event.target.value }))}
                          />
                        ) : (
                          material.supplier ? (
                            <span className="block max-w-[100px] truncate" title={material.supplier}>
                              {material.supplier}
                            </span>
                          ) : (
                            "-"
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Textarea
                            value={editingMaterial.note}
                            onChange={(event) => setEditingMaterial((prev) => ({ ...prev, note: event.target.value }))}
                          />
                        ) : (
                          material.note ? (
                            <span className="block max-w-[120px] truncate" title={material.note}>
                              {material.note}
                            </span>
                          ) : (
                            "-"
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="url"
                            placeholder="https://..."
                            value={editingMaterial.imageUrl}
                            onChange={(event) => setEditingMaterial((prev) => ({ ...prev, imageUrl: event.target.value }))}
                            className="w-40"
                          />
                        ) : material.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={material.imageUrl} alt={material.name} className="h-6 w-6 rounded object-cover" />
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {!isAuthenticated ? (
                          <span className="text-xs text-muted-foreground">-</span>
                        ) : editingStock?.id === material.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              step="any"
                              value={editingStock.value}
                              onChange={(e) =>
                                setEditingStock((prev) =>
                                  prev && prev.id === material.id
                                    ? { ...prev, value: e.target.value }
                                    : { id: material.id, value: e.target.value, unit: displayStockUnit }
                                )
                              }
                              className="h-8 w-20"
                            />
                            <Input
                              value={editingStock.unit}
                              onChange={(e) =>
                                setEditingStock((prev) =>
                                  prev && prev.id === material.id
                                    ? { ...prev, unit: e.target.value }
                                    : { id: material.id, value: String(materialStocks.get(material.id) ?? 0), unit: e.target.value }
                                )
                              }
                              className="h-8 w-16"
                              placeholder="単位"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleStockSave(material)}
                              disabled={savingStockId === material.id}
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
                              materialStocks.get(material.id) ?? 0
                            )} hover:opacity-80`}
                            onClick={() => {
                              resetMaterial()
                              setEditingStock({
                                id: material.id,
                                value: String(materialStocks.get(material.id) ?? 0),
                                unit: displayStockUnit,
                              })
                            }}
                          >
                            {!masterStocksLoaded
                              ? <span className="text-muted-foreground">-</span>
                              : materialStocks.has(material.id)
                                ? `${formatStockQuantity(materialStocks.get(material.id) ?? 0)} ${displayStockUnit}`
                                : <span className="text-muted-foreground">-</span>}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {isAuthenticated && (
                          <Input
                            type="number"
                            min={1}
                            value={adjustAmounts.get(material.id) ?? "1"}
                            onChange={(e) =>
                              setAdjustAmounts((prev) => {
                                const next = new Map(prev)
                                next.set(material.id, e.target.value)
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
                              onClick={() => handleAdd(material)}
                              disabled={(busy?.startsWith(material.id) ?? false) || editingStock?.id === material.id || editingMaterial.id === material.id}
                            >
                              +
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 px-0"
                              title="使用（減算）"
                              onClick={() => handleUse(material)}
                              disabled={(busy?.startsWith(material.id) ?? false) || editingStock?.id === material.id || editingMaterial.id === material.id || (materialStocks.get(material.id) ?? 0) === 0}
                            >
                              −
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          renderActionButtons(handleMaterialSave, resetMaterial, handleMaterialDelete)
                        ) : (
                          <div className="master-row-actions flex items-center justify-end gap-1">
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() => {
                                setEditingStock(null)
                                setEditingMaterial({
                                  id: material.id,
                                  name: material.name,
                                  unit: material.unit,
                                  sizeDescription: material.sizeDescription ?? "",
                                  currency: material.currency,
                                  unitCost: material.unitCost,
                                  unitsPerBatch: material.unitsPerBatch ?? 1,
                                  usePercentageMode: material.usePercentageMode ?? false,
                                  supplier: material.supplier ?? "",
                                  note: material.note ?? "",
                                  imageUrl: material.imageUrl ?? "",
                                })
                              }}
                              title="編集"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() => handleMaterialCopy(material)}
                              title="コピー"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                              onClick={() => setDeleteTarget({ id: material.id, name: material.name })}
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
    <Dialog open={showBulkDeleteDialog} onOpenChange={(open) => !open && setShowBulkDeleteDialog(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>一括削除の確認</DialogTitle>
          <DialogDescription>
            {selectedMaterials.length}件の材料を削除しますか？関連するコスト明細も削除されます。この操作は取り消せません。
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-40 overflow-y-auto rounded border bg-muted/30 px-3 py-2">
          <ul className="space-y-1 text-sm">
            {selectedMaterials.map((m) => (
              <li key={m.id} className="truncate">・{m.name}</li>
            ))}
          </ul>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setShowBulkDeleteDialog(false)}>
            キャンセル
          </Button>
          <Button type="button" variant="destructive" onClick={handleBulkDelete}>
            {selectedMaterials.length}件を削除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={showBulkEditDialog} onOpenChange={(open) => !open && setShowBulkEditDialog(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>一括編集（{selectedMaterials.length}件の材料）</DialogTitle>
          <DialogDescription>
            チェックしたフィールドのみ、選択中の材料に一括適用されます。
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-28 overflow-y-auto rounded border bg-muted/30 px-3 py-2">
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {selectedMaterials.map((m) => (
              <li key={m.id} className="truncate">{m.name}</li>
            ))}
          </ul>
        </div>
        <div className="space-y-4 py-2">
          <label className="flex items-center gap-3">
            <Checkbox
              checked={bulkEditFields.supplier.enabled}
              onCheckedChange={(checked) => setBulkEditFields((prev) => ({ ...prev, supplier: { ...prev.supplier, enabled: !!checked } }))}
            />
            <span className="w-20 text-sm font-medium">仕入先</span>
            <Input
              value={bulkEditFields.supplier.value}
              onChange={(e) => setBulkEditFields((prev) => ({ ...prev, supplier: { ...prev.supplier, value: e.target.value } }))}
              disabled={!bulkEditFields.supplier.enabled}
              placeholder="仕入先名"
              className="flex-1"
            />
          </label>
          <label className="flex items-center gap-3">
            <Checkbox
              checked={bulkEditFields.currency.enabled}
              onCheckedChange={(checked) => setBulkEditFields((prev) => ({ ...prev, currency: { ...prev.currency, enabled: !!checked } }))}
            />
            <span className="w-20 text-sm font-medium">通貨</span>
            <Select
              value={bulkEditFields.currency.value}
              onValueChange={(value) => setBulkEditFields((prev) => ({ ...prev, currency: { ...prev.currency, value } }))}
              disabled={!bulkEditFields.currency.enabled}
            >
              <SelectTrigger className="flex-1">
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
          </label>
          <label className="flex items-center gap-3">
            <Checkbox
              checked={bulkEditFields.unit.enabled}
              onCheckedChange={(checked) => setBulkEditFields((prev) => ({ ...prev, unit: { ...prev.unit, enabled: !!checked } }))}
            />
            <span className="w-20 text-sm font-medium">単位</span>
            <Input
              value={bulkEditFields.unit.value}
              onChange={(e) => setBulkEditFields((prev) => ({ ...prev, unit: { ...prev.unit, value: e.target.value } }))}
              disabled={!bulkEditFields.unit.enabled}
              placeholder="kg, g, mL, 個 など"
              className="flex-1"
            />
          </label>
          <label className="flex items-center gap-3">
            <Checkbox
              checked={bulkEditFields.usePercentageMode.enabled}
              onCheckedChange={(checked) => setBulkEditFields((prev) => ({ ...prev, usePercentageMode: { ...prev.usePercentageMode, enabled: !!checked } }))}
            />
            <span className="w-20 text-sm font-medium">入力モード</span>
            <Select
              value={bulkEditFields.usePercentageMode.value ? "percent" : "unit"}
              onValueChange={(value) => setBulkEditFields((prev) => ({ ...prev, usePercentageMode: { ...prev.usePercentageMode, value: value === "percent" } }))}
              disabled={!bulkEditFields.usePercentageMode.enabled}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unit">単位数</SelectItem>
                <SelectItem value="percent">%入力</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setShowBulkEditDialog(false)}>
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={handleBulkEdit}
            disabled={!bulkEditFields.supplier.enabled && !bulkEditFields.currency.enabled && !bulkEditFields.unit.enabled && !bulkEditFields.usePercentageMode.enabled}
          >
            適用する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>材料を削除しますか？</DialogTitle>
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
    </>
  )
}
