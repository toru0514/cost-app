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

interface MasterListViewProps {
  data: AppData
  actions: AppActions
}

const createTempId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 11)

export function MasterListView({ data, actions }: MasterListViewProps) {
  return (
    <div className="space-y-6">
      <CategoryListSection data={data} actions={actions} createTempId={createTempId} />

      <div className="space-y-6">
        <MaterialListSection data={data} actions={actions} createTempId={createTempId} />

        <PackagingListSection data={data} actions={actions} createTempId={createTempId} />
        <OptionPresetListSection data={data} actions={actions} createTempId={createTempId} />
      </div>

      <div className="space-y-6">
        <ShippingListSection data={data} actions={actions} createTempId={createTempId} />
        <LaborListSection data={data} actions={actions} createTempId={createTempId} />
        <EquipmentListSection data={data} actions={actions} createTempId={createTempId} />
      </div>
    </div>
  )
}
