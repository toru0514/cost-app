export type OutsourcingCostEntry = {
  id: string
  productId: string
  costPerUnit: number
  currency: string
  note?: string
}

export type DevelopmentCostEntry = {
  id: string
  productId: string
  title?: string
  prototypeLaborCost: number
  prototypeMaterialCost: number
  toolingCost: number
  amortizationYears: number
}

export type ElectricityCostEntry = {
  id: string
  productId: string
  costPerUnit: number
  currency: string
}
