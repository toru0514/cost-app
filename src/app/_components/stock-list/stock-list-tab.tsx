"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

type StockListTabProps = {
  data: AppData
  materialStocks: Map<string, number>
  materialStockUnits: Map<string, string>
  packagingStocks: Map<string, number>
  packagingStockUnits: Map<string, string>
  masterStocksLoaded: boolean
  isAuthenticated: boolean
  onAdjustMaterialStock: (id: string, delta: number) => Promise<void>
  onAdjustPackagingStock: (id: string, delta: number) => Promise<void>
}

const formatRoundedQuantity = (quantity: number) => {
  const rounded = Math.round((quantity + Number.EPSILON) * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

const formatStock = (quantity: number | undefined, unit: string) => {
  if (quantity === undefined) return "未設定"
  return `${formatRoundedQuantity(quantity)} ${unit}`.trim()
}

export function StockListTab({
  data,
  materialStocks,
  materialStockUnits,
  packagingStocks,
  packagingStockUnits,
  masterStocksLoaded,
  isAuthenticated,
  onAdjustMaterialStock,
  onAdjustPackagingStock,
}: StockListTabProps) {
  const [adjustAmounts, setAdjustAmounts] = useState<Map<string, string>>(new Map())
  const [busy, setBusy] = useState<string | null>(null)

  const getAdjustAmount = (key: string) => Math.max(1, parseInt(adjustAmounts.get(key) ?? "1", 10) || 1)

  const handleAddMaterial = async (id: string) => {
    setBusy(`material:${id}:add`)
    try {
      await onAdjustMaterialStock(id, getAdjustAmount(`material:${id}`))
    } catch {
      toast.error("材料在庫の追加に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const handleUseMaterial = async (id: string) => {
    setBusy(`material:${id}:use`)
    try {
      await onAdjustMaterialStock(id, -getAdjustAmount(`material:${id}`))
    } catch {
      toast.error("材料在庫の使用に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const handleAddPackaging = async (id: string) => {
    setBusy(`packaging:${id}:add`)
    try {
      await onAdjustPackagingStock(id, getAdjustAmount(`packaging:${id}`))
    } catch {
      toast.error("梱包材在庫の追加に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const handleUsePackaging = async (id: string) => {
    setBusy(`packaging:${id}:use`)
    try {
      await onAdjustPackagingStock(id, -getAdjustAmount(`packaging:${id}`))
    } catch {
      toast.error("梱包材在庫の使用に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const materialRows = data.materials.map((material) => ({
    id: material.id,
    name: material.name,
    unit: material.unit,
    unitCost: material.unitCost,
    currency: material.currency,
    unitsPerBatch: material.unitsPerBatch ?? 1,
    usePercentageMode: material.usePercentageMode ?? false,
    supplier: material.supplier,
    note: material.note,
    stock: materialStocks.get(material.id),
    stockUnit: materialStockUnits.get(material.id)?.trim() || material.unit,
  }))

  const packagingRows = data.packagingItems.map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
    unitCost: item.unitCost,
    currency: item.currency,
    unitsPerBatch: item.unitsPerBatch ?? 1,
    sizeDescription: item.sizeDescription,
    note: item.note,
    stock: packagingStocks.get(item.id),
    stockUnit: packagingStockUnits.get(item.id)?.trim() || item.unit,
  }))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>在庫一覧</CardTitle>
          <CardDescription>材料・梱包材・設備の在庫情報を確認できます。</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>材料在庫</CardTitle>
        </CardHeader>
        <CardContent>
          {!isAuthenticated ? (
            <p className="text-sm text-muted-foreground">在庫表示はログイン中のみ利用できます。</p>
          ) : !masterStocksLoaded ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : materialRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">材料が登録されていません。</p>
          ) : (
            <div className="overflow-x-auto">
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
                    <TableHead className="text-right">現在残数</TableHead>
                    <TableHead>増減量</TableHead>
                    <TableHead>
                      <span className="sr-only">増減操作</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materialRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.unit}</TableCell>
                      <TableCell>{formatCurrency(row.unitCost, row.currency)}</TableCell>
                      <TableCell>{`${row.unitsPerBatch}単位/セット`}</TableCell>
                      <TableCell>{row.usePercentageMode ? "比率入力 (%)" : "数量入力"}</TableCell>
                      <TableCell>{row.supplier || "-"}</TableCell>
                      <TableCell>{row.note || "-"}</TableCell>
                      <TableCell className="text-right">{formatStock(row.stock, row.stockUnit)}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={adjustAmounts.get(`material:${row.id}`) ?? "1"}
                          onChange={(e) =>
                            setAdjustAmounts((prev) => {
                              const next = new Map(prev)
                              next.set(`material:${row.id}`, e.target.value)
                              return next
                            })
                          }
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 px-0"
                            onClick={() => handleAddMaterial(row.id)}
                            disabled={busy !== null}
                            title="追加"
                          >
                            +
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 px-0"
                            onClick={() => handleUseMaterial(row.id)}
                            disabled={busy !== null || (row.stock ?? 0) === 0}
                            title="使用（減算）"
                          >
                            −
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>梱包材在庫</CardTitle>
        </CardHeader>
        <CardContent>
          {!isAuthenticated ? (
            <p className="text-sm text-muted-foreground">在庫表示はログイン中のみ利用できます。</p>
          ) : !masterStocksLoaded ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : packagingRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">梱包材が登録されていません。</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>単位</TableHead>
                    <TableHead>単価</TableHead>
                    <TableHead>セット数</TableHead>
                    <TableHead>仕様</TableHead>
                    <TableHead>備考</TableHead>
                    <TableHead className="text-right">現在残数</TableHead>
                    <TableHead>増減量</TableHead>
                    <TableHead>
                      <span className="sr-only">増減操作</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packagingRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.unit}</TableCell>
                      <TableCell>{formatCurrency(row.unitCost, row.currency)}</TableCell>
                      <TableCell>{`${row.unitsPerBatch}単位/セット`}</TableCell>
                      <TableCell>{row.sizeDescription || "-"}</TableCell>
                      <TableCell>{row.note || "-"}</TableCell>
                      <TableCell className="text-right">{formatStock(row.stock, row.stockUnit)}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={adjustAmounts.get(`packaging:${row.id}`) ?? "1"}
                          onChange={(e) =>
                            setAdjustAmounts((prev) => {
                              const next = new Map(prev)
                              next.set(`packaging:${row.id}`, e.target.value)
                              return next
                            })
                          }
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 px-0"
                            onClick={() => handleAddPackaging(row.id)}
                            disabled={busy !== null}
                            title="追加"
                          >
                            +
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 px-0"
                            onClick={() => handleUsePackaging(row.id)}
                            disabled={busy !== null || (row.stock ?? 0) === 0}
                            title="使用（減算）"
                          >
                            −
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>設備一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {data.equipments.length === 0 ? (
            <p className="text-sm text-muted-foreground">設備が登録されていません。</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>取得額</TableHead>
                    <TableHead>償却年数</TableHead>
                    <TableHead>使用率</TableHead>
                    <TableHead>備考</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.equipments.map((equipment) => (
                    <TableRow key={equipment.id}>
                      <TableCell className="font-medium">{equipment.name}</TableCell>
                      <TableCell>{formatCurrency(equipment.acquisitionCost, equipment.currency)}</TableCell>
                      <TableCell>{`${equipment.amortizationYears}年`}</TableCell>
                      <TableCell>{`${equipment.utilizationRate ?? 100}%`}</TableCell>
                      <TableCell>{equipment.note || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
