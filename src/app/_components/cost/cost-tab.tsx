"use client"

import { useMemo, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"
import type { AppData, Equipment, Material } from "@/lib/types"
import { calculateProductUnitCosts, formatCurrency } from "@/lib/calculations"
import { CostDisplay } from "../shared/ui"

interface CostTabProps {
  data: AppData
}

type ProfitSimulationInput = {
  margin: number
  quantity: number
}

export function CostTab({ data }: CostTabProps) {
  const shippingMethods = data.shippingMethods ?? []
  const [profitSimulations, setProfitSimulations] = useState<Record<string, ProfitSimulationInput>>({})

  const productSummaries = useMemo(() => {
    return data.products.map((product) => ({
      product,
      costs: calculateProductUnitCosts(product.id, data),
    }))
  }, [data])


  const materialUsageGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        materialId: string
        materialName: string
        unit?: string
        currency?: string
        baseUnitCost?: number
        totalUsageRatio?: number
        supplier?: string
        entries: {
          productName: string
          usageRatio?: number
          costShare?: number
          lotSize?: number
        }[]
      }
    >()

    const ensureGroup = (material: Material) => {
      if (!groups.has(material.id)) {
        groups.set(material.id, {
          materialId: material.id,
          materialName: material.name,
          unit: material.unit,
          currency: material.currency,
          baseUnitCost: material.unitCost,
          totalUsageRatio: undefined,
          supplier: material.supplier,
          entries: [],
        })
      }
      return groups.get(material.id)!
    }

    data.costEntries.materials.forEach((entry) => {
      const material = data.materials.find((item) => item.id === entry.materialId)
      if (!material) return
      const product = data.products.find((item) => item.id === entry.productId)
      const productName = product?.name ?? "未設定"

      const group = ensureGroup(material)
      group.currency = entry.currency ?? group.currency
      if (entry.usageRatio !== undefined) {
        group.totalUsageRatio = (group.totalUsageRatio ?? 0) + entry.usageRatio
      }
      group.entries.push({
        productName,
        usageRatio: entry.usageRatio,
        costShare: entry.costPerUnit,
        lotSize: product?.productionLotSize,
      })
    })

    return Array.from(groups.values()).filter((group) => group.entries.length > 0)
  }, [data])

  const equipmentUsageGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        equipment: Equipment
        totalUsageHours?: number
        entries: {
          productName: string
          allocationRatio: number
          annualQuantity: number
          unitCost: number
          usageHours?: number
        }[]
      }
    >()

    data.costEntries.equipmentAllocations.forEach((entry) => {
      const equipment = data.equipments.find((item) => item.id === entry.equipmentId)
      if (!equipment) return
      const product = data.products.find((item) => item.id === entry.productId)
      const productName = product?.name ?? "未設定"
      const annualCost = equipment.acquisitionCost / Math.max(equipment.amortizationYears || 1, 1)
      const unitCost = (annualCost * entry.allocationRatio) / Math.max(entry.annualQuantity || 1, 1)

      if (!groups.has(equipment.id)) {
        groups.set(equipment.id, { equipment, totalUsageHours: undefined, entries: [] })
      }

      const group = groups.get(equipment.id)!
      if (entry.usageHours !== undefined) {
        group.totalUsageHours = (group.totalUsageHours ?? 0) + entry.usageHours
      }

      group.entries.push({
        productName,
        allocationRatio: entry.allocationRatio,
        annualQuantity: entry.annualQuantity,
        unitCost,
        usageHours: entry.usageHours,
      })
    })

    return Array.from(groups.values())
  }, [data.costEntries.equipmentAllocations, data.equipments, data.products])

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

  const formatMaybeCurrency = (value?: number | null, currency?: string) => {
    if (value === undefined || value === null || !Number.isFinite(value)) {
      return "-"
    }
    return formatCurrency(value, currency)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>原価サマリ</CardTitle>
          <CardDescription>カテゴリ別の積み上げと合計を確認できます。</CardDescription>
        </CardHeader>
        <CardContent>
          {productSummaries.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ原価計算対象の商品がありません。</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead>材料</TableHead>
                    <TableHead>梱包</TableHead>
                    <TableHead>人件費</TableHead>
                    <TableHead>外注</TableHead>
                    <TableHead>開発</TableHead>
                    <TableHead>設備</TableHead>
                    <TableHead>物流</TableHead>
                    <TableHead>電気</TableHead>
                    <TableHead>合計</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productSummaries.map(({ product, costs }) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{formatCurrency(costs.material)}</TableCell>
                      <TableCell>{formatCurrency(costs.packaging)}</TableCell>
                      <TableCell>{formatCurrency(costs.labor)}</TableCell>
                      <TableCell>{formatCurrency(costs.outsourcing)}</TableCell>
                      <TableCell>{formatCurrency(costs.development)}</TableCell>
                      <TableCell>{formatCurrency(costs.equipment)}</TableCell>
                      <TableCell>{formatCurrency(costs.logistics)}</TableCell>
                      <TableCell>{formatCurrency(costs.electricity)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(costs.total)}</TableCell>
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
          <CardTitle>目標利益率シミュレーション</CardTitle>
          <CardDescription>目標利益率と販売数量を入力し、必要な販売価格と粗利を逆算します。</CardDescription>
        </CardHeader>
        <CardContent>
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
                const targetRevenue =
                  requiredSalePrice !== null ? requiredSalePrice * plannedQuantity : null
                const totalCostAtQuantity = unitCost * plannedQuantity
                const targetProfit =
                  requiredSalePrice !== null ? targetRevenue! - totalCostAtQuantity : null
                const profitPerUnit =
                  requiredSalePrice !== null ? requiredSalePrice - unitCost : null
                const salePriceGap =
                  requiredSalePrice !== null ? requiredSalePrice - currentSalePrice : null
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
                      <div className="space-y-1 rounded-md border p-3 text-sm">
                        <p className="font-semibold">ギャップ</p>
                        <p>価格差: {formatMaybeCurrency(salePriceGap)}</p>
                        <p>利益率差: {Number.isFinite(marginGap) ? `${marginGap.toFixed(1)}%` : "-"}</p>
                        <p>コスト総額: {formatCurrency(totalCostAtQuantity)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>材料サマリ</CardTitle>
            <CardDescription>材料ごとの使用状況と単価を確認</CardDescription>
          </CardHeader>
          <CardContent>
            {materialUsageGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">まだ材料明細がありません。</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>材料</TableHead>
                      <TableHead>仕入先</TableHead>
                      <TableHead>登録使用率合計</TableHead>
                      <TableHead>材料単価</TableHead>
                      <TableHead>原価内訳</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materialUsageGroups.map((group) => (
                      <TableRow key={`summary-${group.materialId}`}>
                        <TableCell>{group.materialName}</TableCell>
                        <TableCell>{group.supplier ?? "-"}</TableCell>
                        <TableCell>
                          {group.totalUsageRatio !== undefined ? `${group.totalUsageRatio}%` : "-"}
                        </TableCell>
                        <TableCell>
                          {group.baseUnitCost !== undefined
                            ? formatCurrency(group.baseUnitCost, group.currency ?? "JPY")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {group.entries.length === 0
                            ? "-"
                            : group.entries
                                .map((entry) => {
                                  const ratioText = entry.usageRatio !== undefined ? `${entry.usageRatio}%` : "-"
                                  const costText =
                                    entry.costShare !== undefined
                                      ? formatCurrency(entry.costShare, group.currency ?? "JPY")
                                      : "-"
                                  const lotText = entry.lotSize ? `${entry.lotSize}個` : "-"
                                  return `${entry.productName}: ${ratioText} / ${costText} / ${lotText}`
                                })
                                .join(" / ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <CostDisplay
          title="梱包材費"
          description="梱包材の使用数量"
          rows={data.costEntries.packaging.map((entry) => {
            const productName = data.products.find((product) => product.id === entry.productId)?.name ?? "未設定"
            const itemName = data.packagingItems.find((item) => item.id === entry.packagingItemId)?.name ?? "-"
            return {
              product: productName,
              detail: `${itemName} × ${entry.quantity}`,
              amount: formatCurrency(entry.quantity * entry.costPerUnit, entry.currency),
            }
          })}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <CostDisplay
          title="人件費"
          description="作業カテゴリごとの工数"
          rows={data.costEntries.labor.map((entry) => {
            const productName = data.products.find((product) => product.id === entry.productId)?.name ?? "未設定"
            const role = data.laborRoles.find((labor) => labor.id === entry.laborRoleId)
            const hourlyRate = entry.hourlyRateOverride ?? role?.hourlyRate ?? 0
            const currency = role?.currency ?? "JPY"
            return {
              product: productName,
              detail: `${role?.name ?? "-"} / ${entry.hours}h × ${entry.peopleCount}人`,
              amount: formatCurrency(hourlyRate * entry.hours * entry.peopleCount, currency),
            }
          })}
        />
        <CostDisplay
          title="外注費"
          description="委託費用"
          rows={data.costEntries.outsourcing.map((entry) => {
            const productName = data.products.find((product) => product.id === entry.productId)?.name ?? "未設定"
            return {
              product: productName,
              detail: entry.note || "-",
              amount: formatCurrency(entry.costPerUnit, entry.currency),
            }
          })}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <CostDisplay
          title="開発コスト"
          description="試作/道具費の償却"
          rows={data.costEntries.development.map((entry) => {
            const product = data.products.find((item) => item.id === entry.productId)
            const quantity = product?.expectedProduction.quantity || 1
            const total = entry.prototypeLaborCost + entry.prototypeMaterialCost + entry.toolingCost
            const amortized = total / Math.max(entry.amortizationYears || 1, 1)
            return {
              product: product?.name ?? "未設定",
              detail: `${entry.title ?? "開発コスト"} / ${entry.amortizationYears}年 / ${quantity}個`,
              amount: formatCurrency(amortized / Math.max(quantity, 1)),
            }
          })}
        />
        <Card>
          <CardHeader>
            <CardTitle>設備配賦</CardTitle>
            <CardDescription>設備単位での配賦状況</CardDescription>
          </CardHeader>
          <CardContent>
            {equipmentUsageGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">まだ設備配賦が登録されていません。</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>設備</TableHead>
                      <TableHead>取得額 / 償却年数</TableHead>
                      <TableHead>配賦内訳</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipmentUsageGroups.map((group) => (
                      <TableRow key={`equipment-group-${group.equipment.id}`}>
                        <TableCell>{group.equipment.name}</TableCell>
                        <TableCell>
                          {formatCurrency(group.equipment.acquisitionCost, group.equipment.currency)} /
                          {group.equipment.amortizationYears}年
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {group.entries
                            .map((entry) => {
                              const ratio =
                                group.totalUsageHours && entry.usageHours !== undefined && group.totalUsageHours > 0
                                  ? Math.round((entry.usageHours / group.totalUsageHours) * 100)
                                  : Math.round(entry.allocationRatio * 100)
                              const hoursText = entry.usageHours !== undefined ? `${entry.usageHours.toFixed(2)}h` : "-"
                              return `${entry.productName}: ${ratio}% / ${entry.annualQuantity}個 / ${hoursText} / ${formatCurrency(entry.unitCost, group.equipment.currency)}`
                            })
                            .join(" / ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <CostDisplay
          title="物流・配送費"
          description="配送方法"
          rows={data.costEntries.logistics.map((entry) => {
            const productName = data.products.find((product) => product.id === entry.productId)?.name ?? "未設定"
            const methodName = shippingMethods.find((method) => method.id === entry.shippingMethodId)?.name ?? "未設定"
            return {
              product: productName,
              detail: methodName,
              amount: formatCurrency(entry.costPerUnit, entry.currency),
            }
          })}
        />
        <CostDisplay
          title="電気代"
          description="1ユニットあたり"
          rows={data.costEntries.electricity.map((entry) => {
            const productName = data.products.find((product) => product.id === entry.productId)?.name ?? "未設定"
            return {
              product: productName,
              detail: "基準値",
              amount: formatCurrency(entry.costPerUnit, entry.currency),
            }
          })}
        />
      </div>

    </div>
  )
}
