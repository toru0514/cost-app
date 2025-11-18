"use client"

import { CostDisplay } from "../../shared/ui"
import { formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

interface LogisticsElectricitySectionProps {
  data: AppData
}

export function LogisticsElectricitySection({ data }: LogisticsElectricitySectionProps) {
  const shippingMethods = data.shippingMethods ?? []

  return (
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
  )
}
