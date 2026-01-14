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
  })

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
    removeEquipment(id)
    toast.success("設備を削除しました", { description: `「${name}」を削除しました。` })
    resetEquipment()
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
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>設備一覧</CardTitle>
      </CardHeader>
      <CardContent>
        {data.equipments.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
        ) : (
          <div className="relative w-full max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>取得額</TableHead>
                  <TableHead>償却年数</TableHead>
                  <TableHead>使用率</TableHead>
                  <TableHead>備考</TableHead>
                  <TableHead className="w-36 text-right">
                    <span className="sr-only">操作</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.equipments.map((equipment) => {
                  const isEditing = editingEquipment.id === equipment.id
                  return (
                    <TableRow key={equipment.id}>
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
                      <TableCell className="text-right">
                        {isEditing ? (
                          renderActionButtons(handleEquipmentSave, resetEquipment, handleEquipmentDelete)
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setEditingEquipment({
                                  id: equipment.id,
                                  name: equipment.name,
                                  acquisitionCost: equipment.acquisitionCost,
                                  currency: equipment.currency,
                                  amortizationYears: equipment.amortizationYears,
                                  utilizationRate: equipment.utilizationRate ?? 100,
                                  note: equipment.note ?? "",
                                })
                              }
                            >
                              編集
                            </Button>
                            <Button type="button" size="sm" variant="secondary" onClick={() => handleEquipmentCopy(equipment)}>
                              コピー
                            </Button>
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
