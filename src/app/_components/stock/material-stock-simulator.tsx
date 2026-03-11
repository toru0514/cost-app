"use client"

import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NumberInput } from "@/components/ui/number-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MATERIAL_STOCK_LOW_THRESHOLD, calcMaterialConsumption } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

interface MaterialStockSimulatorProps {
  data: AppData
  materialStocks: Map<string, number>
  masterStocksLoaded: boolean
  isAuthenticated: boolean
}

export function MaterialStockSimulator({ data, materialStocks, masterStocksLoaded, isAuthenticated }: MaterialStockSimulatorProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [productionCount, setProductionCount] = useState<number | "">(1)

  const productsWithMaterials = useMemo(() => {
    const ids = new Set(
      data.costEntries.materials.filter((e) => e.usageRatio !== undefined).map((e) => e.productId)
    )
    return data.products.filter((p) => ids.has(p.id))
  }, [data])

  const displayCount = typeof productionCount === "number" && productionCount > 0 ? productionCount : 1

  const rows = useMemo(() => {
    if (!selectedProductId) return []
    return calcMaterialConsumption(selectedProductId, displayCount, data, materialStocks)
  }, [selectedProductId, displayCount, data, materialStocks])

  const lowCount = rows.filter((r) => r.isLow).length

  return (
    <Card>
      <CardHeader>
        <CardTitle>材料残数シミュレーション</CardTitle>
        <CardDescription>
          商品と制作数を指定して、材料の消費量と消費後の残量（%）を確認できます。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="商品を選択" />
            </SelectTrigger>
            <SelectContent>
              {productsWithMaterials.length === 0 ? (
                <SelectItem value="_empty" disabled>
                  材料費が登録された商品がありません
                </SelectItem>
              ) : (
                productsWithMaterials.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <NumberInput
              className="w-28"
              min={1}
              value={productionCount}
              onValueChange={(v) => setProductionCount(v === "" ? "" : Number(v))}
            />
            <span className="text-sm text-muted-foreground">個制作</span>
          </div>
          {lowCount > 0 && (
            <Badge variant="destructive">{lowCount} 種が残量 {MATERIAL_STOCK_LOW_THRESHOLD}% 未満</Badge>
          )}
        </div>

        {!selectedProductId ? (
          <p className="text-sm text-muted-foreground">商品を選択してください。</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">この商品に使用量が設定された材料費明細がありません。</p>
        ) : (
          <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>材料</TableHead>
                  <TableHead className="text-right">使用量入力値</TableHead>
                  <TableHead className="text-right">1個分消費量</TableHead>
                  <TableHead className="text-right">{displayCount}個分消費量</TableHead>
                  {isAuthenticated && (
                    <>
                      <TableHead className="text-right">現在残数</TableHead>
                      <TableHead className="text-right">消費後残数</TableHead>
                      <TableHead className="text-right">残量</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const stockCols = isAuthenticated
                  const showStockLoading = stockCols && !masterStocksLoaded
                  return (
                    <TableRow key={row.materialId} className={row.isLow ? "bg-destructive/5" : undefined}>
                      <TableCell className="font-medium">{row.materialName}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {row.usageInputTotal !== null
                          ? row.usePercentageMode
                            ? `${row.usageInputTotal}%`
                            : `${row.usageInputTotal} ${row.unit}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.usagePerProduct !== null
                          ? `${row.usagePerProduct.toFixed(2)} ${row.unit}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.totalConsumption !== null
                          ? `${row.totalConsumption.toFixed(2)} ${row.unit}`
                          : "-"}
                      </TableCell>
                      {stockCols && (
                        <>
                          <TableCell className="text-right">
                            {showStockLoading ? (
                              <span className="text-muted-foreground">-</span>
                            ) : row.currentStock !== null ? (
                              `${row.currentStock} ${row.unit}`
                            ) : (
                              <span className="text-muted-foreground">未設定</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {showStockLoading || row.remainingStock === null ? (
                              <span className="text-muted-foreground">-</span>
                            ) : (
                              <span className={row.remainingStock < 0 ? "font-semibold text-destructive" : undefined}>
                                {row.remainingStock.toFixed(2)} {row.unit}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {showStockLoading || row.remainingPercent === null ? (
                              <span className="text-muted-foreground">-</span>
                            ) : (
                              <span className={row.isLow ? "font-semibold text-destructive" : undefined}>
                                {row.remainingPercent.toFixed(1)}%
                                {row.isLow && (
                                  <span className="ml-1 text-xs">⚠</span>
                                )}
                              </span>
                            )}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {isAuthenticated && masterStocksLoaded && rows.some((r) => r.currentStock === null) && (
          <p className="text-xs text-muted-foreground">
            「未設定」の材料は「登録済みマスタ」タブで残数を登録できます。
          </p>
        )}
      </CardContent>
    </Card>
  )
}
