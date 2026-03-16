"use client"

import { useCallback, useMemo, useState } from "react"

import { Copy, Edit3, Trash2 } from "lucide-react"

import {
  filterRowsBySearch,
  useSearchWithScope,
  type SearchField,
} from "@/app/_components/shared/search-with-scope"
import { TableToolbar } from "@/app/_components/shared/table-toolbar"
import { useTableSort, type SortOption } from "@/hooks/use-table-sort"
import { Checkbox } from "@/components/ui/checkbox"
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
import type { AppData, Fee } from "@/lib/types"
import { toast } from "sonner"

interface FeeListSectionProps {
  data: AppData
  actions: AppActions
  createTempId: () => string
}

export function FeeListSection({ data, actions, createTempId }: FeeListSectionProps) {
  const [editingFee, setEditingFee] = useState<Omit<Fee, "id"> & { id: string | null }>({
    id: null,
    name: "",
    ratePercent: 5,
    fixedAmount: 0,
    currency: "JPY",
    note: "",
  })

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const searchFields = useMemo<SearchField[]>(() => [{ key: "name", label: "名称" }, { key: "note", label: "備考" }], [])
  const { query, setQuery, checkedFields, setCheckedFields, allFieldKeys } = useSearchWithScope(searchFields)
  const filteredRows = useMemo(() => filterRowsBySearch(data.fees, query, checkedFields, allFieldKeys), [data.fees, query, checkedFields, allFieldKeys])
  const sortOptions = useMemo<SortOption<(typeof filteredRows)[number]>[]>(() => [
    { key: "name", label: "名称" },
    { key: "ratePercent", label: "料率", compareFn: (a, b) => a.ratePercent - b.ratePercent },
    { key: "fixedAmount", label: "固定額", compareFn: (a, b) => a.fixedAmount - b.fixedAmount },
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

  const currentPageIds = useMemo(() => pagedRows.map((f) => f.id), [pagedRows])
  const allCurrentPageSelected = isAllSelected(currentPageIds)
  const someCurrentPageSelected = isSomeSelected(currentPageIds)

  const handleSelectAllPage = useCallback(() => {
    bulkSelectAll(currentPageIds)
  }, [bulkSelectAll, currentPageIds])

  const selectedItems = useMemo(
    () => data.fees.filter((f) => selectedIds.has(f.id)),
    [data.fees, selectedIds]
  )

  const handleBulkDelete = useCallback(() => {
    if (selectedItems.length === 0) return
    actions.bulkRemoveFees(selectedItems.map((f) => f.id))
    toast.success(`${selectedItems.length}件の手数料を削除しました`)
    clearSelection()
    setShowBulkDeleteDialog(false)
  }, [selectedItems, actions, clearSelection])

  const handleBulkEdit = useCallback(() => {
    const updates: Partial<Pick<Fee, "currency">> = {}
    if (bulkEditFields.currency.enabled) updates.currency = bulkEditFields.currency.value
    if (Object.keys(updates).length === 0) return
    actions.bulkUpdateFees(selectedItems.map((f) => f.id), updates)
    toast.success(`${selectedItems.length}件の手数料を更新しました`)
    clearSelection()
    setShowBulkEditDialog(false)
  }, [selectedItems, actions, bulkEditFields, clearSelection])

  const resetBulkEditFields = useCallback(() => {
    setBulkEditFields({
      currency: { enabled: false, value: "JPY" },
    })
  }, [])

  const { updateFee, removeFee, addFee } = actions

  const reset = () =>
    setEditingFee({ id: null, name: "", ratePercent: 5, fixedAmount: 0, currency: "JPY", note: "" })

  const renderActions = (onSave: () => void, onCancel: () => void, onDelete?: () => void) => (
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

  const handleSave = () => {
    if (!editingFee.id) return
    const name = editingFee.name.trim()
    if (!name) return
    updateFee({ ...editingFee, id: editingFee.id, name })
    toast.success("手数料を更新しました", {
      description: `${name} / ${editingFee.ratePercent}% + ${formatCurrency(editingFee.fixedAmount, editingFee.currency)}`,
    })
    reset()
  }

  const handleDelete = () => {
    if (!editingFee.id) return
    const name = editingFee.name.trim() || "手数料"
    setDeleteTarget({ id: editingFee.id, name })
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    removeFee(deleteTarget.id)
    toast.success("手数料を削除しました", { description: `「${deleteTarget.name}」を削除しました。` })
    reset()
    setDeleteTarget(null)
  }

  const handleCopy = (fee: Fee) => {
    const newId = createTempId()
    const name = `${fee.name} (コピー)`
    addFee({
      id: newId,
      name,
      ratePercent: fee.ratePercent,
      fixedAmount: fee.fixedAmount,
      currency: fee.currency,
      note: fee.note ?? "",
    })
    toast.success("手数料をコピーしました", { description: `「${name}」を作成しました。` })
    setEditingFee({
      id: newId,
      name,
      ratePercent: fee.ratePercent,
      fixedAmount: fee.fixedAmount,
      currency: fee.currency,
      note: fee.note ?? "",
    })
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>手数料一覧</CardTitle>
      </CardHeader>
      <CardContent>
        {data.fees.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
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
            <Table className="min-w-[700px]">
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
                  <TableHead>料率</TableHead>
                  <TableHead>固定額</TableHead>
                  <TableHead>備考</TableHead>
                  <TableHead className="w-48 text-right">
                    <span className="sr-only">操作</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.map((fee) => {
                  const isEditing = editingFee.id === fee.id
                  return (
                    <TableRow key={fee.id} className="group">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(fee.id)}
                          onCheckedChange={(checked) => handleSelectOne(fee.id, !!checked)}
                          aria-label={`${fee.name}を選択`}
                        />
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingFee.name}
                            onChange={(event) => setEditingFee((prev) => ({ ...prev, name: event.target.value }))}
                          />
                        ) : (
                          fee.name
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <NumberInput
                            value={editingFee.ratePercent}
                            min={0}
                            max={100}
                            onValueChange={(next) =>
                              setEditingFee((prev) => ({ ...prev, ratePercent: next === "" ? 0 : Number(next) }))
                            }
                          />
                        ) : (
                          `${fee.ratePercent}%`
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <NumberInput
                              value={editingFee.fixedAmount}
                              onValueChange={(next) =>
                                setEditingFee((prev) => ({ ...prev, fixedAmount: next === "" ? 0 : Number(next) }))
                              }
                            />
                            <Select
                              value={editingFee.currency}
                              onValueChange={(value) => setEditingFee((prev) => ({ ...prev, currency: value }))}
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
                          formatCurrency(fee.fixedAmount, fee.currency)
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Textarea
                            value={editingFee.note}
                            onChange={(event) => setEditingFee((prev) => ({ ...prev, note: event.target.value }))}
                          />
                        ) : (
                          fee.note || "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing
                          ? renderActions(handleSave, reset, handleDelete)
                          : (
                            <div className="master-row-actions flex items-center justify-end gap-1">
                              <button
                                type="button"
                                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={() =>
                                  setEditingFee({
                                    id: fee.id,
                                    name: fee.name,
                                    ratePercent: fee.ratePercent,
                                    fixedAmount: fee.fixedAmount,
                                    currency: fee.currency,
                                    note: fee.note ?? "",
                                  })
                                }
                                title="編集"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={() => handleCopy(fee)}
                                title="複製"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                                onClick={() => setDeleteTarget({ id: fee.id, name: fee.name })}
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
            {selectedItems.length}件の手数料を削除しますか？この操作は取り消せません。
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-40 overflow-y-auto rounded border bg-muted/30 px-3 py-2">
          <ul className="space-y-1 text-sm">
            {selectedItems.map((f) => (
              <li key={f.id} className="truncate">・{f.name}</li>
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
          <DialogTitle>一括編集（{selectedItems.length}件の手数料）</DialogTitle>
          <DialogDescription>
            チェックしたフィールドのみ、選択中の手数料に一括適用されます。
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-28 overflow-y-auto rounded border bg-muted/30 px-3 py-2">
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {selectedItems.map((f) => (
              <li key={f.id} className="truncate">{f.name}</li>
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
          <DialogTitle>手数料を削除しますか？</DialogTitle>
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
