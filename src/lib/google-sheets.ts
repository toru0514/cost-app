import { google } from "googleapis"

type SheetRow = {
  rowNumber: number
  values: Record<string, string>
}

type FetchOptions = {
  range?: string
  spreadsheetId?: string
  worksheetTitle?: string
}

const SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"]

export const ensureEnv = (key: string) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`${key} is not defined`)
  }
  return value
}

export const loadServiceAccount = () => {
  const base64 = ensureEnv("GOOGLE_SERVICE_ACCOUNT_BASE64")
  try {
    const json = Buffer.from(base64, "base64").toString("utf-8")
    return JSON.parse(json)
  } catch (error) {
    console.error("Failed to parse Google service account env", error)
    throw new Error("Failed to parse GOOGLE_SERVICE_ACCOUNT_BASE64")
  }
}

const buildSheetsClient = () => {
  const creds = loadServiceAccount()
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: SHEETS_SCOPE,
  })
  return google.sheets({ version: "v4", auth })
}

export async function fetchGoogleSheetRows(options: FetchOptions = {}) {
  const spreadsheetId = options.spreadsheetId ?? ensureEnv("GOOGLE_SHEETS_SPREADSHEET_ID")
  const worksheetTitle = options.worksheetTitle ?? (options.range ? undefined : ensureEnv("GOOGLE_SHEETS_WORKSHEET_TITLE"))
  const range = options.range ?? `${worksheetTitle}!A1:Z`

  const sheets = buildSheetsClient()
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range })
  const values = response.data.values ?? []
  if (values.length === 0) {
    return { headers: [] as string[], rows: [] as SheetRow[], range }
  }

  const [headerRow, ...dataRows] = values
  const headers = (headerRow ?? []).map((header) => header?.toString().trim() ?? "" )

  const rows = dataRows
    .map((cells, index) => {
      const rowNumber = index + 2
      let hasValue = false
      const normalized: Record<string, string> = {}
      headers.forEach((header, headerIndex) => {
        if (!header) return
        const cellValue = cells?.[headerIndex]
        const text = typeof cellValue === "string" ? cellValue.trim() : cellValue?.toString() ?? ""
        if (text.length > 0) {
          hasValue = true
        }
        normalized[header] = text
      })
      return hasValue ? { rowNumber, values: normalized } : null
    })
    .filter((row): row is SheetRow => Boolean(row))

  return { headers, rows, range }
}

export type GoogleSheetResult = Awaited<ReturnType<typeof fetchGoogleSheetRows>>

export async function clearGoogleSheetRange(spreadsheetId: string, range: string) {
  const sheets = buildSheetsClient()
  await sheets.spreadsheets.values.clear({ spreadsheetId, range })
}

export async function updateGoogleSheetValues(spreadsheetId: string, range: string, values: (string | number | boolean | null)[][]) {
  const sheets = buildSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  })
}

export async function appendGoogleSheetValues(spreadsheetId: string, range: string, values: (string | number | boolean | null)[][]) {
  const sheets = buildSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  })
}
