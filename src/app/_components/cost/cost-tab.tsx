"use client"

import { useEffect, useState } from "react"

import Accordion from "@mui/material/Accordion"
import AccordionSummary from "@mui/material/AccordionSummary"
import AccordionDetails from "@mui/material/AccordionDetails"
import Button from "@mui/material/Button"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"

import type { AppData } from "@/lib/types"

import { CostSummarySection } from "./sections/cost-summary-section"
import { CostVarianceSimulationSection } from "./sections/cost-variance-simulation-section"
import { DevelopmentCostSection } from "./sections/development-cost-section"
import { ElectricityCostSection } from "./sections/electricity-cost-section"
import { EquipmentAllocationSection } from "./sections/equipment-allocation-section"
import { FeesCostSection } from "./sections/fees-cost-section"
import { LaborCostSection } from "./sections/labor-cost-section"
import { LogisticsCostSection } from "./sections/logistics-cost-section"
import { MaterialCostSection } from "./sections/material-cost-section"
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

const sectionLabels: Record<CostSectionKey, string> = {
  summary: "原価サマリ",
  costVarianceSimulation: "原価変動シミュレーション",
  profitSimulation: "利益シミュレーション",
  material: "材料費集計",
  packaging: "梱包コスト集計",
  labor: "人件費",
  outsourcing: "外注費",
  development: "開発コスト",
  equipment: "設備配賦",
  logistics: "物流・配送費",
  electricity: "電気代",
  fees: "販売・決済手数料",
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

  const sections: { key: CostSectionKey; content: React.ReactNode }[] = [
    { key: "summary", content: <CostSummarySection data={data} exchangeRateMap={exchangeRateMap} /> },
    { key: "costVarianceSimulation", content: <CostVarianceSimulationSection data={data} exchangeRateMap={exchangeRateMap} /> },
    { key: "profitSimulation", content: <ProfitSimulationSection data={data} exchangeRateMap={exchangeRateMap} /> },
    { key: "material", content: <MaterialCostSection data={data} /> },
    { key: "packaging", content: <PackagingCostSection data={data} /> },
    { key: "labor", content: <LaborCostSection data={data} /> },
    { key: "outsourcing", content: <OutsourcingCostSection data={data} /> },
    { key: "development", content: <DevelopmentCostSection data={data} /> },
    { key: "equipment", content: <EquipmentAllocationSection data={data} /> },
    { key: "logistics", content: <LogisticsCostSection data={data} /> },
    { key: "electricity", content: <ElectricityCostSection data={data} /> },
    { key: "fees", content: <FeesCostSection data={data} /> },
  ]

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            原価サマリ
          </Typography>
          <Typography variant="body2" color="text.secondary">
            カテゴリ別の積み上げと合計を確認できます
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" size="small" onClick={() => setAllOpenState(true)}>
            全て開く
          </Button>
          <Button size="small" onClick={() => setAllOpenState(false)}>
            全て閉じる
          </Button>
        </Box>
      </Box>

      {sections.map(({ key, content }) => (
        <Accordion
          key={key}
          expanded={openState[key]}
          onChange={() => toggleSection(key)}
          disableGutters
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600} variant="body2">
              {sectionLabels[key]}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>{content}</AccordionDetails>
        </Accordion>
      ))}
    </Box>
  )
}
