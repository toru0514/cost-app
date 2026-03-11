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
import type { AppData, Material } from "@/lib/types"
import { toast } from "sonner"

interface MaterialListSectionProps {
  data: AppData
  actions: AppActions
  createTempId: () => string
  isAuthenticated: boolean
  materialStocks: Map<string, number>
  materialStockUnits: Map<string, string>
  masterStocksLoaded: boolean
  onSetMaterialStock: (id: string, quantity: number, stockUnit?: string) => Promise<void>
  onAdjustMaterialStock: (id: string, delta: number) => Promise<void>
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

export function MaterialListSection({ data, actions, createTempId, isAuthenticated, materialStocks, materialStockUnits, masterStocksLoaded, onSetMaterialStock, onAdjustMaterialStock }: MaterialListSectionProps) {
  const [editingMaterial, setEditingMaterial] = useState<Omit<Material, "id"> & { id: string | null }>({
    id: null,
    name: "",
    unit: "kg",
    sizeDescription: "",
    currency: "JPY",
    unitCost: 0,
    unitsPerBatch: 1,
    usePercentageMode: false,
    supplier: "",
    note: "",
  })

  const [editingStock, setEditingStock] = useState<{ id: string; value: string; unit: string } | null>(null)
  const [savingStockId, setSavingStockId] = useState<string | null>(null)
  const [adjustAmounts, setAdjustAmounts] = useState<Map<string, string>>(new Map())
  const [busy, setBusy] = useState<string | null>(null)

  const { updateMaterial, removeMaterial, addMaterial } = actions

  const handleStockSave = async (material: Material) => {
    if (!editingStock || editingStock.id !== material.id) return
    const quantity = Math.max(0, parseFloat(editingStock.value) || 0)
    const stockUnit = editingStock.unit.trim()
    const displayUnit = stockUnit || material.unit
    setSavingStockId(material.id)
    try {
      await onSetMaterialStock(material.id, quantity, stockUnit)
      toast.success("残数を保存しました", { description: `${material.name}: ${quantity} ${displayUnit}` })
      setEditingStock(null)
    } catch {
      toast.error("残数の保存に失敗しました")
    } finally {
      setSavingStockId(null)
    }
  }

  const getAdjustAmount = (id: string) => Math.max(1, parseInt(adjustAmounts.get(id) ?? "1", 10) || 1)

  const handleAdd = async (material: Material) => {
    setBusy(material.id + "_add")
    try {
      await onAdjustMaterialStock(material.id, getAdjustAmount(material.id))
    } catch {
      toast.error("残数の追加に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const handleUse = async (material: Material) => {
    setBusy(material.id + "_use")
    try {
      await onAdjustMaterialStock(material.id, -getAdjustAmount(material.id))
    } catch {
      toast.error("残数の使用に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const resetMaterial = () =>
    setEditingMaterial({
      id: null,
      name: "",
      unit: "kg",
      sizeDescription: "",
      currency: "JPY",
      unitCost: 0,
      unitsPerBatch: 1,
      usePercentageMode: false,
      supplier: "",
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

  const handleMaterialSave = () => {
    const { id, ...rest } = editingMaterial
    if (!id) return
    const name = editingMaterial.name.trim()
    if (!name) return
    updateMaterial({ id, ...rest, name })
    toast.success("材料を更新しました", {
      description: `${name} / ${formatCurrency(editingMaterial.unitCost, editingMaterial.currency)}`,
    })
    resetMaterial()
  }

  const handleMaterialDelete = () => {
    const { id } = editingMaterial
    if (!id) return
    const name = editingMaterial.name.trim() || "材料"
    removeMaterial(id)
    toast.success("材料を削除しました", { description: `「${name}」を削除しました。` })
    resetMaterial()
  }

  const handleMaterialCopy = (material: Material) => {
    const newId = createTempId()
    const name = `${material.name} (コピー)`
    addMaterial({
      id: newId,
      name,
      unit: material.unit,
      sizeDescription: material.sizeDescription,
      currency: material.currency,
      unitCost: material.unitCost,
      unitsPerBatch: material.unitsPerBatch ?? 1,
      usePercentageMode: material.usePercentageMode ?? false,
      supplier: material.supplier,
      note: material.note,
    })
    toast.success("材料をコピーしました", { description: `「${name}」を作成しました。` })
    setEditingMaterial({
      id: newId,
      name,
      unit: material.unit,
      sizeDescription: material.sizeDescription ?? "",
      currency: material.currency,
      unitCost: material.unitCost,
      unitsPerBatch: material.unitsPerBatch ?? 1,
      usePercentageMode: material.usePercentageMode ?? false,
      supplier: material.supplier ?? "",
      note: material.note ?? "",
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>材料一覧</CardTitle>
      </CardHeader>
      <CardContent>
        {data.materials.length === 0 ? (
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
                  <TableHead>入力モード</TableHead>
                  <TableHead>仕入先</TableHead>
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
                {data.materials.map((material) => {
                  const isEditing = editingMaterial.id === material.id
                  const displayStockUnit = materialStockUnits.get(material.id)?.trim() || material.unit
                  return (
                    <TableRow key={material.id} className="group">
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingMaterial.name}
                            onChange={(event) => setEditingMaterial((prev) => ({ ...prev, name: event.target.value }))}
                          />
                        ) : (
                          <span className="block max-w-[140px] truncate" title={material.name}>
                            {material.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingMaterial.unit}
                            onChange={(event) => setEditingMaterial((prev) => ({ ...prev, unit: event.target.value }))}
                          />
                        ) : (
                          material.unit
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <NumberInput
                              value={editingMaterial.unitCost}
                              onValueChange={(next) => setEditingMaterial((prev) => ({ ...prev, unitCost: next === "" ? 0 : next }))}
                            />
                            <Select
                              value={editingMaterial.currency}
                              onValueChange={(value) => setEditingMaterial((prev) => ({ ...prev, currency: value }))}
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
                          formatCurrency(material.unitCost, material.currency)
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <NumberInput
                            value={editingMaterial.unitsPerBatch ?? 1}
                            min={1}
                            onValueChange={(next) =>
                              setEditingMaterial((prev) => ({ ...prev, unitsPerBatch: next === "" ? 1 : Number(next) }))
                            }
                          />
                        ) : material.unitsPerBatch && material.unitsPerBatch > 0 ? (
                          `${material.unitsPerBatch}単位/セット`
                        ) : (
                          "1単位/セット"
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <label className="inline-flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={Boolean(editingMaterial.usePercentageMode)}
                              onChange={(event) =>
                                setEditingMaterial((prev) => ({ ...prev, usePercentageMode: event.target.checked }))
                              }
                            />
                            %入力
                          </label>
                        ) : material.usePercentageMode ? (
                          "%入力"
                        ) : (
                          "単位数"
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingMaterial.supplier}
                            onChange={(event) => setEditingMaterial((prev) => ({ ...prev, supplier: event.target.value }))}
                          />
                        ) : (
                          material.supplier ? (
                            <span className="block max-w-[100px] truncate" title={material.supplier}>
                              {material.supplier}
                            </span>
                          ) : (
                            "-"
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Textarea
                            value={editingMaterial.note}
                            onChange={(event) => setEditingMaterial((prev) => ({ ...prev, note: event.target.value }))}
                          />
                        ) : (
                          material.note ? (
                            <span className="block max-w-[120px] truncate" title={material.note}>
                              {material.note}
                            </span>
                          ) : (
                            "-"
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {!isAuthenticated ? (
                          <span className="text-xs text-muted-foreground">-</span>
                        ) : editingStock?.id === material.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              step="any"
                              value={editingStock.value}
                              onChange={(e) =>
                                setEditingStock((prev) =>
                                  prev && prev.id === material.id
                                    ? { ...prev, value: e.target.value }
                                    : { id: material.id, value: e.target.value, unit: displayStockUnit }
                                )
                              }
                              className="h-8 w-20"
                            />
                            <Input
                              value={editingStock.unit}
                              onChange={(e) =>
                                setEditingStock((prev) =>
                                  prev && prev.id === material.id
                                    ? { ...prev, unit: e.target.value }
                                    : { id: material.id, value: String(materialStocks.get(material.id) ?? 0), unit: e.target.value }
                                )
                              }
                              className="h-8 w-16"
                              placeholder="単位"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleStockSave(material)}
                              disabled={savingStockId === material.id}
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
                              materialStocks.get(material.id) ?? 0
                            )} hover:opacity-80`}
                            onClick={() => {
                              resetMaterial()
                              setEditingStock({
                                id: material.id,
                                value: String(materialStocks.get(material.id) ?? 0),
                                unit: displayStockUnit,
                              })
                            }}
                          >
                            {!masterStocksLoaded
                              ? <span className="text-muted-foreground">-</span>
                              : materialStocks.has(material.id)
                                ? `${formatStockQuantity(materialStocks.get(material.id) ?? 0)} ${displayStockUnit}`
                                : <span className="text-muted-foreground">-</span>}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {isAuthenticated && (
                          <Input
                            type="number"
                            min={1}
                            value={adjustAmounts.get(material.id) ?? "1"}
                            onChange={(e) =>
                              setAdjustAmounts((prev) => {
                                const next = new Map(prev)
                                next.set(material.id, e.target.value)
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
                              onClick={() => handleAdd(material)}
                              disabled={(busy?.startsWith(material.id) ?? false) || editingStock?.id === material.id || editingMaterial.id === material.id}
                            >
                              +
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 px-0"
                              title="使用（減算）"
                              onClick={() => handleUse(material)}
                              disabled={(busy?.startsWith(material.id) ?? false) || editingStock?.id === material.id || editingMaterial.id === material.id || (materialStocks.get(material.id) ?? 0) === 0}
                            >
                              −
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          renderActionButtons(handleMaterialSave, resetMaterial, handleMaterialDelete)
                        ) : (
                          <div className="master-row-actions flex items-center justify-end gap-1">
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() => {
                                setEditingStock(null)
                                setEditingMaterial({
                                  id: material.id,
                                  name: material.name,
                                  unit: material.unit,
                                  sizeDescription: material.sizeDescription ?? "",
                                  currency: material.currency,
                                  unitCost: material.unitCost,
                                  unitsPerBatch: material.unitsPerBatch ?? 1,
                                  supplier: material.supplier ?? "",
                                  note: material.note ?? "",
                                })
                              }}
                              title="編集"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() => handleMaterialCopy(material)}
                              title="コピー"
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
