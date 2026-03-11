"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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

const stockColorClass = (quantity: number | undefined) => {
  if (quantity === undefined) return "bg-muted text-muted-foreground"
  if (quantity < 5) return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
  if (quantity < 10) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
  return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
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
      <section className="space-y-1">
        <h2 className="text-xl font-semibold">在庫一覧</h2>
        <p className="text-sm text-muted-foreground">材料・梱包材・設備の在庫情報を確認できます。</p>
      </section>

      <section className="min-w-0 space-y-3 overflow-hidden">
        <h3 className="text-lg font-semibold">材料在庫</h3>
        {!isAuthenticated ? (
          <p className="text-sm text-muted-foreground">在庫表示はログイン中のみ利用できます。</p>
        ) : !masterStocksLoaded ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : materialRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">材料が登録されていません。</p>
        ) : (
          <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x rounded-lg border">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">名称</TableHead>
                  <TableHead className="font-semibold">単位</TableHead>
                  <TableHead className="font-semibold">単価</TableHead>
                  <TableHead className="font-semibold">セット数</TableHead>
                  <TableHead className="font-semibold">入力モード</TableHead>
                  <TableHead className="font-semibold">仕入先</TableHead>
                  <TableHead className="font-semibold">備考</TableHead>
                  <TableHead className="text-right font-semibold">現在残数</TableHead>
                  <TableHead className="font-semibold">増減量</TableHead>
                  <TableHead>
                    <span className="sr-only">増減操作</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materialRows.map((row) => (
                  <TableRow key={row.id} className="group">
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.unit}</TableCell>
                    <TableCell>{formatCurrency(row.unitCost, row.currency)}</TableCell>
                    <TableCell>{`${row.unitsPerBatch}単位/セット`}</TableCell>
                    <TableCell>{row.usePercentageMode ? "比率入力 (%)" : "数量入力"}</TableCell>
                    <TableCell>{row.supplier || "-"}</TableCell>
                    <TableCell>{row.note || "-"}</TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${stockColorClass(row.stock)}`}>
                        {formatStock(row.stock, row.stockUnit)}
                      </span>
                    </TableCell>
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
                      <div className="flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
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
      </section>

      <section className="min-w-0 space-y-3 overflow-hidden">
        <h3 className="text-lg font-semibold">梱包材在庫</h3>
        {!isAuthenticated ? (
          <p className="text-sm text-muted-foreground">在庫表示はログイン中のみ利用できます。</p>
        ) : !masterStocksLoaded ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : packagingRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">梱包材が登録されていません。</p>
        ) : (
          <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x rounded-lg border">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">名称</TableHead>
                  <TableHead className="font-semibold">単位</TableHead>
                  <TableHead className="font-semibold">単価</TableHead>
                  <TableHead className="font-semibold">セット数</TableHead>
                  <TableHead className="font-semibold">仕様</TableHead>
                  <TableHead className="font-semibold">備考</TableHead>
                  <TableHead className="text-right font-semibold">現在残数</TableHead>
                  <TableHead className="font-semibold">増減量</TableHead>
                  <TableHead>
                    <span className="sr-only">増減操作</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packagingRows.map((row) => (
                  <TableRow key={row.id} className="group">
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.unit}</TableCell>
                    <TableCell>{formatCurrency(row.unitCost, row.currency)}</TableCell>
                    <TableCell>{`${row.unitsPerBatch}単位/セット`}</TableCell>
                    <TableCell>{row.sizeDescription || "-"}</TableCell>
                    <TableCell>{row.note || "-"}</TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${stockColorClass(row.stock)}`}>
                        {formatStock(row.stock, row.stockUnit)}
                      </span>
                    </TableCell>
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
                      <div className="flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
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
      </section>

      <section className="min-w-0 space-y-3 overflow-hidden">
        <h3 className="text-lg font-semibold">設備一覧</h3>
        {data.equipments.length === 0 ? (
          <p className="text-sm text-muted-foreground">設備が登録されていません。</p>
        ) : (
          <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x rounded-lg border">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">名称</TableHead>
                  <TableHead className="font-semibold">取得額</TableHead>
                  <TableHead className="font-semibold">償却年数</TableHead>
                  <TableHead className="font-semibold">使用率</TableHead>
                  <TableHead className="font-semibold">備考</TableHead>
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
      </section>
    </div>
  )
}
