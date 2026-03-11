"use client"

import { useMemo } from "react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/calculations"
import type { AppData, Equipment } from "@/lib/types"

interface CostSectionProps {
  data: AppData
}

export function EquipmentAllocationSection({ data }: CostSectionProps) {
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
      const utilizationRate = Math.min(Math.max(equipment.utilizationRate ?? 100, 0), 100) / 100
      const annualCost = (equipment.acquisitionCost / Math.max(equipment.amortizationYears || 1, 1)) * utilizationRate
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
    <section className="min-w-0 space-y-3 rounded-lg border p-4">
      <div>
        <h2 className="text-xl font-semibold">設備配賦</h2>
        <p className="text-sm text-muted-foreground">設備単位での配賦状況</p>
      </div>
      <div className="space-y-3">
        {equipmentUsageGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ設備配賦が登録されていません。</p>
        ) : (
          <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
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
                      {(() => {
                        const utilizationRate = Math.min(Math.max(group.equipment.utilizationRate ?? 100, 0), 100)
                        const effectiveCost = (group.equipment.acquisitionCost * utilizationRate) / 100
                        return (
                          <>
                            {formatCurrency(group.equipment.acquisitionCost, group.equipment.currency)} /
                            {group.equipment.amortizationYears}年
                            <span className="block text-xs text-muted-foreground">
                              利用率 {utilizationRate}% / 配賦対象額 {formatCurrency(effectiveCost, group.equipment.currency)}
                            </span>
                          </>
                        )
                      })()}
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
      </div>
    </section>
  )
}
