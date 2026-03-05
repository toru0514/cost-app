export type BulkSyncEntity =
  | "categories_large"
  | "categories_medium"
  | "categories_small"
  | "materials"
  | "packaging_items"
  | "shipping_methods"
  | "labor_roles"
  | "equipments"
  | "fees"
  | "option_presets"
  | "products"

export type BulkSyncPayload = {
  categories_large?: CategoryLargeInput[]
  categories_medium?: CategoryMediumInput[]
  categories_small?: CategorySmallInput[]
  materials?: MaterialInput[]
  packaging_items?: PackagingInput[]
  shipping_methods?: ShippingMethodInput[]
  labor_roles?: LaborRoleInput[]
  equipments?: EquipmentInput[]
  fees?: FeeInput[]
  option_presets?: OptionPresetInput[]
  products?: ProductInput[]
}

export type CategoryLargeInput = {
  id?: string
  name?: string
  description?: string
  is_deleted?: boolean
}

export type CategoryMediumInput = {
  id?: string
  large_id?: string
  large_name?: string
  name?: string
  description?: string
  is_deleted?: boolean
}

export type CategorySmallInput = {
  id?: string
  medium_id?: string
  large_name?: string
  medium_name?: string
  name?: string
  description?: string
  is_deleted?: boolean
}

export type MaterialInput = {
  id?: string
  name?: string
  unit?: string
  size_description?: string
  currency?: string
  unit_cost?: number | string
  units_per_batch?: number | string
  supplier?: string
  note?: string
  stock?: number | string
  is_deleted?: boolean
}

export type PackagingInput = {
  id?: string
  name?: string
  unit?: string
  size_description?: string
  currency?: string
  unit_cost?: number | string
  units_per_batch?: number | string
  note?: string
  stock?: number | string
  is_deleted?: boolean
}

export type ShippingMethodInput = {
  id?: string
  name?: string
  description?: string
  unit_cost?: number | string
  currency?: string
  note?: string
  is_deleted?: boolean
}

export type LaborRoleInput = {
  id?: string
  name?: string
  hourly_rate?: number | string
  currency?: string
  note?: string
  is_deleted?: boolean
}

export type EquipmentInput = {
  id?: string
  name?: string
  acquisition_cost?: number | string
  currency?: string
  amortization_years?: number | string
  utilization_rate?: number | string
  note?: string
  is_deleted?: boolean
}

export type FeeInput = {
  id?: string
  name?: string
  rate_percent?: number | string
  fixed_amount?: number | string
  currency?: string
  note?: string
  is_deleted?: boolean
}

export type OptionPresetInput = {
  id?: string
  name?: string
  variants?: unknown
  is_deleted?: boolean
}

export type ProductInput = {
  id?: string
  product_name?: string
  category_large?: string
  category_medium?: string
  category_small?: string
  sale_price?: number | string
  base_man_hours?: number | string
  expected_period_years?: number | string
  expected_quantity?: number | string
  size_variants?: unknown
  default_electricity_cost?: number | string
  production_lot_size?: number | string
  equipment_names?: string
  notes?: string
  stock?: number | string
  is_deleted?: boolean
}

export type ValidationIssue = {
  entity: BulkSyncEntity
  key: string
  field?: string
  message: string
  severity: "error" | "warning"
}

export type NormalizedRecord = {
  entity: BulkSyncEntity
  id?: string
  naturalKey: string
  isDeleted: boolean
  data: Record<string, unknown>
  rowIndex?: number
}

export type NormalizedPayload = Record<BulkSyncEntity, NormalizedRecord[]>

export type DiffSummary = {
  total: number
  create: number
  update: number
  delete: number
}

export type DiffItem = {
  entity: BulkSyncEntity
  operation: "create" | "update" | "delete"
  issueOnly?: boolean
  key: {
    id?: string
    naturalKey: string
  }
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  issues: ValidationIssue[]
}

export type DiffResult = {
  summary: DiffSummary
  items: DiffItem[]
}
