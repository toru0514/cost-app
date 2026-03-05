import { supabaseClient } from "./supabase-client"
import type {
  AppData,
  AuditLog,
  MaterialStock,
  PackagingStock,
  ProductStock,
  CategoryLarge,
  CategoryMedium,
  CategorySmall,
  Material,
  PackagingItem,
  ShippingMethod,
  LaborRole,
  Equipment,
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
  Fee,
  FeeCostEntry,
} from "./types"
import { emptyAppData } from "./types"

const TABLES = {
  categories: {
    large: "categories_large",
    medium: "categories_medium",
    small: "categories_small",
  },
  materials: "materials",
  packaging: "packaging_items",
  shipping: "shipping_methods",
  labor: "labor_roles",
  equipments: "equipments",
  fees: "fees",
  optionPresets: "option_presets",
  products: "products",
  costEntries: {
    materials: "cost_entries_materials",
    packaging: "cost_entries_packaging",
    labor: "cost_entries_labor",
    outsourcing: "cost_entries_outsourcing",
    development: "cost_entries_development",
    equipment: "cost_entries_equipment",
    logistics: "cost_entries_logistics",
    electricity: "cost_entries_electricity",
    fees: "cost_entries_fees",
  },
} as const

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

type CategoryLargeRow = { id: string; name: string; description: string | null }
type CategoryMediumRow = CategoryLargeRow & { large_id: string | null }
type CategorySmallRow = CategoryLargeRow & { medium_id: string | null }
type MaterialRow = {
  id: string
  name: string
  unit: string | null
  size_description: string | null
  currency: string | null
  unit_cost: number | null
  supplier: string | null
  note: string | null
  units_per_batch: number | null
}
type PackagingRow = MaterialRow
type ShippingMethodRow = {
  id: string
  name: string
  description: string | null
  unit_cost: number | null
  currency: string | null
  note: string | null
}
type LaborRoleRow = {
  id: string
  name: string
  hourly_rate: number | null
  currency: string | null
  note: string | null
}
type EquipmentRow = {
  id: string
  name: string
  acquisition_cost: number | null
  currency: string | null
  amortization_years: number | null
  utilization_rate: number | null
  note: string | null
}
type FeeRow = {
  id: string
  name: string
  rate_percent: number | null
  fixed_amount: number | null
  currency: string | null
  note: string | null
}
type OptionPresetRow = { id: string; name: string; variants: JsonValue | null }
type ProductRow = {
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
}

type MaterialCostRow = {
  id: string
  product_id: string
  material_id: string
  description: string | null
  usage_ratio: number | null
  cost_per_unit: number | null
  currency: string | null
}
type PackagingCostRow = {
  id: string
  product_id: string
  packaging_item_id: string
  quantity: number | null
  cost_per_unit: number | null
  currency: string | null
}
type LaborCostRow = {
  id: string
  product_id: string
  labor_role_id: string
  hours: number | null
  people_count: number | null
  hourly_rate_override: number | null
}
type OutsourcingCostRow = {
  id: string
  product_id: string
  cost_per_unit: number | null
  currency: string | null
  note: string | null
}
type DevelopmentCostRow = {
  id: string
  product_id: string
  title: string | null
  prototype_labor_cost: number | null
  prototype_material_cost: number | null
  tooling_cost: number | null
  amortization_years: number | null
}
type EquipmentAllocationRow = {
  id: string
  product_id: string
  equipment_id: string
  allocation_ratio: number | null
  annual_quantity: number | null
  usage_hours: number | null
}
type LogisticsCostRow = {
  id: string
  product_id: string
  shipping_method_id: string
  cost_per_unit: number | null
  currency: string | null
}
type ElectricityCostRow = {
  id: string
  product_id: string
  cost_per_unit: number | null
  currency: string | null
}
type FeeCostRow = {
  id: string
  product_id: string
  fee_id: string
  rate_percent: number | null
  fixed_amount: number | null
  currency: string | null
}

type AuditLogRow = {
  id: string
  user_id: string
  created_at: string
  device_info: string | null
  metadata: AuditLog["metadata"] | null
}

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

async function fetchRows<T>(table: string, userId: string): Promise<T[]> {
  const { data, error } = await supabaseClient.from(table).select("*").eq("user_id", userId)
  if (error) throw error
  return (data as T[]) ?? []
}

export async function loadUserAppData(userId: string): Promise<AppData | null> {
  try {
    const [
      large,
      medium,
      small,
      materials,
      packaging,
    shipping,
    labor,
    equipments,
    fees,
    optionPresets,
    products,
    costMaterials,
      costPackaging,
      costLabor,
      costOutsourcing,
    costDevelopment,
    costEquipment,
    costLogistics,
    costElectricity,
    costFees,
  ] = await Promise.all([
    fetchRows<CategoryLargeRow>(TABLES.categories.large, userId),
    fetchRows<CategoryMediumRow>(TABLES.categories.medium, userId),
    fetchRows<CategorySmallRow>(TABLES.categories.small, userId),
    fetchRows<MaterialRow>(TABLES.materials, userId),
    fetchRows<PackagingRow>(TABLES.packaging, userId),
    fetchRows<ShippingMethodRow>(TABLES.shipping, userId),
    fetchRows<LaborRoleRow>(TABLES.labor, userId),
    fetchRows<EquipmentRow>(TABLES.equipments, userId),
    fetchRows<FeeRow>(TABLES.fees, userId),
    fetchRows<OptionPresetRow>(TABLES.optionPresets, userId),
    fetchRows<ProductRow>(TABLES.products, userId),
    fetchRows<MaterialCostRow>(TABLES.costEntries.materials, userId),
    fetchRows<PackagingCostRow>(TABLES.costEntries.packaging, userId),
    fetchRows<LaborCostRow>(TABLES.costEntries.labor, userId),
    fetchRows<OutsourcingCostRow>(TABLES.costEntries.outsourcing, userId),
    fetchRows<DevelopmentCostRow>(TABLES.costEntries.development, userId),
    fetchRows<EquipmentAllocationRow>(TABLES.costEntries.equipment, userId),
    fetchRows<LogisticsCostRow>(TABLES.costEntries.logistics, userId),
    fetchRows<ElectricityCostRow>(TABLES.costEntries.electricity, userId),
    fetchRows<FeeCostRow>(TABLES.costEntries.fees, userId),
  ])

    const hasData =
      large.length ||
      medium.length ||
      small.length ||
      materials.length ||
      packaging.length ||
      shipping.length ||
      labor.length ||
      equipments.length ||
      optionPresets.length ||
      products.length

    if (!hasData) {
      return null
    }

    const mapLarge = (row: CategoryLargeRow): CategoryLarge => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
    })
    const mapMedium = (row: CategoryMediumRow): CategoryMedium => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      largeId: row.large_id ?? "",
    })
    const mapSmall = (row: CategorySmallRow): CategorySmall => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      mediumId: row.medium_id ?? "",
    })

    const mapMaterial = (row: MaterialRow): Material => ({
      id: row.id,
      name: row.name,
      unit: row.unit ?? "",
      sizeDescription: row.size_description ?? "",
      currency: row.currency ?? "JPY",
      unitCost: Number(row.unit_cost ?? 0),
      supplier: row.supplier ?? undefined,
      note: row.note ?? undefined,
      unitsPerBatch: row.units_per_batch ?? undefined,
    })

    const mapPackaging = (row: PackagingRow): PackagingItem => ({
      id: row.id,
      name: row.name,
      unit: row.unit ?? "",
      sizeDescription: row.size_description ?? "",
      currency: row.currency ?? "JPY",
      unitCost: Number(row.unit_cost ?? 0),
      note: row.note ?? undefined,
      unitsPerBatch: row.units_per_batch ?? undefined,
    })

    const mapShipping = (row: ShippingMethodRow): ShippingMethod => ({
      id: row.id,
      name: row.name,
      unitCost: Number(row.unit_cost ?? 0),
      currency: row.currency ?? "JPY",
      note: row.note ?? undefined,
      description: row.description ?? undefined,
    })

    const mapLabor = (row: LaborRoleRow): LaborRole => ({
      id: row.id,
      name: row.name,
      hourlyRate: Number(row.hourly_rate ?? 0),
      currency: row.currency ?? "JPY",
      note: row.note ?? undefined,
    })

    const mapEquipment = (row: EquipmentRow): Equipment => ({
      id: row.id,
      name: row.name,
      acquisitionCost: Number(row.acquisition_cost ?? 0),
      currency: row.currency ?? "JPY",
      amortizationYears: Number(row.amortization_years ?? 1),
      utilizationRate: Number(row.utilization_rate ?? 100),
      note: row.note ?? undefined,
    })

    const mapFee = (row: FeeRow): Fee => ({
      id: row.id,
      name: row.name,
      ratePercent: Number(row.rate_percent ?? 0),
      fixedAmount: Number(row.fixed_amount ?? 0),
      currency: row.currency ?? "JPY",
      note: row.note ?? undefined,
    })

    const mapOptionPreset = (row: OptionPresetRow): OptionPreset => ({
      id: row.id,
      name: row.name,
      variants: asArray(row.variants) as OptionPreset["variants"],
    })

    const mapProduct = (row: ProductRow): Product => ({
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
    })

    const mapMaterialEntry = (row: MaterialCostRow): MaterialCostEntry => ({
      id: row.id,
      productId: row.product_id,
      materialId: row.material_id,
      description: row.description ?? undefined,
      usageRatio: row.usage_ratio ?? undefined,
      costPerUnit: Number(row.cost_per_unit ?? 0),
      currency: row.currency ?? "JPY",
    })

    const mapPackagingEntry = (row: PackagingCostRow): PackagingCostEntry => ({
      id: row.id,
      productId: row.product_id,
      packagingItemId: row.packaging_item_id,
      quantity: Number(row.quantity ?? 0),
      costPerUnit: Number(row.cost_per_unit ?? 0),
      currency: row.currency ?? "JPY",
    })

    const mapLaborEntry = (row: LaborCostRow): LaborCostEntry => ({
      id: row.id,
      productId: row.product_id,
      laborRoleId: row.labor_role_id,
      hours: Number(row.hours ?? 0),
      peopleCount: Number(row.people_count ?? 0),
      hourlyRateOverride: row.hourly_rate_override ?? undefined,
    })

    const mapOutsourcingEntry = (row: OutsourcingCostRow): OutsourcingCostEntry => ({
      id: row.id,
      productId: row.product_id,
      costPerUnit: Number(row.cost_per_unit ?? 0),
      currency: row.currency ?? "JPY",
      note: row.note ?? undefined,
    })

    const mapDevelopmentEntry = (row: DevelopmentCostRow): DevelopmentCostEntry => ({
      id: row.id,
      productId: row.product_id,
      title: row.title ?? undefined,
      prototypeLaborCost: Number(row.prototype_labor_cost ?? 0),
      prototypeMaterialCost: Number(row.prototype_material_cost ?? 0),
      toolingCost: Number(row.tooling_cost ?? 0),
      amortizationYears: Number(row.amortization_years ?? 1),
    })

    const mapEquipmentEntry = (row: EquipmentAllocationRow): EquipmentAllocationEntry => ({
      id: row.id,
      productId: row.product_id,
      equipmentId: row.equipment_id,
      allocationRatio: Number(row.allocation_ratio ?? 0),
      annualQuantity: Number(row.annual_quantity ?? 0),
      usageHours: row.usage_hours ?? undefined,
    })

    const mapLogisticsEntry = (row: LogisticsCostRow): LogisticsCostEntry => ({
      id: row.id,
      productId: row.product_id,
      shippingMethodId: row.shipping_method_id,
      costPerUnit: Number(row.cost_per_unit ?? 0),
      currency: row.currency ?? "JPY",
    })

    const mapElectricEntry = (row: ElectricityCostRow): ElectricityCostEntry => ({
      id: row.id,
      productId: row.product_id,
      costPerUnit: Number(row.cost_per_unit ?? 0),
      currency: row.currency ?? "JPY",
    })

    const mapFeeEntry = (row: FeeCostRow): FeeCostEntry => ({
      id: row.id,
      productId: row.product_id,
      feeId: row.fee_id,
      ratePercent: Number(row.rate_percent ?? 0),
      fixedAmount: Number(row.fixed_amount ?? 0),
      currency: row.currency ?? "JPY",
    })

    return {
      categories: {
        large: large.map(mapLarge),
        medium: medium.map(mapMedium),
        small: small.map(mapSmall),
      },
      materials: materials.map(mapMaterial),
      packagingItems: packaging.map(mapPackaging),
      shippingMethods: shipping.map(mapShipping),
      laborRoles: labor.map(mapLabor),
      equipments: equipments.map(mapEquipment),
      fees: fees.map(mapFee),
      optionPresets: optionPresets.map(mapOptionPreset),
      products: products.map(mapProduct),
      costEntries: {
        materials: costMaterials.map(mapMaterialEntry),
        packaging: costPackaging.map(mapPackagingEntry),
        labor: costLabor.map(mapLaborEntry),
        outsourcing: costOutsourcing.map(mapOutsourcingEntry),
        development: costDevelopment.map(mapDevelopmentEntry),
        equipmentAllocations: costEquipment.map(mapEquipmentEntry),
        logistics: costLogistics.map(mapLogisticsEntry),
        electricity: costElectricity.map(mapElectricEntry),
        fees: costFees.map(mapFeeEntry),
      },
    }
  } catch (error) {
    console.error("Failed to load user app data", error)
    return null
  }
}

function buildSyncPayload(data: AppData, previous?: AppData) {
  const prev = previous ?? emptyAppData
  const toDeletePayload = (prevItems: { id: string }[], currentItems: { id: string }[]) => {
    if (!prevItems?.length) return []
    const currentIds = new Set(currentItems.map((item) => item.id))
    return prevItems.filter((item) => !currentIds.has(item.id)).map((item) => ({ id: item.id }))
  }
  const serializeDate = (value: string | undefined) => {
    if (!value) return new Date().toISOString()
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return new Date().toISOString()
    }
    return date.toISOString()
  }

  return {
    categories_large: data.categories.large.map((item) => ({ id: item.id, name: item.name, description: item.description ?? null })),
    categories_large_deleted: toDeletePayload(prev.categories.large, data.categories.large),
    categories_medium: data.categories.medium.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description ?? null,
      large_id: item.largeId ?? null,
    })),
    categories_medium_deleted: toDeletePayload(prev.categories.medium, data.categories.medium),
    categories_small: data.categories.small.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description ?? null,
      medium_id: item.mediumId ?? null,
    })),
    categories_small_deleted: toDeletePayload(prev.categories.small, data.categories.small),
    materials: data.materials.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      size_description: item.sizeDescription,
      currency: item.currency,
      unit_cost: item.unitCost,
      supplier: item.supplier ?? null,
      note: item.note ?? null,
      units_per_batch: item.unitsPerBatch ?? null,
    })),
    materials_deleted: toDeletePayload(prev.materials, data.materials),
    packaging_items: data.packagingItems.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      size_description: item.sizeDescription,
      currency: item.currency,
      unit_cost: item.unitCost,
      note: item.note ?? null,
      units_per_batch: item.unitsPerBatch ?? null,
    })),
    packaging_items_deleted: toDeletePayload(prev.packagingItems, data.packagingItems),
    shipping_methods: (data.shippingMethods ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      unit_cost: item.unitCost,
      currency: item.currency,
      note: item.note ?? null,
      description: item.description ?? null,
    })),
    shipping_methods_deleted: toDeletePayload(prev.shippingMethods ?? [], data.shippingMethods ?? []),
    labor_roles: data.laborRoles.map((item) => ({
      id: item.id,
      name: item.name,
      hourly_rate: item.hourlyRate,
      currency: item.currency,
      note: item.note ?? null,
    })),
    labor_roles_deleted: toDeletePayload(prev.laborRoles, data.laborRoles),
    equipments: data.equipments.map((item) => ({
      id: item.id,
      name: item.name,
      acquisition_cost: item.acquisitionCost,
      currency: item.currency,
      amortization_years: item.amortizationYears,
      utilization_rate: item.utilizationRate ?? 100,
      note: item.note ?? null,
    })),
    equipments_deleted: toDeletePayload(prev.equipments, data.equipments),
    fees: data.fees.map((item) => ({
      id: item.id,
      name: item.name,
      rate_percent: item.ratePercent,
      fixed_amount: item.fixedAmount,
      currency: item.currency,
      note: item.note ?? null,
    })),
    fees_deleted: toDeletePayload(prev.fees, data.fees),
    option_presets: (data.optionPresets ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      variants: item.variants,
    })),
    option_presets_deleted: toDeletePayload(prev.optionPresets ?? [], data.optionPresets ?? []),
    products: data.products.map((item) => ({
      id: item.id,
      name: item.name,
      category_large_id: item.categoryLargeId ?? null,
      category_medium_id: item.categoryMediumId ?? null,
      category_small_id: item.categorySmallId ?? null,
      size_variants: item.sizeVariants,
      base_man_hours: item.baseManHours,
      default_electricity_cost: item.defaultElectricityCost,
      sale_price: item.salePrice,
      registered_at: serializeDate(item.registeredAt),
      notes: item.notes ?? null,
      production_lot_size: item.productionLotSize,
      expected_production_period_years: item.expectedProduction.periodYears,
      expected_production_quantity: item.expectedProduction.quantity,
      equipment_ids: item.equipmentIds ?? [],
    })),
    products_deleted: toDeletePayload(prev.products, data.products),
    cost_entries_materials: data.costEntries.materials.map((item) => ({
      id: item.id,
      product_id: item.productId,
      material_id: item.materialId,
      description: item.description ?? null,
      usage_ratio: item.usageRatio ?? null,
      cost_per_unit: item.costPerUnit,
      currency: item.currency,
    })),
    cost_entries_materials_deleted: toDeletePayload(prev.costEntries.materials, data.costEntries.materials),
    cost_entries_packaging: data.costEntries.packaging.map((item) => ({
      id: item.id,
      product_id: item.productId,
      packaging_item_id: item.packagingItemId,
      quantity: item.quantity,
      cost_per_unit: item.costPerUnit,
      currency: item.currency,
    })),
    cost_entries_packaging_deleted: toDeletePayload(prev.costEntries.packaging, data.costEntries.packaging),
    cost_entries_labor: data.costEntries.labor.map((item) => ({
      id: item.id,
      product_id: item.productId,
      labor_role_id: item.laborRoleId,
      hours: item.hours,
      people_count: item.peopleCount,
      hourly_rate_override: item.hourlyRateOverride ?? null,
    })),
    cost_entries_labor_deleted: toDeletePayload(prev.costEntries.labor, data.costEntries.labor),
    cost_entries_outsourcing: data.costEntries.outsourcing.map((item) => ({
      id: item.id,
      product_id: item.productId,
      cost_per_unit: item.costPerUnit,
      currency: item.currency,
      note: item.note ?? null,
    })),
    cost_entries_outsourcing_deleted: toDeletePayload(prev.costEntries.outsourcing, data.costEntries.outsourcing),
    cost_entries_development: data.costEntries.development.map((item) => ({
      id: item.id,
      product_id: item.productId,
      title: item.title ?? null,
      prototype_labor_cost: item.prototypeLaborCost,
      prototype_material_cost: item.prototypeMaterialCost,
      tooling_cost: item.toolingCost,
      amortization_years: item.amortizationYears,
    })),
    cost_entries_development_deleted: toDeletePayload(prev.costEntries.development, data.costEntries.development),
    cost_entries_equipment: data.costEntries.equipmentAllocations.map((item) => ({
      id: item.id,
      product_id: item.productId,
      equipment_id: item.equipmentId,
      allocation_ratio: item.allocationRatio,
      annual_quantity: item.annualQuantity,
      usage_hours: item.usageHours ?? null,
    })),
    cost_entries_equipment_deleted: toDeletePayload(prev.costEntries.equipmentAllocations, data.costEntries.equipmentAllocations),
    cost_entries_logistics: data.costEntries.logistics.map((item) => ({
      id: item.id,
      product_id: item.productId,
      shipping_method_id: item.shippingMethodId,
      cost_per_unit: item.costPerUnit,
      currency: item.currency,
    })),
    cost_entries_logistics_deleted: toDeletePayload(prev.costEntries.logistics, data.costEntries.logistics),
    cost_entries_electricity: data.costEntries.electricity.map((item) => ({
      id: item.id,
      product_id: item.productId,
      cost_per_unit: item.costPerUnit,
      currency: item.currency,
    })),
    cost_entries_electricity_deleted: toDeletePayload(prev.costEntries.electricity, data.costEntries.electricity),
    cost_entries_fees: data.costEntries.fees.map((item) => ({
      id: item.id,
      product_id: item.productId,
      fee_id: item.feeId,
      rate_percent: item.ratePercent,
      fixed_amount: item.fixedAmount,
      currency: item.currency,
    })),
    cost_entries_fees_deleted: toDeletePayload(prev.costEntries.fees, data.costEntries.fees),
  }
}

const diffById = <T extends { id: string }>(
  prev: T[],
  next: T[],
  getLabel: (item: T) => string
) => {
  const prevMap = new Map(prev.map((item) => [item.id, item]))
  const nextMap = new Map(next.map((item) => [item.id, item]))
  const added = Array.from(nextMap.values())
    .filter((item) => !prevMap.has(item.id))
    .map(getLabel)
  const removed = Array.from(prevMap.values())
    .filter((item) => !nextMap.has(item.id))
    .map(getLabel)
  return {
    added: added.slice(0, 10),
    removed: removed.slice(0, 10),
  }
}

const buildAuditMetadata = (data: AppData, previousData?: AppData) => {
  const clientInfo = (() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return {
        userAgent: "server",
        platform: typeof process !== "undefined" ? process.platform : "unknown",
        language: undefined,
        location: undefined,
      }
    }
    const { userAgent, platform, language } = window.navigator
    const locationInfo = {
      host: window.location.host,
      pathname: window.location.pathname,
    }
    return {
      userAgent,
      platform,
      language,
      location: locationInfo,
    }
  })()

  const payloadStats = {
    categories: {
      large: data.categories.large.length,
      medium: data.categories.medium.length,
      small: data.categories.small.length,
    },
    materials: data.materials.length,
    packaging: data.packagingItems.length,
    shippingMethods: data.shippingMethods.length,
    laborRoles: data.laborRoles.length,
    equipments: data.equipments.length,
    fees: data.fees.length,
    optionPresets: data.optionPresets?.length ?? 0,
    products: data.products.length,
    costEntries: {
      materials: data.costEntries.materials.length,
      packaging: data.costEntries.packaging.length,
      labor: data.costEntries.labor.length,
      outsourcing: data.costEntries.outsourcing.length,
      development: data.costEntries.development.length,
      equipment: data.costEntries.equipmentAllocations.length,
      logistics: data.costEntries.logistics.length,
      electricity: data.costEntries.electricity.length,
      fees: data.costEntries.fees.length,
    },
  }

  const summary = {
    totalCategories: payloadStats.categories.large + payloadStats.categories.medium + payloadStats.categories.small,
    totalMasters:
      payloadStats.materials +
      payloadStats.packaging +
      payloadStats.shippingMethods +
      payloadStats.laborRoles +
      payloadStats.equipments +
      payloadStats.fees +
      payloadStats.optionPresets,
    totalCostEntries:
      payloadStats.costEntries.materials +
      payloadStats.costEntries.packaging +
      payloadStats.costEntries.labor +
      payloadStats.costEntries.outsourcing +
      payloadStats.costEntries.development +
      payloadStats.costEntries.equipment +
      payloadStats.costEntries.logistics +
      payloadStats.costEntries.electricity +
      payloadStats.costEntries.fees,
    totalRecords: 0,
  }
  summary.totalRecords = summary.totalCategories + summary.totalMasters + summary.totalCostEntries + payloadStats.products

  return {
    deviceInfo: clientInfo.userAgent,
    metadata: {
      client: clientInfo,
      payloadStats: {
        ...payloadStats,
        summary,
      },
      changes: previousData
        ? {
            products: diffById(previousData.products, data.products, (item) => item.name),
            materials: diffById(previousData.materials, data.materials, (item) => item.name),
            packaging: diffById(previousData.packagingItems, data.packagingItems, (item) => item.name),
            shippingMethods: diffById(previousData.shippingMethods, data.shippingMethods, (item) => item.name),
            laborRoles: diffById(previousData.laborRoles, data.laborRoles, (item) => item.name),
            equipments: diffById(previousData.equipments, data.equipments, (item) => item.name),
            fees: diffById(previousData.fees, data.fees, (item) => item.name),
            optionPresets: diffById(previousData.optionPresets ?? [], data.optionPresets ?? [], (item) => item.name),
            categoriesLarge: diffById(previousData.categories.large, data.categories.large, (item) => item.name),
            categoriesMedium: diffById(previousData.categories.medium, data.categories.medium, (item) => item.name),
            categoriesSmall: diffById(previousData.categories.small, data.categories.small, (item) => item.name),
          }
        : undefined,
    },
  }
}

export async function saveUserAppData(userId: string, data: AppData, previousData?: AppData) {
  try {
    const payload = buildSyncPayload(data, previousData)
    const { error } = await supabaseClient.rpc("sync_app_data", {
      p_user_id: userId,
      p_payload: payload,
    })
    if (error) {
      throw error
    }

    const audit = buildAuditMetadata(data, previousData)
    const { error: auditError } = await supabaseClient.from("sync_audit_logs").insert({
      user_id: userId,
      device_info: audit.deviceInfo,
      metadata: audit.metadata,
    })
    if (auditError) {
      console.warn("Failed to record sync audit log", auditError)
    }
  } catch (error) {
    console.error("Failed to save user app data", error)
    throw error
  }
}

const mapAuditLog = (row: AuditLogRow): AuditLog => ({
  id: row.id,
  userId: row.user_id,
  createdAt: row.created_at,
  deviceInfo: row.device_info ?? undefined,
  metadata: row.metadata ?? undefined,
})

type ProductStockRow = {
  product_id: string
  quantity: number
  updated_at: string
}

export async function loadProductStocks(userId: string): Promise<ProductStock[]> {
  const { data, error } = await supabaseClient
    .from("product_stock")
    .select("product_id, quantity, updated_at")
    .eq("user_id", userId)
  if (error) throw error
  return (data ?? []).map((row: ProductStockRow) => ({
    productId: row.product_id,
    quantity: row.quantity,
    updatedAt: row.updated_at,
  }))
}

export async function upsertProductStock(userId: string, productId: string, quantity: number): Promise<void> {
  const { error } = await supabaseClient.from("product_stock").upsert(
    { user_id: userId, product_id: productId, quantity, updated_at: new Date().toISOString() },
    { onConflict: "user_id,product_id" }
  )
  if (error) throw error
}

export async function deleteProductStock(userId: string, productId: string): Promise<void> {
  const { error } = await supabaseClient
    .from("product_stock")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId)
  if (error) throw error
}

// --- material stock ---

type MaterialStockRow = { material_id: string; quantity: number; stock_unit: string | null; updated_at: string }

export async function loadMaterialStocks(userId: string): Promise<MaterialStock[]> {
  const { data, error } = await supabaseClient
    .from("material_stock")
    .select("material_id, quantity, stock_unit, updated_at")
    .eq("user_id", userId)
  if (error) throw error
  return (data ?? []).map((row: MaterialStockRow) => ({
    materialId: row.material_id,
    quantity: Number(row.quantity),
    stockUnit: row.stock_unit ?? undefined,
    updatedAt: row.updated_at,
  }))
}

export async function upsertMaterialStock(
  userId: string,
  materialId: string,
  quantity: number,
  stockUnit?: string
): Promise<void> {
  const payload: {
    user_id: string
    material_id: string
    quantity: number
    updated_at: string
    stock_unit?: string
  } = {
    user_id: userId,
    material_id: materialId,
    quantity,
    updated_at: new Date().toISOString(),
  }
  if (typeof stockUnit === "string") {
    payload.stock_unit = stockUnit
  }
  const { error } = await supabaseClient.from("material_stock").upsert(
    payload,
    { onConflict: "user_id,material_id" }
  )
  if (error) throw error
}

export async function deleteMaterialStock(userId: string, materialId: string): Promise<void> {
  const { error } = await supabaseClient
    .from("material_stock")
    .delete()
    .eq("user_id", userId)
    .eq("material_id", materialId)
  if (error) throw error
}

// --- packaging stock ---

type PackagingStockRow = { packaging_item_id: string; quantity: number; stock_unit: string | null; updated_at: string }

export async function loadPackagingStocks(userId: string): Promise<PackagingStock[]> {
  const { data, error } = await supabaseClient
    .from("packaging_stock")
    .select("packaging_item_id, quantity, stock_unit, updated_at")
    .eq("user_id", userId)
  if (error) throw error
  return (data ?? []).map((row: PackagingStockRow) => ({
    packagingItemId: row.packaging_item_id,
    quantity: Number(row.quantity),
    stockUnit: row.stock_unit ?? undefined,
    updatedAt: row.updated_at,
  }))
}

export async function upsertPackagingStock(
  userId: string,
  packagingItemId: string,
  quantity: number,
  stockUnit?: string
): Promise<void> {
  const payload: {
    user_id: string
    packaging_item_id: string
    quantity: number
    updated_at: string
    stock_unit?: string
  } = {
    user_id: userId,
    packaging_item_id: packagingItemId,
    quantity,
    updated_at: new Date().toISOString(),
  }
  if (typeof stockUnit === "string") {
    payload.stock_unit = stockUnit
  }
  const { error } = await supabaseClient.from("packaging_stock").upsert(
    payload,
    { onConflict: "user_id,packaging_item_id" }
  )
  if (error) throw error
}

export async function deletePackagingStock(userId: string, packagingItemId: string): Promise<void> {
  const { error } = await supabaseClient
    .from("packaging_stock")
    .delete()
    .eq("user_id", userId)
    .eq("packaging_item_id", packagingItemId)
  if (error) throw error
}

export async function loadAuditLogs(
  userId: string,
  limit = 50,
  offset = 0,
  filters?: { from?: string; to?: string }
): Promise<AuditLog[]> {
  let query = supabaseClient
    .from("sync_audit_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (filters?.from) {
    query = query.gte("created_at", filters.from)
  }
  if (filters?.to) {
    query = query.lte("created_at", filters.to)
  }

  const { data, error } = await query.range(offset, offset + limit - 1)

  if (error) throw error
  return (data ?? []).map(mapAuditLog)
}
