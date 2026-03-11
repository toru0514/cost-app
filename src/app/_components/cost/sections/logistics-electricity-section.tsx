"use client"

import { CostDisplay } from "../../shared/ui"
import { formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

interface SectionProps {
  data: AppData
}

export function LogisticsCostSection({ data }: SectionProps) {
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

export function ElectricityCostSection({ data }: SectionProps) {
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

export function FeesCostSection({ data }: SectionProps) {
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
