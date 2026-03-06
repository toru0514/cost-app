"use client"

import type { AppActions } from "@/lib/app-data"
import type { AppData } from "@/lib/types"

import { RegisteredProductsSection } from "./sections/registered-products-section"
import { ProductFormPanel } from "./product-form-panel"

interface ProductTabProps {
  data: AppData
  actions: AppActions
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
