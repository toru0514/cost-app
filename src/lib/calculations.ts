import type { AppData } from "./types"

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
