import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { AppData } from "@/lib/types"
import { calculateProductUnitCosts, formatCurrency } from "@/lib/calculations"

export type CostReportData = {
  productName: string
  material: number
  packaging: number
  labor: number
  outsourcing: number
  development: number
  equipment: number
  logistics: number
  electricity: number
  fees: number
  total: number
  salePrice: number
  profitMargin: number
}

export function generateCostReportData(data: AppData): CostReportData[] {
  return data.products.map((product) => {
    const costs = calculateProductUnitCosts(product.id, data)
    const salePrice = product.salePrice ?? 0
    const profitMargin = salePrice > 0 ? ((salePrice - costs.total) / salePrice) * 100 : 0

    return {
      productName: product.name,
      material: costs.material,
      packaging: costs.packaging,
      labor: costs.labor,
      outsourcing: costs.outsourcing,
      development: costs.development,
      equipment: costs.equipment,
      logistics: costs.logistics,
      electricity: costs.electricity,
      fees: costs.fees,
      total: costs.total,
      salePrice,
      profitMargin,
    }
  })
}

export async function generatePdf(data: AppData): Promise<Blob> {
  const reportData = generateCostReportData(data)

  // A4横向き
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

  // フォント設定（日本語対応のためMSゴシックを指定）
  doc.setFont("helvetica")

  // タイトル
  const title = "Cost Report - " + encodeURIComponent("原価レポート")
  doc.setFontSize(16)
  doc.text("Cost Report", 14, 15)

  // 生成日時
  doc.setFontSize(10)
  const now = new Date().toLocaleString("ja-JP")
  doc.text(`Generated: ${now}`, 14, 22)

  // テーブルヘッダー
  const headers = [
    ["Product", "Material", "Packaging", "Labor", "Outsourcing", "Development", "Equipment", "Logistics", "Electricity", "Fees", "Total", "Sale Price", "Margin %"],
  ]

  // テーブルデータ
  const tableData = reportData.map((row) => [
    row.productName,
    formatNumber(row.material),
    formatNumber(row.packaging),
    formatNumber(row.labor),
    formatNumber(row.outsourcing),
    formatNumber(row.development),
    formatNumber(row.equipment),
    formatNumber(row.logistics),
    formatNumber(row.electricity),
    formatNumber(row.fees),
    formatNumber(row.total),
    formatNumber(row.salePrice),
    row.profitMargin.toFixed(1) + "%",
  ])

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

  const avgMargin = totals.salePrice > 0 ? ((totals.salePrice - totals.total) / totals.salePrice) * 100 : 0

  tableData.push([
    "TOTAL",
    formatNumber(totals.material),
    formatNumber(totals.packaging),
    formatNumber(totals.labor),
    formatNumber(totals.outsourcing),
    formatNumber(totals.development),
    formatNumber(totals.equipment),
    formatNumber(totals.logistics),
    formatNumber(totals.electricity),
    formatNumber(totals.fees),
    formatNumber(totals.total),
    formatNumber(totals.salePrice),
    avgMargin.toFixed(1) + "%",
  ])

  autoTable(doc, {
    head: headers,
    body: tableData,
    startY: 28,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [66, 66, 66],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 35 }, // Product name
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
      9: { halign: "right" },
      10: { halign: "right" },
      11: { halign: "right" },
      12: { halign: "right" },
    },
    didParseCell: (hookData) => {
      // 最終行（合計行）のスタイル
      if (hookData.row.index === tableData.length - 1) {
        hookData.cell.styles.fillColor = [240, 240, 240]
        hookData.cell.styles.fontStyle = "bold"
      }
    },
  })

  return doc.output("blob")
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}
