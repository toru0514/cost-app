import { supabaseClient } from "../supabase-client"
import type { ProductStock, MaterialStock, PackagingStock } from "../types"
import type { ProductStockRow, MaterialStockRow, PackagingStockRow } from "./row-types"

export async function loadProductStocks(userId: string): Promise<ProductStock[]> {
  const { data, error } = await supabaseClient
    .from("product_stock")
    .select("product_id, quantity, updated_at")
    .eq("user_id", userId)
  if (error) throw error
  return (data ?? []).map((row: ProductStockRow) => ({
    productId: row.product_id,
    quantity: row.quantity,
    updatedAt: row.updated_at,
  }))
}

export async function upsertProductStock(userId: string, productId: string, quantity: number): Promise<void> {
  const { error } = await supabaseClient.from("product_stock").upsert(
    { user_id: userId, product_id: productId, quantity, updated_at: new Date().toISOString() },
    { onConflict: "user_id,product_id" }
  )
  if (error) throw error
}

export async function deleteProductStock(userId: string, productId: string): Promise<void> {
  const { error } = await supabaseClient
    .from("product_stock")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId)
  if (error) throw error
}

// --- material stock ---

export async function loadMaterialStocks(userId: string): Promise<MaterialStock[]> {
  const { data, error } = await supabaseClient
    .from("material_stock")
    .select("material_id, quantity, stock_unit, updated_at")
    .eq("user_id", userId)
  if (error) throw error
  return (data ?? []).map((row: MaterialStockRow) => ({
    materialId: row.material_id,
    quantity: Number(row.quantity),
    stockUnit: row.stock_unit ?? undefined,
    updatedAt: row.updated_at,
  }))
}

export async function upsertMaterialStock(
  userId: string,
  materialId: string,
  quantity: number,
  stockUnit?: string
): Promise<void> {
  const payload: {
    user_id: string
    material_id: string
    quantity: number
    updated_at: string
    stock_unit?: string | null
  } = {
    user_id: userId,
    material_id: materialId,
    quantity,
    updated_at: new Date().toISOString(),
  }
  if (typeof stockUnit === "string") {
    payload.stock_unit = stockUnit.length > 0 ? stockUnit : null
  }
  const { error } = await supabaseClient.from("material_stock").upsert(
    payload,
    { onConflict: "user_id,material_id" }
  )
  if (error) throw error
}

export async function deleteMaterialStock(userId: string, materialId: string): Promise<void> {
  const { error } = await supabaseClient
    .from("material_stock")
    .delete()
    .eq("user_id", userId)
    .eq("material_id", materialId)
  if (error) throw error
}

// --- packaging stock ---

export async function loadPackagingStocks(userId: string): Promise<PackagingStock[]> {
  const { data, error } = await supabaseClient
    .from("packaging_stock")
    .select("packaging_item_id, quantity, stock_unit, updated_at")
    .eq("user_id", userId)
  if (error) throw error
  return (data ?? []).map((row: PackagingStockRow) => ({
    packagingItemId: row.packaging_item_id,
    quantity: Number(row.quantity),
    stockUnit: row.stock_unit ?? undefined,
    updatedAt: row.updated_at,
  }))
}

export async function upsertPackagingStock(
  userId: string,
  packagingItemId: string,
  quantity: number,
  stockUnit?: string
): Promise<void> {
  const payload: {
    user_id: string
    packaging_item_id: string
    quantity: number
    updated_at: string
    stock_unit?: string | null
  } = {
    user_id: userId,
    packaging_item_id: packagingItemId,
    quantity,
    updated_at: new Date().toISOString(),
  }
  if (typeof stockUnit === "string") {
    payload.stock_unit = stockUnit.length > 0 ? stockUnit : null
  }
  const { error } = await supabaseClient.from("packaging_stock").upsert(
    payload,
    { onConflict: "user_id,packaging_item_id" }
  )
  if (error) throw error
}

export async function deletePackagingStock(userId: string, packagingItemId: string): Promise<void> {
  const { error } = await supabaseClient
    .from("packaging_stock")
    .delete()
    .eq("user_id", userId)
    .eq("packaging_item_id", packagingItemId)
  if (error) throw error
}
