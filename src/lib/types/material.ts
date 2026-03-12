export type Material = {
  id: string
  name: string
  unit: string
  sizeDescription: string
  currency: string
  unitCost: number
  unitsPerBatch?: number
  usePercentageMode?: boolean
  supplier?: string
  note?: string
}

export type MaterialCostEntry = {
  id: string
  productId: string
  materialId: string
  description?: string
  usageRatio?: number
  costPerUnit: number
  currency: string
}

export type MaterialStock = {
  materialId: string
  quantity: number
  stockUnit?: string
  updatedAt: string
}
