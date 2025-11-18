"use client"

import { CostDisplay } from "../../shared/ui"
import { formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

interface LaborOutsourcingSectionProps {
  data: AppData
}

export function LaborOutsourcingSection({ data }: LaborOutsourcingSectionProps) {
  return (
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
  )
}
