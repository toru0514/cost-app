"use client"

import type { AppActions } from "@/lib/app-data"
import type { AppData } from "@/lib/types"

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
  onSetMaterialStock: (id: string, quantity: number) => Promise<void>
  onSetPackagingStock: (id: string, quantity: number) => Promise<void>
}

const createTempId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 11)

export function MasterListView({ data, actions, isAuthenticated, materialStocks, packagingStocks, onSetMaterialStock, onSetPackagingStock }: MasterListViewProps) {
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
          onSetMaterialStock={onSetMaterialStock}
        />

        <PackagingListSection
          data={data}
          actions={actions}
          createTempId={createTempId}
          isAuthenticated={isAuthenticated}
          packagingStocks={packagingStocks}
          onSetPackagingStock={onSetPackagingStock}
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
