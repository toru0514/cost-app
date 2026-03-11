"use client"

import { useMemo, useState } from "react"

import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"
import { calculateProductUnitCosts, formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

interface ProfitSimulationSectionProps {
  data: AppData
}

type ProfitSimulationInput = {
  margin: number
  quantity: number
}

const formatMaybeCurrency = (value?: number | null, currency?: string) => {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "-"
  }
  return formatCurrency(value, currency)
}

export function ProfitSimulationSection({ data }: ProfitSimulationSectionProps) {
  const [profitSimulations, setProfitSimulations] = useState<Record<string, ProfitSimulationInput>>({})

  const productSummaries = useMemo(() => {
    return data.products.map((product) => ({
      product,
      costs: calculateProductUnitCosts(product.id, data),
    }))
  }, [data])

  const applyProfitSimulationPatch = (
    productId: string,
    fallback: ProfitSimulationInput,
    patch: Partial<ProfitSimulationInput>
  ) => {
    setProfitSimulations((prev) => {
      const current = prev[productId] ?? fallback
      const next = { ...current, ...patch }
      return { ...prev, [productId]: next }
    })
  }

  return (
    <section className="min-w-0 space-y-3 rounded-lg border p-4">
      <div>
        <h2 className="text-xl font-semibold">目標利益率シミュレーション</h2>
        <p className="text-sm text-muted-foreground">目標利益率と販売数量を入力し、必要な販売価格と粗利を逆算します。</p>
      </div>
      <div className="space-y-3">
        {productSummaries.length === 0 ? (
          <p className="text-sm text-muted-foreground">商品が登録されると試算できます。</p>
        ) : (
          <div className="space-y-4">
            {productSummaries.map(({ product, costs }) => {
              const unitCost = costs.total ?? 0
              const currentSalePrice = Number(product.salePrice ?? 0)
              const currentMargin =
                currentSalePrice > 0 ? ((currentSalePrice - unitCost) / currentSalePrice) * 100 : 0
              const defaultInputs: ProfitSimulationInput = {
                margin: Number.isFinite(currentMargin) && currentMargin > 0 ? Number(currentMargin.toFixed(1)) : 30,
                quantity: product.expectedProduction.quantity || product.productionLotSize || 1000,
              }
              const simulation = profitSimulations[product.id] ?? defaultInputs
              const targetMargin = Math.max(0, Number(simulation.margin) || 0)
              const plannedQuantity = Math.max(0, Number(simulation.quantity) || 0)
              const cappedMargin = Math.min(targetMargin, 99.9)
              const marginRatio = cappedMargin / 100
              const canCompute = cappedMargin < 100
              const requiredSalePrice = canCompute ? unitCost / Math.max(1 - marginRatio, 0.0001) : null
              const targetRevenue = requiredSalePrice !== null ? requiredSalePrice * plannedQuantity : null
              const totalCostAtQuantity = unitCost * plannedQuantity
              const targetProfit = requiredSalePrice !== null ? targetRevenue! - totalCostAtQuantity : null
              const profitPerUnit = requiredSalePrice !== null ? requiredSalePrice - unitCost : null
              const salePriceGap = requiredSalePrice !== null ? requiredSalePrice - currentSalePrice : null
              const marginGap = targetMargin - currentMargin

              return (
                <div key={`profit-sim-${product.id}`} className="space-y-4 rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        原価 {formatCurrency(unitCost)} / 現行販売価格 {formatCurrency(currentSalePrice)}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>現行利益率: {currentSalePrice > 0 ? `${currentMargin.toFixed(1)}%` : "-"}</p>
                      <p>現行粗利: {formatCurrency(currentSalePrice - unitCost)}</p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">目標利益率 (%)</Label>
                        <NumberInput
                          value={simulation.margin}
                          onValueChange={(next) =>
                            applyProfitSimulationPatch(product.id, defaultInputs, {
                              margin: next === "" ? 0 : Number(next),
                            })
                          }
                          min={0}
                          max={99.9}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">想定販売数量</Label>
                        <NumberInput
                          value={simulation.quantity}
                          onValueChange={(next) =>
                            applyProfitSimulationPatch(product.id, defaultInputs, {
                              quantity: next === "" ? 0 : Number(next),
                            })
                          }
                          min={0}
                        />
                      </div>
                    </div>
                    <div className="space-y-1 rounded-md border p-3 text-sm">
                      <p className="font-semibold">逆算結果</p>
                      <p>必要販売価格: {formatMaybeCurrency(requiredSalePrice)}</p>
                      <p>単位粗利: {formatMaybeCurrency(profitPerUnit)}</p>
                      <p>想定売上: {formatMaybeCurrency(targetRevenue)}</p>
                      <p>想定粗利: {formatMaybeCurrency(targetProfit)}</p>
                    </div>
                    <div className="space-y-1 rounded-md border p-3 text-sm text-muted-foreground">
                      <p className="font-semibold text-foreground">現状との差分</p>
                      <p>
                        販売価格差: {salePriceGap !== null ? `${salePriceGap >= 0 ? "+" : ""}${formatCurrency(salePriceGap)}` : "-"}
                      </p>
                      <p>利益率差: {Number.isFinite(marginGap) ? `${marginGap >= 0 ? "+" : ""}${marginGap.toFixed(1)}%` : "-"}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
