"use client"

import { MuiCostDisplay as CostDisplay } from "../mui/cost-display"
import { formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

interface CostSectionProps {
  data: AppData
}

export function OutsourcingCostSection({ data }: CostSectionProps) {
  return (
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
  )
}
