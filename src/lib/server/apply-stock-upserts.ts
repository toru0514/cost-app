import type { SupabaseClient } from "@supabase/supabase-js"
import type { BulkSyncApplyResult } from "@/lib/bulk-sync/apply"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function applyStockUpserts(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  stockUpserts: BulkSyncApplyResult["stockUpserts"]
) {
  const now = new Date().toISOString()
  const results = await Promise.allSettled([
    ...stockUpserts.materials.map(({ id, quantity }) =>
      supabase
        .from("material_stock")
        .upsert({ user_id: userId, material_id: id, quantity, updated_at: now }, { onConflict: "user_id,material_id" })
    ),
    ...stockUpserts.packagingItems.map(({ id, quantity }) =>
      supabase
        .from("packaging_stock")
        .upsert(
          { user_id: userId, packaging_item_id: id, quantity, updated_at: now },
          { onConflict: "user_id,packaging_item_id" }
        )
    ),
    ...stockUpserts.products.map(({ id, quantity }) =>
      supabase
        .from("product_stock")
        .upsert({ user_id: userId, product_id: id, quantity, updated_at: now }, { onConflict: "user_id,product_id" })
    ),
  ])
  results.forEach((result) => {
    if (result.status === "rejected") {
      console.warn("Failed to upsert stock during bulk sync", result.reason)
    } else if (result.value?.error) {
      console.warn("Failed to upsert stock during bulk sync", result.value.error)
    }
  })
}
