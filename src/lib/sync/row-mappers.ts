import type {
  CategoryLarge,
  CategoryMedium,
  CategorySmall,
  Material,
  PackagingItem,
  ShippingMethod,
  LaborRole,
  Equipment,
  Fee,
  OptionPreset,
  Product,
  MaterialCostEntry,
  PackagingCostEntry,
  LaborCostEntry,
  OutsourcingCostEntry,
  DevelopmentCostEntry,
  EquipmentAllocationEntry,
  LogisticsCostEntry,
  ElectricityCostEntry,
  FeeCostEntry,
  AuditLog,
} from "../types"
import type {
  CategoryLargeRow,
  CategoryMediumRow,
  CategorySmallRow,
  MaterialRow,
  PackagingRow,
  ShippingMethodRow,
  LaborRoleRow,
  EquipmentRow,
  FeeRow,
  OptionPresetRow,
  ProductRow,
  MaterialCostRow,
  PackagingCostRow,
  LaborCostRow,
  OutsourcingCostRow,
  DevelopmentCostRow,
  EquipmentAllocationRow,
  LogisticsCostRow,
  ElectricityCostRow,
  FeeCostRow,
  AuditLogRow,
} from "./row-types"

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

export const mapLarge = (row: CategoryLargeRow): CategoryLarge => ({
  id: row.id,
  name: row.name,
  description: row.description ?? undefined,
})

export const mapMedium = (row: CategoryMediumRow): CategoryMedium => ({
  id: row.id,
  name: row.name,
  description: row.description ?? undefined,
  largeId: row.large_id ?? "",
})

export const mapSmall = (row: CategorySmallRow): CategorySmall => ({
  id: row.id,
  name: row.name,
  description: row.description ?? undefined,
  mediumId: row.medium_id ?? "",
})

export const mapMaterial = (row: MaterialRow): Material => ({
  id: row.id,
  name: row.name,
  unit: row.unit ?? "",
  sizeDescription: row.size_description ?? "",
  currency: row.currency ?? "JPY",
  unitCost: Number(row.unit_cost ?? 0),
  usePercentageMode: Boolean(row.use_percentage_mode ?? false),
  supplier: row.supplier ?? undefined,
  note: row.note ?? undefined,
  unitsPerBatch: row.units_per_batch ?? undefined,
  imageUrl: row.image_url ?? undefined,
})

export const mapPackaging = (row: PackagingRow): PackagingItem => ({
  id: row.id,
  name: row.name,
  unit: row.unit ?? "",
  sizeDescription: row.size_description ?? "",
  currency: row.currency ?? "JPY",
  unitCost: Number(row.unit_cost ?? 0),
  note: row.note ?? undefined,
  unitsPerBatch: row.units_per_batch ?? undefined,
  imageUrl: row.image_url ?? undefined,
})

export const mapShipping = (row: ShippingMethodRow): ShippingMethod => ({
  id: row.id,
  name: row.name,
  unitCost: Number(row.unit_cost ?? 0),
  currency: row.currency ?? "JPY",
  note: row.note ?? undefined,
  description: row.description ?? undefined,
})

export const mapLabor = (row: LaborRoleRow): LaborRole => ({
  id: row.id,
  name: row.name,
  hourlyRate: Number(row.hourly_rate ?? 0),
  currency: row.currency ?? "JPY",
  note: row.note ?? undefined,
})

export const mapEquipment = (row: EquipmentRow): Equipment => ({
  id: row.id,
  name: row.name,
  acquisitionCost: Number(row.acquisition_cost ?? 0),
  currency: row.currency ?? "JPY",
  amortizationYears: Number(row.amortization_years ?? 1),
  utilizationRate: Number(row.utilization_rate ?? 100),
  note: row.note ?? undefined,
  imageUrl: row.image_url ?? undefined,
})

export const mapFee = (row: FeeRow): Fee => ({
  id: row.id,
  name: row.name,
  ratePercent: Number(row.rate_percent ?? 0),
  fixedAmount: Number(row.fixed_amount ?? 0),
  currency: row.currency ?? "JPY",
  note: row.note ?? undefined,
})

export const mapOptionPreset = (row: OptionPresetRow): OptionPreset => ({
  id: row.id,
  name: row.name,
  variants: asArray(row.variants) as OptionPreset["variants"],
})

export const mapProduct = (row: ProductRow): Product => ({
  id: row.id,
  name: row.name,
  categoryLargeId: row.category_large_id ?? undefined,
  categoryMediumId: row.category_medium_id ?? undefined,
  categorySmallId: row.category_small_id ?? undefined,
  sizeVariants: asArray(row.size_variants) as Product["sizeVariants"],
  baseManHours: Number(row.base_man_hours ?? 0),
  defaultElectricityCost: Number(row.default_electricity_cost ?? 0),
  salePrice: Number(row.sale_price ?? 0),
  registeredAt: row.registered_at ?? new Date().toISOString(),
  notes: row.notes ?? undefined,
  productionLotSize: Number(row.production_lot_size ?? 1),
  expectedProduction: {
    periodYears: Number(row.expected_production_period_years ?? 1),
    quantity: Number(row.expected_production_quantity ?? 1),
  },
  equipmentIds: Array.isArray(row.equipment_ids) ? row.equipment_ids : [],
  imageUrl: row.image_url ?? undefined,
  status: (row.status as Product["status"]) ?? "active",
})

export const mapMaterialEntry = (row: MaterialCostRow): MaterialCostEntry => ({
  id: row.id,
  productId: row.product_id,
  materialId: row.material_id,
  description: row.description ?? undefined,
  usageRatio: row.usage_ratio ?? undefined,
  costPerUnit: Number(row.cost_per_unit ?? 0),
  currency: row.currency ?? "JPY",
})

export const mapPackagingEntry = (row: PackagingCostRow): PackagingCostEntry => ({
  id: row.id,
  productId: row.product_id,
  packagingItemId: row.packaging_item_id,
  quantity: Number(row.quantity ?? 0),
  costPerUnit: Number(row.cost_per_unit ?? 0),
  currency: row.currency ?? "JPY",
})

export const mapLaborEntry = (row: LaborCostRow): LaborCostEntry => ({
  id: row.id,
  productId: row.product_id,
  laborRoleId: row.labor_role_id,
  hours: Number(row.hours ?? 0),
  peopleCount: Number(row.people_count ?? 0),
  hourlyRateOverride: row.hourly_rate_override ?? undefined,
})

export const mapOutsourcingEntry = (row: OutsourcingCostRow): OutsourcingCostEntry => ({
  id: row.id,
  productId: row.product_id,
  costPerUnit: Number(row.cost_per_unit ?? 0),
  currency: row.currency ?? "JPY",
  note: row.note ?? undefined,
})

export const mapDevelopmentEntry = (row: DevelopmentCostRow): DevelopmentCostEntry => ({
  id: row.id,
  productId: row.product_id,
  title: row.title ?? undefined,
  prototypeLaborCost: Number(row.prototype_labor_cost ?? 0),
  prototypeMaterialCost: Number(row.prototype_material_cost ?? 0),
  toolingCost: Number(row.tooling_cost ?? 0),
  amortizationYears: Number(row.amortization_years ?? 1),
})

export const mapEquipmentEntry = (row: EquipmentAllocationRow): EquipmentAllocationEntry => ({
  id: row.id,
  productId: row.product_id,
  equipmentId: row.equipment_id,
  allocationRatio: Number(row.allocation_ratio ?? 0),
  annualQuantity: Number(row.annual_quantity ?? 0),
  usageHours: row.usage_hours ?? undefined,
})

export const mapLogisticsEntry = (row: LogisticsCostRow): LogisticsCostEntry => ({
  id: row.id,
  productId: row.product_id,
  shippingMethodId: row.shipping_method_id,
  costPerUnit: Number(row.cost_per_unit ?? 0),
  currency: row.currency ?? "JPY",
})

export const mapElectricEntry = (row: ElectricityCostRow): ElectricityCostEntry => ({
  id: row.id,
  productId: row.product_id,
  costPerUnit: Number(row.cost_per_unit ?? 0),
  currency: row.currency ?? "JPY",
})

export const mapFeeEntry = (row: FeeCostRow): FeeCostEntry => ({
  id: row.id,
  productId: row.product_id,
  feeId: row.fee_id,
  ratePercent: Number(row.rate_percent ?? 0),
  fixedAmount: Number(row.fixed_amount ?? 0),
  currency: row.currency ?? "JPY",
})

export const mapAuditLog = (row: AuditLogRow): AuditLog => ({
  id: row.id,
  userId: row.user_id,
  createdAt: row.created_at,
  deviceInfo: row.device_info ?? undefined,
  metadata: row.metadata ?? undefined,
})
