"use client"

import { useMemo } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/calculations"
import type { AppData, Material } from "@/lib/types"

interface MaterialUsageSectionProps {
  data: AppData
}

export function MaterialUsageSection({ data }: MaterialUsageSectionProps) {
  const materialUsageGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        materialId: string
        materialName: string
        unit?: string
        currency?: string
        baseUnitCost?: number
        totalUsageInput?: number
        usePercentageMode?: boolean
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
          totalUsageInput: undefined,
          usePercentageMode: material.usePercentageMode,
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
        group.totalUsageInput = (group.totalUsageInput ?? 0) + entry.usageRatio
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

  return (
    <Card className="overflow-x-hidden">
      <CardHeader>
        <CardTitle>材料使用状況</CardTitle>
        <CardDescription>各材料がどの商品でどの程度使われているかを一覧できます。</CardDescription>
      </CardHeader>
      <CardContent>
        {materialUsageGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ材料コストが登録されていません。</p>
        ) : (
          <div className="relative w-full max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
            <Table className="w-auto min-w-max">
              <TableHeader>
                <TableRow>
                  <TableHead>材料</TableHead>
                  <TableHead>仕入先</TableHead>
                  <TableHead>総使用量</TableHead>
                  <TableHead>単価</TableHead>
                  <TableHead>内訳</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materialUsageGroups.map((group) => (
                  <TableRow key={`summary-${group.materialId}`}>
                    <TableCell>{group.materialName}</TableCell>
                    <TableCell>{group.supplier ?? "-"}</TableCell>
                    <TableCell>
                      {group.totalUsageInput !== undefined
                        ? group.usePercentageMode
                          ? `${group.totalUsageInput}%`
                          : `${group.totalUsageInput}${group.unit ?? ""}`
                        : "-"}
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
                              const ratioText =
                                entry.usageRatio !== undefined
                                  ? group.usePercentageMode
                                    ? `${entry.usageRatio}%`
                                    : `${entry.usageRatio}${group.unit ?? ""}`
                                  : "-"
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
  )
}
