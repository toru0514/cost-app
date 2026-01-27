import type { AppData } from "../types"
import type { DiffItem, DiffResult, DiffSummary, NormalizedPayload, ValidationIssue } from "./types"

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

      items.push({
        entity: entity as DiffItem["entity"],
        operation: existingRecord ? "update" : "create",
        key: { id: record.id, naturalKey: record.naturalKey },
        before: existingRecord,
        after: record.data,
        issues: recordIssues,
      })
    })
  })

  return { summary: buildSummary(items), items }
}
