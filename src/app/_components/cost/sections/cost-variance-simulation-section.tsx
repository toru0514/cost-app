"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { simulateProductCosts, formatCurrency, type CostVarianceRates } from "@/lib/calculations"
import type { AppData } from "@/lib/types"
import { RotateCcw } from "lucide-react"

interface CostVarianceSimulationSectionProps {
  data: AppData
  exchangeRateMap?: Map<string, number>
}

const defaultRates: CostVarianceRates = {
  material: 1,
  packaging: 1,
  labor: 1,
  outsourcing: 1,
  development: 1,
  equipment: 1,
  logistics: 1,
  electricity: 1,
  fees: 1,
}

const rateLabels: { key: keyof CostVarianceRates; label: string }[] = [
  { key: "material", label: "材料費" },
  { key: "packaging", label: "梱包費" },
  { key: "labor", label: "人件費" },
  { key: "outsourcing", label: "外注費" },
  { key: "development", label: "開発費" },
  { key: "equipment", label: "設備費" },
  { key: "logistics", label: "物流費" },
  { key: "electricity", label: "電気代" },
  { key: "fees", label: "手数料" },
]

export function CostVarianceSimulationSection({ data, exchangeRateMap }: CostVarianceSimulationSectionProps) {
  const [rates, setRates] = useState<CostVarianceRates>(defaultRates)

  const updateRate = (key: keyof CostVarianceRates, percentChange: number) => {
    setRates((prev) => ({
      ...prev,
      [key]: 1 + percentChange / 100,
    }))
  }

  const resetRates = () => {
    setRates(defaultRates)
  }

  const simulationResults = useMemo(() => {
    return data.products.map((product) => ({
      product,
      simulation: simulateProductCosts(product.id, data, rates, exchangeRateMap),
    }))
  }, [data, rates, exchangeRateMap])

  const formatDiff = (value: number) => {
    if (value === 0) return "-"
    const sign = value >= 0 ? "+" : ""
    return `${sign}${formatCurrency(value)}`
  }

  const getPercentValue = (rate: number | undefined): number => {
    return Math.round(((rate ?? 1) - 1) * 100)
  }

  const hasChanges = Object.values(rates).some((r) => r !== 1)

  // 全体合計の計算
  const totals = useMemo(() => {
    return simulationResults.reduce(
      (acc, { simulation }) => ({
        originalTotal: acc.originalTotal + simulation.original.total,
        simulatedTotal: acc.simulatedTotal + simulation.simulated.total,
        diffTotal: acc.diffTotal + simulation.diff.total,
      }),
      { originalTotal: 0, simulatedTotal: 0, diffTotal: 0 }
    )
  }, [simulationResults])

  return (
    <section className="min-w-0 space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">原価変動シミュレーション</h2>
          <p className="text-sm text-muted-foreground">
            各コスト項目の変動率を入力し、原価への影響を確認できます。
          </p>
        </div>
        {hasChanges && (
          <Button variant="outline" size="sm" onClick={resetRates}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            リセット
          </Button>
        )}
      </div>

      {data.products.length === 0 ? (
        <p className="text-sm text-muted-foreground">商品が登録されると試算できます。</p>
      ) : (
        <div className="space-y-4">
          {/* 変動率入力フォーム */}
          <div className="rounded-md border p-4">
            <p className="mb-3 text-sm font-semibold">変動率設定 (%)</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9">
              {rateLabels.map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <NumberInput
                    value={getPercentValue(rates[key])}
                    onValueChange={(next) => updateRate(key, next === "" ? 0 : Number(next))}
                    min={-100}
                    max={1000}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              正の値で増加、負の値で減少（例: 10 = 10%増、-5 = 5%減）
            </p>
          </div>

          {/* シミュレーション結果テーブル */}
          <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
            <Table className="w-auto min-w-max">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">商品名</TableHead>
                  <TableHead className="text-right font-semibold">現行原価</TableHead>
                  <TableHead className="text-right font-semibold">変動後原価</TableHead>
                  <TableHead className="text-right font-semibold">差額</TableHead>
                  <TableHead className="text-right font-semibold">変動率</TableHead>
                  <TableHead className="text-right font-semibold">販売価格</TableHead>
                  <TableHead className="text-right font-semibold">変動後利益率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {simulationResults.map(({ product, simulation }) => {
                  const salePrice = product.salePrice ?? 0
                  const originalMargin =
                    salePrice > 0 ? ((salePrice - simulation.original.total) / salePrice) * 100 : 0
                  const simulatedMargin =
                    salePrice > 0 ? ((salePrice - simulation.simulated.total) / salePrice) * 100 : 0
                  const changePercent =
                    simulation.original.total > 0
                      ? ((simulation.simulated.total - simulation.original.total) / simulation.original.total) * 100
                      : 0

                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(simulation.original.total)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(simulation.simulated.total)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${
                          simulation.diff.total > 0
                            ? "text-red-600 dark:text-red-400"
                            : simulation.diff.total < 0
                              ? "text-green-600 dark:text-green-400"
                              : ""
                        }`}
                      >
                        {formatDiff(simulation.diff.total)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${
                          changePercent > 0
                            ? "text-red-600 dark:text-red-400"
                            : changePercent < 0
                              ? "text-green-600 dark:text-green-400"
                              : ""
                        }`}
                      >
                        {changePercent !== 0 ? `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%` : "-"}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(salePrice)}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            simulatedMargin < originalMargin
                              ? "text-red-600 dark:text-red-400"
                              : simulatedMargin > originalMargin
                                ? "text-green-600 dark:text-green-400"
                                : ""
                          }
                        >
                          {salePrice > 0 ? `${simulatedMargin.toFixed(1)}%` : "-"}
                        </span>
                        {salePrice > 0 && simulatedMargin !== originalMargin && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({originalMargin.toFixed(1)}%)
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {/* 合計行 */}
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell>合計</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.originalTotal)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.simulatedTotal)}</TableCell>
                  <TableCell
                    className={`text-right ${
                      totals.diffTotal > 0
                        ? "text-red-600 dark:text-red-400"
                        : totals.diffTotal < 0
                          ? "text-green-600 dark:text-green-400"
                          : ""
                    }`}
                  >
                    {formatDiff(totals.diffTotal)}
                  </TableCell>
                  <TableCell className="text-right">
                    {totals.originalTotal > 0
                      ? `${((totals.simulatedTotal - totals.originalTotal) / totals.originalTotal * 100) >= 0 ? "+" : ""}${(
                          ((totals.simulatedTotal - totals.originalTotal) / totals.originalTotal) *
                          100
                        ).toFixed(1)}%`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* 項目別内訳（変動がある場合のみ表示） */}
          {hasChanges && simulationResults.length > 0 && (
            <div className="rounded-md border p-4">
              <p className="mb-3 text-sm font-semibold">項目別影響額（全商品合計）</p>
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 md:grid-cols-5">
                {rateLabels.map(({ key, label }) => {
                  const totalDiff = simulationResults.reduce(
                    (sum, { simulation }) => sum + simulation.diff[key],
                    0
                  )
                  if (totalDiff === 0) return null
                  return (
                    <div key={key} className="flex justify-between rounded-md bg-muted/30 p-2">
                      <span className="text-muted-foreground">{label}</span>
                      <span
                        className={
                          totalDiff > 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-green-600 dark:text-green-400"
                        }
                      >
                        {formatDiff(totalDiff)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
