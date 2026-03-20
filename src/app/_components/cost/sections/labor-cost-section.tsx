"use client"

import { MuiCostDisplay as CostDisplay } from "../mui/cost-display"
import { formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

interface CostSectionProps {
  data: AppData
}

export function LaborCostSection({ data }: CostSectionProps) {
  return (
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
  )
}
