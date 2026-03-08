"use client"

import { useEffect, useState } from "react"
import { Activity, Boxes, Layers3 } from "lucide-react"

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
  const totalCostEntries = Object.values(data.costEntries).reduce((sum, list) => sum + list.length, 0)
  const registeredProducts = data.products.length
  const totalMasterCount =
    data.materials.length +
    data.packagingItems.length +
    data.laborRoles.length +
    data.equipments.length +
    data.shippingMethods.length +
    data.fees.length

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
    <div className="cost-section-toggle">
      <Button type="button" size="sm" variant="ghost" onClick={() => toggleSection(key)}>
        {label}を{openState[key] ? "閉じる" : "開く"}
      </Button>
    </div>
  )

  return (
    <div className="cost-ux space-y-6">
      <section className="cost-hero">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Cost Studio</p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">原価サマリ</h1>
          <p className="text-sm text-muted-foreground md:text-base">カテゴリ別の積み上げと合計を、テーブル中心で確認します。</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="cost-hero-stat">
            <Activity className="h-4 w-4" />
            <span>コスト明細</span>
            <strong>{totalCostEntries}件</strong>
          </div>
          <div className="cost-hero-stat">
            <Layers3 className="h-4 w-4" />
            <span>商品</span>
            <strong>{registeredProducts}件</strong>
          </div>
          <div className="cost-hero-stat">
            <Boxes className="h-4 w-4" />
            <span>関連マスタ</span>
            <strong>{totalMasterCount}件</strong>
          </div>
        </div>
      </section>

      <section className="cost-control-panel">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setAllOpenState(true)}>
            全て開く
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setAllOpenState(false)}>
            全て閉じる
          </Button>
        </div>
      </section>

      <div className="cost-section-block space-y-3">
        <div className="cost-section-heading">
          <h2>原価サマリ</h2>
          {renderSectionToggle("summary", "表示")}
        </div>
        {openState.summary && <CostSummarySection data={data} />}
      </div>

      <div className="cost-section-block space-y-3">
        <div className="cost-section-heading">
          <h2>利益シミュレーション</h2>
          {renderSectionToggle("profitSimulation", "表示")}
        </div>
        {openState.profitSimulation && <ProfitSimulationSection data={data} />}
      </div>

      <div className="cost-section-block space-y-3">
        <div className="cost-section-heading">
          <h2>梱包コスト集計</h2>
          {renderSectionToggle("packaging", "表示")}
        </div>
        {openState.packaging && <PackagingCostSection data={data} />}
      </div>

      <div className="cost-section-block space-y-3">
        <div className="cost-section-heading">
          <h2>人件費・外注費集計</h2>
          {renderSectionToggle("laborOutsourcing", "表示")}
        </div>
        {openState.laborOutsourcing && <LaborOutsourcingSection data={data} />}
      </div>

      <div className="cost-section-block space-y-3">
        <div className="cost-section-heading">
          <h2>開発・設備コスト</h2>
          {renderSectionToggle("developmentEquipment", "表示")}
        </div>
        {openState.developmentEquipment && <DevelopmentEquipmentSection data={data} />}
      </div>

      <div className="cost-section-block space-y-3">
        <div className="cost-section-heading">
          <h2>物流・電力コスト</h2>
          {renderSectionToggle("logisticsElectricity", "表示")}
        </div>
        {openState.logisticsElectricity && <LogisticsElectricitySection data={data} />}
      </div>
    </div>
  )
}
