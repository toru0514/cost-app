import type { AuditLog } from "../types"

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export type CategoryLargeRow = { id: string; name: string; description: string | null }
export type CategoryMediumRow = CategoryLargeRow & { large_id: string | null }
export type CategorySmallRow = CategoryLargeRow & { medium_id: string | null }
export type MaterialRow = {
  id: string
  name: string
  unit: string | null
  size_description: string | null
  currency: string | null
  unit_cost: number | null
  use_percentage_mode: boolean | null
  supplier: string | null
  note: string | null
  units_per_batch: number | null
  image_url: string | null
}
export type PackagingRow = MaterialRow
export type ShippingMethodRow = {
  id: string
  name: string
  description: string | null
  unit_cost: number | null
  currency: string | null
  note: string | null
}
export type LaborRoleRow = {
  id: string
  name: string
  hourly_rate: number | null
  currency: string | null
  note: string | null
}
export type EquipmentRow = {
  id: string
  name: string
  acquisition_cost: number | null
  currency: string | null
  amortization_years: number | null
  utilization_rate: number | null
  note: string | null
  image_url: string | null
}
export type FeeRow = {
  id: string
  name: string
  rate_percent: number | null
  fixed_amount: number | null
  currency: string | null
  note: string | null
}
export type OptionPresetRow = { id: string; name: string; variants: JsonValue | null }
export type ProductRow = {
  id: string
  name: string
  category_large_id: string | null
  category_medium_id: string | null
  category_small_id: string | null
  size_variants: JsonValue | null
  base_man_hours: number | null
  default_electricity_cost: number | null
  sale_price: number | null
  registered_at: string | null
  notes: string | null
  production_lot_size: number | null
  expected_production_period_years: number | null
  expected_production_quantity: number | null
  equipment_ids: string[] | null
  image_url: string | null
  status: string | null
}

export type MaterialCostRow = {
  id: string
  product_id: string
  material_id: string
  description: string | null
  usage_ratio: number | null
  cost_per_unit: number | null
  currency: string | null
}
export type PackagingCostRow = {
  id: string
  product_id: string
  packaging_item_id: string
  quantity: number | null
  cost_per_unit: number | null
  currency: string | null
}
export type LaborCostRow = {
  id: string
  product_id: string
  labor_role_id: string
  hours: number | null
  people_count: number | null
  hourly_rate_override: number | null
}
export type OutsourcingCostRow = {
  id: string
  product_id: string
  cost_per_unit: number | null
  currency: string | null
  note: string | null
}
export type DevelopmentCostRow = {
  id: string
  product_id: string
  title: string | null
  prototype_labor_cost: number | null
  prototype_material_cost: number | null
  tooling_cost: number | null
  amortization_years: number | null
}
export type EquipmentAllocationRow = {
  id: string
  product_id: string
  equipment_id: string
  allocation_ratio: number | null
  annual_quantity: number | null
  usage_hours: number | null
}
export type LogisticsCostRow = {
  id: string
  product_id: string
  shipping_method_id: string
  cost_per_unit: number | null
  currency: string | null
}
export type ElectricityCostRow = {
  id: string
  product_id: string
  cost_per_unit: number | null
  currency: string | null
}
export type FeeCostRow = {
  id: string
  product_id: string
  fee_id: string
  rate_percent: number | null
  fixed_amount: number | null
  currency: string | null
}

export type AuditLogRow = {
  id: string
  user_id: string
  created_at: string
  device_info: string | null
  metadata: AuditLog["metadata"] | null
}

export type ProductStockRow = {
  product_id: string
  quantity: number
  updated_at: string
}

export type MaterialStockRow = { material_id: string; quantity: number; stock_unit: string | null; updated_at: string }

export type PackagingStockRow = { packaging_item_id: string; quantity: number; stock_unit: string | null; updated_at: string }

export type ProductListColumnSettingsRow = {
  column_order: string[] | null
  hidden_columns: string[] | null
}

export type TabOrderSettingsRow = {
  tab_order: string[] | null
}

export type StockAlertSettingRow = {
  item_type: string
  item_id: string
  enabled: boolean
  threshold: number
}
