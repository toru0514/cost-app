export type Fee = {
  id: string
  name: string
  ratePercent: number
  fixedAmount: number
  currency: string
  note?: string
}

export type FeeCostEntry = {
  id: string
  productId: string
  feeId: string
  ratePercent: number
  fixedAmount: number
  currency: string
}
