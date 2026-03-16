"use client"

import { useCallback, useMemo, useState } from "react"

import { Copy, Edit3, Trash2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { useBulkSelection } from "@/hooks/use-bulk-selection"

import { filterRowsBySearch, useSearchWithScope, type SearchField } from "@/app/_components/shared/search-with-scope"
import { TableToolbar } from "@/app/_components/shared/table-toolbar"
import { useTableSort, type SortOption } from "@/hooks/use-table-sort"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TablePagination } from "@/components/ui/table-pagination"
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
import { Textarea } from "@/components/ui/textarea"
import type { AppActions } from "@/lib/app-data"
import { formatCurrency } from "@/lib/calculations"
import { currencyOptions } from "@/lib/constants"
import { useTablePagination } from "@/hooks/use-table-pagination"
import type { AppData, LaborRole } from "@/lib/types"
import { toast } from "sonner"

interface LaborListSectionProps {
  data: AppData
  actions: AppActions
  createTempId: () => string
}

export function LaborListSection({ data, actions, createTempId }: LaborListSectionProps) {
  const [editingLabor, setEditingLabor] = useState<Omit<LaborRole, "id"> & { id: string | null }>({
    id: null,
    name: "",
    hourlyRate: 1800,
    currency: "JPY",
    note: "",
  })

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const searchFields = useMemo<SearchField[]>(() => [{ key: "name", label: "名称" }, { key: "note", label: "備考" }], [])
  const { query, setQuery, checkedFields, setCheckedFields, allFieldKeys } = useSearchWithScope(searchFields)
  const filteredRows = useMemo(() => filterRowsBySearch(data.laborRoles, query, checkedFields, allFieldKeys), [data.laborRoles, query, checkedFields, allFieldKeys])
  const sortOptions = useMemo<SortOption<(typeof filteredRows)[number]>[]>(() => [
    { key: "name", label: "名称" },
    { key: "hourlyRate", label: "時給", compareFn: (a, b) => a.hourlyRate - b.hourlyRate },
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

  const currentPageIds = useMemo(() => pagedRows.map((item) => item.id), [pagedRows])
  const allCurrentPageSelected = isAllSelected(currentPageIds)
  const someCurrentPageSelected = isSomeSelected(currentPageIds)
  const handleSelectAllPage = useCallback(() => { bulkSelectAll(currentPageIds) }, [bulkSelectAll, currentPageIds])

  const selectedItems = useMemo(
    () => data.laborRoles.filter((item) => selectedIds.has(item.id)),
    [data.laborRoles, selectedIds]
  )

  const handleBulkDelete = useCallback(() => {
    if (selectedItems.length === 0) return
    actions.bulkRemoveLaborRoles(selectedItems.map((item) => item.id))
    toast.success(`${selectedItems.length}件の人件費を削除しました`)
    clearSelection()
    setShowBulkDeleteDialog(false)
  }, [selectedItems, actions, clearSelection])

  const handleBulkEdit = useCallback(() => {
    const updates: Partial<Pick<LaborRole, "currency">> = {}
    if (bulkEditFields.currency.enabled) updates.currency = bulkEditFields.currency.value
    if (Object.keys(updates).length === 0) return
    actions.bulkUpdateLaborRoles(selectedItems.map((item) => item.id), updates)
    toast.success(`${selectedItems.length}件の人件費を更新しました`)
    clearSelection()
    setShowBulkEditDialog(false)
  }, [selectedItems, actions, bulkEditFields, clearSelection])

  const resetBulkEditFields = useCallback(() => {
    setBulkEditFields({
      currency: { enabled: false, value: "JPY" },
    })
  }, [])

  const { updateLaborRole, removeLaborRole, addLaborRole } = actions

  const resetLabor = () => setEditingLabor({ id: null, name: "", hourlyRate: 1800, currency: "JPY", note: "" })

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

  const handleLaborSave = () => {
    const { id, ...rest } = editingLabor
    if (!id) return
    const name = editingLabor.name.trim()
    if (!name) return
    updateLaborRole({ id, ...rest, name })
    toast.success("人件費レートを更新しました", {
      description: `${name} / ${formatCurrency(editingLabor.hourlyRate, editingLabor.currency)}`,
    })
    resetLabor()
  }

  const handleLaborDelete = () => {
    const { id } = editingLabor
    if (!id) return
    const name = editingLabor.name.trim() || "人件費レート"
    setDeleteTarget({ id, name })
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    removeLaborRole(deleteTarget.id)
    toast.success("人件費レートを削除しました", { description: `「${deleteTarget.name}」を削除しました。` })
    resetLabor()
    setDeleteTarget(null)
  }

  const handleLaborCopy = (role: LaborRole) => {
    const newId = createTempId()
    const name = `${role.name} (コピー)`
    addLaborRole({ id: newId, name, hourlyRate: role.hourlyRate, currency: role.currency, note: role.note })
    toast.success("人件費レートをコピーしました", { description: `「${name}」を作成しました。` })
    setEditingLabor({ id: newId, name, hourlyRate: role.hourlyRate, currency: role.currency, note: role.note ?? "" })
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>人件費一覧</CardTitle>
      </CardHeader>
      <CardContent>
        {data.laborRoles.length === 0 ? (
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
            <Table className="min-w-[650px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allCurrentPageSelected ? true : someCurrentPageSelected ? "indeterminate" : false}
                      onCheckedChange={handleSelectAllPage}
                      aria-label="全選択"
                    />
                  </TableHead>
                  <TableHead>作業カテゴリ</TableHead>
                  <TableHead>時給</TableHead>
                  <TableHead>備考</TableHead>
                  <TableHead className="w-36 text-right">
                    <span className="sr-only">操作</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.map((role) => {
                  const isEditing = editingLabor.id === role.id
                  return (
                    <TableRow key={role.id} className="group">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(role.id)}
                          onCheckedChange={(checked) => handleSelectOne(role.id, !!checked)}
                          aria-label={`${role.name}を選択`}
                        />
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingLabor.name}
                            onChange={(event) => setEditingLabor((prev) => ({ ...prev, name: event.target.value }))}
                          />
                        ) : (
                          role.name
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <NumberInput
                              value={editingLabor.hourlyRate}
                              onValueChange={(next) => setEditingLabor((prev) => ({ ...prev, hourlyRate: next === "" ? 0 : next }))}
                            />
                            <Select
                              value={editingLabor.currency}
                              onValueChange={(value) => setEditingLabor((prev) => ({ ...prev, currency: value }))}
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
                          formatCurrency(role.hourlyRate, role.currency)
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Textarea
                            value={editingLabor.note ?? ""}
                            onChange={(event) => setEditingLabor((prev) => ({ ...prev, note: event.target.value }))}
                          />
                        ) : (
                          role.note || "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          renderActionButtons(handleLaborSave, resetLabor, handleLaborDelete)
                        ) : (
                          <div className="master-row-actions flex items-center justify-end gap-1">
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() =>
                                setEditingLabor({
                                  id: role.id,
                                  name: role.name,
                                  hourlyRate: role.hourlyRate,
                                  currency: role.currency,
                                  note: role.note ?? "",
                                })
                              }
                              title="編集"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() => handleLaborCopy(role)}
                              title="コピー"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                              onClick={() => setDeleteTarget({ id: role.id, name: role.name })}
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
          <DialogTitle>人件費レートを削除しますか？</DialogTitle>
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
          <DialogTitle>{selectedItems.length}件の人件費を削除しますか？</DialogTitle>
          <DialogDescription>
            以下の人件費を削除します。この操作は取り消せません。
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
          <DialogTitle>一括編集（{selectedItems.length}件の人件費）</DialogTitle>
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
