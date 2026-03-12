export type ProductSizeVariant = {
  label: string
  quantity: number
}

export type Product = {
  id: string
  name: string
  categoryLargeId?: string | null
  categoryMediumId?: string | null
  categorySmallId?: string | null
  sizeVariants: ProductSizeVariant[]
  baseManHours: number
  defaultElectricityCost: number
  salePrice: number
  registeredAt: string
  notes?: string
  productionLotSize: number
  expectedProduction: {
    periodYears: number
    quantity: number
  }
  equipmentIds: string[]
}

export type OptionPreset = {
  id: string
  name: string
  variants: ProductSizeVariant[]
}

export type ProductStock = {
  productId: string
  quantity: number
  updatedAt: string
}
