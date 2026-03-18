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
import { ProcessTemplateSection } from "../sections/process"
import type { FormSectionOpenSignal } from "../../shared/ui"

interface MasterRegisterViewProps {
  data: AppData
  actions: AppActions
  isAuthenticated: boolean
  onSetMaterialStock: (id: string, quantity: number, stockUnit?: string) => Promise<void>
  onSetPackagingStock: (id: string, quantity: number, stockUnit?: string) => Promise<void>
  onRefreshExchangeRates?: () => Promise<void>
  onSectionFocus?: (sectionKey: string | null) => void
}

export function MasterRegisterView({ data, actions, isAuthenticated, onSetMaterialStock, onSetPackagingStock, onRefreshExchangeRates, onSectionFocus }: MasterRegisterViewProps) {
  const [sectionOpenSignal, setSectionOpenSignal] = useState<FormSectionOpenSignal | null>(null)

  const triggerSectionOpenState = (value: boolean) => {
    setSectionOpenSignal({ value, nonce: Date.now() })
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => { triggerSectionOpenState(true); onSectionFocus?.(null) }}>
          全て開く
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => { triggerSectionOpenState(false); onSectionFocus?.(null) }}>
          全て閉じる
        </Button>
      </div>

      <div className="space-y-6">
        <CategorySection data={data} actions={actions} openSignal={sectionOpenSignal} onOpen={() => onSectionFocus?.("category")} onClose={() => onSectionFocus?.(null)} />

        <MaterialSection
          data={data}
          actions={actions}
          isAuthenticated={isAuthenticated}
          onSetMaterialStock={onSetMaterialStock}
          openSignal={sectionOpenSignal}
          onOpen={() => onSectionFocus?.("material")}
          onClose={() => onSectionFocus?.(null)}
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
          onClose={() => onSectionFocus?.(null)}
        />

        <ShippingSection data={data} actions={actions} openSignal={sectionOpenSignal} onOpen={() => onSectionFocus?.("shipping")} onClose={() => onSectionFocus?.(null)} />

        <FeeSection data={data} actions={actions} openSignal={sectionOpenSignal} onOpen={() => onSectionFocus?.("fee")} onClose={() => onSectionFocus?.(null)} />

        <ProcessTemplateSection data={data} actions={actions} openSignal={sectionOpenSignal} onOpen={() => onSectionFocus?.("process")} onClose={() => onSectionFocus?.(null)} />

        <OptionPresetSection data={data} actions={actions} openSignal={sectionOpenSignal} onOpen={() => onSectionFocus?.("option-preset")} onClose={() => onSectionFocus?.(null)} />
      </div>

      <LaborEquipmentSection data={data} actions={actions} openSignal={sectionOpenSignal} onOpen={() => onSectionFocus?.("labor")} onClose={() => onSectionFocus?.(null)} />

      <EquipmentSimulationSection data={data} openSignal={sectionOpenSignal} onOpen={() => onSectionFocus?.("equipment")} onClose={() => onSectionFocus?.(null)} />

      <ExchangeRateSection isAuthenticated={isAuthenticated} openSignal={sectionOpenSignal} onRefreshExchangeRates={onRefreshExchangeRates} onOpen={() => onSectionFocus?.("exchange-rate")} onClose={() => onSectionFocus?.(null)} />

      <MasterOverviewSection data={data} />
    </div>
  )
}
