"use client"

import { useMemo } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CostDisplay } from "../../shared/ui"
import { formatCurrency } from "@/lib/calculations"
import type { AppData, Equipment } from "@/lib/types"

interface DevelopmentEquipmentSectionProps {
  data: AppData
}

export function DevelopmentEquipmentSection({ data }: DevelopmentEquipmentSectionProps) {
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

  return (
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
      <Card className="overflow-x-hidden">
        <CardHeader>
          <CardTitle>設備配賦</CardTitle>
          <CardDescription>設備単位での配賦状況</CardDescription>
        </CardHeader>
        <CardContent>
          {equipmentUsageGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ設備配賦が登録されていません。</p>
          ) : (
            <div className="relative w-full max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
              <Table className="w-auto min-w-max">
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
  )
}
