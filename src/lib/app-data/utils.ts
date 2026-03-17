import type { AppData } from "../types"
import { emptyAppData } from "../types"

const ensureArray = <T,>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : [])

export const normalizeAppData = (dataset?: Partial<AppData> | null): AppData => {
  const source = dataset ?? {}
  const categories = (source.categories ?? {}) as Partial<AppData["categories"]>
  const costEntries = (source.costEntries ?? {}) as Partial<AppData["costEntries"]>

  return {
    categories: {
      large: ensureArray(categories.large),
      medium: ensureArray(categories.medium),
      small: ensureArray(categories.small),
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
      materials: ensureArray(costEntries.materials),
      packaging: ensureArray(costEntries.packaging),
      labor: ensureArray(costEntries.labor),
      outsourcing: ensureArray(costEntries.outsourcing),
      development: ensureArray(costEntries.development),
      equipmentAllocations: ensureArray(costEntries.equipmentAllocations),
      logistics: ensureArray(costEntries.logistics),
      electricity: ensureArray(costEntries.electricity),
      fees: ensureArray(costEntries.fees),
    },
  }
}

export const cloneAppData = (dataset: AppData): AppData => JSON.parse(JSON.stringify(dataset))

export const hasMeaningfulData = (dataset: AppData) => {
  if (dataset.products.length > 0) return true
  if (dataset.materials.length > 0) return true
  if (dataset.packagingItems.length > 0) return true
  if ((dataset.shippingMethods ?? []).length > 0) return true
  if (dataset.laborRoles.length > 0) return true
  if (dataset.equipments.length > 0) return true
  if (dataset.fees.length > 0) return true
  if (dataset.optionPresets.length > 0) return true
  if ((dataset.timeRecords ?? []).length > 0) return true
  if (dataset.categories.large.length > 0) return true
  if (dataset.categories.medium.length > 0) return true
  if (dataset.categories.small.length > 0) return true
  const entries = dataset.costEntries
  if (entries.materials.length > 0) return true
  if (entries.packaging.length > 0) return true
  if (entries.labor.length > 0) return true
  if (entries.outsourcing.length > 0) return true
  if (entries.development.length > 0) return true
  if (entries.equipmentAllocations.length > 0) return true
  if (entries.logistics.length > 0) return true
  if (entries.electricity.length > 0) return true
  if (entries.fees.length > 0) return true
  return false
}

export const mergeAppData = (base: AppData, guest: AppData): AppData => {
  const mergeById = <T extends { id: string }>(baseArr: T[], guestArr: T[]): T[] => {
    const existingIds = new Set(baseArr.map((item) => item.id))
    const newItems = guestArr.filter((item) => !existingIds.has(item.id))
    return [...baseArr, ...newItems]
  }
  return {
    categories: {
      large: mergeById(base.categories.large, guest.categories.large),
      medium: mergeById(base.categories.medium, guest.categories.medium),
      small: mergeById(base.categories.small, guest.categories.small),
    },
    materials: mergeById(base.materials, guest.materials),
    packagingItems: mergeById(base.packagingItems, guest.packagingItems),
    shippingMethods: mergeById(base.shippingMethods, guest.shippingMethods),
    laborRoles: mergeById(base.laborRoles, guest.laborRoles),
    equipments: mergeById(base.equipments, guest.equipments),
    fees: mergeById(base.fees, guest.fees),
    optionPresets: mergeById(base.optionPresets, guest.optionPresets),
    products: mergeById(base.products, guest.products),
    timeRecords: mergeById(base.timeRecords ?? [], guest.timeRecords ?? []),
    costEntries: {
      materials: mergeById(base.costEntries.materials, guest.costEntries.materials),
      packaging: mergeById(base.costEntries.packaging, guest.costEntries.packaging),
      labor: mergeById(base.costEntries.labor, guest.costEntries.labor),
      outsourcing: mergeById(base.costEntries.outsourcing, guest.costEntries.outsourcing),
      development: mergeById(base.costEntries.development, guest.costEntries.development),
      equipmentAllocations: mergeById(base.costEntries.equipmentAllocations, guest.costEntries.equipmentAllocations),
      logistics: mergeById(base.costEntries.logistics, guest.costEntries.logistics),
      electricity: mergeById(base.costEntries.electricity, guest.costEntries.electricity),
      fees: mergeById(base.costEntries.fees, guest.costEntries.fees),
    },
  }
}
