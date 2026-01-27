import type { AppData } from "../types"
import type { BulkSyncEntity, DiffItem } from "./types"

type ChangeSummary = {
  added: string[]
  removed: string[]
  updated: string[]
}

type BulkSyncAuditChanges = {
  products?: ChangeSummary
  materials?: ChangeSummary
  packaging?: ChangeSummary
  shippingMethods?: ChangeSummary
  laborRoles?: ChangeSummary
  equipments?: ChangeSummary
  optionPresets?: ChangeSummary
  fees?: ChangeSummary
  categoriesLarge?: ChangeSummary
  categoriesMedium?: ChangeSummary
  categoriesSmall?: ChangeSummary
}

const createSummary = (): ChangeSummary => ({ added: [], removed: [], updated: [] })

const mapEntity = (entity: BulkSyncEntity) => {
  switch (entity) {
    case "products":
      return "products"
    case "materials":
      return "materials"
    case "packaging_items":
      return "packaging"
    case "shipping_methods":
      return "shippingMethods"
    case "labor_roles":
      return "laborRoles"
    case "equipments":
      return "equipments"
    case "fees":
      return "fees"
    case "option_presets":
      return "optionPresets"
    case "categories_large":
      return "categoriesLarge"
    case "categories_medium":
      return "categoriesMedium"
    case "categories_small":
      return "categoriesSmall"
    default:
      return null
  }
}

const toLabel = (entity: BulkSyncEntity, item: DiffItem, existing: AppData) => {
  if (item.key.naturalKey) return item.key.naturalKey
  if (!item.key.id) return "(unknown)"
  const id = item.key.id
  switch (entity) {
    case "products":
      return existing.products.find((entry) => entry.id === id)?.name ?? id
    case "materials":
      return existing.materials.find((entry) => entry.id === id)?.name ?? id
    case "packaging_items":
      return existing.packagingItems.find((entry) => entry.id === id)?.name ?? id
    case "shipping_methods":
      return existing.shippingMethods.find((entry) => entry.id === id)?.name ?? id
    case "labor_roles":
      return existing.laborRoles.find((entry) => entry.id === id)?.name ?? id
    case "equipments":
      return existing.equipments.find((entry) => entry.id === id)?.name ?? id
    case "fees":
      return existing.fees.find((entry) => entry.id === id)?.name ?? id
    case "option_presets":
      return existing.optionPresets.find((entry) => entry.id === id)?.name ?? id
    case "categories_large":
      return existing.categories.large.find((entry) => entry.id === id)?.name ?? id
    case "categories_medium":
      return existing.categories.medium.find((entry) => entry.id === id)?.name ?? id
    case "categories_small":
      return existing.categories.small.find((entry) => entry.id === id)?.name ?? id
    default:
      return id
  }
}

const pushUnique = (list: string[], value: string) => {
  if (!value) return
  if (list.includes(value)) return
  list.push(value)
}

export const buildBulkSyncAuditChanges = (items: DiffItem[], existing: AppData): BulkSyncAuditChanges => {
  const changes: BulkSyncAuditChanges = {}

  items.forEach((item) => {
    const mapped = mapEntity(item.entity)
    if (!mapped) return
    const summary = changes[mapped] ?? createSummary()
    const label = toLabel(item.entity, item, existing)

    switch (item.operation) {
      case "create":
        pushUnique(summary.added, label)
        break
      case "delete":
        pushUnique(summary.removed, label)
        break
      case "update":
        pushUnique(summary.updated, label)
        break
      default:
        break
    }

    changes[mapped] = summary
  })

  return changes
}
