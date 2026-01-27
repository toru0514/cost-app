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
      <BulkSyncSection
        title="マスタ一括反映"
        description="マスタ用シートから生成した JSON を投入して差分と反映結果を確認します。"
        placeholder='{"materials":[],"packaging_items":[],"shipping_methods":[],"labor_roles":[],"equipments":[],"fees":[],"categories_large":[],"categories_medium":[],"categories_small":[]}'
        helpText="マスタ項目は `docs/spreadsheet-spec.md` を参照してください。"
      />
      <BulkSyncSection
        title="商品一括反映"
        description="商品シートから生成した JSON を投入して差分と反映結果を確認します。"
        placeholder='{"products":[]}'
        helpText="商品項目は `docs/spreadsheet-spec.md` と `templates/product-import-template.csv` を参照してください。"
      />
      <ProductImportSection data={data} actions={actions} />
    </div>
  )
}
