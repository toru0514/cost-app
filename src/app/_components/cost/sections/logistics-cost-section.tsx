"use client"

import { MuiCostDisplay as CostDisplay } from "../mui/cost-display"
import { formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

interface CostSectionProps {
  data: AppData
}

export function LogisticsCostSection({ data }: CostSectionProps) {
  const shippingMethods = data.shippingMethods ?? []

  return (
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
  )
}
