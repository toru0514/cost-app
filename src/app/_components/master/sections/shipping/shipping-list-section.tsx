"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type { AppActions } from "@/lib/app-data"
import { formatCurrency } from "@/lib/calculations"
import { currencyOptions } from "@/lib/constants"
import type { AppData, ShippingMethod } from "@/lib/types"
import { Copy, Edit3, Trash2 } from "lucide-react"
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
    removeShippingMethod(id)
    toast.success("配送方法を削除しました", { description: `「${name}」を削除しました。` })
    resetShipping()
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
    <Card>
      <CardHeader>
        <CardTitle>配送方法一覧</CardTitle>
      </CardHeader>
      <CardContent>
        {(data.shippingMethods ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
        ) : (
          <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
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
                {(data.shippingMethods ?? []).map((method) => {
                  const isEditing = editingShipping.id === method.id
                  return (
                    <TableRow key={method.id} className="group">
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
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
                              onClick={() => {
                                removeShippingMethod(method.id)
                                toast.success("配送方法を削除しました", { description: `「${method.name}」を削除しました。` })
                              }}
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
        )}
      </CardContent>
    </Card>
  )
}
