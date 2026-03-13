export type Equipment = {
  id: string
  name: string
  acquisitionCost: number
  currency: string
  amortizationYears: number
  utilizationRate?: number
  note?: string
  imageUrl?: string
}

export type EquipmentAllocationEntry = {
  id: string
  productId: string
  equipmentId: string
  allocationRatio: number
  annualQuantity: number
  usageHours?: number
}
