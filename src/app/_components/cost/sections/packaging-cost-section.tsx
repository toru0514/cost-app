"use client"

import { CostDisplay } from "../../shared/ui"
import { formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

interface PackagingCostSectionProps {
  data: AppData
}

export function PackagingCostSection({ data }: PackagingCostSectionProps) {
  return (
    <CostDisplay
      title="梱包材費"
      description="梱包材の使用数量"
      rows={data.costEntries.packaging.map((entry) => {
        const productName = data.products.find((product) => product.id === entry.productId)?.name ?? "未設定"
        const itemName = data.packagingItems.find((item) => item.id === entry.packagingItemId)?.name ?? "-"
        return {
          product: productName,
          detail: `${itemName} × ${entry.quantity}`,
          amount: formatCurrency(entry.quantity * entry.costPerUnit, entry.currency),
        }
      })}
    />
  )
}
