import { supabaseClient } from "../supabase-client"
import type { StockAlertSetting } from "../types"
import type { StockAlertSettingRow } from "./row-types"

export async function loadStockAlertSettings(userId: string): Promise<StockAlertSetting[]> {
  const { data, error } = await supabaseClient
    .from("stock_alert_settings")
    .select("item_type, item_id, enabled, threshold")
    .eq("user_id", userId)
  if (error) throw error
  return (data ?? []).map((row: StockAlertSettingRow) => ({
    itemType: row.item_type as StockAlertSetting["itemType"],
    itemId: row.item_id,
    enabled: row.enabled,
    threshold: row.threshold,
  }))
}

export async function upsertStockAlertSetting(
  userId: string,
  itemType: StockAlertSetting["itemType"],
  itemId: string,
  enabled: boolean,
  threshold: number
): Promise<void> {
  const { error } = await supabaseClient.from("stock_alert_settings").upsert(
    {
      user_id: userId,
      item_type: itemType,
      item_id: itemId,
      enabled,
      threshold,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,item_type,item_id" }
  )
  if (error) throw error
}
