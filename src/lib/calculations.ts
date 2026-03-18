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
 * baseCurrencyへの変換レートのみを抽出する
 */
export function buildExchangeRateMap(exchangeRates: ExchangeRate[], baseCurrency = "JPY"): Map<string, number> {
  const rateMap = new Map<string, number>()
  const sortedRates = [...exchangeRates].sort(
    (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  )
  for (const rate of sortedRates) {
    if (rate.toCurrency !== baseCurrency) continue
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

/**
 * 原価シミュレーション用の変動率型
 * 1.0 = 変動なし、1.1 = 10%増、0.9 = 10%減
 */
export type CostVarianceRates = {
  material?: number
  packaging?: number
  labor?: number
  outsourcing?: number
  development?: number
  equipment?: number
  logistics?: number
  electricity?: number
  fees?: number
}

export type SimulatedProductCosts = {
  original: ReturnType<typeof calculateProductUnitCosts>
  simulated: ReturnType<typeof calculateProductUnitCosts>
  diff: ReturnType<typeof calculateProductUnitCosts>
}

/**
 * 変動率を適用した原価シミュレーションを計算
 */
export function simulateProductCosts(
  productId: string,
  data: AppData,
  rates: CostVarianceRates,
  exchangeRateMap?: Map<string, number>
): SimulatedProductCosts {
  const original = calculateProductUnitCosts(productId, data, exchangeRateMap)

  const materialRate = rates.material ?? 1
  const packagingRate = rates.packaging ?? 1
  const laborRate = rates.labor ?? 1
  const outsourcingRate = rates.outsourcing ?? 1
  const developmentRate = rates.development ?? 1
  const equipmentRate = rates.equipment ?? 1
  const logisticsRate = rates.logistics ?? 1
  const electricityRate = rates.electricity ?? 1
  const feesRate = rates.fees ?? 1

  const simulated = {
    material: original.material * materialRate,
    packaging: original.packaging * packagingRate,
    labor: original.labor * laborRate,
    outsourcing: original.outsourcing * outsourcingRate,
    development: original.development * developmentRate,
    equipment: original.equipment * equipmentRate,
    logistics: original.logistics * logisticsRate,
    electricity: original.electricity * electricityRate,
    fees: original.fees * feesRate,
    total: 0,
  }

  simulated.total =
    simulated.material +
    simulated.packaging +
    simulated.labor +
    simulated.outsourcing +
    simulated.development +
    simulated.equipment +
    simulated.logistics +
    simulated.electricity +
    simulated.fees

  const diff = {
    material: simulated.material - original.material,
    packaging: simulated.packaging - original.packaging,
    labor: simulated.labor - original.labor,
    outsourcing: simulated.outsourcing - original.outsourcing,
    development: simulated.development - original.development,
    equipment: simulated.equipment - original.equipment,
    logistics: simulated.logistics - original.logistics,
    electricity: simulated.electricity - original.electricity,
    fees: simulated.fees - original.fees,
    total: simulated.total - original.total,
  }

  return { original, simulated, diff }
}

export function calculateProductUnitCosts(productId: string, data: AppData, exchangeRateMap?: Map<string, number>) {
  const convert = (amount: number, currency: string) =>
    exchangeRateMap ? convertToBaseCurrency(amount, currency, exchangeRateMap) : amount

  const product = data.products.find((p) => p.id === productId)
  const quantity = product?.expectedProduction.quantity || 1
  const salePrice = product?.salePrice || 0

  const material = data.costEntries.materials
    .filter((entry) => entry.productId === productId)
    .reduce((sum, entry) => sum + convert(entry.costPerUnit, entry.currency), 0)

  const packaging = data.costEntries.packaging
    .filter((entry) => entry.productId === productId)
    .reduce((sum, entry) => sum + convert(entry.quantity * entry.costPerUnit, entry.currency), 0)

  const labor = data.costEntries.labor
    .filter((entry) => entry.productId === productId)
    .reduce((sum, entry) => {
      const role = data.laborRoles.find((r) => r.id === entry.laborRoleId)
      const hourlyRate = entry.hourlyRateOverride ?? role?.hourlyRate ?? 0
      const currency = role?.currency ?? "JPY"
      return sum + convert(hourlyRate * entry.hours * entry.peopleCount, currency)
    }, 0)

  const outsourcing = data.costEntries.outsourcing
    .filter((entry) => entry.productId === productId)
    .reduce((sum, entry) => sum + convert(entry.costPerUnit, entry.currency), 0)

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
    const eq = data.equipments.find((e) => e.id === entry.equipmentId)
    if (!eq) return sum
    const utilizationRate = Math.min(Math.max(eq.utilizationRate ?? 100, 0), 100) / 100
    const annualCost = (eq.acquisitionCost / Math.max(eq.amortizationYears || 1, 1)) * utilizationRate
    const ratio =
      totalEquipmentHours > 0 && entry.usageHours !== undefined
        ? entry.usageHours / totalEquipmentHours
        : entry.allocationRatio
    const totalAnnualQuantity = Math.max(
      equipmentAnnualQuantityMap.get(entry.equipmentId) ?? entry.annualQuantity ?? quantity,
      1
    )
    const costPerUnit = (annualCost * ratio) / totalAnnualQuantity
    return sum + convert(costPerUnit, eq.currency)
  }, 0)

  const logistics = data.costEntries.logistics
    .filter((entry) => entry.productId === productId)
    .reduce((sum, entry) => sum + convert(entry.costPerUnit, entry.currency), 0)

  const electricity = data.costEntries.electricity
    .filter((entry) => entry.productId === productId)
    .reduce((sum, entry) => sum + convert(entry.costPerUnit, entry.currency), 0)

  const fees = data.costEntries.fees
    .filter((entry) => entry.productId === productId)
    .reduce((sum, entry) => {
      const rate = Number(entry.ratePercent) || 0
      const fixed = Number(entry.fixedAmount) || 0
      return sum + (salePrice * rate) / 100 + convert(fixed, entry.currency)
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

export type ActualLaborByProcess = {
  processId: string
  processName: string
  avgMinutes: number
  hourlyRate: number
  cost: number
  recordCount: number
}

export type EffectiveProfitResult = {
  /** 実績人件費合計 */
  actualLaborCost: number
  /** 工程別内訳 */
  actualLaborByProcess: ActualLaborByProcess[]
  /** 実質原価 = 原価(人件費除く) + 実績人件費 */
  actualTotal: number
  /** 実質利益率 (%) */
  effectiveProfitRate: number | null
  /** 実質時給 = (販売価格 - 原価(人件費除く)) / 実績合計時間(H) */
  effectiveHourlyRate: number | null
  /** 実績合計時間（時間） */
  actualTotalHours: number
  /** 計測回数（最小の工程の回数） */
  minRecordCount: number
}

/**
 * Build an index of timeRecords grouped by productProcessId for O(1) lookup.
 * Call once and pass to calculateEffectiveProfitRate to avoid O(N*M*R) filtering.
 */
export function buildTimeRecordIndex(data: AppData): Map<string, typeof data.timeRecords> {
  const map = new Map<string, typeof data.timeRecords>()
  for (const tr of data.timeRecords) {
    if (!tr.productProcessId) continue
    const list = map.get(tr.productProcessId)
    if (list) {
      list.push(tr)
    } else {
      map.set(tr.productProcessId, [tr])
    }
  }
  return map
}

export function calculateEffectiveProfitRate(
  productId: string,
  data: AppData,
  exchangeRateMap?: Map<string, number>,
  precomputedCosts?: ReturnType<typeof calculateProductUnitCosts>,
  timeRecordIndex?: Map<string, typeof data.timeRecords>,
): EffectiveProfitResult {
  const unitCosts = precomputedCosts ?? calculateProductUnitCosts(productId, data, exchangeRateMap)
  const product = data.products.find((p) => p.id === productId)
  const salePrice = product?.salePrice || 0

  // 商品に紐づく工程を取得
  const processes = data.productProcesses.filter((pp) => pp.productId === productId)

  // 工程ごとの実績時間を集計
  const actualLaborByProcess: ActualLaborByProcess[] = processes.map((process) => {
    const records = timeRecordIndex
      ? (timeRecordIndex.get(process.id) ?? [])
      : data.timeRecords.filter((tr) => tr.productProcessId === process.id)
    const totalMs = records.reduce((sum, r) => sum + r.totalDuration, 0)
    const avgMs = records.length > 0 ? totalMs / records.length : 0
    const avgMinutes = avgMs / 60000
    const cost = (avgMinutes / 60) * process.hourlyRate

    return {
      processId: process.id,
      processName: process.name,
      avgMinutes,
      hourlyRate: process.hourlyRate,
      cost,
      recordCount: records.length,
    }
  })

  const actualLaborCost = actualLaborByProcess.reduce((sum, p) => sum + p.cost, 0)
  const costWithoutLabor = unitCosts.total - unitCosts.labor
  const actualTotal = costWithoutLabor + actualLaborCost
  const actualTotalHours = actualLaborByProcess.reduce((sum, p) => sum + p.avgMinutes / 60, 0)
  const minRecordCount = actualLaborByProcess.length > 0
    ? Math.min(...actualLaborByProcess.map((p) => p.recordCount))
    : 0

  const effectiveProfitRate = salePrice > 0 && minRecordCount > 0
    ? ((salePrice - actualTotal) / salePrice) * 100
    : null

  const effectiveHourlyRate = actualTotalHours > 0 && minRecordCount > 0
    ? (salePrice - costWithoutLabor) / actualTotalHours
    : null

  return {
    actualLaborCost,
    actualLaborByProcess,
    actualTotal,
    effectiveProfitRate,
    effectiveHourlyRate,
    actualTotalHours,
    minRecordCount,
  }
}
