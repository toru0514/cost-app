import type { BulkSyncPayload } from "./types"
import { fetchGoogleSheetRows } from "../google-sheets"
import { SHEET_COLUMNS, SHEET_ENTITIES } from "./sheet-columns"

export { SHEET_COLUMNS, SHEET_ENTITIES }

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
