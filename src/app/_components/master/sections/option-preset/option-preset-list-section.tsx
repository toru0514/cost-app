"use client"

import { useMemo, useState } from "react"

import { Copy, Edit3, Trash2 } from "lucide-react"

import {
  SearchWithScope,
  filterRowsBySearch,
  useSearchWithScope,
  type SearchField,
} from "@/app/_components/shared/search-with-scope"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination } from "@/components/ui/table-pagination"
import { useTablePagination } from "@/hooks/use-table-pagination"
import type { AppActions } from "@/lib/app-data"
import type { AppData, OptionPreset, ProductSizeVariant } from "@/lib/types"
import { toast } from "sonner"

interface OptionPresetListSectionProps {
  data: AppData
  actions: AppActions
  createTempId: () => string
}

export function OptionPresetListSection({ data, actions, createTempId }: OptionPresetListSectionProps) {
  const [editingOptionPreset, setEditingOptionPreset] = useState<{ id: string | null; name: string; variants: ProductSizeVariant[] }>({
    id: null,
    name: "",
    variants: [{ label: "", quantity: 0 }],
  })

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const searchFields = useMemo<SearchField[]>(() => [{ key: "name", label: "名称" }], [])
  const { query, setQuery, checkedFields, setCheckedFields, allFieldKeys } = useSearchWithScope(searchFields)
  const filteredRows = useMemo(() => filterRowsBySearch(data.optionPresets ?? [], query, checkedFields, allFieldKeys), [data.optionPresets, query, checkedFields, allFieldKeys])
  const { pagedRows, currentPage, totalPages, onPageChange } = useTablePagination(filteredRows)

  const { updateOptionPreset, removeOptionPreset, addOptionPreset } = actions

  const resetOptionPreset = () => setEditingOptionPreset({ id: null, name: "", variants: [{ label: "", quantity: 0 }] })

  const addVariant = () => {
    setEditingOptionPreset((prev) => ({
      ...prev,
      variants: [...prev.variants, { label: "", quantity: 0 }],
    }))
  }

  const updateVariant = (index: number, patch: Partial<ProductSizeVariant>) => {
    setEditingOptionPreset((prev) => ({
      ...prev,
      variants: prev.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...patch } : variant
      ),
    }))
  }

  const removeVariant = (index: number) => {
    setEditingOptionPreset((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, variantIndex) => variantIndex !== index),
    }))
  }

  const handlePresetSave = () => {
    const { id } = editingOptionPreset
    if (!id) return
    const name = editingOptionPreset.name.trim()
    const variants = editingOptionPreset.variants
      .map((variant) => ({ label: variant.label.trim(), quantity: Number(variant.quantity) || 0 }))
      .filter((variant) => variant.label.length > 0)
    if (!name || variants.length === 0) return
    updateOptionPreset({ id, name, variants })
    toast.success("オプションプリセットを更新しました", { description: `「${name}」を更新しました。` })
    resetOptionPreset()
  }

  const handlePresetDelete = () => {
    const { id } = editingOptionPreset
    if (!id) return
    const name = editingOptionPreset.name.trim() || "プリセット"
    setDeleteTarget({ id, name })
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    removeOptionPreset(deleteTarget.id)
    toast.success("オプションプリセットを削除しました", { description: `「${deleteTarget.name}」を削除しました。` })
    resetOptionPreset()
    setDeleteTarget(null)
  }

  const handlePresetCopy = (preset: OptionPreset) => {
    const newId = createTempId()
    const name = `${preset.name} (コピー)`
    addOptionPreset({
      id: newId,
      name,
      variants: preset.variants.map((variant) => ({ label: variant.label, quantity: variant.quantity })),
    })
    toast.success("オプションプリセットをコピーしました", { description: `「${name}」を作成しました。` })
    setEditingOptionPreset({
      id: newId,
      name,
      variants:
        preset.variants.length > 0
          ? preset.variants.map((variant) => ({ label: variant.label, quantity: variant.quantity }))
          : [{ label: "", quantity: 0 }],
    })
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>オプションプリセット一覧</CardTitle>
        <CardDescription>登録済みプリセットの名称や内容を編集できます。</CardDescription>
      </CardHeader>
      <CardContent>
        {(data.optionPresets ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
        ) : (
          <div className="space-y-2">
          <SearchWithScope fields={searchFields} query={query} onQueryChange={setQuery} checkedFields={checkedFields} onCheckedFieldsChange={setCheckedFields} />
          <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead className="w-40 text-right">
                    <span className="sr-only">操作</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.map((preset) => {
                  const isEditing = editingOptionPreset.id === preset.id
                  const detailText =
                    preset.variants.length > 0
                      ? preset.variants.map((variant) => `${variant.label}(${variant.quantity})`).join(" / ")
                      : "-"
                  return (
                    <TableRow key={preset.id} className="group">
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingOptionPreset.name}
                            onChange={(event) =>
                              setEditingOptionPreset((prev) => ({ ...prev, name: event.target.value }))
                            }
                          />
                        ) : (
                          preset.name
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="space-y-2">
                            {editingOptionPreset.variants.map((variant, index) => (
                              <div key={`editing-preset-${index}`} className="flex flex-wrap items-center gap-2">
                                <Input
                                  className="min-w-[120px] flex-1"
                                  placeholder="例: S"
                                  value={variant.label}
                                  onChange={(event) => updateVariant(index, { label: event.target.value })}
                                />
                                <NumberInput
                                  value={variant.quantity}
                                  onValueChange={(next) => updateVariant(index, { quantity: next === "" ? 0 : next })}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeVariant(index)}
                                  disabled={editingOptionPreset.variants.length === 1}
                                >
                                  削除
                                </Button>
                              </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                              行を追加
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">{detailText}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <Button type="button" size="sm" onClick={handlePresetSave}>保存</Button>
                            <Button type="button" size="sm" variant="destructive" onClick={handlePresetDelete}>削除</Button>
                            <Button type="button" size="sm" variant="ghost" onClick={resetOptionPreset}>キャンセル</Button>
                          </div>
                        ) : (
                          <div className="master-row-actions flex items-center justify-end gap-1">
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() =>
                                setEditingOptionPreset({
                                  id: preset.id,
                                  name: preset.name,
                                  variants:
                                    preset.variants.length > 0
                                      ? preset.variants.map((variant) => ({ label: variant.label, quantity: variant.quantity }))
                                      : [{ label: "", quantity: 0 }],
                                })
                              }
                              title="編集"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() => handlePresetCopy(preset)}
                              title="コピー"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                              onClick={() => setDeleteTarget({ id: preset.id, name: preset.name })}
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
          <DialogTitle>オプションプリセットを削除しますか？</DialogTitle>
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
