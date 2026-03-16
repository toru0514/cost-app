"use client"

import { useEffect, useState } from "react"

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { AppData } from "@/lib/types"

import { CostSummarySection } from "./sections/cost-summary-section"
import { CostVarianceSimulationSection } from "./sections/cost-variance-simulation-section"
import { DevelopmentCostSection } from "./sections/development-cost-section"
import { ElectricityCostSection } from "./sections/electricity-cost-section"
import { EquipmentAllocationSection } from "./sections/equipment-allocation-section"
import { FeesCostSection } from "./sections/fees-cost-section"
import { LaborCostSection } from "./sections/labor-cost-section"
import { MaterialCostSection } from "./sections/material-cost-section"
import { LogisticsCostSection } from "./sections/logistics-cost-section"
import { OutsourcingCostSection } from "./sections/outsourcing-cost-section"
import { PackagingCostSection } from "./sections/packaging-cost-section"
import { ProfitSimulationSection } from "./sections/profit-simulation-section"

interface CostTabProps {
  data: AppData
  exchangeRateMap?: Map<string, number>
}

type CostSectionKey =
  | "summary"
  | "costVarianceSimulation"
  | "profitSimulation"
  | "material"
  | "packaging"
  | "labor"
  | "outsourcing"
  | "development"
  | "equipment"
  | "logistics"
  | "electricity"
  | "fees"

const defaultOpenState: Record<CostSectionKey, boolean> = {
  summary: true,
  costVarianceSimulation: true,
  profitSimulation: true,
  material: true,
  packaging: true,
  labor: true,
  outsourcing: true,
  development: true,
  equipment: true,
  logistics: true,
  electricity: true,
  fees: true,
}

const COST_TAB_OPEN_STATE_STORAGE_KEY = "cost-app-cost-tab-open-state"

const loadCostTabOpenState = (): Record<CostSectionKey, boolean> => {
  if (typeof window === "undefined") return defaultOpenState
  try {
    const raw = window.localStorage.getItem(COST_TAB_OPEN_STATE_STORAGE_KEY)
    if (!raw) return defaultOpenState
    const parsed = JSON.parse(raw) as Partial<Record<string, unknown>>
    const result = { ...defaultOpenState }
    for (const key of Object.keys(defaultOpenState) as CostSectionKey[]) {
      if (typeof parsed[key] === "boolean") {
        result[key] = parsed[key]
      }
    }
    return result
  } catch {
    return defaultOpenState
  }
}

export function CostTab({ data, exchangeRateMap }: CostTabProps) {
  const [openState, setOpenState] = useState<Record<CostSectionKey, boolean>>(() => loadCostTabOpenState())

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(COST_TAB_OPEN_STATE_STORAGE_KEY, JSON.stringify(openState))
  }, [openState])

  const setAllOpenState = (value: boolean) => {
    const next = {} as Record<CostSectionKey, boolean>
    for (const key of Object.keys(defaultOpenState) as CostSectionKey[]) {
      next[key] = value
    }
    setOpenState(next)
  }

  const toggleSection = (key: CostSectionKey) => {
    setOpenState((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const renderSectionToggle = (key: CostSectionKey, label: string) => (
    <div
      className="cost-section-toggle flex items-center justify-between cursor-pointer select-none rounded-md px-2 py-1 hover:bg-muted/50"
      role="button"
      tabIndex={0}
      aria-expanded={openState[key]}
      onClick={() => toggleSection(key)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          toggleSection(key)
        }
      }}
    >
      <h3 className="text-sm font-semibold">{label}</h3>
      <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 pointer-events-none" aria-hidden="true">
        {openState[key] ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
      </Button>
    </div>
  )

  return (
    <div className="cost-ux space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">原価サマリ</h1>
          <p className="text-muted-foreground">カテゴリ別の積み上げと合計を確認できます</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setAllOpenState(true)}>
            全て開く
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setAllOpenState(false)}>
            全て閉じる
          </Button>
        </div>
      </div>

      <div className="cost-section-block min-w-0 space-y-3 overflow-hidden">
        {renderSectionToggle("summary", "原価サマリ")}
        {openState.summary && <CostSummarySection data={data} exchangeRateMap={exchangeRateMap} />}
      </div>

      <div className="cost-section-block min-w-0 space-y-3 overflow-hidden">
        {renderSectionToggle("costVarianceSimulation", "原価変動シミュレーション")}
        {openState.costVarianceSimulation && <CostVarianceSimulationSection data={data} exchangeRateMap={exchangeRateMap} />}
      </div>

      <div className="cost-section-block min-w-0 space-y-3 overflow-hidden">
        {renderSectionToggle("profitSimulation", "利益シミュレーション")}
        {openState.profitSimulation && <ProfitSimulationSection data={data} exchangeRateMap={exchangeRateMap} />}
      </div>

      <div className="cost-section-block min-w-0 space-y-3 overflow-hidden">
        {renderSectionToggle("material", "材料費集計")}
        {openState.material && <MaterialCostSection data={data} />}
      </div>

      <div className="cost-section-block min-w-0 space-y-3 overflow-hidden">
        {renderSectionToggle("packaging", "梱包コスト集計")}
        {openState.packaging && <PackagingCostSection data={data} />}
      </div>

      <div className="cost-section-block min-w-0 space-y-3 overflow-hidden">
        {renderSectionToggle("labor", "人件費")}
        {openState.labor && <LaborCostSection data={data} />}
      </div>

      <div className="cost-section-block min-w-0 space-y-3 overflow-hidden">
        {renderSectionToggle("outsourcing", "外注費")}
        {openState.outsourcing && <OutsourcingCostSection data={data} />}
      </div>

      <div className="cost-section-block min-w-0 space-y-3 overflow-hidden">
        {renderSectionToggle("development", "開発コスト")}
        {openState.development && <DevelopmentCostSection data={data} />}
      </div>

      <div className="cost-section-block min-w-0 space-y-3 overflow-hidden">
        {renderSectionToggle("equipment", "設備配賦")}
        {openState.equipment && <EquipmentAllocationSection data={data} />}
      </div>

      <div className="cost-section-block min-w-0 space-y-3 overflow-hidden">
        {renderSectionToggle("logistics", "物流・配送費")}
        {openState.logistics && <LogisticsCostSection data={data} />}
      </div>

      <div className="cost-section-block min-w-0 space-y-3 overflow-hidden">
        {renderSectionToggle("electricity", "電気代")}
        {openState.electricity && <ElectricityCostSection data={data} />}
      </div>

      <div className="cost-section-block min-w-0 space-y-3 overflow-hidden">
        {renderSectionToggle("fees", "販売・決済手数料")}
        {openState.fees && <FeesCostSection data={data} />}
      </div>
    </div>
  )
}
