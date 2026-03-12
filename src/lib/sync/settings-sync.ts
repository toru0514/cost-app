import { supabaseClient } from "../supabase-client"
import type { ProductListColumnSettingsRow, TabOrderSettingsRow } from "./row-types"

export async function loadProductListColumnSettings(
  userId: string
): Promise<{ columnOrder: string[]; hiddenColumns: string[] } | null> {
  const { data, error } = await supabaseClient
    .from("product_list_column_settings")
    .select("column_order, hidden_columns")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as ProductListColumnSettingsRow
  return {
    columnOrder: Array.isArray(row.column_order) ? row.column_order : [],
    hiddenColumns: Array.isArray(row.hidden_columns) ? row.hidden_columns : [],
  }
}

export async function upsertProductListColumnSettings(
  userId: string,
  columnOrder: string[],
  hiddenColumns: string[]
): Promise<void> {
  const { error } = await supabaseClient.from("product_list_column_settings").upsert(
    {
      user_id: userId,
      column_order: columnOrder,
      hidden_columns: hiddenColumns,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  )
  if (error) throw error
}

export async function loadTabOrderSettings(
  userId: string
): Promise<{ tabOrder: string[] } | null> {
  const { data, error } = await supabaseClient
    .from("tab_order_settings")
    .select("tab_order")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as TabOrderSettingsRow
  return {
    tabOrder: Array.isArray(row.tab_order) ? row.tab_order : [],
  }
}

export async function upsertTabOrderSettings(
  userId: string,
  tabOrder: string[]
): Promise<void> {
  const { error } = await supabaseClient.from("tab_order_settings").upsert(
    {
      user_id: userId,
      tab_order: tabOrder,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  )
  if (error) throw error
}
