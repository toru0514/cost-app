import type { AppData } from "../types"
import { emptyAppData } from "../types"

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

export function buildSyncPayload(data: AppData, previous?: AppData) {
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
      image_url: item.imageUrl ?? null,
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
      image_url: item.imageUrl ?? null,
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
      image_url: item.imageUrl ?? null,
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
      image_url: item.imageUrl ?? null,
      status: item.status ?? "active",
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

export const buildAuditMetadata = (data: AppData, previousData?: AppData) => {
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
