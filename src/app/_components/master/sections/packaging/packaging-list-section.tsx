"use client"

import { useState } from "react"

import { Copy, Edit3, Trash2 } from "lucide-react"

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
  packagingStockUnits: Map<string, string>
  masterStocksLoaded: boolean
  onSetPackagingStock: (id: string, quantity: number, stockUnit?: string) => Promise<void>
  onAdjustPackagingStock: (id: string, delta: number) => Promise<void>
}

const formatStockQuantity = (quantity: number) => {
  const rounded = Math.round((quantity + Number.EPSILON) * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

const stockBadgeClass = (quantity: number) => {
  if (quantity < 5) return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
  if (quantity < 10) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
  return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
}

export function PackagingListSection({ data, actions, createTempId, isAuthenticated, packagingStocks, packagingStockUnits, masterStocksLoaded, onSetPackagingStock, onAdjustPackagingStock }: PackagingListSectionProps) {
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

  const [editingStock, setEditingStock] = useState<{ id: string; value: string; unit: string } | null>(null)
  const [savingStockId, setSavingStockId] = useState<string | null>(null)
  const [adjustAmounts, setAdjustAmounts] = useState<Map<string, string>>(new Map())
  const [busy, setBusy] = useState<string | null>(null)

  const { updatePackagingItem, removePackagingItem, addPackagingItem } = actions

  const handleStockSave = async (item: PackagingItem) => {
    if (!editingStock || editingStock.id !== item.id) return
    const quantity = Math.max(0, parseFloat(editingStock.value) || 0)
    const stockUnit = editingStock.unit.trim()
    const displayUnit = stockUnit || item.unit
    setSavingStockId(item.id)
    try {
      await onSetPackagingStock(item.id, quantity, stockUnit)
      toast.success("残数を保存しました", { description: `${item.name}: ${quantity} ${displayUnit}` })
      setEditingStock(null)
    } catch {
      toast.error("残数の保存に失敗しました")
    } finally {
      setSavingStockId(null)
    }
  }

  const getAdjustAmount = (id: string) => Math.max(1, parseInt(adjustAmounts.get(id) ?? "1", 10) || 1)

  const handleAdd = async (item: PackagingItem) => {
    setBusy(item.id + "_add")
    try {
      await onAdjustPackagingStock(item.id, getAdjustAmount(item.id))
    } catch {
      toast.error("残数の追加に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const handleUse = async (item: PackagingItem) => {
    setBusy(item.id + "_use")
    try {
      await onAdjustPackagingStock(item.id, -getAdjustAmount(item.id))
    } catch {
      toast.error("残数の使用に失敗しました")
    } finally {
      setBusy(null)
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
          <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>単位</TableHead>
                  <TableHead>単価</TableHead>
                  <TableHead>セット数</TableHead>
                  <TableHead>仕様</TableHead>
                  <TableHead>備考</TableHead>
                  <TableHead>現在残数</TableHead>
                  <TableHead>増減量</TableHead>
                  <TableHead></TableHead>
                  <TableHead className="w-40 text-right">
                    <span className="sr-only">操作</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.packagingItems.map((item) => {
                  const isEditing = editingPackaging.id === item.id
                  const displayStockUnit = packagingStockUnits.get(item.id)?.trim() || item.unit
                  return (
                    <TableRow key={item.id} className="group">
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingPackaging.name}
                            onChange={(event) => setEditingPackaging((prev) => ({ ...prev, name: event.target.value }))}
                          />
                        ) : (
                          <span className="block max-w-[140px] truncate" title={item.name}>
                            {item.name}
                          </span>
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
                          item.sizeDescription ? (
                            <span className="block max-w-[120px] truncate" title={item.sizeDescription}>
                              {item.sizeDescription}
                            </span>
                          ) : (
                            "-"
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Textarea
                            value={editingPackaging.note}
                            onChange={(event) => setEditingPackaging((prev) => ({ ...prev, note: event.target.value }))}
                          />
                        ) : (
                          item.note ? (
                            <span className="block max-w-[120px] truncate" title={item.note}>
                              {item.note}
                            </span>
                          ) : (
                            "-"
                          )
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
                              onChange={(e) =>
                                setEditingStock((prev) =>
                                  prev && prev.id === item.id
                                    ? { ...prev, value: e.target.value }
                                    : { id: item.id, value: e.target.value, unit: displayStockUnit }
                                )
                              }
                              className="h-8 w-20"
                            />
                            <Input
                              value={editingStock.unit}
                              onChange={(e) =>
                                setEditingStock((prev) =>
                                  prev && prev.id === item.id
                                    ? { ...prev, unit: e.target.value }
                                    : { id: item.id, value: String(packagingStocks.get(item.id) ?? 0), unit: e.target.value }
                                )
                              }
                              className="h-8 w-16"
                              placeholder="単位"
                            />
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
                            className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${stockBadgeClass(
                              packagingStocks.get(item.id) ?? 0
                            )} hover:opacity-80`}
                            onClick={() => {
                              resetPackaging()
                              setEditingStock({
                                id: item.id,
                                value: String(packagingStocks.get(item.id) ?? 0),
                                unit: displayStockUnit,
                              })
                            }}
                          >
                            {!masterStocksLoaded
                              ? <span className="text-muted-foreground">-</span>
                              : packagingStocks.has(item.id)
                                ? `${formatStockQuantity(packagingStocks.get(item.id) ?? 0)} ${displayStockUnit}`
                                : <span className="text-muted-foreground">-</span>}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {isAuthenticated && (
                          <Input
                            type="number"
                            min={1}
                            value={adjustAmounts.get(item.id) ?? "1"}
                            onChange={(e) =>
                              setAdjustAmounts((prev) => {
                                const next = new Map(prev)
                                next.set(item.id, e.target.value)
                                return next
                              })
                            }
                            className="h-8 w-16"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {isAuthenticated && (
                          <div className="master-row-actions flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 px-0"
                              title="追加"
                              onClick={() => handleAdd(item)}
                              disabled={(busy?.startsWith(item.id) ?? false) || editingStock?.id === item.id || editingPackaging.id === item.id}
                            >
                              +
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 px-0"
                              title="使用（減算）"
                              onClick={() => handleUse(item)}
                              disabled={(busy?.startsWith(item.id) ?? false) || editingStock?.id === item.id || editingPackaging.id === item.id || (packagingStocks.get(item.id) ?? 0) === 0}
                            >
                              −
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          renderActionButtons(handlePackagingSave, resetPackaging, handlePackagingDelete)
                        ) : (
                          <div className="master-row-actions flex items-center justify-end gap-1">
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
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
                              title="編集"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() => handlePackagingCopy(item)}
                              title="コピー"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                              onClick={() => {
                                removePackagingItem(item.id)
                                toast.success("梱包材を削除しました", { description: `「${item.name}」を削除しました。` })
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
