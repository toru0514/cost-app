"use client"

import type { AppActions } from "@/lib/app-data"
import type { AppData } from "@/lib/types"

import { RegisteredProductsSection } from "./sections/registered-products-section"
import { ProductFormPanel } from "./product-form-panel"

interface ProductTabProps {
  data: AppData
  actions: AppActions
  stocks: Map<string, number>
  stocksLoaded: boolean
  isAuthenticated: boolean
  onAdjustStock: (productId: string, delta: number) => Promise<void>
  onSetStock: (productId: string, quantity: number) => Promise<void>
  editingProductId?: string | null
  onRequestEditClear?: () => void
  copySourceProductId?: string | null
  copyRequestNonce?: number
}

export function ProductTab(props: ProductTabProps) {
  const { data, stocks, stocksLoaded, isAuthenticated, onAdjustStock, onSetStock } = props

  return (
    <div className="space-y-6">
      <ProductFormPanel {...props} />
      <RegisteredProductsSection
        data={data}
        stocks={stocks}
        stocksLoaded={stocksLoaded}
        isAuthenticated={isAuthenticated}
        onAdjust={onAdjustStock}
        onSet={onSetStock}
      />
    </div>
  )
}
