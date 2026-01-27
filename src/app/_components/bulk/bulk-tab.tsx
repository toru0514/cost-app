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
      <BulkSyncSection />
      <ProductImportSection data={data} actions={actions} />
    </div>
  )
}
