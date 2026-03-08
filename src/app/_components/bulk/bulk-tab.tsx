"use client"

import type { AppActions } from "@/lib/app-data"
import type { AppData } from "@/lib/types"
import { ProductImportSection } from "../product/product-import-section"
import { BulkSyncSection } from "./bulk-sync-section"

interface BulkTabProps {
  data: AppData
  actions: AppActions
}

export function BulkTab({ data, actions }: BulkTabProps) {
  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div>
        <h1 className="text-2xl font-semibold">一括処理</h1>
        <p className="text-muted-foreground">データのインポート・エクスポートを実行できます</p>
      </div>

      <BulkSyncSection
        title="マスタ一括反映"
        description="マスタ用シートの差分確認・書き出し・読み込みを実行します。"
        placeholder='{"materials":[],"packaging_items":[],"shipping_methods":[],"labor_roles":[],"equipments":[],"fees":[],"categories_large":[],"categories_medium":[],"categories_small":[]}'
        helpText="マスタ項目はテンプレートのヘッダーと入力例に従ってください。"
        target="master"
      />
      <BulkSyncSection
        title="商品一括反映"
        description="商品シートの差分確認・書き出し・読み込みを実行します。"
        placeholder='{"products":[]}'
        helpText="商品項目はテンプレートのヘッダーと入力例に従ってください。"
        target="products"
      />
      <ProductImportSection data={data} actions={actions} />
    </div>
  )
}
