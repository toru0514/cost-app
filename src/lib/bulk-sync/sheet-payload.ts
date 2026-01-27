import type { BulkSyncEntity, BulkSyncPayload } from "./types"
import { fetchGoogleSheetRows } from "../google-sheets"

export const SHEET_ENTITIES: BulkSyncEntity[] = [
  "categories_large",
  "categories_medium",
  "categories_small",
  "materials",
  "packaging_items",
  "shipping_methods",
  "labor_roles",
  "equipments",
  "fees",
  "option_presets",
  "products",
]

export const SHEET_COLUMNS: Record<BulkSyncEntity, string[]> = {
  categories_large: ["id", "name", "description", "is_deleted"],
  categories_medium: ["id", "large_id", "large_name", "name", "description", "is_deleted"],
  categories_small: ["id", "medium_id", "large_name", "medium_name", "name", "description", "is_deleted"],
  materials: [
    "id",
    "name",
    "unit",
    "size_description",
    "currency",
    "unit_cost",
    "units_per_batch",
    "supplier",
    "note",
    "is_deleted",
  ],
  packaging_items: [
    "id",
    "name",
    "unit",
    "size_description",
    "currency",
    "unit_cost",
    "units_per_batch",
    "note",
    "is_deleted",
  ],
  shipping_methods: ["id", "name", "description", "unit_cost", "currency", "note", "is_deleted"],
  labor_roles: ["id", "name", "hourly_rate", "currency", "note", "is_deleted"],
  equipments: [
    "id",
    "name",
    "acquisition_cost",
    "currency",
    "amortization_years",
    "utilization_rate",
    "note",
    "is_deleted",
  ],
  fees: ["id", "name", "rate_percent", "fixed_amount", "currency", "note", "is_deleted"],
  option_presets: ["id", "name", "variants", "is_deleted"],
  products: [
    "id",
    "status",
    "product_name",
    "category_large",
    "category_medium",
    "category_small",
    "sale_price",
    "base_man_hours",
    "expected_period_years",
    "expected_quantity",
    "size_variants",
    "default_electricity_cost",
    "production_lot_size",
    "equipment_names",
    "notes",
    "is_deleted",
  ],
}

const pickRowValues = (values: Record<string, string>, columns: string[]) => {
  return columns.reduce<Record<string, string>>((acc, column) => {
    if (column in values) {
      acc[column] = values[column]
    }
    return acc
  }, {})
}

export const fetchBulkSyncSheetPayload = async (spreadsheetId: string) => {
  const results = await Promise.all(
    SHEET_ENTITIES.map(async (entity) => ({
      entity,
      result: await fetchGoogleSheetRows({ spreadsheetId, range: `${entity}!A1:Z` }),
    }))
  )

  const payload = results.reduce<BulkSyncPayload>((acc, { entity, result }) => {
    const columns = SHEET_COLUMNS[entity]
    const records = result.rows.map((row) => pickRowValues(row.values, columns))
    if (entity === "products") {
      const normalized = records.map(({ status: _status, ...rest }) => rest)
      acc[entity] = normalized
    } else {
      acc[entity] = records
    }
    return acc
  }, {})

  return { payload }
}
