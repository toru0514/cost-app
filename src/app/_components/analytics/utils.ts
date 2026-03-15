import type { AppData } from "@/lib/types"
import { calculateProductUnitCosts } from "@/lib/calculations"

export const costKeyConfig = [
  { key: "material", label: "材料", color: "bg-emerald-500" },
  { key: "packaging", label: "梱包", color: "bg-lime-500" },
  { key: "labor", label: "人件費", color: "bg-sky-500" },
  { key: "outsourcing", label: "外注", color: "bg-indigo-500" },
  { key: "development", label: "開発", color: "bg-purple-500" },
  { key: "equipment", label: "設備", color: "bg-amber-500" },
  { key: "logistics", label: "物流", color: "bg-rose-500" },
  { key: "electricity", label: "電気", color: "bg-stone-500" },
  { key: "fees", label: "手数料", color: "bg-orange-600" },
] as const

export type ProductSummary = {
  product: AppData["products"][number]
  costs: ReturnType<typeof calculateProductUnitCosts>
  registeredAt: number
}

export type CostTotals = Record<(typeof costKeyConfig)[number]["key"] | "total" | "totalQuantity" | "productCount" | "totalRevenue", number>

export const monthsRangeOptions = [
  { value: "3", label: "直近3ヶ月" },
  { value: "6", label: "直近6ヶ月" },
  { value: "12", label: "直近12ヶ月" },
  { value: "24", label: "直近24ヶ月" },
]

export const createEmptyTotals = (): CostTotals => ({
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
  totalQuantity: 0,
  productCount: 0,
  totalRevenue: 0,
})

export const aggregateCostTotals = (entries: ProductSummary[]): CostTotals => {
  return entries.reduce((acc, entry) => {
    const { product, costs } = entry
    const quantity = product.expectedProduction.quantity || 1
    acc.material += costs.material * quantity
    acc.packaging += costs.packaging * quantity
    acc.labor += costs.labor * quantity
    acc.outsourcing += costs.outsourcing * quantity
    acc.development += costs.development * quantity
    acc.equipment += costs.equipment * quantity
    acc.logistics += costs.logistics * quantity
    acc.electricity += costs.electricity * quantity
    acc.fees += (costs.fees ?? 0) * quantity
    acc.total += costs.total * quantity
    acc.totalRevenue += (product.salePrice || 0) * quantity
    acc.totalQuantity += quantity
    acc.productCount += 1
    return acc
  }, createEmptyTotals())
}

export const formatDateLabel = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}/${month}/${day}`
}

export const formatRangeLabel = (start: Date, end: Date) => `${formatDateLabel(start)} 〜 ${formatDateLabel(end)}`

export const categoryLevels = [
  {
    level: "large" as const,
    label: "大カテゴリ",
    getId: (product: AppData["products"][number]) => product.categoryLargeId,
    getName: (data: AppData, id?: string | null) =>
      id ? data.categories.large.find((c) => c.id === id)?.name ?? "未分類" : "未分類",
  },
  {
    level: "medium" as const,
    label: "中カテゴリ",
    getId: (product: AppData["products"][number]) => product.categoryMediumId,
    getName: (data: AppData, id?: string | null) =>
      id ? data.categories.medium.find((c) => c.id === id)?.name ?? "未分類" : "未分類",
  },
  {
    level: "small" as const,
    label: "小カテゴリ",
    getId: (product: AppData["products"][number]) => product.categorySmallId,
    getName: (data: AppData, id?: string | null) =>
      id ? data.categories.small.find((c) => c.id === id)?.name ?? "未分類" : "未分類",
  },
]
