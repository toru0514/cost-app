import type { AppData } from "../types"
import type { BulkSyncEntity, DiffItem, DiffResult, DiffSummary, NormalizedPayload, ValidationIssue } from "./types"
import { SHEET_COLUMNS } from "./sheet-columns"

type ComparableRecord = Record<string, unknown>

const buildSummary = (items: DiffItem[]): DiffSummary => {
  return items.reduce<DiffSummary>(
    (acc, item) => {
      if (item.issueOnly) return acc
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
  const mediumNameById = new Map(existing.categories.medium.map((item) => [item.id, item.name]))
  const smallNameById = new Map(existing.categories.small.map((item) => [item.id, item.name]))
  const equipmentNameById = new Map(existing.equipments.map((item) => [item.id, item.name]))

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
  existing.products.forEach((item) => {
    const categoryLarge = item.categoryLargeId ? largeNameById.get(item.categoryLargeId) : undefined
    const categoryMedium = item.categoryMediumId ? mediumNameById.get(item.categoryMediumId) : undefined
    const categorySmall = item.categorySmallId ? smallNameById.get(item.categorySmallId) : undefined
    const equipmentNames = (item.equipmentIds ?? [])
      .map((id) => equipmentNameById.get(id))
      .filter(Boolean)
      .sort()
    addRecord("products", item.id, item.name, {
      ...item,
      categoryLarge,
      categoryMedium,
      categorySmall,
      equipmentNames,
    })
  })

  return { byId: map, byNaturalKey: naturalMap }
}

const normalizeString = (value: unknown): unknown => {
  if (value === null || value === undefined) return null
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed ? trimmed : null
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null
    return value
  }
  if (typeof value === "boolean") return value
  return value
}

const normalizeNumber = (value: unknown): unknown => {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null
    return value
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    const numeric = Number(trimmed)
    return Number.isFinite(numeric) ? numeric : trimmed
  }
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
        const label = normalizeString((entry as { label?: unknown }).label)
        const quantity = normalizeNumber((entry as { quantity?: unknown }).quantity)
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
        const label = normalizeString(labelRaw)
        const quantity = normalizeNumber(quantityRaw)
        return label ? { label, quantity } : null
      })
      .filter(Boolean)
      .sort((a, b) => String((a as { label: unknown }).label).localeCompare(String((b as { label: unknown }).label)))
    return segments
  }
  return value
}

const toCamelCase = (value: string) => value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())

const numericKeys = new Set([
  "unitCost",
  "unitsPerBatch",
  "hourlyRate",
  "acquisitionCost",
  "amortizationYears",
  "utilizationRate",
  "ratePercent",
  "fixedAmount",
  "salePrice",
  "baseManHours",
  "expectedPeriodYears",
  "expectedQuantity",
  "defaultElectricityCost",
  "productionLotSize",
])

const normalizeValue = (key: string, value: unknown) => {
  if (numericKeys.has(key)) return normalizeNumber(value)
  return normalizeString(value)
}

const normalizeRecord = (
  entity: string,
  record: ComparableRecord | null,
  allowedKeys?: Set<string>,
  fillMissingAsNull = false
) => {
  if (!record) return {}
  const result: ComparableRecord = {}
  Object.entries(record).forEach(([key, value]) => {
    if (value === undefined) return
    if (key === "id") return
    const camelKey = key.includes("_") ? toCamelCase(key) : key
    if (allowedKeys && !allowedKeys.has(camelKey)) return
    if (camelKey === "equipmentNames") {
      result[camelKey] = normalizeDelimited(value)
      return
    }
    if (camelKey === "equipmentIds") {
      result[camelKey] = Array.isArray(value) ? [...value].sort() : value
      return
    }
    if (camelKey === "variants" || camelKey === "sizeVariants") {
      result[camelKey] = normalizeVariants(value)
      return
    }
    result[camelKey] = normalizeValue(camelKey, value)
  })

  if (allowedKeys && fillMissingAsNull) {
    allowedKeys.forEach((key) => {
      if (!(key in result)) {
        result[key] = null
      }
    })
  }

  if (entity === "products") {
    if ("expectedProduction" in result) {
      const expected = result.expectedProduction as { periodYears?: unknown; quantity?: unknown }
      result.expectedPeriodYears = normalizeNumber(expected?.periodYears)
      result.expectedQuantity = normalizeNumber(expected?.quantity)
      delete result.expectedProduction
    }
    if ("productName" in result && !("name" in result)) {
      result.name = result.productName
      delete result.productName
    }
    if ("notes" in result && !("note" in result)) {
      result.note = result.notes
      delete result.notes
    }
    if ("categoryLargeId" in result) {
      delete result.categoryLargeId
    }
    if ("categoryMediumId" in result) {
      delete result.categoryMediumId
    }
    if ("categorySmallId" in result) {
      delete result.categorySmallId
    }
    if ("equipmentIds" in result) {
      delete result.equipmentIds
    }
  }

  return result
}

const ignoredKeysByEntity: Partial<Record<BulkSyncEntity, Set<string>>> = {
  categories_medium: new Set(["largeName"]),
  categories_small: new Set(["largeName", "mediumName"]),
}

const buildAllowedKeys = (entity: BulkSyncEntity) => {
  const ignored = ignoredKeysByEntity[entity]
  const keys = new Set<string>()
  SHEET_COLUMNS[entity].forEach((column) => {
    if (column === "id" || column === "is_deleted" || column === "status") return
    const camelKey = toCamelCase(column)
    if (ignored?.has(camelKey)) return
    keys.add(camelKey)
  })
  return keys
}

const hasRecordChanges = (
  entity: string,
  existingRecord: ComparableRecord | null,
  nextRecord: ComparableRecord,
  allowedKeys: Set<string>
) => {
  const normalizedNext = normalizeRecord(entity, nextRecord, allowedKeys, true)
  const normalizedExisting = normalizeRecord(entity, existingRecord, allowedKeys, true)
  for (const key of allowedKeys) {
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
    const allowedKeys = buildAllowedKeys(entity as BulkSyncEntity)
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
        ? hasRecordChanges(entity, existingRecord, record.data, allowedKeys)
          ? "update"
          : null
        : "create"

      if (!operation) {
        if (recordIssues.length > 0) {
          items.push({
            entity: entity as DiffItem["entity"],
            operation: "update",
            issueOnly: true,
            key: { id: record.id, naturalKey: record.naturalKey },
            before: existingRecord,
            after: record.data,
            issues: recordIssues,
          })
        }
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
