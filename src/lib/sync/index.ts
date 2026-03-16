import { supabaseClient } from "../supabase-client"
import type { AppData, AuditLog, Material } from "../types"
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
import {
  mapLarge,
  mapMedium,
  mapSmall,
  mapMaterial,
  mapPackaging,
  mapShipping,
  mapLabor,
  mapEquipment,
  mapFee,
  mapOptionPreset,
  mapProduct,
  mapMaterialEntry,
  mapPackagingEntry,
  mapLaborEntry,
  mapOutsourcingEntry,
  mapDevelopmentEntry,
  mapEquipmentEntry,
  mapLogisticsEntry,
  mapElectricEntry,
  mapFeeEntry,
  mapAuditLog,
} from "./row-mappers"
import { buildSyncPayload, buildAuditMetadata } from "./build-sync-payload"

export * from "./row-types"
export * from "./row-mappers"
export * from "./build-sync-payload"
export * from "./stock-sync"
export * from "./settings-sync"
export * from "./alert-sync"

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

async function fallbackUpsertMaterials(userId: string, materials: Material[]) {
  for (const material of materials) {
    const { error } = await supabaseClient
      .from("materials")
      .upsert(
        {
          id: material.id,
          user_id: userId,
          name: material.name,
          unit: material.unit,
          size_description: material.sizeDescription,
          currency: material.currency,
          unit_cost: material.unitCost,
          use_percentage_mode: Boolean(material.usePercentageMode ?? false),
          supplier: material.supplier ?? null,
          note: material.note ?? null,
          units_per_batch: material.unitsPerBatch ?? null,
          image_url: material.imageUrl ?? null,
        },
        { onConflict: "user_id,id" }
      )
    if (error) {
      console.error(`[sync] Fallback upsert failed for material ${material.id}:`, error)
    } else {
      console.log(`[sync] Fallback upsert succeeded for material "${material.name}" (${material.id.slice(0, 8)})`)
    }
  }
}

export async function saveUserAppData(userId: string, data: AppData, previousData?: AppData) {
  try {
    const payload = buildSyncPayload(data, previousData)
    if (process.env.NODE_ENV !== "production") {
      console.log("[sync] Saving materials:", data.materials.map((m) => ({ id: m.id.slice(0, 8), name: m.name })))
    }

    const { error } = await supabaseClient.rpc("sync_app_data", {
      p_user_id: userId,
      p_payload: payload,
    })
    if (error) {
      throw error
    }

    // 材料の保存を検証し、不一致があればフォールバックで再保存
    if (data.materials.length > 0) {
      const { data: savedMaterials, error: verifyError } = await supabaseClient
        .from("materials")
        .select("id, name, supplier, note, size_description")
        .eq("user_id", userId)
      if (verifyError) {
        console.warn("[sync] Verification query failed:", verifyError)
      } else if (savedMaterials) {
        type SavedRow = { id: string; name: string; supplier: string | null; note: string | null; size_description: string | null }
        const savedMap = new Map(savedMaterials.map((m: SavedRow) => [m.id, m]))
        const mismatched = data.materials.filter((m) => {
          const saved = savedMap.get(m.id)
          if (!saved) return true
          return (
            saved.name !== m.name ||
            (saved.supplier ?? undefined) !== (m.supplier ?? undefined) ||
            (saved.note ?? undefined) !== (m.note ?? undefined) ||
            (saved.size_description ?? undefined) !== (m.sizeDescription ?? undefined)
          )
        })
        if (mismatched.length > 0) {
          console.error("[sync] Material save verification failed:", {
            expected: mismatched.map((m) => ({ id: m.id.slice(0, 8), name: m.name, supplier: m.supplier, note: m.note })),
            actual: mismatched.map((m) => {
              const saved = savedMap.get(m.id)
              return { id: m.id.slice(0, 8), name: saved?.name ?? "NOT_FOUND", supplier: saved?.supplier, note: saved?.note }
            }),
          })
          await fallbackUpsertMaterials(userId, mismatched)
        } else {
          console.log("[sync] Verification passed: all", data.materials.length, "materials match")
        }
      }
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
  return (data ?? []).map((row: AuditLogRow) => mapAuditLog(row))
}
