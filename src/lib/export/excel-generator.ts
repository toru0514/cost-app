import ExcelJS from "exceljs"
import type { AppData } from "@/lib/types"
import { generateCostReportData, type CostReportData } from "./pdf-generator"

export async function generateExcel(data: AppData): Promise<Blob> {
  const reportData = generateCostReportData(data)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Cost App"
  workbook.created = new Date()

  // サマリーシート
  const summarySheet = workbook.addWorksheet("原価サマリ")
  createSummarySheet(summarySheet, reportData)

  // 詳細シート（商品ごと）
  const detailSheet = workbook.addWorksheet("商品別詳細")
  createDetailSheet(detailSheet, data, reportData)

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}

function createSummarySheet(sheet: ExcelJS.Worksheet, reportData: CostReportData[]) {
  // ヘッダー行
  const headers = [
    "商品名",
    "材料費",
    "梱包費",
    "人件費",
    "外注費",
    "開発費",
    "設備費",
    "物流費",
    "電気代",
    "手数料",
    "原価合計",
    "販売価格",
    "利益率(%)",
  ]

  const headerRow = sheet.addRow(headers)
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF424242" },
  }
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
  headerRow.alignment = { horizontal: "center" }

  // データ行
  reportData.forEach((row) => {
    const dataRow = sheet.addRow([
      row.productName,
      row.material,
      row.packaging,
      row.labor,
      row.outsourcing,
      row.development,
      row.equipment,
      row.logistics,
      row.electricity,
      row.fees,
      row.total,
      row.salePrice,
      row.profitMargin,
    ])

    // 数値列の書式設定
    for (let i = 2; i <= 12; i++) {
      const cell = dataRow.getCell(i)
      cell.numFmt = "#,##0"
      cell.alignment = { horizontal: "right" }
    }
    // 利益率は%表示
    const marginCell = dataRow.getCell(13)
    marginCell.numFmt = "0.0%"
    marginCell.value = row.profitMargin / 100
    marginCell.alignment = { horizontal: "right" }
  })

  // 合計行
  const totals = reportData.reduce(
    (acc, row) => ({
      material: acc.material + row.material,
      packaging: acc.packaging + row.packaging,
      labor: acc.labor + row.labor,
      outsourcing: acc.outsourcing + row.outsourcing,
      development: acc.development + row.development,
      equipment: acc.equipment + row.equipment,
      logistics: acc.logistics + row.logistics,
      electricity: acc.electricity + row.electricity,
      fees: acc.fees + row.fees,
      total: acc.total + row.total,
      salePrice: acc.salePrice + row.salePrice,
    }),
    {
      material: 0,
      packaging: 0,
      labor: 0,
      outsourcing: 0,
      development: 0,
      equipment: 0,
      logistics: 0,
      electricity: 0,
      fees: 0,
      total: 0,
      salePrice: 0,
    }
  )

  const avgMargin = totals.salePrice > 0 ? (totals.salePrice - totals.total) / totals.salePrice : 0

  const totalRow = sheet.addRow([
    "合計",
    totals.material,
    totals.packaging,
    totals.labor,
    totals.outsourcing,
    totals.development,
    totals.equipment,
    totals.logistics,
    totals.electricity,
    totals.fees,
    totals.total,
    totals.salePrice,
    avgMargin,
  ])

  totalRow.font = { bold: true }
  totalRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF0F0F0" },
  }

  for (let i = 2; i <= 12; i++) {
    const cell = totalRow.getCell(i)
    cell.numFmt = "#,##0"
    cell.alignment = { horizontal: "right" }
  }
  const totalMarginCell = totalRow.getCell(13)
  totalMarginCell.numFmt = "0.0%"
  totalMarginCell.alignment = { horizontal: "right" }

  // 列幅調整
  sheet.getColumn(1).width = 25
  for (let i = 2; i <= 13; i++) {
    sheet.getColumn(i).width = 12
  }

  // 罫線
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      }
    })
  })
}

function createDetailSheet(sheet: ExcelJS.Worksheet, data: AppData, reportData: CostReportData[]) {
  // ヘッダー
  const headers = ["カテゴリ", "項目", "単価/金額", "備考"]
  const headerRow = sheet.addRow(headers)
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF424242" },
  }
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }

  // 商品ごとにセクションを作成
  data.products.forEach((product, index) => {
    const costData = reportData.find((r) => r.productName === product.name)
    if (!costData) return

    // 商品名行
    if (index > 0) {
      sheet.addRow([]) // 空行
    }
    const productRow = sheet.addRow([product.name])
    productRow.font = { bold: true, size: 12 }
    productRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE3F2FD" },
    }
    sheet.mergeCells(productRow.number, 1, productRow.number, 4)

    // コストカテゴリ
    const costCategories = [
      { name: "材料費", value: costData.material },
      { name: "梱包費", value: costData.packaging },
      { name: "人件費", value: costData.labor },
      { name: "外注費", value: costData.outsourcing },
      { name: "開発費", value: costData.development },
      { name: "設備費", value: costData.equipment },
      { name: "物流費", value: costData.logistics },
      { name: "電気代", value: costData.electricity },
      { name: "手数料", value: costData.fees },
    ]

    costCategories.forEach((category) => {
      const row = sheet.addRow(["", category.name, category.value, ""])
      row.getCell(3).numFmt = "#,##0"
      row.getCell(3).alignment = { horizontal: "right" }
    })

    // 小計行
    const subtotalRow = sheet.addRow(["", "原価合計", costData.total, ""])
    subtotalRow.font = { bold: true }
    subtotalRow.getCell(3).numFmt = "#,##0"
    subtotalRow.getCell(3).alignment = { horizontal: "right" }

    // 販売価格・利益率
    const priceRow = sheet.addRow(["", "販売価格", costData.salePrice, ""])
    priceRow.getCell(3).numFmt = "#,##0"
    priceRow.getCell(3).alignment = { horizontal: "right" }

    const marginRow = sheet.addRow(["", "利益率", costData.profitMargin / 100, ""])
    marginRow.getCell(3).numFmt = "0.0%"
    marginRow.getCell(3).alignment = { horizontal: "right" }
  })

  // 列幅調整
  sheet.getColumn(1).width = 25
  sheet.getColumn(2).width = 15
  sheet.getColumn(3).width = 15
  sheet.getColumn(4).width = 30
}
