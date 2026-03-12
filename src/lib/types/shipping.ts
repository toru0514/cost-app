export type ShippingMethod = {
  id: string
  name: string
  description?: string
  unitCost: number
  currency: string
  note?: string
}

export type LogisticsCostEntry = {
  id: string
  productId: string
  shippingMethodId: string
  costPerUnit: number
  currency: string
}
