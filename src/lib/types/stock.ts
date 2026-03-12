export type StockAlertSetting = {
  itemType: "product" | "material" | "packaging"
  itemId: string
  enabled: boolean
  threshold: number
}
