"use client"

import { MuiCostDisplay as CostDisplay } from "../mui/cost-display"
import { formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

interface CostSectionProps {
  data: AppData
}

export function DevelopmentCostSection({ data }: CostSectionProps) {
  return (
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
  )
}
