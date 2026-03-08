"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import type { AppData } from "@/lib/types"

import { CostSummarySection } from "./sections/cost-summary-section"
import { DevelopmentEquipmentSection } from "./sections/development-equipment-section"
import { LaborOutsourcingSection } from "./sections/labor-outsourcing-section"
import { LogisticsElectricitySection } from "./sections/logistics-electricity-section"
import { PackagingCostSection } from "./sections/packaging-cost-section"
import { ProfitSimulationSection } from "./sections/profit-simulation-section"

interface CostTabProps {
  data: AppData
}

type CostSectionKey =
  | "summary"
  | "profitSimulation"
  | "packaging"
  | "laborOutsourcing"
  | "developmentEquipment"
  | "logisticsElectricity"

const defaultOpenState: Record<CostSectionKey, boolean> = {
  summary: true,
  profitSimulation: true,
  packaging: true,
  laborOutsourcing: true,
  developmentEquipment: true,
  logisticsElectricity: true,
}

const COST_TAB_OPEN_STATE_STORAGE_KEY = "cost-app-cost-tab-open-state"

const loadCostTabOpenState = (): Record<CostSectionKey, boolean> => {
  if (typeof window === "undefined") return defaultOpenState
  try {
    const raw = window.localStorage.getItem(COST_TAB_OPEN_STATE_STORAGE_KEY)
    if (!raw) return defaultOpenState
    const parsed = JSON.parse(raw) as Partial<Record<CostSectionKey, unknown>>
    return {
      summary: typeof parsed.summary === "boolean" ? parsed.summary : defaultOpenState.summary,
      profitSimulation: typeof parsed.profitSimulation === "boolean" ? parsed.profitSimulation : defaultOpenState.profitSimulation,
      packaging: typeof parsed.packaging === "boolean" ? parsed.packaging : defaultOpenState.packaging,
      laborOutsourcing: typeof parsed.laborOutsourcing === "boolean" ? parsed.laborOutsourcing : defaultOpenState.laborOutsourcing,
      developmentEquipment: typeof parsed.developmentEquipment === "boolean" ? parsed.developmentEquipment : defaultOpenState.developmentEquipment,
      logisticsElectricity: typeof parsed.logisticsElectricity === "boolean" ? parsed.logisticsElectricity : defaultOpenState.logisticsElectricity,
    }
  } catch {
    return defaultOpenState
  }
}

export function CostTab({ data }: CostTabProps) {
  const [openState, setOpenState] = useState<Record<CostSectionKey, boolean>>(() => loadCostTabOpenState())

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(COST_TAB_OPEN_STATE_STORAGE_KEY, JSON.stringify(openState))
  }, [openState])

  const setAllOpenState = (value: boolean) => {
    setOpenState({
      summary: value,
      profitSimulation: value,
      packaging: value,
      laborOutsourcing: value,
      developmentEquipment: value,
      logisticsElectricity: value,
    })
  }

  const toggleSection = (key: CostSectionKey) => {
    setOpenState((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const renderSectionToggle = (key: CostSectionKey, label: string) => (
    <div className="flex justify-end">
      <Button type="button" size="sm" variant="ghost" onClick={() => toggleSection(key)}>
        {label}を{openState[key] ? "閉じる" : "開く"}
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setAllOpenState(true)}>
          全て開く
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAllOpenState(false)}>
          全て閉じる
        </Button>
      </div>

      <div className="space-y-2">
        {renderSectionToggle("summary", "原価サマリ")}
        {openState.summary && <CostSummarySection data={data} />}
      </div>

      <div className="space-y-2">
        {renderSectionToggle("profitSimulation", "利益シミュレーション")}
        {openState.profitSimulation && <ProfitSimulationSection data={data} />}
      </div>

      <div className="space-y-2">
        {renderSectionToggle("packaging", "梱包コスト集計")}
        {openState.packaging && <PackagingCostSection data={data} />}
      </div>

      <div className="space-y-2">
        {renderSectionToggle("laborOutsourcing", "人件費・外注費集計")}
        {openState.laborOutsourcing && <LaborOutsourcingSection data={data} />}
      </div>

      <div className="space-y-2">
        {renderSectionToggle("developmentEquipment", "開発・設備コスト")}
        {openState.developmentEquipment && <DevelopmentEquipmentSection data={data} />}
      </div>

      <div className="space-y-2">
        {renderSectionToggle("logisticsElectricity", "物流・電力コスト")}
        {openState.logisticsElectricity && <LogisticsElectricitySection data={data} />}
      </div>
    </div>
  )
}
