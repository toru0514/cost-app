import type { AppData, ExchangeRate } from "./types"

export const MATERIAL_STOCK_LOW_THRESHOLD = 20 // 残量%の警告閾値

/**
 * 外貨金額を基準通貨に変換する
 * @param amount 金額
 * @param fromCurrency 変換元通貨
 * @param exchangeRates 為替レートマップ（通貨コード -> レート）
 * @param baseCurrency 基準通貨（デフォルト: JPY）
 * @returns 基準通貨での金額
 */
export function convertToBaseCurrency(
  amount: number,
  fromCurrency: string,
  exchangeRates: Map<string, number>,
  baseCurrency = "JPY"
): number {
  if (fromCurrency === baseCurrency) return amount
  const rate = exchangeRates.get(fromCurrency) ?? 1
  return amount * rate
}

/**
 * 為替レート配列からMapを作成する
 * 同一通貨に複数のレートがある場合、最新の適用日のものを使用
 */
export function buildExchangeRateMap(exchangeRates: ExchangeRate[]): Map<string, number> {
  const rateMap = new Map<string, number>()
  const sortedRates = [...exchangeRates].sort(
    (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  )
  for (const rate of sortedRates) {
    if (!rateMap.has(rate.fromCurrency)) {
      rateMap.set(rate.fromCurrency, rate.rate)
    }
  }
  return rateMap
}

export type MaterialConsumptionRow = {
  materialId: string
  materialName: string
  unit: string
  usageInputTotal: number | null
  usePercentageMode: boolean
  usagePerProduct: number | null
  totalConsumption: number | null
  currentStock: number | null
  remainingStock: number | null
  remainingPercent: number | null
  isLow: boolean
}

export function calcMaterialConsumption(
  productId: string,
  productionCount: number,
  data: AppData,
  materialStocks: Map<string, number>
): MaterialConsumptionRow[] {
  const grouped = new Map<string, { usageInputTotal: number; material: (typeof data.materials)[0] }>()

  data.costEntries.materials
    .filter((entry) => entry.productId === productId && entry.usageRatio !== undefined)
    .forEach((entry) => {
      const material = data.materials.find((m) => m.id === entry.materialId)
      if (!material) return
      const existing = grouped.get(material.id)
      if (existing) {
        existing.usageInputTotal += entry.usageRatio!
      } else {
        grouped.set(material.id, { usageInputTotal: entry.usageRatio!, material })
      }
    })

  return Array.from(grouped.values()).map(({ usageInputTotal, material }) => {
    const usagePerProduct = material.usePercentageMode ? usageInputTotal / 100 : usageInputTotal
    const totalConsumption = productionCount * usagePerProduct
    const hasStock = materialStocks.has(material.id)
    const currentStock = hasStock ? (materialStocks.get(material.id) ?? 0) : null
    const remainingStock = currentStock !== null ? currentStock - totalConsumption : null
    const remainingPercent =
      currentStock !== null && currentStock > 0 ? (remainingStock! / currentStock) * 100 : null
    const isLow =
      (remainingPercent !== null && remainingPercent < MATERIAL_STOCK_LOW_THRESHOLD) ||
      (currentStock === 0 && totalConsumption > 0)

    return {
      materialId: material.id,
      materialName: material.name,
      unit: material.unit,
      usageInputTotal,
      usePercentageMode: Boolean(material.usePercentageMode),
      usagePerProduct,
      totalConsumption,
      currentStock,
      remainingStock,
      remainingPercent,
      isLow,
    }
  })
}

export function formatCurrency(value: number, currency = "JPY") {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(isFinite(value) ? value : 0)
}

export function calculateProductUnitCosts(productId: string, data: AppData) {
  const product = data.products.find((p) => p.id === productId)
  const quantity = product?.expectedProduction.quantity || 1
  const salePrice = product?.salePrice || 0

  const material = data.costEntries.materials
    .filter((entry) => entry.productId === productId)
    .reduce((sum, entry) => sum + entry.costPerUnit, 0)

  const packaging = data.costEntries.packaging
    .filter((entry) => entry.productId === productId)
    .reduce((sum, entry) => sum + entry.quantity * entry.costPerUnit, 0)

  const labor = data.costEntries.labor
    .filter((entry) => entry.productId === productId)
    .reduce((sum, entry) => {
      const role = data.laborRoles.find((r) => r.id === entry.laborRoleId)
      const hourlyRate = entry.hourlyRateOverride ?? role?.hourlyRate ?? 0
      return sum + hourlyRate * entry.hours * entry.peopleCount
    }, 0)

  const outsourcing = data.costEntries.outsourcing
    .filter((entry) => entry.productId === productId)
    .reduce((sum, entry) => sum + entry.costPerUnit, 0)

  const development = data.costEntries.development
    .filter((entry) => entry.productId === productId)
    .reduce((sum, entry) => {
      const total = entry.prototypeLaborCost + entry.prototypeMaterialCost + entry.toolingCost
      const amortized = total / Math.max(entry.amortizationYears || 1, 1)
      return sum + amortized / Math.max(quantity, 1)
    }, 0)

  const equipmentEntries = data.costEntries.equipmentAllocations.filter((entry) => entry.productId === productId)
  const totalEquipmentHours = equipmentEntries.reduce((sum, entry) => sum + (entry.usageHours ?? 0), 0)

  const equipmentAnnualQuantityMap = data.costEntries.equipmentAllocations.reduce((map, entry) => {
    const product = data.products.find((p) => p.id === entry.productId)
    const fallbackQuantity = product?.expectedProduction.quantity ?? quantity
    const normalizedQuantity = Math.max(Number(entry.annualQuantity) || Number(fallbackQuantity) || 0, 0)
    if (normalizedQuantity <= 0) return map
    map.set(entry.equipmentId, (map.get(entry.equipmentId) ?? 0) + normalizedQuantity)
    return map
  }, new Map<string, number>())

  const equipment = equipmentEntries.reduce((sum, entry) => {
    const equipment = data.equipments.find((eq) => eq.id === entry.equipmentId)
    if (!equipment) return sum
    const utilizationRate = Math.min(Math.max(equipment.utilizationRate ?? 100, 0), 100) / 100
    const annualCost = (equipment.acquisitionCost / Math.max(equipment.amortizationYears || 1, 1)) * utilizationRate
    const ratio =
      totalEquipmentHours > 0 && entry.usageHours !== undefined
        ? entry.usageHours / totalEquipmentHours
        : entry.allocationRatio
    const totalAnnualQuantity = Math.max(
      equipmentAnnualQuantityMap.get(entry.equipmentId) ?? entry.annualQuantity ?? quantity,
      1
    )
    return sum + (annualCost * ratio) / totalAnnualQuantity
  }, 0)

  const logistics = data.costEntries.logistics
    .filter((entry) => entry.productId === productId)
    .reduce((sum, entry) => sum + entry.costPerUnit, 0)

  const electricity = data.costEntries.electricity
    .filter((entry) => entry.productId === productId)
    .reduce((sum, entry) => sum + entry.costPerUnit, 0)

  const fees = data.costEntries.fees
    .filter((entry) => entry.productId === productId)
    .reduce((sum, entry) => {
      const rate = Number(entry.ratePercent) || 0
      const fixed = Number(entry.fixedAmount) || 0
      return sum + (salePrice * rate) / 100 + fixed
    }, 0)

  const total =
    material +
    packaging +
    labor +
    outsourcing +
    development +
    equipment +
    logistics +
    electricity +
    fees

  return {
    material,
    packaging,
    labor,
    outsourcing,
    development,
    equipment,
    logistics,
    electricity,
    fees,
    total,
  }
}
