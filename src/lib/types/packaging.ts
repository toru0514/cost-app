export type PackagingItem = {
  id: string
  name: string
  unit: string
  sizeDescription: string
  unitCost: number
  currency: string
  unitsPerBatch?: number
  note?: string
}

export type PackagingCostEntry = {
  id: string
  productId: string
  packagingItemId: string
  quantity: number
  costPerUnit: number
  currency: string
}

export type PackagingStock = {
  packagingItemId: string
  quantity: number
  stockUnit?: string
  updatedAt: string
}
