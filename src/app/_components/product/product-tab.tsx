"use client"

import type { AppActions } from "@/lib/app-data"
import type { AppData } from "@/lib/types"

import { ProductFormPanel } from "./product-form-panel"
import { RegisteredProductsSection } from "./sections/registered-products-section"

interface ProductTabProps {
  data: AppData
  actions: AppActions
  materialStocks: Map<string, number>
  packagingStocks: Map<string, number>
  packagingStockUnits: Map<string, string>
  masterStocksLoaded: boolean
  isAuthenticated: boolean
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
      {/* ページヘッダー */}
      <div>
        <h1 className="text-2xl font-semibold">商品登録</h1>
        <p className="text-muted-foreground">商品情報とコスト明細を登録・編集</p>
      </div>

      <ProductFormPanel {...props} />
      <RegisteredProductsSection data={data} readOnly />
    </div>
  )
}
