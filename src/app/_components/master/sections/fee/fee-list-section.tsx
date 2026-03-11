"use client"

import { useState } from "react"

import { Copy, Edit3 } from "lucide-react"

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
    removeFee(editingFee.id)
    toast.success("手数料を削除しました", { description: `「${name}」を削除しました。` })
    reset()
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
    <Card>
      <CardHeader>
        <CardTitle>手数料一覧</CardTitle>
      </CardHeader>
      <CardContent>
        {data.fees.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
        ) : (
          <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
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
                {data.fees.map((fee) => {
                  const isEditing = editingFee.id === fee.id
                  return (
                    <TableRow key={fee.id}>
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
