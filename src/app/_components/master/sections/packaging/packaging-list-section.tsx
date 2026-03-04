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
import type { AppData, PackagingItem } from "@/lib/types"
import { toast } from "sonner"

interface PackagingListSectionProps {
  data: AppData
  actions: AppActions
  createTempId: () => string
  isAuthenticated: boolean
  packagingStocks: Map<string, number>
  masterStocksLoaded: boolean
  onSetPackagingStock: (id: string, quantity: number) => Promise<void>
}

export function PackagingListSection({ data, actions, createTempId, isAuthenticated, packagingStocks, masterStocksLoaded, onSetPackagingStock }: PackagingListSectionProps) {
  const [editingPackaging, setEditingPackaging] = useState<Omit<PackagingItem, "id"> & { id: string | null }>({
    id: null,
    name: "",
    unit: "set",
    sizeDescription: "",
    currency: "JPY",
    unitCost: 0,
    unitsPerBatch: 1,
    note: "",
  })

  const [editingStock, setEditingStock] = useState<{ id: string; value: string } | null>(null)
  const [savingStockId, setSavingStockId] = useState<string | null>(null)

  const { updatePackagingItem, removePackagingItem, addPackagingItem } = actions

  const handleStockSave = async (item: PackagingItem) => {
    if (!editingStock || editingStock.id !== item.id) return
    const quantity = Math.max(0, parseFloat(editingStock.value) || 0)
    setSavingStockId(item.id)
    try {
      await onSetPackagingStock(item.id, quantity)
      toast.success("残数を保存しました", { description: `${item.name}: ${quantity} ${item.unit}` })
      setEditingStock(null)
    } catch {
      toast.error("残数の保存に失敗しました")
    } finally {
      setSavingStockId(null)
    }
  }

  const resetPackaging = () =>
    setEditingPackaging({
      id: null,
      name: "",
      unit: "set",
      sizeDescription: "",
      currency: "JPY",
      unitCost: 0,
      unitsPerBatch: 1,
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

  const handlePackagingSave = () => {
    const { id, ...rest } = editingPackaging
    if (!id) return
    const name = editingPackaging.name.trim()
    if (!name) return
    updatePackagingItem({ id, ...rest, name })
    toast.success("梱包材を更新しました", {
      description: `${name} / ${formatCurrency(editingPackaging.unitCost, editingPackaging.currency)}`,
    })
    resetPackaging()
  }

  const handlePackagingDelete = () => {
    const { id } = editingPackaging
    if (!id) return
    const name = editingPackaging.name.trim() || "梱包材"
    removePackagingItem(id)
    toast.success("梱包材を削除しました", { description: `「${name}」を削除しました。` })
    resetPackaging()
  }

  const handlePackagingCopy = (item: PackagingItem) => {
    const newId = createTempId()
    const name = `${item.name} (コピー)`
    addPackagingItem({
      id: newId,
      name,
      unit: item.unit,
      sizeDescription: item.sizeDescription,
      currency: item.currency,
      unitCost: item.unitCost,
      unitsPerBatch: item.unitsPerBatch ?? 1,
      note: item.note,
    })
    toast.success("梱包材をコピーしました", { description: `「${name}」を作成しました。` })
    setEditingPackaging({
      id: newId,
      name,
      unit: item.unit,
      sizeDescription: item.sizeDescription ?? "",
      currency: item.currency,
      unitCost: item.unitCost,
      unitsPerBatch: item.unitsPerBatch ?? 1,
      note: item.note ?? "",
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>梱包材一覧</CardTitle>
      </CardHeader>
      <CardContent>
        {data.packagingItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
        ) : (
          <div className="relative w-full max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>単位</TableHead>
                  <TableHead>単価</TableHead>
                  <TableHead>セット数</TableHead>
                  <TableHead>仕様</TableHead>
                  <TableHead>備考</TableHead>
                  <TableHead>現在残数</TableHead>
                  <TableHead className="w-48 text-right">
                    <span className="sr-only">操作</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.packagingItems.map((item) => {
                  const isEditing = editingPackaging.id === item.id
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingPackaging.name}
                            onChange={(event) => setEditingPackaging((prev) => ({ ...prev, name: event.target.value }))}
                          />
                        ) : (
                          item.name
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingPackaging.unit}
                            onChange={(event) => setEditingPackaging((prev) => ({ ...prev, unit: event.target.value }))}
                          />
                        ) : (
                          item.unit
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <NumberInput
                              value={editingPackaging.unitCost}
                              onValueChange={(next) => setEditingPackaging((prev) => ({ ...prev, unitCost: next === "" ? 0 : next }))}
                            />
                            <Select
                              value={editingPackaging.currency}
                              onValueChange={(value) => setEditingPackaging((prev) => ({ ...prev, currency: value }))}
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
                          formatCurrency(item.unitCost, item.currency)
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <NumberInput
                            value={editingPackaging.unitsPerBatch ?? 1}
                            min={1}
                            onValueChange={(next) =>
                              setEditingPackaging((prev) => ({ ...prev, unitsPerBatch: next === "" ? 1 : Number(next) }))
                            }
                          />
                        ) : item.unitsPerBatch && item.unitsPerBatch > 0 ? (
                          `${item.unitsPerBatch}単位/セット`
                        ) : (
                          "1単位/セット"
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingPackaging.sizeDescription}
                            onChange={(event) => setEditingPackaging((prev) => ({ ...prev, sizeDescription: event.target.value }))}
                          />
                        ) : (
                          item.sizeDescription || "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Textarea
                            value={editingPackaging.note}
                            onChange={(event) => setEditingPackaging((prev) => ({ ...prev, note: event.target.value }))}
                          />
                        ) : (
                          item.note || "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {!isAuthenticated ? (
                          <span className="text-xs text-muted-foreground">-</span>
                        ) : editingStock?.id === item.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              step="any"
                              value={editingStock.value}
                              onChange={(e) => setEditingStock({ id: item.id, value: e.target.value })}
                              className="h-8 w-24"
                            />
                            <span className="text-xs text-muted-foreground">{item.unit}</span>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleStockSave(item)}
                              disabled={savingStockId === item.id}
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
                            className="text-sm hover:underline"
                            onClick={() => {
                              resetPackaging()
                              setEditingStock({
                                id: item.id,
                                value: String(packagingStocks.get(item.id) ?? 0),
                              })
                            }}
                          >
                            {!masterStocksLoaded
                              ? <span className="text-muted-foreground">-</span>
                              : packagingStocks.has(item.id)
                                ? `${packagingStocks.get(item.id)} ${item.unit}`
                                : <span className="text-muted-foreground">-</span>}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          renderActionButtons(handlePackagingSave, resetPackaging, handlePackagingDelete)
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingStock(null)
                                setEditingPackaging({
                                  id: item.id,
                                  name: item.name,
                                  unit: item.unit,
                                  sizeDescription: item.sizeDescription ?? "",
                                  currency: item.currency,
                                  unitCost: item.unitCost,
                                  unitsPerBatch: item.unitsPerBatch ?? 1,
                                  note: item.note ?? "",
                                })
                              }}
                            >
                              編集
                            </Button>
                            <Button type="button" size="sm" variant="secondary" onClick={() => handlePackagingCopy(item)}>
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
