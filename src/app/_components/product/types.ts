export type NumericValue = number | ""

export type MaterialCostDraft = {
  id: string
  materialId: string
  usageRatio: number
  description: string
}

export type PackagingCostDraft = {
  id: string
  packagingItemId: string
  quantity: number
}

export type LaborCostDraft = {
  id: string
  laborRoleId: string
  hours: number
  peopleCount: number
  hourlyRateOverride?: number
  isAutoLinked?: boolean
}

export type OutsourcingCostDraft = {
  id: string
  note: string
  costPerUnit: NumericValue
  currency: string
}

export type DevelopmentCostDraft = {
  id: string
  title: string
  prototypeLaborCost: NumericValue
  prototypeMaterialCost: NumericValue
  toolingCost: NumericValue
  amortizationYears: number
}

export type EquipmentAllocationDraft = {
  id: string
  equipmentId: string
  allocationRatio: number
  annualQuantity: number
  usageHours: number
}

export type LogisticsCostDraft = {
  id: string
  shippingMethodId: string
}

export type ElectricityCostDraft = {
  id: string
  costPerUnit: NumericValue
  currency: string
}

export type FeeCostDraft = {
  id: string
  feeId: string
}
