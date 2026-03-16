"use client"

import { useCallback, useMemo, useState } from "react"

import { Copy, Edit3, Trash2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

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
import { useBulkSelection } from "@/hooks/use-bulk-selection"
import { useTablePagination } from "@/hooks/use-table-pagination"
import type { AppActions } from "@/lib/app-data"
import { formatCurrency } from "@/lib/calculations"
import { currencyOptions } from "@/lib/constants"
import type { AppData, Equipment } from "@/lib/types"
import { toast } from "sonner"

interface EquipmentListSectionProps {
  data: AppData
  actions: AppActions
  createTempId: () => string
}

export function EquipmentListSection({ data, actions, createTempId }: EquipmentListSectionProps) {
  const [editingEquipment, setEditingEquipment] = useState<Omit<Equipment, "id"> & { id: string | null }>({
    id: null,
    name: "",
    acquisitionCost: 0,
    currency: "JPY",
    amortizationYears: 5,
    utilizationRate: 100,
    note: "",
    imageUrl: "",
  })

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const searchFields = useMemo<SearchField[]>(() => [{ key: "name", label: "名称" }, { key: "note", label: "備考" }], [])
  const { query, setQuery, checkedFields, setCheckedFields, allFieldKeys } = useSearchWithScope(searchFields)
  const filteredRows = useMemo(() => filterRowsBySearch(data.equipments, query, checkedFields, allFieldKeys), [data.equipments, query, checkedFields, allFieldKeys])
  const sortOptions = useMemo<SortOption<(typeof filteredRows)[number]>[]>(() => [
    { key: "name", label: "名称" },
    { key: "acquisitionCost", label: "取得額", compareFn: (a, b) => a.acquisitionCost - b.acquisitionCost },
  ], [])
  const { sortedItems, sortKey, sortDirection, setSortKey, setSortDirection, sortOptions: sortOpts } = useTableSort(filteredRows, sortOptions, "name", "asc")
  const { pagedRows, currentPage, totalPages, onPageChange } = useTablePagination(sortedItems)

  const { selectedIds, handleSelectAll: bulkSelectAll, handleSelectOne, clearSelection, isAllSelected, isSomeSelected, getOtherPageCount } = useBulkSelection()
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false)
  const [bulkEditFields, setBulkEditFields] = useState<{
    currency: { enabled: boolean; value: string }
  }>({
    currency: { enabled: false, value: "JPY" },
  })

  const currentPageIds = useMemo(() => pagedRows.map((e) => e.id), [pagedRows])
  const allCurrentPageSelected = isAllSelected(currentPageIds)
  const someCurrentPageSelected = isSomeSelected(currentPageIds)

  const handleSelectAllPage = useCallback(() => {
    bulkSelectAll(currentPageIds)
  }, [bulkSelectAll, currentPageIds])

  const selectedItems = useMemo(
    () => data.equipments.filter((e) => selectedIds.has(e.id)),
    [data.equipments, selectedIds]
  )

  const handleBulkDelete = useCallback(() => {
    if (selectedItems.length === 0) return
    actions.bulkRemoveEquipments(selectedItems.map((e) => e.id))
    toast.success(`${selectedItems.length}件の設備を削除しました`)
    clearSelection()
    setShowBulkDeleteDialog(false)
  }, [selectedItems, actions, clearSelection])

  const handleBulkEdit = useCallback(() => {
    const updates: Partial<Pick<Equipment, "currency">> = {}
    if (bulkEditFields.currency.enabled) updates.currency = bulkEditFields.currency.value
    if (Object.keys(updates).length === 0) return
    actions.bulkUpdateEquipments(selectedItems.map((e) => e.id), updates)
    toast.success(`${selectedItems.length}件の設備を更新しました`)
    clearSelection()
    setShowBulkEditDialog(false)
  }, [selectedItems, actions, bulkEditFields, clearSelection])

  const resetBulkEditFields = useCallback(() => {
    setBulkEditFields({
      currency: { enabled: false, value: "JPY" },
    })
  }, [])

  const { updateEquipment, removeEquipment, addEquipment } = actions

  const resetEquipment = () =>
    setEditingEquipment({
      id: null,
      name: "",
      acquisitionCost: 0,
      currency: "JPY",
      amortizationYears: 5,
      utilizationRate: 100,
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

  const handleEquipmentSave = () => {
    const { id, ...rest } = editingEquipment
    if (!id) return
    const name = editingEquipment.name.trim()
    if (!name) return
    updateEquipment({ id, ...rest, name })
    toast.success("設備を更新しました", {
      description: `${name} / ${formatCurrency(editingEquipment.acquisitionCost, editingEquipment.currency)}`,
    })
    resetEquipment()
  }

  const handleEquipmentDelete = () => {
    const { id } = editingEquipment
    if (!id) return
    const name = editingEquipment.name.trim() || "設備"
    setDeleteTarget({ id, name })
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    removeEquipment(deleteTarget.id)
    toast.success("設備を削除しました", { description: `「${deleteTarget.name}」を削除しました。` })
    resetEquipment()
    setDeleteTarget(null)
  }

  const handleEquipmentCopy = (equipment: Equipment) => {
    const newId = createTempId()
    const name = `${equipment.name} (コピー)`
    addEquipment({
      id: newId,
      name,
      acquisitionCost: equipment.acquisitionCost,
      currency: equipment.currency,
      amortizationYears: equipment.amortizationYears,
      utilizationRate: equipment.utilizationRate ?? 100,
      note: equipment.note,
      imageUrl: equipment.imageUrl,
    })
    toast.success("設備をコピーしました", { description: `「${name}」を作成しました。` })
    setEditingEquipment({
      id: newId,
      name,
      acquisitionCost: equipment.acquisitionCost,
      currency: equipment.currency,
      amortizationYears: equipment.amortizationYears,
      utilizationRate: equipment.utilizationRate ?? 100,
      note: equipment.note ?? "",
      imageUrl: equipment.imageUrl ?? "",
    })
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>設備一覧</CardTitle>
      </CardHeader>
      <CardContent>
        {data.equipments.length === 0 ? (
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
            <Table className="min-w-[780px]">
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
                  <TableHead>取得額</TableHead>
                  <TableHead>償却年数</TableHead>
                  <TableHead>使用率</TableHead>
                  <TableHead>備考</TableHead>
                  <TableHead>画像</TableHead>
                  <TableHead className="w-36 text-right">
                    <span className="sr-only">操作</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.map((equipment) => {
                  const isEditing = editingEquipment.id === equipment.id
                  return (
                    <TableRow key={equipment.id} className="group">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(equipment.id)}
                          onCheckedChange={(checked) => handleSelectOne(equipment.id, !!checked)}
                          aria-label={`${equipment.name}を選択`}
                        />
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingEquipment.name}
                            onChange={(event) => setEditingEquipment((prev) => ({ ...prev, name: event.target.value }))}
                          />
                        ) : (
                          equipment.name
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <NumberInput
                              value={editingEquipment.acquisitionCost}
                              onValueChange={(next) =>
                                setEditingEquipment((prev) => ({ ...prev, acquisitionCost: next === "" ? 0 : next }))
                              }
                            />
                            <Select
                              value={editingEquipment.currency}
                              onValueChange={(value) => setEditingEquipment((prev) => ({ ...prev, currency: value }))}
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
                          formatCurrency(equipment.acquisitionCost, equipment.currency)
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <NumberInput
                            value={editingEquipment.amortizationYears}
                            onValueChange={(next) =>
                              setEditingEquipment((prev) => ({ ...prev, amortizationYears: next === "" ? 0 : next }))
                            }
                          />
                        ) : (
                          `${equipment.amortizationYears}年`
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <NumberInput
                            value={editingEquipment.utilizationRate ?? 100}
                            onValueChange={(next) =>
                              setEditingEquipment((prev) => ({
                                ...prev,
                                utilizationRate: next === "" ? 0 : Math.min(Math.max(Number(next), 0), 100),
                              }))
                            }
                            min={0}
                            max={100}
                          />
                        ) : (
                          `${equipment.utilizationRate ?? 100}%`
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Textarea
                            value={editingEquipment.note ?? ""}
                            onChange={(event) => setEditingEquipment((prev) => ({ ...prev, note: event.target.value }))}
                          />
                        ) : (
                          equipment.note || "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <ImageUrlField
                            value={editingEquipment.imageUrl ?? ""}
                            onChange={(url) => setEditingEquipment((prev) => ({ ...prev, imageUrl: url }))}
                            placeholder="https://..."
                            inputClassName="w-40"
                          />
                        ) : equipment.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={equipment.imageUrl} alt={equipment.name} className="h-6 w-6 rounded object-cover" />
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          renderActionButtons(handleEquipmentSave, resetEquipment, handleEquipmentDelete)
                        ) : (
                          <div className="master-row-actions flex items-center justify-end gap-1">
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() =>
                                setEditingEquipment({
                                  id: equipment.id,
                                  name: equipment.name,
                                  acquisitionCost: equipment.acquisitionCost,
                                  currency: equipment.currency,
                                  amortizationYears: equipment.amortizationYears,
                                  utilizationRate: equipment.utilizationRate ?? 100,
                                  note: equipment.note ?? "",
                                  imageUrl: equipment.imageUrl ?? "",
                                })
                              }
                              title="編集"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() => handleEquipmentCopy(equipment)}
                              title="コピー"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                              onClick={() => setDeleteTarget({ id: equipment.id, name: equipment.name })}
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
            {selectedItems.length}件の設備を削除しますか？関連するコスト明細も削除されます。この操作は取り消せません。
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-40 overflow-y-auto rounded border bg-muted/30 px-3 py-2">
          <ul className="space-y-1 text-sm">
            {selectedItems.map((e) => (
              <li key={e.id} className="truncate">・{e.name}</li>
            ))}
          </ul>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setShowBulkDeleteDialog(false)}>
            キャンセル
          </Button>
          <Button type="button" variant="destructive" onClick={handleBulkDelete}>
            {selectedItems.length}件を削除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={showBulkEditDialog} onOpenChange={(open) => !open && setShowBulkEditDialog(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>一括編集（{selectedItems.length}件の設備）</DialogTitle>
          <DialogDescription>
            チェックしたフィールドのみ、選択中の設備に一括適用されます。
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-28 overflow-y-auto rounded border bg-muted/30 px-3 py-2">
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {selectedItems.map((e) => (
              <li key={e.id} className="truncate">{e.name}</li>
            ))}
          </ul>
        </div>
        <div className="space-y-4 py-2">
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
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setShowBulkEditDialog(false)}>
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={handleBulkEdit}
            disabled={!bulkEditFields.currency.enabled}
          >
            適用する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>設備を削除しますか？</DialogTitle>
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
