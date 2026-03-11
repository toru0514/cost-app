"use client"

import { CostDisplay } from "../../shared/ui"
import { formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

interface CostSectionProps {
  data: AppData
}

export function ElectricityCostSection({ data }: CostSectionProps) {
  return (
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
  )
}
