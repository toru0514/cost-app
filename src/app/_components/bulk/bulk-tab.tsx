"use client"

import type { AppActions } from "@/lib/app-data"
import { useAuth } from "@/lib/auth"
import type { AppData } from "@/lib/types"
import { ProductImportSection } from "../product/product-import-section"
import { BulkSyncSection } from "./bulk-sync-section"

interface BulkTabProps {
  data: AppData
  actions: AppActions
}

export function BulkTab({ data, actions }: BulkTabProps) {
  const { state: authState } = useAuth()
  const isGuest = authState.status !== "authenticated"

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div>
        <h1 className="text-2xl font-semibold">一括処理</h1>
        <p className="text-muted-foreground">データのインポート・エクスポートを実行できます</p>
      </div>

      {isGuest && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          この機能はログイン後に利用できます。スプレッドシート連携はログインユーザーのみ利用可能です。
        </div>
      )}

      <BulkSyncSection
        title="マスタ一括反映"
        description="マスタ用シートの差分確認・書き出し・読み込みを実行します。"
        placeholder='{"materials":[],"packaging_items":[],"shipping_methods":[],"labor_roles":[],"equipments":[],"fees":[],"categories_large":[],"categories_medium":[],"categories_small":[]}'
        target="master"
        disabled={isGuest}
      />
      <BulkSyncSection
        title="商品一括反映"
        description="商品シートの差分確認・書き出し・読み込みを実行します。"
        placeholder='{"products":[]}'
        target="products"
        disabled={isGuest}
      />
      <ProductImportSection data={data} actions={actions} />
    </div>
  )
}
