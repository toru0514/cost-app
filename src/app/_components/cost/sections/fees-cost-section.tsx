"use client"

import { CostDisplay } from "../../shared/ui"
import { formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

interface CostSectionProps {
  data: AppData
}

export function FeesCostSection({ data }: CostSectionProps) {
  return (
    <CostDisplay
      title="販売・決済手数料"
      description="マスタ定義の%+固定額で算出"
      rows={data.costEntries.fees.map((entry) => {
        const product = data.products.find((item) => item.id === entry.productId)
        const fee = data.fees.find((item) => item.id === entry.feeId)
        const salePrice = Number(product?.salePrice) || 0
        const variable = (salePrice * (entry.ratePercent ?? 0)) / 100
        const amount = variable + (entry.fixedAmount ?? 0)
        const detailParts = [fee?.name ?? "手数料", `率 ${entry.ratePercent ?? 0}%`]
        if ((entry.fixedAmount ?? 0) !== 0) {
          detailParts.push(`固定 ${formatCurrency(entry.fixedAmount ?? 0, entry.currency)}`)
        }
        return {
          product: product?.name ?? "未設定",
          detail: detailParts.join(" / "),
          amount: formatCurrency(amount, entry.currency),
        }
      })}
    />
  )
}
