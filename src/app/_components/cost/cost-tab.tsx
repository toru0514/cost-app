"use client"

import type { AppData } from "@/lib/types"

import { CostSummarySection } from "./sections/cost-summary-section"
import { DevelopmentEquipmentSection } from "./sections/development-equipment-section"
import { LaborOutsourcingSection } from "./sections/labor-outsourcing-section"
import { LogisticsElectricitySection } from "./sections/logistics-electricity-section"
import { MaterialUsageSection } from "./sections/material-usage-section"
import { PackagingCostSection } from "./sections/packaging-cost-section"
import { ProfitSimulationSection } from "./sections/profit-simulation-section"

interface CostTabProps {
  data: AppData
}

export function CostTab({ data }: CostTabProps) {
  return (
    <div className="space-y-6">
      <CostSummarySection data={data} />

      <ProfitSimulationSection data={data} />

      <MaterialUsageSection data={data} />

      <PackagingCostSection data={data} />

      <LaborOutsourcingSection data={data} />

      <DevelopmentEquipmentSection data={data} />

      <LogisticsElectricitySection data={data} />
    </div>
  )
}
