"use client"

import { useState } from "react"

import type { AppActions } from "@/lib/app-data"
import type { AppData } from "@/lib/types"
import { Button } from "@/components/ui/button"

import { CategorySection } from "../sections/category"
import { EquipmentSimulationSection } from "../sections/equipment"
import { ExchangeRateSection } from "../sections/exchange-rate"
import { LaborEquipmentSection } from "../sections/labor"
import { MasterOverviewSection } from "./master-overview-section"
import { MaterialSection } from "../sections/material"
import { OptionPresetSection } from "../sections/option-preset"
import { PackagingSection } from "../sections/packaging"
import { ShippingSection } from "../sections/shipping"
import { FeeSection } from "../sections/fee"
import type { FormSectionOpenSignal } from "../../shared/ui"

interface MasterRegisterViewProps {
  data: AppData
  actions: AppActions
  isAuthenticated: boolean
  onSetMaterialStock: (id: string, quantity: number, stockUnit?: string) => Promise<void>
  onSetPackagingStock: (id: string, quantity: number, stockUnit?: string) => Promise<void>
  onSectionFocus?: (sectionKey: string | null) => void
}

export function MasterRegisterView({ data, actions, isAuthenticated, onSetMaterialStock, onSetPackagingStock, onSectionFocus }: MasterRegisterViewProps) {
  const [sectionOpenSignal, setSectionOpenSignal] = useState<FormSectionOpenSignal | null>(null)

  const triggerSectionOpenState = (value: boolean) => {
    setSectionOpenSignal({ value, nonce: Date.now() })
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => triggerSectionOpenState(true)}>
          全て開く
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => triggerSectionOpenState(false)}>
          全て閉じる
        </Button>
      </div>

      <div className="space-y-6">
        <CategorySection data={data} actions={actions} openSignal={sectionOpenSignal} onOpen={() => onSectionFocus?.("category")} />

        <MaterialSection
          data={data}
          actions={actions}
          isAuthenticated={isAuthenticated}
          onSetMaterialStock={onSetMaterialStock}
          openSignal={sectionOpenSignal}
          onOpen={() => onSectionFocus?.("material")}
        />
      </div>

      <div className="space-y-6">
        <PackagingSection
          data={data}
          actions={actions}
          isAuthenticated={isAuthenticated}
          onSetPackagingStock={onSetPackagingStock}
          openSignal={sectionOpenSignal}
          onOpen={() => onSectionFocus?.("packaging")}
        />

        <ShippingSection data={data} actions={actions} openSignal={sectionOpenSignal} onOpen={() => onSectionFocus?.("shipping")} />

        <FeeSection data={data} actions={actions} openSignal={sectionOpenSignal} onOpen={() => onSectionFocus?.("fee")} />

        <OptionPresetSection data={data} actions={actions} openSignal={sectionOpenSignal} onOpen={() => onSectionFocus?.("option-preset")} />
      </div>

      <LaborEquipmentSection data={data} actions={actions} openSignal={sectionOpenSignal} onOpen={() => onSectionFocus?.("labor")} />

      <EquipmentSimulationSection data={data} openSignal={sectionOpenSignal} onOpen={() => onSectionFocus?.("equipment")} />

      <ExchangeRateSection isAuthenticated={isAuthenticated} openSignal={sectionOpenSignal} onOpen={() => onSectionFocus?.("exchange-rate")} />

      <MasterOverviewSection data={data} />
    </div>
  )
}
