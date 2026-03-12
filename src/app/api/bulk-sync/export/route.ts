import { NextResponse } from "next/server"

import { authenticateApiRequest } from "@/lib/server/api-auth"
import { loadUserAppDataServer } from "@/lib/server/load-app-data"
import { buildBulkSyncSheetRows } from "@/lib/bulk-sync/sheet-export"
import {
  appendGoogleSheetValues,
  clearGoogleSheetRange,
  fetchGoogleSheetRows,
  updateGoogleSheetValues,
} from "@/lib/google-sheets"

export const runtime = "nodejs"

type ExportTarget = "master" | "products"
type ExportMode = "overwrite" | "append"

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request)
  if ("error" in auth) return auth.error
  const { user, supabase } = auth

  let body: { target?: ExportTarget; mode?: ExportMode } | null = null
  try {
    body = (await request.json()) as { target?: ExportTarget; mode?: ExportMode }
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body?.target) {
    return NextResponse.json({ error: "target is required" }, { status: 400 })
  }

  const mode: ExportMode = body.mode ?? "overwrite"

  const { data: sheetSetting, error: sheetError } = await supabase
    .from("sheet_settings")
    .select("spreadsheet_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (sheetError && sheetError.code !== "PGRST116") {
    console.error("Failed to load sheet_settings", sheetError)
    return NextResponse.json({ error: "Failed to load sheet settings" }, { status: 500 })
  }

  const spreadsheetId = sheetSetting?.spreadsheet_id ?? process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  if (!spreadsheetId) {
    return NextResponse.json({ error: "Sheet settings not found" }, { status: 400 })
  }

  try {
    const [appData, materialStocksResult, packagingStocksResult, productStocksResult] = await Promise.all([
      loadUserAppDataServer(supabase, user.id),
      supabase.from("material_stock").select("material_id, quantity, stock_unit").eq("user_id", user.id),
      supabase.from("packaging_stock").select("packaging_item_id, quantity, stock_unit").eq("user_id", user.id),
      supabase.from("product_stock").select("product_id, quantity").eq("user_id", user.id),
    ])

    const materialStocks = new Map(
      (materialStocksResult.data ?? []).map((r) => [r.material_id as string, Number(r.quantity)])
    )
    const materialStockUnits = new Map(
      (materialStocksResult.data ?? [])
        .filter((r) => r.stock_unit)
        .map((r) => [r.material_id as string, r.stock_unit as string])
    )
    const packagingStocks = new Map(
      (packagingStocksResult.data ?? []).map((r) => [r.packaging_item_id as string, Number(r.quantity)])
    )
    const packagingStockUnits = new Map(
      (packagingStocksResult.data ?? [])
        .filter((r) => r.stock_unit)
        .map((r) => [r.packaging_item_id as string, r.stock_unit as string])
    )
    const productStocks = new Map(
      (productStocksResult.data ?? []).map((r) => [r.product_id as string, Number(r.quantity)])
    )

    const sheetRows = buildBulkSyncSheetRows(appData, { materialStocks, materialStockUnits, packagingStocks, packagingStockUnits, productStocks })

    const targets: (keyof typeof sheetRows)[] =
      body.target === "master"
        ? [
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
          ]
        : ["products"]

    for (const sheetName of targets) {
      const values = sheetRows[sheetName]
      if (!values) continue

      const range = `${sheetName}!A1:Z`
      if (mode === "overwrite") {
        await clearGoogleSheetRange(spreadsheetId, range)
        await updateGoogleSheetValues(spreadsheetId, range, values)
      } else {
        const [, ...dataRows] = values
        if (dataRows.length === 0) continue

        const headerCheck = await fetchGoogleSheetRows({
          spreadsheetId,
          range: `${sheetName}!A1:Z1`,
        })
        if (headerCheck.headers.length === 0) {
          await updateGoogleSheetValues(spreadsheetId, range, values)
        } else {
          await appendGoogleSheetValues(spreadsheetId, range, dataRows)
        }
      }
    }

    return NextResponse.json({ status: "ok", target: body.target, mode })
  } catch (error) {
    console.error("Failed to export bulk sync sheet", error)
    return NextResponse.json({ error: "Failed to export sheet" }, { status: 500 })
  }
}
