export type LaborRole = {
  id: string
  name: string
  hourlyRate: number
  currency: string
  note?: string
}

export type LaborCostEntry = {
  id: string
  productId: string
  laborRoleId: string
  hours: number
  peopleCount: number
  hourlyRateOverride?: number
}
