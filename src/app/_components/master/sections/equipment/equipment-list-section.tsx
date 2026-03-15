"use client"

import { useMemo, useState } from "react"

import { Copy, Edit3, Trash2 } from "lucide-react"

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
          <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
            <Table className="min-w-[740px]">
              <TableHeader>
                <TableRow>
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
                          <Input
                            type="url"
                            placeholder="https://..."
                            value={editingEquipment.imageUrl}
                            onChange={(event) => setEditingEquipment((prev) => ({ ...prev, imageUrl: event.target.value }))}
                            className="w-40"
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
