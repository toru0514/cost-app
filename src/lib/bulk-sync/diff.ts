import type { AppData } from "../types"
import type { DiffItem, DiffResult, DiffSummary, NormalizedPayload, ValidationIssue } from "./types"

type ComparableRecord = Record<string, unknown>

const buildSummary = (items: DiffItem[]): DiffSummary => {
  return items.reduce<DiffSummary>(
    (acc, item) => {
      acc.total += 1
      if (item.operation === "create") acc.create += 1
      if (item.operation === "update") acc.update += 1
      if (item.operation === "delete") acc.delete += 1
      return acc
    },
    { total: 0, create: 0, update: 0, delete: 0 }
  )
}

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

const toKey = (entity: string, id?: string, naturalKey?: string) => {
  if (id) return `${entity}#${id}`
  return `${entity}#${naturalKey ?? "(unknown)"}`
}

const buildExistingIndex = (existing: AppData) => {
  const map = new Map<string, Record<string, unknown>>()
  const naturalMap = new Map<string, Record<string, unknown>>()

  const addRecord = (entity: string, id: string, naturalKey: string, record: Record<string, unknown>) => {
    map.set(`${entity}#${id}`, record)
    naturalMap.set(`${entity}#${naturalKey}`, record)
  }

  const largeNameById = new Map(existing.categories.large.map((item) => [item.id, item.name]))
  const mediumById = new Map(existing.categories.medium.map((item) => [item.id, item]))

  existing.categories.large.forEach((item) => addRecord("categories_large", item.id, item.name, item))

  existing.categories.medium.forEach((item) => {
    const largeName = largeNameById.get(item.largeId) ?? item.largeId
    addRecord("categories_medium", item.id, `${largeName}::${item.name}`, item)
  })

  existing.categories.small.forEach((item) => {
    const medium = mediumById.get(item.mediumId)
    const largeName = medium ? largeNameById.get(medium.largeId) : undefined
    const mediumName = medium?.name ?? item.mediumId
    const key = `${largeName ?? ""}::${mediumName}::${item.name}`
    addRecord("categories_small", item.id, key, item)
  })

  existing.materials.forEach((item) => {
    const key = item.supplier ? `${item.name}::${item.supplier}` : item.name
    addRecord("materials", item.id, key, item)
  })

  existing.packagingItems.forEach((item) => addRecord("packaging_items", item.id, item.name, item))
  existing.shippingMethods.forEach((item) => addRecord("shipping_methods", item.id, item.name, item))
  existing.laborRoles.forEach((item) => addRecord("labor_roles", item.id, item.name, item))
  existing.equipments.forEach((item) => addRecord("equipments", item.id, item.name, item))
  existing.fees.forEach((item) => addRecord("fees", item.id, item.name, item))
  existing.optionPresets.forEach((item) => addRecord("option_presets", item.id, item.name, item))
  existing.products.forEach((item) => addRecord("products", item.id, item.name, item))

  return { byId: map, byNaturalKey: naturalMap }
}

const normalizePrimitive = (value: unknown): unknown => {
  if (value === null || value === undefined) return null
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    const lowered = trimmed.toLowerCase()
    if (lowered === "true") return true
    if (lowered === "false") return false
    const numeric = Number(trimmed)
    if (!Number.isNaN(numeric)) return numeric
    return trimmed
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null
    return value
  }
  if (typeof value === "boolean") return value
  return value
}

const normalizeDelimited = (value: unknown) => {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) return value
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    const segments = trimmed
      .split("|")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .sort()
    return segments
  }
  return value
}

const normalizeVariants = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null
        const label = normalizePrimitive((entry as { label?: unknown }).label)
        const quantity = normalizePrimitive((entry as { quantity?: unknown }).quantity)
        return label ? { label, quantity } : null
      })
      .filter(Boolean)
      .sort((a, b) => String((a as { label: unknown }).label).localeCompare(String((b as { label: unknown }).label)))
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed)
        return normalizeVariants(parsed)
      } catch {
        return trimmed
      }
    }
    const segments = trimmed
      .split("|")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .map((segment) => {
        const [labelRaw, quantityRaw] = segment.split(":")
        const label = normalizePrimitive(labelRaw)
        const quantity = normalizePrimitive(quantityRaw)
        return label ? { label, quantity } : null
      })
      .filter(Boolean)
      .sort((a, b) => String((a as { label: unknown }).label).localeCompare(String((b as { label: unknown }).label)))
    return segments
  }
  return value
}

const normalizeRecord = (entity: string, record: ComparableRecord | null) => {
  if (!record) return {}
  const result: ComparableRecord = {}
  Object.entries(record).forEach(([key, value]) => {
    if (value === undefined) return
    if (key === "id") return
    if (key === "equipment_names") {
      result[key] = normalizeDelimited(value)
      return
    }
    if (key === "equipmentIds") {
      result[key] = Array.isArray(value) ? [...value].sort() : value
      return
    }
    if (key === "variants" || key === "size_variants" || key === "sizeVariants") {
      result[key] = normalizeVariants(value)
      return
    }
    result[key] = normalizePrimitive(value)
  })

  if (entity === "products") {
    if ("product_name" in result && !("name" in result)) {
      result.name = result.product_name
      delete result.product_name
    }
    if ("expected_period_years" in result) {
      result.expectedPeriodYears = result.expected_period_years
      delete result.expected_period_years
    }
    if ("expected_quantity" in result) {
      result.expectedQuantity = result.expected_quantity
      delete result.expected_quantity
    }
    if ("base_man_hours" in result) {
      result.baseManHours = result.base_man_hours
      delete result.base_man_hours
    }
    if ("default_electricity_cost" in result) {
      result.defaultElectricityCost = result.default_electricity_cost
      delete result.default_electricity_cost
    }
    if ("production_lot_size" in result) {
      result.productionLotSize = result.production_lot_size
      delete result.production_lot_size
    }
    if ("sale_price" in result) {
      result.salePrice = result.sale_price
      delete result.sale_price
    }
    if ("notes" in result && !("note" in result)) {
      result.note = result.notes
      delete result.notes
    }
    if ("equipment_names" in result) {
      result.equipmentNames = result.equipment_names
      delete result.equipment_names
    }
    if ("category_large" in result) {
      result.categoryLarge = result.category_large
      delete result.category_large
    }
    if ("category_medium" in result) {
      result.categoryMedium = result.category_medium
      delete result.category_medium
    }
    if ("category_small" in result) {
      result.categorySmall = result.category_small
      delete result.category_small
    }
  }

  return result
}

const hasRecordChanges = (entity: string, existingRecord: ComparableRecord | null, nextRecord: ComparableRecord) => {
  const normalizedExisting = normalizeRecord(entity, existingRecord)
  const normalizedNext = normalizeRecord(entity, nextRecord)
  const keys = new Set([...Object.keys(normalizedExisting), ...Object.keys(normalizedNext)])
  for (const key of keys) {
    const left = normalizedExisting[key]
    const right = normalizedNext[key]
    if (Array.isArray(left) || Array.isArray(right)) {
      const leftJson = JSON.stringify(left ?? [])
      const rightJson = JSON.stringify(right ?? [])
      if (leftJson !== rightJson) return true
      continue
    }
    if (left !== right) return true
  }
  return false
}

export const buildBulkSyncDiff = (
  normalized: NormalizedPayload,
  existing: AppData,
  issues: ValidationIssue[]
): DiffResult => {
  const issueMap = buildIssueMap(issues)
  const existingIndex = buildExistingIndex(existing)
  const items: DiffItem[] = []

  Object.entries(normalized).forEach(([entity, records]) => {
    records.forEach((record) => {
      const issueKey = toKey(entity, record.id, record.naturalKey)
      const recordIssues = issueMap.get(issueKey) ?? []
      const byId = record.id ? existingIndex.byId.get(toKey(entity, record.id)) : undefined
      const byNaturalKey = existingIndex.byNaturalKey.get(toKey(entity, record.naturalKey))
      const existingRecord = byId ?? byNaturalKey ?? null

      if (record.isDeleted) {
        items.push({
          entity: entity as DiffItem["entity"],
          operation: "delete",
          key: { id: record.id, naturalKey: record.naturalKey },
          before: existingRecord,
          after: null,
          issues: recordIssues,
        })
        return
      }

      const operation = existingRecord
        ? hasRecordChanges(entity, existingRecord, record.data)
          ? "update"
          : null
        : "create"

      if (!operation) {
        return
      }

      items.push({
        entity: entity as DiffItem["entity"],
        operation,
        key: { id: record.id, naturalKey: record.naturalKey },
        before: existingRecord,
        after: record.data,
        issues: recordIssues,
      })
    })
  })

  return { summary: buildSummary(items), items }
}
