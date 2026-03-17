import type { AppData } from "../types"
import { emptyAppData } from "../types"

type SyncPayload = Record<string, unknown>

type MinimalAppData = Partial<AppData>

const ensureArray = <T,>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : [])

export const normalizeAppData = (dataset?: MinimalAppData | null): AppData => {
  const source = dataset ?? {}
  return {
    categories: {
      large: ensureArray(source.categories?.large),
      medium: ensureArray(source.categories?.medium),
      small: ensureArray(source.categories?.small),
    },
    materials: ensureArray(source.materials),
    packagingItems: ensureArray(source.packagingItems),
    shippingMethods: ensureArray(source.shippingMethods),
    laborRoles: ensureArray(source.laborRoles),
    equipments: ensureArray(source.equipments),
    fees: ensureArray(source.fees),
    optionPresets: ensureArray(source.optionPresets),
    products: ensureArray(source.products),
    timeRecords: ensureArray(source.timeRecords),
    costEntries: {
      materials: ensureArray(source.costEntries?.materials),
      packaging: ensureArray(source.costEntries?.packaging),
      labor: ensureArray(source.costEntries?.labor),
      outsourcing: ensureArray(source.costEntries?.outsourcing),
      development: ensureArray(source.costEntries?.development),
      equipmentAllocations: ensureArray(source.costEntries?.equipmentAllocations),
      logistics: ensureArray(source.costEntries?.logistics),
      electricity: ensureArray(source.costEntries?.electricity),
      fees: ensureArray(source.costEntries?.fees),
    },
  }
}

export const buildSyncPayloadFromAppData = (data: AppData, previous?: AppData): SyncPayload => {
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
      use_percentage_mode: Boolean(item.usePercentageMode ?? false),
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
