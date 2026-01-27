import type { SupabaseClient } from "@supabase/supabase-js"
import type { AppData } from "../types"
import { emptyAppData } from "../types"

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
} as const

const fetchRows = async <T>(supabase: SupabaseClient, table: string, userId: string) => {
  const { data, error } = await supabase.from(table).select("*").eq("user_id", userId)
  if (error) throw error
  return (data as T[]) ?? []
}

export const loadUserAppDataServer = async (supabase: SupabaseClient, userId: string): Promise<AppData> => {
  const [large, medium, small, materials, packaging, shipping, labor, equipments, fees, optionPresets, products] =
    await Promise.all([
      fetchRows(supabase, TABLES.categories.large, userId),
      fetchRows(supabase, TABLES.categories.medium, userId),
      fetchRows(supabase, TABLES.categories.small, userId),
      fetchRows(supabase, TABLES.materials, userId),
      fetchRows(supabase, TABLES.packaging, userId),
      fetchRows(supabase, TABLES.shipping, userId),
      fetchRows(supabase, TABLES.labor, userId),
      fetchRows(supabase, TABLES.equipments, userId),
      fetchRows(supabase, TABLES.fees, userId),
      fetchRows(supabase, TABLES.optionPresets, userId),
      fetchRows(supabase, TABLES.products, userId),
    ])

  return {
    ...emptyAppData,
    categories: {
      large: large.map((row: any) => ({ id: row.id, name: row.name, description: row.description ?? undefined })),
      medium: medium.map((row: any) => ({
        id: row.id,
        largeId: row.large_id ?? row.largeId,
        name: row.name,
        description: row.description ?? undefined,
      })),
      small: small.map((row: any) => ({
        id: row.id,
        mediumId: row.medium_id ?? row.mediumId,
        name: row.name,
        description: row.description ?? undefined,
      })),
    },
    materials: materials.map((row: any) => ({
      id: row.id,
      name: row.name,
      unit: row.unit ?? "",
      sizeDescription: row.size_description ?? "",
      currency: row.currency ?? "JPY",
      unitCost: row.unit_cost ?? 0,
      unitsPerBatch: row.units_per_batch ?? undefined,
      supplier: row.supplier ?? undefined,
      note: row.note ?? undefined,
    })),
    packagingItems: packaging.map((row: any) => ({
      id: row.id,
      name: row.name,
      unit: row.unit ?? "",
      sizeDescription: row.size_description ?? "",
      unitCost: row.unit_cost ?? 0,
      currency: row.currency ?? "JPY",
      unitsPerBatch: row.units_per_batch ?? undefined,
      note: row.note ?? undefined,
    })),
    shippingMethods: shipping.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      unitCost: row.unit_cost ?? 0,
      currency: row.currency ?? "JPY",
      note: row.note ?? undefined,
    })),
    laborRoles: labor.map((row: any) => ({
      id: row.id,
      name: row.name,
      hourlyRate: row.hourly_rate ?? 0,
      currency: row.currency ?? "JPY",
      note: row.note ?? undefined,
    })),
    equipments: equipments.map((row: any) => ({
      id: row.id,
      name: row.name,
      acquisitionCost: row.acquisition_cost ?? 0,
      currency: row.currency ?? "JPY",
      amortizationYears: row.amortization_years ?? 0,
      utilizationRate: row.utilization_rate ?? undefined,
      note: row.note ?? undefined,
    })),
    fees: fees.map((row: any) => ({
      id: row.id,
      name: row.name,
      ratePercent: row.rate_percent ?? 0,
      fixedAmount: row.fixed_amount ?? 0,
      currency: row.currency ?? "JPY",
      note: row.note ?? undefined,
    })),
    optionPresets: optionPresets.map((row: any) => ({
      id: row.id,
      name: row.name,
      variants: Array.isArray(row.variants) ? row.variants : [],
    })),
    products: products.map((row: any) => ({
      id: row.id,
      name: row.name,
      categoryLargeId: row.category_large_id ?? undefined,
      categoryMediumId: row.category_medium_id ?? undefined,
      categorySmallId: row.category_small_id ?? undefined,
      sizeVariants: Array.isArray(row.size_variants) ? row.size_variants : [],
      baseManHours: row.base_man_hours ?? 0,
      defaultElectricityCost: row.default_electricity_cost ?? 0,
      salePrice: row.sale_price ?? 0,
      registeredAt: row.registered_at ?? "",
      notes: row.notes ?? undefined,
      productionLotSize: row.production_lot_size ?? 1,
      expectedProduction: {
        periodYears: row.expected_production_period_years ?? 1,
        quantity: row.expected_production_quantity ?? 0,
      },
      equipmentIds: Array.isArray(row.equipment_ids) ? row.equipment_ids : [],
    })),
  }
}
