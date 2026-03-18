import { BarChart3, Box, Boxes, ClipboardList, FileText, LayoutDashboard, Package } from "lucide-react"

export const currencyOptions = ["JPY", "USD", "EUR"] as const

export const tabOptions = [
  { value: "cost", label: "原価サマリ", icon: LayoutDashboard },
  { value: "analytics", label: "集計データ", icon: BarChart3 },
  { value: "product", label: "商品登録", icon: Package },
  { value: "master", label: "マスタ登録", icon: Boxes },
  { value: "list", label: "商品/在庫一覧", icon: ClipboardList },
  { value: "bulk", label: "一括処理", icon: Box },
  { value: "audit", label: "監査ログ", icon: FileText },
] as const

export type TabValue = (typeof tabOptions)[number]["value"]

export const tabPathMap: Record<TabValue, string> = {
  cost: "/cost",
  analytics: "/analytics",
  product: "/product",
  master: "/master",
  list: "/list",
  bulk: "/bulk",
  audit: "/audit",
}

export const SECTION_LABELS: Record<string, string> = {
  category: "カテゴリ",
  material: "材料",
  packaging: "梱包材",
  shipping: "配送",
  fee: "手数料",
  "option-preset": "オプションプリセット",
  labor: "労務・設備",
  equipment: "設備シミュレーション",
  "exchange-rate": "為替レート",
}
