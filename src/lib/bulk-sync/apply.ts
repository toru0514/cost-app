import type { AppData } from "../types"
import type {
  BulkSyncEntity,
  DiffSummary,
  NormalizedPayload,
  NormalizedRecord,
  ValidationIssue,
} from "./types"

export type BulkSyncApplyError = {
  entity: BulkSyncEntity
  rowIndex?: number
  message: string
  code: "VALIDATION_ERROR" | "NOT_FOUND"
}

export type BulkSyncApplySummary = DiffSummary & {
  success: number
  failed: number
}

export type StockUpsert = { id: string; quantity: number }

export type BulkSyncApplyResult = {
  payload: Record<string, unknown>
  summary: BulkSyncApplySummary
  errors: BulkSyncApplyError[]
  stockUpserts: {
    materials: StockUpsert[]
    packagingItems: StockUpsert[]
    products: StockUpsert[]
  }
}

const issueKey = (entity: BulkSyncEntity, record: NormalizedRecord) => `${entity}#${record.id ?? record.naturalKey}`

const buildIssueMap = (issues: ValidationIssue[]) => {
  const map = new Map<string, ValidationIssue[]>()
  issues.forEach((issue) => {
    const key = `${issue.entity}#${issue.key}`
    const list = map.get(key) ?? []
    list.push(issue)
    map.set(key, list)
  })
  return map
}

type ExistingIndex = {
  byId: Map<string, { id: string; naturalKey: string }>
  byNaturalKey: Map<string, { id: string; naturalKey: string }>
  categoryNames: {
    largeByName: Map<string, string>
    mediumByName: Map<string, { id: string; largeId: string }>
    smallByName: Map<string, { id: string; mediumId: string; largeId: string }>
  }
  equipmentByName: Map<string, string>
}

const buildExistingIndex = (existing: AppData): ExistingIndex => {
  const byId = new Map<string, { id: string; naturalKey: string }>()
  const byNaturalKey = new Map<string, { id: string; naturalKey: string }>()

  const largeNameById = new Map(existing.categories.large.map((item) => [item.id, item.name]))
  const mediumById = new Map(existing.categories.medium.map((item) => [item.id, item]))

  existing.categories.large.forEach((item) => {
    const naturalKey = item.name
    byId.set(`categories_large#${item.id}`, { id: item.id, naturalKey })
    byNaturalKey.set(`categories_large#${naturalKey}`, { id: item.id, naturalKey })
  })

  existing.categories.medium.forEach((item) => {
    const largeName = largeNameById.get(item.largeId) ?? item.largeId
    const naturalKey = `${largeName}::${item.name}`
    byId.set(`categories_medium#${item.id}`, { id: item.id, naturalKey })
    byNaturalKey.set(`categories_medium#${naturalKey}`, { id: item.id, naturalKey })
  })

  existing.categories.small.forEach((item) => {
    const medium = mediumById.get(item.mediumId)
    const largeName = medium ? largeNameById.get(medium.largeId) : undefined
    const mediumName = medium?.name ?? item.mediumId
    const naturalKey = `${largeName ?? ""}::${mediumName}::${item.name}`
    byId.set(`categories_small#${item.id}`, { id: item.id, naturalKey })
    byNaturalKey.set(`categories_small#${naturalKey}`, { id: item.id, naturalKey })
  })

  existing.materials.forEach((item) => {
    const naturalKey = item.supplier ? `${item.name}::${item.supplier}` : item.name
    byId.set(`materials#${item.id}`, { id: item.id, naturalKey })
    byNaturalKey.set(`materials#${naturalKey}`, { id: item.id, naturalKey })
  })

  existing.packagingItems.forEach((item) => {
    const naturalKey = item.name
    byId.set(`packaging_items#${item.id}`, { id: item.id, naturalKey })
    byNaturalKey.set(`packaging_items#${naturalKey}`, { id: item.id, naturalKey })
  })

  existing.shippingMethods.forEach((item) => {
    const naturalKey = item.name
    byId.set(`shipping_methods#${item.id}`, { id: item.id, naturalKey })
    byNaturalKey.set(`shipping_methods#${naturalKey}`, { id: item.id, naturalKey })
  })

  existing.laborRoles.forEach((item) => {
    const naturalKey = item.name
    byId.set(`labor_roles#${item.id}`, { id: item.id, naturalKey })
    byNaturalKey.set(`labor_roles#${naturalKey}`, { id: item.id, naturalKey })
  })

  existing.equipments.forEach((item) => {
    const naturalKey = item.name
    byId.set(`equipments#${item.id}`, { id: item.id, naturalKey })
    byNaturalKey.set(`equipments#${naturalKey}`, { id: item.id, naturalKey })
  })

  existing.fees.forEach((item) => {
    const naturalKey = item.name
    byId.set(`fees#${item.id}`, { id: item.id, naturalKey })
    byNaturalKey.set(`fees#${naturalKey}`, { id: item.id, naturalKey })
  })

  existing.optionPresets.forEach((item) => {
    const naturalKey = item.name
    byId.set(`option_presets#${item.id}`, { id: item.id, naturalKey })
    byNaturalKey.set(`option_presets#${naturalKey}`, { id: item.id, naturalKey })
  })

  existing.products.forEach((item) => {
    const naturalKey = item.name
    byId.set(`products#${item.id}`, { id: item.id, naturalKey })
    byNaturalKey.set(`products#${naturalKey}`, { id: item.id, naturalKey })
  })

  const largeByName = new Map(existing.categories.large.map((item) => [item.name, item.id]))
  const mediumByName = new Map(
    existing.categories.medium.map((item) => [`${item.largeId}::${item.name}`, { id: item.id, largeId: item.largeId }])
  )
  const smallByName = new Map(
    existing.categories.small.map((item) => {
      const medium = mediumById.get(item.mediumId)
      const largeId = medium?.largeId ?? ""
      return [`${largeId}::${item.mediumId}::${item.name}`, { id: item.id, mediumId: item.mediumId, largeId }]
    })
  )

  const equipmentByName = new Map(existing.equipments.map((item) => [item.name, item.id]))

  return {
    byId,
    byNaturalKey,
    categoryNames: {
      largeByName,
      mediumByName,
      smallByName,
    },
    equipmentByName,
  }
}

const resolveExistingId = (index: ExistingIndex, entity: BulkSyncEntity, record: NormalizedRecord) => {
  if (record.id) return record.id
  const byNaturalKey = index.byNaturalKey.get(`${entity}#${record.naturalKey}`)
  return byNaturalKey?.id
}

const buildSummary = (total: number, applied: number, failed: number): BulkSyncApplySummary => ({
  total,
  create: 0,
  update: 0,
  delete: 0,
  success: applied,
  failed,
})

const collectErrors = (issues: ValidationIssue[], records: NormalizedRecord[]) => {
  const errorMap = new Map<string, ValidationIssue[]>()
  issues
    .filter((issue) => issue.severity === "error")
    .forEach((issue) => {
      const key = `${issue.entity}#${issue.key}`
      const list = errorMap.get(key) ?? []
      list.push(issue)
      errorMap.set(key, list)
    })

  return records.flatMap((record) => {
    const key = `${record.entity}#${record.id ?? record.naturalKey}`
    const recordIssues = errorMap.get(key) ?? []
    return recordIssues.map<BulkSyncApplyError>((issue) => ({
      entity: record.entity,
      rowIndex: record.rowIndex,
      message: issue.message,
      code: "VALIDATION_ERROR",
    }))
  })
}

const parseEquipmentNames = (value: unknown) => {
  if (typeof value !== "string") return []
  return value
    .split("|")
    .map((name) => name.trim())
    .filter(Boolean)
}

const getString = (value: unknown) => (typeof value === "string" ? value : undefined)

const getNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined)

export const prepareBulkSyncApply = (
  normalized: NormalizedPayload,
  existing: AppData,
  issues: ValidationIssue[]
): BulkSyncApplyResult => {
  const issueMap = buildIssueMap(issues)
  const existingIndex = buildExistingIndex(existing)
  const failedKeys = new Set<string>()

  const applyRecords: NormalizedRecord[] = []
  const deleteRecords: NormalizedRecord[] = []
  const allRecords: NormalizedRecord[] = []

  Object.values(normalized).forEach((records) => {
    records.forEach((record) => {
      allRecords.push(record)
      const recordIssues = issueMap.get(issueKey(record.entity, record)) ?? []
      const hasError = recordIssues.some((issue) => issue.severity === "error")
      if (hasError) {
        failedKeys.add(issueKey(record.entity, record))
        return
      }
      if (record.isDeleted) {
        deleteRecords.push(record)
      } else {
        applyRecords.push(record)
      }
    })
  })

  const errors = collectErrors(issues, allRecords)

  const addRecordError = (record: NormalizedRecord, message: string, code: BulkSyncApplyError["code"]) => {
    errors.push({
      entity: record.entity,
      rowIndex: record.rowIndex,
      message,
      code,
    })
    failedKeys.add(issueKey(record.entity, record))
  }

  const payload: Record<string, unknown> = {
    categories_large: [],
    categories_large_deleted: [],
    categories_medium: [],
    categories_medium_deleted: [],
    categories_small: [],
    categories_small_deleted: [],
    materials: [],
    materials_deleted: [],
    packaging_items: [],
    packaging_items_deleted: [],
    shipping_methods: [],
    shipping_methods_deleted: [],
    labor_roles: [],
    labor_roles_deleted: [],
    equipments: [],
    equipments_deleted: [],
    fees: [],
    fees_deleted: [],
    option_presets: [],
    option_presets_deleted: [],
    products: [],
    products_deleted: [],
  }

  let createCount = 0
  let updateCount = 0
  let deleteCount = 0

  const stockUpserts: BulkSyncApplyResult["stockUpserts"] = {
    materials: [],
    packagingItems: [],
    products: [],
  }

  const addDelete = (entity: BulkSyncEntity, record: NormalizedRecord) => {
    const resolvedId = resolveExistingId(existingIndex, entity, record)
    if (!resolvedId) {
      addRecordError(record, "削除対象のIDが見つかりません", "NOT_FOUND")
      return
    }
    const target = `${entity}_deleted`
    ;(payload[target] as Array<{ id: string }>).push({ id: resolvedId })
    deleteCount += 1
  }

  deleteRecords.forEach((record) => addDelete(record.entity, record))

  const { largeByName, mediumByName } = existingIndex.categoryNames
  const smallByName = existingIndex.categoryNames.smallByName

  const resolveCategoryIdsForProduct = (record: NormalizedRecord) => {
    const largeName = getString(record.data.category_large)
    const mediumName = getString(record.data.category_medium)
    const smallName = getString(record.data.category_small)

    const largeId = largeName ? largeByName.get(largeName) : undefined
    let mediumId: string | undefined
    if (mediumName && largeId) {
      mediumId = mediumByName.get(`${largeId}::${mediumName}`)?.id
    }
    let smallId: string | undefined
    if (smallName && mediumId) {
      smallId = smallByName.get(`${largeId ?? ""}::${mediumId}::${smallName}`)?.id
    }

    if (largeName && !largeId) {
      addRecordError(record, `カテゴリ(大)が解決できません: ${largeName}`, "NOT_FOUND")
    }

    if (mediumName && !mediumId) {
      addRecordError(record, `カテゴリ(中)が解決できません: ${mediumName}`, "NOT_FOUND")
    }

    if (smallName && !smallId) {
      addRecordError(record, `カテゴリ(小)が解決できません: ${smallName}`, "NOT_FOUND")
    }

    return { largeId, mediumId, smallId }
  }

  const resolveEquipmentIds = (record: NormalizedRecord) => {
    const names = parseEquipmentNames(record.data.equipment_names)
    return names
      .map((name) => ({ name, id: existingIndex.equipmentByName.get(name) }))
      .filter((entry) => {
        if (!entry.id) {
          addRecordError(record, `設備が解決できません: ${entry.name}`, "NOT_FOUND")
          return false
        }
        return true
      })
      .map((entry) => entry.id as string)
  }

  applyRecords.forEach((record) => {
    const recordKey = issueKey(record.entity, record)
    const resolvedId = resolveExistingId(existingIndex, record.entity, record)
    const id = record.id ?? resolvedId

    switch (record.entity) {
      case "categories_large":
        ;(payload.categories_large as Array<Record<string, unknown>>).push({
          id,
          name: record.data.name,
          description: record.data.description ?? null,
        })
        if (resolvedId) updateCount += 1
        else createCount += 1
        break
      case "categories_medium": {
        const largeId = getString(record.data.large_id)
        ;(payload.categories_medium as Array<Record<string, unknown>>).push({
          id,
          name: record.data.name,
          description: record.data.description ?? null,
          large_id: largeId ?? null,
        })
        if (resolvedId) updateCount += 1
        else createCount += 1
        break
      }
      case "categories_small": {
        const mediumId = getString(record.data.medium_id)
        ;(payload.categories_small as Array<Record<string, unknown>>).push({
          id,
          name: record.data.name,
          description: record.data.description ?? null,
          medium_id: mediumId ?? null,
        })
        if (resolvedId) updateCount += 1
        else createCount += 1
        break
      }
      case "materials":
        ;(payload.materials as Array<Record<string, unknown>>).push({
          id,
          name: record.data.name,
          unit: record.data.unit ?? null,
          size_description: record.data.size_description ?? null,
          currency: record.data.currency ?? "JPY",
          unit_cost: record.data.unit_cost ?? null,
          supplier: record.data.supplier ?? null,
          note: record.data.note ?? null,
          units_per_batch: record.data.units_per_batch ?? null,
        })
        if (id) {
          const stock = getNumber(record.data.stock)
          if (stock !== undefined && stock >= 0) stockUpserts.materials.push({ id, quantity: stock })
        }
        if (resolvedId) updateCount += 1
        else createCount += 1
        break
      case "packaging_items":
        ;(payload.packaging_items as Array<Record<string, unknown>>).push({
          id,
          name: record.data.name,
          unit: record.data.unit ?? null,
          size_description: record.data.size_description ?? null,
          currency: record.data.currency ?? "JPY",
          unit_cost: record.data.unit_cost ?? null,
          note: record.data.note ?? null,
          units_per_batch: record.data.units_per_batch ?? null,
        })
        if (id) {
          const stock = getNumber(record.data.stock)
          if (stock !== undefined && stock >= 0) stockUpserts.packagingItems.push({ id, quantity: stock })
        }
        if (resolvedId) updateCount += 1
        else createCount += 1
        break
      case "shipping_methods":
        ;(payload.shipping_methods as Array<Record<string, unknown>>).push({
          id,
          name: record.data.name,
          unit_cost: record.data.unit_cost ?? null,
          currency: record.data.currency ?? "JPY",
          note: record.data.note ?? null,
          description: record.data.description ?? null,
        })
        if (resolvedId) updateCount += 1
        else createCount += 1
        break
      case "labor_roles":
        ;(payload.labor_roles as Array<Record<string, unknown>>).push({
          id,
          name: record.data.name,
          hourly_rate: record.data.hourly_rate ?? null,
          currency: record.data.currency ?? "JPY",
          note: record.data.note ?? null,
        })
        if (resolvedId) updateCount += 1
        else createCount += 1
        break
      case "equipments":
        ;(payload.equipments as Array<Record<string, unknown>>).push({
          id,
          name: record.data.name,
          acquisition_cost: record.data.acquisition_cost ?? null,
          currency: record.data.currency ?? "JPY",
          amortization_years: record.data.amortization_years ?? null,
          utilization_rate: record.data.utilization_rate ?? 100,
          note: record.data.note ?? null,
        })
        if (resolvedId) updateCount += 1
        else createCount += 1
        break
      case "fees":
        ;(payload.fees as Array<Record<string, unknown>>).push({
          id,
          name: record.data.name,
          rate_percent: record.data.rate_percent ?? null,
          fixed_amount: record.data.fixed_amount ?? null,
          currency: record.data.currency ?? "JPY",
          note: record.data.note ?? null,
        })
        if (resolvedId) updateCount += 1
        else createCount += 1
        break
      case "option_presets":
        ;(payload.option_presets as Array<Record<string, unknown>>).push({
          id,
          name: record.data.name,
          variants: record.data.variants ?? [],
        })
        if (resolvedId) updateCount += 1
        else createCount += 1
        break
      case "products": {
        const { largeId, mediumId, smallId } = resolveCategoryIdsForProduct(record)
        const equipmentIds = resolveEquipmentIds(record)
        const registeredAt = getString(record.data.registered_at) ?? new Date().toISOString()
        if (failedKeys.has(recordKey)) return
        ;(payload.products as Array<Record<string, unknown>>).push({
          id,
          name: record.data.product_name,
          category_large_id: largeId ?? null,
          category_medium_id: mediumId ?? null,
          category_small_id: smallId ?? null,
          size_variants: record.data.size_variants ?? [],
          base_man_hours: record.data.base_man_hours ?? null,
          default_electricity_cost: record.data.default_electricity_cost ?? null,
          sale_price: record.data.sale_price ?? null,
          registered_at: registeredAt,
          notes: record.data.notes ?? null,
          production_lot_size: record.data.production_lot_size ?? 1,
          expected_production_period_years: record.data.expected_period_years ?? 1,
          expected_production_quantity: record.data.expected_quantity ?? null,
          equipment_ids: equipmentIds,
        })
        if (id) {
          const stock = getNumber(record.data.stock)
          if (stock !== undefined && stock >= 0) stockUpserts.products.push({ id, quantity: stock })
        }
        if (resolvedId) updateCount += 1
        else createCount += 1
        break
      }
      default:
        break
    }
  })

  const total = allRecords.length
  const failed = Math.min(failedKeys.size, total)
  const success = Math.max(total - failed, 0)

  return {
    payload,
    summary: {
      ...buildSummary(total, success, failed),
      create: createCount,
      update: updateCount,
      delete: deleteCount,
    },
    errors,
    stockUpserts,
  }
}
