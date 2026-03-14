"use client"

import { useMemo, useState } from "react"

import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"
import { formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"
import { FormSection, type FormSectionOpenSignal } from "../../../shared/ui"

interface EquipmentSimulationSectionProps {
  data: AppData
  openSignal?: FormSectionOpenSignal | null
  onOpen?: () => void
  onClose?: () => void
}

export function EquipmentSimulationSection({ data, openSignal, onOpen, onClose }: EquipmentSimulationSectionProps) {
  const [simulationInputs, setSimulationInputs] = useState<
    Record<string, { quantity: number; salePrice: number; utilizationRatio: number }>
  >({})

  const integerFormatter = useMemo(() => new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }), [])
  const formatInteger = (value: number) => integerFormatter.format(Math.round(value))

  const equipmentSimulationData = useMemo(() => {
    return data.equipments.map((equipment) => {
      const utilizationRate = Math.min(Math.max(equipment.utilizationRate ?? 100, 0), 100)
      const effectiveAcquisitionCost = (equipment.acquisitionCost * utilizationRate) / 100
      const allocations = data.costEntries.equipmentAllocations.filter((entry) => entry.equipmentId === equipment.id)
      const annualCost = effectiveAcquisitionCost / Math.max(equipment.amortizationYears || 1, 1)
      const totalUsageHours = allocations.reduce((sum, entry) => sum + (entry.usageHours ?? 0), 0)
      const annualAllocation = allocations.reduce((sum, entry) => {
        const ratio =
          totalUsageHours > 0 && entry.usageHours !== undefined
            ? entry.usageHours / totalUsageHours
            : entry.allocationRatio
        return sum + annualCost * ratio
      }, allocations.length > 0 ? 0 : 0)
      const allocationsQuantity = allocations.reduce((sum, entry) => sum + (entry.annualQuantity || 0), 0)
      const relatedProducts = data.products.filter((product) => product.equipmentIds.includes(equipment.id))
      const fallbackAnnualQuantity = relatedProducts.reduce((sum, product) => {
        const years = Math.max(product.expectedProduction.periodYears || 1, 1)
        return sum + (product.expectedProduction.quantity || 0) / years
      }, 0)
      const currentAnnualQuantity = allocationsQuantity || fallbackAnnualQuantity
      const currentUnitCost = annualCost / Math.max(currentAnnualQuantity || 1, 1)
      const baseSalePriceAverage =
        relatedProducts.length > 0
          ? relatedProducts.reduce((sum, product) => sum + (product.salePrice || 0), 0) / relatedProducts.length
          : 10000

      return {
        equipment,
        annualCost,
        annualAllocation,
        currentAnnualQuantity,
        currentUnitCost,
        relatedProducts,
        baseSalePriceAverage,
        utilizationRate,
        effectiveAcquisitionCost,
      }
    })
  }, [data.costEntries.equipmentAllocations, data.equipments, data.products])

  return (
    <FormSection
      title="設備導入シミュレーション"
      description="年間数量と販売価格を仮入力し、配賦単価と投資回収を比較します。"
      storageKey="master-section-equipment-sim"
      openSignal={openSignal}
      onOpen={onOpen}
      onClose={onClose}
    >
      <div className="space-y-4">
        {equipmentSimulationData.length === 0 ? (
          <p className="text-sm text-muted-foreground">設備が登録されると試算できます。</p>
        ) : (
          equipmentSimulationData.map((info) => {
            const {
              equipment,
              annualCost,
              annualAllocation,
              currentAnnualQuantity,
              currentUnitCost,
              relatedProducts,
              baseSalePriceAverage,
              utilizationRate,
              effectiveAcquisitionCost,
            } = info
            const defaultSimulation = {
              quantity: Math.max(Math.round(currentAnnualQuantity) || 1000, 1),
              salePrice: Math.max(Math.round(baseSalePriceAverage) || 10000, 1),
              utilizationRatio: 100,
            }
            const simulationValue = simulationInputs[equipment.id] ?? defaultSimulation
            const simQuantity = Math.max(simulationValue.quantity || 0, 0)
            const simSalePrice = Math.max(simulationValue.salePrice || 0, 0)
            const simUtilizationRatioRaw = simulationValue.utilizationRatio ?? 0
            const simUtilizationRatio = Math.min(Math.max(simUtilizationRatioRaw, 0), 100)
            const simUnitAllocation = annualCost / Math.max(simQuantity || 1, 1)
            const effectiveSalePrice = (simSalePrice * simUtilizationRatio) / 100
            const simAnnualMargin = (effectiveSalePrice - simUnitAllocation) * simQuantity
            const annualRecoveryRate =
              effectiveAcquisitionCost > 0 ? (simAnnualMargin / effectiveAcquisitionCost) * 100 : 0
            const paybackYears = simAnnualMargin > 0 ? effectiveAcquisitionCost / simAnnualMargin : Infinity
            const paybackText = Number.isFinite(paybackYears) ? `${paybackYears.toFixed(1)}年` : "未達"
            const relatedProductNames = relatedProducts.length
              ? relatedProducts.map((product) => product.name).join(" / ")
              : "対象商品なし"

            const updateSimulationValue = (
              patch: Partial<{ quantity: number; salePrice: number; utilizationRatio: number }>
            ) => {
              setSimulationInputs((prev) => {
                const current = prev[equipment.id] ?? defaultSimulation
                const next = { ...current, ...patch }
                return { ...prev, [equipment.id]: next }
              })
            }

            return (
              <div key={`simulation-${equipment.id}`} className="space-y-4 rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{equipment.name}</p>
                    <p className="text-xs text-muted-foreground">対象商品: {relatedProductNames}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>
                      取得額 {formatCurrency(equipment.acquisitionCost, equipment.currency)} / {equipment.amortizationYears}年償却
                    </p>
                    <p>利用率 {utilizationRate}% → 配賦対象 {formatCurrency(effectiveAcquisitionCost, equipment.currency)}</p>
                    <p>年間償却額 {formatCurrency(annualCost, equipment.currency)}</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1 rounded-md border p-3 text-sm">
                    <p className="font-semibold">現在の前提</p>
                    <p>年間数量: {currentAnnualQuantity ? `${formatInteger(currentAnnualQuantity)} 個` : "未設定"}</p>
                    <p>設備単価: {formatCurrency(currentUnitCost, equipment.currency)}</p>
                    <p>年間配賦額: {formatCurrency(annualAllocation, equipment.currency)}</p>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">シミュレーション年間数量</Label>
                      <NumberInput
                        value={simulationValue.quantity}
                        onValueChange={(next) => updateSimulationValue({ quantity: next === "" ? 0 : Number(next) })}
                        min={0}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">1個あたり販売価格</Label>
                      <NumberInput
                        value={simulationValue.salePrice}
                        onValueChange={(next) => updateSimulationValue({ salePrice: next === "" ? 0 : Number(next) })}
                        min={0}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">設備利用割合 (%)</Label>
                      <NumberInput
                        value={simulationValue.utilizationRatio}
                        onValueChange={(next) =>
                          updateSimulationValue({ utilizationRatio: next === "" ? 0 : Number(next) })
                        }
                        min={0}
                        max={100}
                      />
                    </div>
                  </div>
                  <div className="space-y-1 rounded-md border p-3 text-sm">
                    <p className="font-semibold">シミュレーション結果</p>
                    <p>設備単価: {formatCurrency(simUnitAllocation, equipment.currency)}</p>
                    <p>有効販売価格: {formatCurrency(effectiveSalePrice, equipment.currency)}</p>
                    <p>利用割合: {simUtilizationRatio.toFixed(1)}%</p>
                    <p>年間粗利: {formatCurrency(simAnnualMargin, equipment.currency)}</p>
                    <p>
                      年間回収率: {simAnnualMargin > 0 && effectiveAcquisitionCost > 0 ? `${annualRecoveryRate.toFixed(1)}%` : "-"}
                    </p>
                    <p>回収見込み: {paybackText}</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </FormSection>
  )
}
