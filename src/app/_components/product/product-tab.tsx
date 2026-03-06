"use client"

import type { AppActions } from "@/lib/app-data"
import type { AppData } from "@/lib/types"

import { ProductFormPanel } from "./product-form-panel"
import { RegisteredProductsSection } from "./sections/registered-products-section"

interface ProductTabProps {
  data: AppData
  actions: AppActions
  onSetStock?: (productId: string, quantity: number) => Promise<void>
  editingProductId?: string | null
  onRequestEditClear?: () => void
  copySourceProductId?: string | null
  copyRequestNonce?: number
}

export function ProductTab(props: ProductTabProps) {
  const { data } = props

  return (
    <div className="space-y-6">
      <ProductFormPanel {...props} />
      <RegisteredProductsSection data={data} readOnly />
    </div>
  )
}
