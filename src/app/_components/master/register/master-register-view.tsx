"use client"

import type { AppActions } from "@/lib/app-data"
import type { AppData } from "@/lib/types"

import { CategorySection } from "../sections/category"
import { EquipmentSimulationSection } from "../sections/equipment"
import { LaborEquipmentSection } from "../sections/labor"
import { MasterOverviewSection } from "./master-overview-section"
import { MaterialSection } from "../sections/material"
import { OptionPresetSection } from "../sections/option-preset"
import { PackagingSection } from "../sections/packaging"
import { ShippingSection } from "../sections/shipping"

interface MasterRegisterViewProps {
  data: AppData
  actions: AppActions
}

export function MasterRegisterView({ data, actions }: MasterRegisterViewProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <CategorySection data={data} actions={actions} />

        <MaterialSection data={data} actions={actions} />
      </div>

      <div className="space-y-6">
        <PackagingSection data={data} actions={actions} />

        <ShippingSection data={data} actions={actions} />

        <OptionPresetSection data={data} actions={actions} />
      </div>

      <LaborEquipmentSection data={data} actions={actions} />

      <EquipmentSimulationSection data={data} />

      <MasterOverviewSection data={data} />
    </div>
  )
}
