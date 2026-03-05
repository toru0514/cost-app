"use client"

import type { AppActions } from "@/lib/app-data"
import type { AppData } from "@/lib/types"
import { createTempId } from "@/lib/utils"

import { CategoryListSection } from "../sections/category"
import { EquipmentListSection } from "../sections/equipment"
import { LaborListSection } from "../sections/labor"
import { MaterialListSection } from "../sections/material"
import { OptionPresetListSection } from "../sections/option-preset"
import { PackagingListSection } from "../sections/packaging"
import { ShippingListSection } from "../sections/shipping"
import { FeeListSection } from "../sections/fee"

interface MasterListViewProps {
  data: AppData
  actions: AppActions
  isAuthenticated: boolean
  materialStocks: Map<string, number>
  packagingStocks: Map<string, number>
  masterStocksLoaded: boolean
  onSetMaterialStock: (id: string, quantity: number) => Promise<void>
  onSetPackagingStock: (id: string, quantity: number) => Promise<void>
  onAdjustMaterialStock: (id: string, delta: number) => Promise<void>
  onAdjustPackagingStock: (id: string, delta: number) => Promise<void>
}

export function MasterListView({ data, actions, isAuthenticated, materialStocks, packagingStocks, masterStocksLoaded, onSetMaterialStock, onSetPackagingStock, onAdjustMaterialStock, onAdjustPackagingStock }: MasterListViewProps) {
  return (
    <div className="space-y-6">
      <CategoryListSection data={data} actions={actions} createTempId={createTempId} />

      <div className="space-y-6">
        <MaterialListSection
          data={data}
          actions={actions}
          createTempId={createTempId}
          isAuthenticated={isAuthenticated}
          materialStocks={materialStocks}
          masterStocksLoaded={masterStocksLoaded}
          onSetMaterialStock={onSetMaterialStock}
          onAdjustMaterialStock={onAdjustMaterialStock}
        />

        <PackagingListSection
          data={data}
          actions={actions}
          createTempId={createTempId}
          isAuthenticated={isAuthenticated}
          packagingStocks={packagingStocks}
          masterStocksLoaded={masterStocksLoaded}
          onSetPackagingStock={onSetPackagingStock}
          onAdjustPackagingStock={onAdjustPackagingStock}
        />
        <OptionPresetListSection data={data} actions={actions} createTempId={createTempId} />
      </div>

      <div className="space-y-6">
        <ShippingListSection data={data} actions={actions} createTempId={createTempId} />
        <FeeListSection data={data} actions={actions} createTempId={createTempId} />
        <LaborListSection data={data} actions={actions} createTempId={createTempId} />
        <EquipmentListSection data={data} actions={actions} createTempId={createTempId} />
      </div>
    </div>
  )
}
