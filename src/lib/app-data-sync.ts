import { supabaseClient } from "./supabase-client"
import type {
  AppData,
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
} from "./types"

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
  },
} as const

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
    ] = await Promise.all([
      fetchRows<any>(TABLES.categories.large, userId),
      fetchRows<any>(TABLES.categories.medium, userId),
      fetchRows<any>(TABLES.categories.small, userId),
      fetchRows<any>(TABLES.materials, userId),
      fetchRows<any>(TABLES.packaging, userId),
      fetchRows<any>(TABLES.shipping, userId),
      fetchRows<any>(TABLES.labor, userId),
      fetchRows<any>(TABLES.equipments, userId),
      fetchRows<any>(TABLES.optionPresets, userId),
      fetchRows<any>(TABLES.products, userId),
      fetchRows<any>(TABLES.costEntries.materials, userId),
      fetchRows<any>(TABLES.costEntries.packaging, userId),
      fetchRows<any>(TABLES.costEntries.labor, userId),
      fetchRows<any>(TABLES.costEntries.outsourcing, userId),
      fetchRows<any>(TABLES.costEntries.development, userId),
      fetchRows<any>(TABLES.costEntries.equipment, userId),
      fetchRows<any>(TABLES.costEntries.logistics, userId),
      fetchRows<any>(TABLES.costEntries.electricity, userId),
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

    const mapLarge = (row: any): CategoryLarge => ({ id: row.id, name: row.name, description: row.description ?? undefined })
    const mapMedium = (row: any): CategoryMedium => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      largeId: row.large_id ?? undefined,
    })
    const mapSmall = (row: any): CategorySmall => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      mediumId: row.medium_id ?? undefined,
    })

    const mapMaterial = (row: any): Material => ({
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

    const mapPackaging = (row: any): PackagingItem => ({
      id: row.id,
      name: row.name,
      unit: row.unit ?? "",
      sizeDescription: row.size_description ?? "",
      currency: row.currency ?? "JPY",
      unitCost: Number(row.unit_cost ?? 0),
      note: row.note ?? undefined,
      unitsPerBatch: row.units_per_batch ?? undefined,
    })

    const mapShipping = (row: any): ShippingMethod => ({
      id: row.id,
      name: row.name,
      unitCost: Number(row.unit_cost ?? 0),
      currency: row.currency ?? "JPY",
      note: row.note ?? undefined,
      description: row.description ?? undefined,
    })

    const mapLabor = (row: any): LaborRole => ({
      id: row.id,
      name: row.name,
      hourlyRate: Number(row.hourly_rate ?? 0),
      currency: row.currency ?? "JPY",
      note: row.note ?? undefined,
    })

    const mapEquipment = (row: any): Equipment => ({
      id: row.id,
      name: row.name,
      acquisitionCost: Number(row.acquisition_cost ?? 0),
      currency: row.currency ?? "JPY",
      amortizationYears: Number(row.amortization_years ?? 1),
      note: row.note ?? undefined,
    })

    const mapOptionPreset = (row: any): OptionPreset => ({
      id: row.id,
      name: row.name,
      variants: row.variants ?? [],
    })

    const mapProduct = (row: any): Product => ({
      id: row.id,
      name: row.name,
      categoryLargeId: row.category_large_id ?? undefined,
      categoryMediumId: row.category_medium_id ?? undefined,
      categorySmallId: row.category_small_id ?? undefined,
      sizeVariants: row.size_variants ?? [],
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
      equipmentIds: row.equipment_ids ?? [],
    })

    const mapMaterialEntry = (row: any): MaterialCostEntry => ({
      id: row.id,
      productId: row.product_id,
      materialId: row.material_id,
      description: row.description ?? undefined,
      usageRatio: row.usage_ratio ?? undefined,
      costPerUnit: Number(row.cost_per_unit ?? 0),
      currency: row.currency ?? "JPY",
    })

    const mapPackagingEntry = (row: any): PackagingCostEntry => ({
      id: row.id,
      productId: row.product_id,
      packagingItemId: row.packaging_item_id,
      quantity: Number(row.quantity ?? 0),
      costPerUnit: Number(row.cost_per_unit ?? 0),
      currency: row.currency ?? "JPY",
    })

    const mapLaborEntry = (row: any): LaborCostEntry => ({
      id: row.id,
      productId: row.product_id,
      laborRoleId: row.labor_role_id,
      hours: Number(row.hours ?? 0),
      peopleCount: Number(row.people_count ?? 0),
      hourlyRateOverride: row.hourly_rate_override ?? undefined,
    })

    const mapOutsourcingEntry = (row: any): OutsourcingCostEntry => ({
      id: row.id,
      productId: row.product_id,
      costPerUnit: Number(row.cost_per_unit ?? 0),
      currency: row.currency ?? "JPY",
      note: row.note ?? undefined,
    })

    const mapDevelopmentEntry = (row: any): DevelopmentCostEntry => ({
      id: row.id,
      productId: row.product_id,
      title: row.title ?? undefined,
      prototypeLaborCost: Number(row.prototype_labor_cost ?? 0),
      prototypeMaterialCost: Number(row.prototype_material_cost ?? 0),
      toolingCost: Number(row.tooling_cost ?? 0),
      amortizationYears: Number(row.amortization_years ?? 1),
    })

    const mapEquipmentEntry = (row: any): EquipmentAllocationEntry => ({
      id: row.id,
      productId: row.product_id,
      equipmentId: row.equipment_id,
      allocationRatio: Number(row.allocation_ratio ?? 0),
      annualQuantity: Number(row.annual_quantity ?? 0),
      usageHours: row.usage_hours ?? undefined,
    })

    const mapLogisticsEntry = (row: any): LogisticsCostEntry => ({
      id: row.id,
      productId: row.product_id,
      shippingMethodId: row.shipping_method_id,
      costPerUnit: Number(row.cost_per_unit ?? 0),
      currency: row.currency ?? "JPY",
    })

    const mapElectricEntry = (row: any): ElectricityCostEntry => ({
      id: row.id,
      productId: row.product_id,
      costPerUnit: Number(row.cost_per_unit ?? 0),
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
      },
    }
  } catch (error) {
    console.error("Failed to load user app data", error)
    return null
  }
}

function buildSyncPayload(data: AppData) {
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
    categories_medium: data.categories.medium.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description ?? null,
      large_id: item.largeId ?? null,
    })),
    categories_small: data.categories.small.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description ?? null,
      medium_id: item.mediumId ?? null,
    })),
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
    shipping_methods: (data.shippingMethods ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      unit_cost: item.unitCost,
      currency: item.currency,
      note: item.note ?? null,
      description: item.description ?? null,
    })),
    labor_roles: data.laborRoles.map((item) => ({
      id: item.id,
      name: item.name,
      hourly_rate: item.hourlyRate,
      currency: item.currency,
      note: item.note ?? null,
    })),
    equipments: data.equipments.map((item) => ({
      id: item.id,
      name: item.name,
      acquisition_cost: item.acquisitionCost,
      currency: item.currency,
      amortization_years: item.amortizationYears,
      note: item.note ?? null,
    })),
    option_presets: (data.optionPresets ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      variants: item.variants,
    })),
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
    cost_entries_materials: data.costEntries.materials.map((item) => ({
      id: item.id,
      product_id: item.productId,
      material_id: item.materialId,
      description: item.description ?? null,
      usage_ratio: item.usageRatio ?? null,
      cost_per_unit: item.costPerUnit,
      currency: item.currency,
    })),
    cost_entries_packaging: data.costEntries.packaging.map((item) => ({
      id: item.id,
      product_id: item.productId,
      packaging_item_id: item.packagingItemId,
      quantity: item.quantity,
      cost_per_unit: item.costPerUnit,
      currency: item.currency,
    })),
    cost_entries_labor: data.costEntries.labor.map((item) => ({
      id: item.id,
      product_id: item.productId,
      labor_role_id: item.laborRoleId,
      hours: item.hours,
      people_count: item.peopleCount,
      hourly_rate_override: item.hourlyRateOverride ?? null,
    })),
    cost_entries_outsourcing: data.costEntries.outsourcing.map((item) => ({
      id: item.id,
      product_id: item.productId,
      cost_per_unit: item.costPerUnit,
      currency: item.currency,
      note: item.note ?? null,
    })),
    cost_entries_development: data.costEntries.development.map((item) => ({
      id: item.id,
      product_id: item.productId,
      title: item.title ?? null,
      prototype_labor_cost: item.prototypeLaborCost,
      prototype_material_cost: item.prototypeMaterialCost,
      tooling_cost: item.toolingCost,
      amortization_years: item.amortizationYears,
    })),
    cost_entries_equipment: data.costEntries.equipmentAllocations.map((item) => ({
      id: item.id,
      product_id: item.productId,
      equipment_id: item.equipmentId,
      allocation_ratio: item.allocationRatio,
      annual_quantity: item.annualQuantity,
      usage_hours: item.usageHours ?? null,
    })),
    cost_entries_logistics: data.costEntries.logistics.map((item) => ({
      id: item.id,
      product_id: item.productId,
      shipping_method_id: item.shippingMethodId,
      cost_per_unit: item.costPerUnit,
      currency: item.currency,
    })),
    cost_entries_electricity: data.costEntries.electricity.map((item) => ({
      id: item.id,
      product_id: item.productId,
      cost_per_unit: item.costPerUnit,
      currency: item.currency,
    })),
  }
}

export async function saveUserAppData(userId: string, data: AppData) {
  try {
    const payload = buildSyncPayload(data)
    const { error } = await supabaseClient.rpc("sync_app_data", {
      p_user_id: userId,
      p_payload: payload,
    })
    if (error) {
      throw error
    }
  } catch (error) {
    console.error("Failed to save user app data", error)
    throw error
  }
}
