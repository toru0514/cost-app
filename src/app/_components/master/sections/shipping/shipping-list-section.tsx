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
import type { AppData, ShippingMethod } from "@/lib/types"
import { toast } from "sonner"

interface ShippingListSectionProps {
  data: AppData
  actions: AppActions
  createTempId: () => string
}

export function ShippingListSection({ data, actions, createTempId }: ShippingListSectionProps) {
  const [editingShipping, setEditingShipping] = useState<Omit<ShippingMethod, "id"> & { id: string | null }>({
    id: null,
    name: "",
    description: "",
    unitCost: 0,
    currency: "JPY",
    note: "",
  })

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const searchFields = useMemo<SearchField[]>(() => [{ key: "name", label: "名称" }, { key: "description", label: "説明" }, { key: "note", label: "備考" }], [])
  const { query, setQuery, checkedFields, setCheckedFields, allFieldKeys } = useSearchWithScope(searchFields)
  const filteredRows = useMemo(() => filterRowsBySearch(data.shippingMethods ?? [], query, checkedFields, allFieldKeys), [data.shippingMethods, query, checkedFields, allFieldKeys])
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
  }>({ currency: { enabled: false, value: "JPY" } })

  const currentPageIds = useMemo(() => pagedRows.map((m) => m.id), [pagedRows])
  const allCurrentPageSelected = isAllSelected(currentPageIds)
  const someCurrentPageSelected = isSomeSelected(currentPageIds)
  const handleSelectAllPage = useCallback(() => { bulkSelectAll(currentPageIds) }, [bulkSelectAll, currentPageIds])

  const selectedItems = useMemo(
    () => (data.shippingMethods ?? []).filter((m) => selectedIds.has(m.id)),
    [data.shippingMethods, selectedIds]
  )

  const handleBulkDelete = useCallback(() => {
    if (selectedItems.length === 0) return
    actions.bulkRemoveShippingMethods(selectedItems.map((m) => m.id))
    toast.success(`${selectedItems.length}件の配送方法を削除しました`)
    clearSelection()
    setShowBulkDeleteDialog(false)
  }, [selectedItems, actions, clearSelection])

  const handleBulkEdit = useCallback(() => {
    const updates: Partial<Pick<ShippingMethod, "currency">> = {}
    if (bulkEditFields.currency.enabled) updates.currency = bulkEditFields.currency.value
    if (Object.keys(updates).length === 0) return
    actions.bulkUpdateShippingMethods(selectedItems.map((m) => m.id), updates)
    toast.success(`${selectedItems.length}件の配送方法を更新しました`)
    clearSelection()
    setShowBulkEditDialog(false)
  }, [selectedItems, actions, bulkEditFields, clearSelection])

  const resetBulkEditFields = useCallback(() => {
    setBulkEditFields({ currency: { enabled: false, value: "JPY" } })
  }, [])

  const { updateShippingMethod, removeShippingMethod, addShippingMethod } = actions

  const resetShipping = () =>
    setEditingShipping({ id: null, name: "", description: "", unitCost: 0, currency: "JPY", note: "" })

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

  const handleShippingSave = () => {
    const { id, ...rest } = editingShipping
    if (!id) return
    const name = editingShipping.name.trim()
    if (!name) return
    updateShippingMethod({ id, ...rest, name })
    toast.success("配送方法を更新しました", {
      description: `${name} / ${formatCurrency(editingShipping.unitCost, editingShipping.currency)}`,
    })
    resetShipping()
  }

  const handleShippingDelete = () => {
    const { id } = editingShipping
    if (!id) return
    const name = editingShipping.name.trim() || "配送方法"
    setDeleteTarget({ id, name })
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    removeShippingMethod(deleteTarget.id)
    toast.success("配送方法を削除しました", { description: `「${deleteTarget.name}」を削除しました。` })
    resetShipping()
    setDeleteTarget(null)
  }

  const handleShippingCopy = (method: ShippingMethod) => {
    const newId = createTempId()
    const name = `${method.name} (コピー)`
    addShippingMethod({
      id: newId,
      name,
      description: method.description,
      unitCost: method.unitCost,
      currency: method.currency,
      note: method.note,
    })
    toast.success("配送方法をコピーしました", { description: `「${name}」を作成しました。` })
    setEditingShipping({
      id: newId,
      name,
      description: method.description ?? "",
      unitCost: method.unitCost,
      currency: method.currency,
      note: method.note ?? "",
    })
  }

  return (
    <>
      <Card>
      <CardHeader>
        <CardTitle>配送方法一覧</CardTitle>
      </CardHeader>
      <CardContent>
        {(data.shippingMethods ?? []).length === 0 ? (
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
              {(() => { const otherCount = getOtherPageCount(currentPageIds); return otherCount > 0 ? <span className="text-xs text-amber-600 dark:text-amber-400">（他のページに{otherCount}件の選択あり）</span> : null })()}
              <Button type="button" size="sm" variant="outline" onClick={() => { resetBulkEditFields(); setShowBulkEditDialog(true) }}>一括編集</Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => setShowBulkDeleteDialog(true)}>一括削除</Button>
              <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>選択解除</Button>
            </div>
          )}
          <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
            <Table className="min-w-[680px]">
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
                  <TableHead>説明</TableHead>
                  <TableHead>単価</TableHead>
                  <TableHead>備考</TableHead>
                  <TableHead className="w-36 text-right">
                    <span className="sr-only">操作</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.map((method) => {
                  const isEditing = editingShipping.id === method.id
                  return (
                    <TableRow key={method.id} className="group">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(method.id)}
                          onCheckedChange={(checked) => handleSelectOne(method.id, !!checked)}
                          aria-label={`${method.name}を選択`}
                        />
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingShipping.name}
                            onChange={(event) => setEditingShipping((prev) => ({ ...prev, name: event.target.value }))}
                          />
                        ) : (
                          method.name
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingShipping.description ?? ""}
                            onChange={(event) => setEditingShipping((prev) => ({ ...prev, description: event.target.value }))}
                          />
                        ) : (
                          method.description || "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <NumberInput
                              value={editingShipping.unitCost}
                              onValueChange={(next) => setEditingShipping((prev) => ({ ...prev, unitCost: next === "" ? 0 : next }))}
                            />
                            <Select
                              value={editingShipping.currency}
                              onValueChange={(value) => setEditingShipping((prev) => ({ ...prev, currency: value }))}
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
                          formatCurrency(method.unitCost, method.currency)
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Textarea
                            value={editingShipping.note ?? ""}
                            onChange={(event) => setEditingShipping((prev) => ({ ...prev, note: event.target.value }))}
                          />
                        ) : (
                          method.note || "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          renderActionButtons(handleShippingSave, resetShipping, handleShippingDelete)
                        ) : (
                          <div className="master-row-actions flex items-center justify-end gap-1">
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() =>
                                setEditingShipping({
                                  id: method.id,
                                  name: method.name,
                                  description: method.description ?? "",
                                  unitCost: method.unitCost,
                                  currency: method.currency,
                                  note: method.note ?? "",
                                })
                              }
                              title="編集"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() => handleShippingCopy(method)}
                              title="コピー"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                              onClick={() => setDeleteTarget({ id: method.id, name: method.name })}
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
            <DialogTitle>配送方法を削除しますか？</DialogTitle>
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
            <DialogTitle>{selectedItems.length}件の配送方法を削除しますか？</DialogTitle>
            <DialogDescription>以下の配送方法を削除します。この操作は取り消せません。</DialogDescription>
          </DialogHeader>
          <div className="max-h-40 overflow-y-auto rounded border p-2">
            <ul className="space-y-1 text-sm">{selectedItems.map((m) => <li key={m.id}>・{m.name}</li>)}</ul>
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
            <DialogTitle>一括編集（{selectedItems.length}件の配送方法）</DialogTitle>
            <DialogDescription>チェックを入れた項目のみ更新されます。</DialogDescription>
          </DialogHeader>
          <div className="max-h-32 overflow-y-auto rounded border p-2 mb-2">
            <ul className="space-y-1 text-sm">{selectedItems.map((m) => <li key={m.id}>・{m.name}</li>)}</ul>
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
                <SelectContent>{currencyOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setShowBulkEditDialog(false)}>キャンセル</Button>
            <Button type="button" onClick={handleBulkEdit} disabled={!bulkEditFields.currency.enabled}>更新する</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
