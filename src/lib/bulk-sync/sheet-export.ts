import type { AppData, ProductSizeVariant } from "../types"
import type { BulkSyncEntity } from "./types"
import { SHEET_COLUMNS } from "./sheet-columns"

type SheetValues = (string | number | boolean | null)[]

const toText = (value: string | number | boolean | null | undefined) => (value === null || value === undefined ? "" : value)

const serializeVariants = (variants: ProductSizeVariant[]) => {
  if (!variants.length) return ""
  return variants.map((variant) => `${variant.label}:${variant.quantity}`).join("|")
}

type StockMaps = {
  materialStocks?: Map<string, number>
  materialStockUnits?: Map<string, string>
  packagingStocks?: Map<string, number>
  packagingStockUnits?: Map<string, string>
  productStocks?: Map<string, number>
}

export const buildBulkSyncSheetRows = (data: AppData, stocks?: StockMaps) => {
  const categoryLargeById = new Map(data.categories.large.map((item) => [item.id, item.name]))
  const categoryMediumById = new Map(data.categories.medium.map((item) => [item.id, item.name]))
  const categoryMediumToLargeId = new Map(data.categories.medium.map((item) => [item.id, item.largeId]))
  const categorySmallById = new Map(data.categories.small.map((item) => [item.id, item.name]))
  const equipmentById = new Map(data.equipments.map((item) => [item.id, item.name]))

  const rows: Record<BulkSyncEntity, SheetValues[]> = {
    categories_large: data.categories.large.map((item) => [
      item.id,
      item.name,
      item.description ?? "",
      "",
    ]),
    categories_medium: data.categories.medium.map((item) => [
      item.id,
      item.largeId,
      categoryLargeById.get(item.largeId) ?? "",
      item.name,
      item.description ?? "",
      "",
    ]),
    categories_small: data.categories.small.map((item) => [
      item.id,
      item.mediumId,
      categoryLargeById.get(categoryMediumToLargeId.get(item.mediumId) ?? "") ?? "",
      categoryMediumById.get(item.mediumId) ?? "",
      item.name,
      item.description ?? "",
      "",
    ]),
    materials: data.materials.map((item) => [
      item.id,
      item.name,
      item.unit,
      item.sizeDescription,
      item.currency,
      item.unitCost,
      item.unitsPerBatch ?? "",
      item.supplier ?? "",
      item.note ?? "",
      stocks?.materialStocks?.get(item.id) ?? "",
      stocks?.materialStockUnits?.get(item.id) ?? "",
      "",
    ]),
    packaging_items: data.packagingItems.map((item) => [
      item.id,
      item.name,
      item.unit,
      item.sizeDescription,
      item.currency,
      item.unitCost,
      item.unitsPerBatch ?? "",
      item.note ?? "",
      stocks?.packagingStocks?.get(item.id) ?? "",
      stocks?.packagingStockUnits?.get(item.id) ?? "",
      "",
    ]),
    shipping_methods: data.shippingMethods.map((item) => [
      item.id,
      item.name,
      item.description ?? "",
      item.unitCost,
      item.currency,
      item.note ?? "",
      "",
    ]),
    labor_roles: data.laborRoles.map((item) => [
      item.id,
      item.name,
      item.hourlyRate,
      item.currency,
      item.note ?? "",
      "",
    ]),
    equipments: data.equipments.map((item) => [
      item.id,
      item.name,
      item.acquisitionCost,
      item.currency,
      item.amortizationYears,
      item.utilizationRate ?? 100,
      item.note ?? "",
      "",
    ]),
    fees: data.fees.map((item) => [
      item.id,
      item.name,
      item.ratePercent,
      item.fixedAmount,
      item.currency,
      item.note ?? "",
      "",
    ]),
    option_presets: (data.optionPresets ?? []).map((item) => [
      item.id,
      item.name,
      serializeVariants(item.variants ?? []),
      "",
    ]),
    products: data.products.map((item) => [
      item.id,
      "",
      item.name,
      item.categoryLargeId ? categoryLargeById.get(item.categoryLargeId) ?? "" : "",
      item.categoryMediumId ? categoryMediumById.get(item.categoryMediumId) ?? "" : "",
      item.categorySmallId ? categorySmallById.get(item.categorySmallId) ?? "" : "",
      item.salePrice,
      item.baseManHours,
      item.expectedProduction.periodYears,
      item.expectedProduction.quantity,
      serializeVariants(item.sizeVariants),
      item.defaultElectricityCost,
      item.productionLotSize,
      (item.equipmentIds ?? []).map((id) => equipmentById.get(id)).filter(Boolean).join("|"),
      item.notes ?? "",
      stocks?.productStocks?.get(item.id) ?? "",
      "",
    ]),
  }

  const toSheetValues = (entity: BulkSyncEntity) => {
    const header = SHEET_COLUMNS[entity].map((column) => column)
    const dataRows = rows[entity].map((row) => row.map((value) => toText(value)))
    return [header, ...dataRows]
  }

  return {
    categories_large: toSheetValues("categories_large"),
    categories_medium: toSheetValues("categories_medium"),
    categories_small: toSheetValues("categories_small"),
    materials: toSheetValues("materials"),
    packaging_items: toSheetValues("packaging_items"),
    shipping_methods: toSheetValues("shipping_methods"),
    labor_roles: toSheetValues("labor_roles"),
    equipments: toSheetValues("equipments"),
    fees: toSheetValues("fees"),
    option_presets: toSheetValues("option_presets"),
    products: toSheetValues("products"),
  }
}
