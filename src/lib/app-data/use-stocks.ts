"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { AppData } from "../types"
import type { StockAlertSetting } from "../types"
import type { AuthState } from "../auth"
import {
  deleteProductStock,
  deleteMaterialStock,
  deletePackagingStock,
  loadProductStocks,
  loadMaterialStocks,
  loadPackagingStocks,
  loadStockAlertSettings,
  upsertProductStock,
  upsertMaterialStock,
  upsertPackagingStock,
  upsertStockAlertSetting,
} from "../app-data-sync"

export function useStocks(authState: AuthState, dataRef: React.RefObject<AppData>) {
  const [stocks, setStocks] = useState<Map<string, number>>(new Map())
  const [stocksLoaded, setStocksLoaded] = useState(false)
  const stocksRef = useRef<Map<string, number>>(new Map())
  const [materialStocks, setMaterialStocks] = useState<Map<string, number>>(new Map())
  const materialStocksRef = useRef<Map<string, number>>(new Map())
  const [materialStockUnits, setMaterialStockUnits] = useState<Map<string, string>>(new Map())
  const [packagingStocks, setPackagingStocks] = useState<Map<string, number>>(new Map())
  const packagingStocksRef = useRef<Map<string, number>>(new Map())
  const [packagingStockUnits, setPackagingStockUnits] = useState<Map<string, string>>(new Map())
  const [masterStocksLoaded, setMasterStocksLoaded] = useState(false)
  const [stockAlertSettings, setStockAlertSettings] = useState<Map<string, StockAlertSetting>>(new Map())
  const stockAlertSettingsRef = useRef<Map<string, StockAlertSetting>>(new Map())
  const [stockAlertSettingsLoaded, setStockAlertSettingsLoaded] = useState(false)

  useEffect(() => {
    stocksRef.current = stocks
  }, [stocks])

  useEffect(() => {
    materialStocksRef.current = materialStocks
  }, [materialStocks])

  useEffect(() => {
    packagingStocksRef.current = packagingStocks
  }, [packagingStocks])

  const resetStockState = useCallback(() => {
    setStocks(new Map())
    setStocksLoaded(false)
    setMaterialStocks(new Map())
    setMaterialStockUnits(new Map())
    setPackagingStocks(new Map())
    setPackagingStockUnits(new Map())
    setMasterStocksLoaded(false)
    setStockAlertSettings(new Map())
    stockAlertSettingsRef.current = new Map()
    setStockAlertSettingsLoaded(false)
  }, [])

  const refreshStocks = useCallback(async () => {
    if (authState.status !== "authenticated") return
    try {
      const loaded = await loadProductStocks(authState.user.id)
      const map = new Map(loaded.map((s) => [s.productId, s.quantity]))
      setStocks(map)
      setStocksLoaded(true)
    } catch (error) {
      console.error("Failed to load product stocks", error)
    }
  }, [authState])

  const refreshMasterStocks = useCallback(async () => {
    if (authState.status !== "authenticated") return
    try {
      const [materials, packaging] = await Promise.all([
        loadMaterialStocks(authState.user.id),
        loadPackagingStocks(authState.user.id),
      ])
      setMaterialStocks(new Map(materials.map((s) => [s.materialId, s.quantity])))
      setMaterialStockUnits(
        new Map(
          materials.flatMap((s) => {
            const unit = typeof s.stockUnit === "string" ? s.stockUnit.trim() : ""
            return unit.length > 0 ? [[s.materialId, unit] as const] : []
          })
        )
      )
      setPackagingStocks(new Map(packaging.map((s) => [s.packagingItemId, s.quantity])))
      setPackagingStockUnits(
        new Map(
          packaging.flatMap((s) => {
            const unit = typeof s.stockUnit === "string" ? s.stockUnit.trim() : ""
            return unit.length > 0 ? [[s.packagingItemId, unit] as const] : []
          })
        )
      )
      setMasterStocksLoaded(true)
    } catch (error) {
      console.error("Failed to load master stocks", error)
    }
  }, [authState])

  const setMaterialStock = useCallback(
    async (materialId: string, quantity: number, stockUnit?: string) => {
      if (authState.status !== "authenticated") return
      const normalizedStockUnit = typeof stockUnit === "string" ? stockUnit.trim() : undefined
      await upsertMaterialStock(authState.user.id, materialId, quantity, normalizedStockUnit)
      setMaterialStocks((prev) => {
        const next = new Map(prev)
        next.set(materialId, quantity)
        return next
      })
      if (typeof normalizedStockUnit === "string" && normalizedStockUnit.length > 0) {
        setMaterialStockUnits((prev) => {
          const next = new Map(prev)
          next.set(materialId, normalizedStockUnit)
          return next
        })
      } else if (normalizedStockUnit === "") {
        setMaterialStockUnits((prev) => {
          const next = new Map(prev)
          next.delete(materialId)
          return next
        })
      }
    },
    [authState]
  )

  const setPackagingStock = useCallback(
    async (packagingItemId: string, quantity: number, stockUnit?: string) => {
      if (authState.status !== "authenticated") return
      const normalizedStockUnit = typeof stockUnit === "string" ? stockUnit.trim() : undefined
      await upsertPackagingStock(authState.user.id, packagingItemId, quantity, normalizedStockUnit)
      setPackagingStocks((prev) => {
        const next = new Map(prev)
        next.set(packagingItemId, quantity)
        return next
      })
      if (typeof normalizedStockUnit === "string" && normalizedStockUnit.length > 0) {
        setPackagingStockUnits((prev) => {
          const next = new Map(prev)
          next.set(packagingItemId, normalizedStockUnit)
          return next
        })
      } else if (normalizedStockUnit === "") {
        setPackagingStockUnits((prev) => {
          const next = new Map(prev)
          next.delete(packagingItemId)
          return next
        })
      }
    },
    [authState]
  )

  const adjustMaterialStock = useCallback(
    async (materialId: string, delta: number) => {
      if (authState.status !== "authenticated") return
      const current = materialStocksRef.current.get(materialId) ?? 0
      const next = Math.max(0, current + delta)
      await upsertMaterialStock(authState.user.id, materialId, next)
      setMaterialStocks((prev) => {
        const map = new Map(prev)
        map.set(materialId, next)
        return map
      })
    },
    [authState]
  )

  const adjustPackagingStock = useCallback(
    async (packagingItemId: string, delta: number) => {
      if (authState.status !== "authenticated") return
      const current = packagingStocksRef.current.get(packagingItemId) ?? 0
      const next = Math.max(0, current + delta)
      await upsertPackagingStock(authState.user.id, packagingItemId, next)
      setPackagingStocks((prev) => {
        const map = new Map(prev)
        map.set(packagingItemId, next)
        return map
      })
    },
    [authState]
  )

  const refreshStockAlertSettings = useCallback(async () => {
    if (authState.status !== "authenticated") return
    try {
      const settings = await loadStockAlertSettings(authState.user.id)
      const map = new Map<string, StockAlertSetting>()
      settings.forEach((s) => map.set(`${s.itemType}:${s.itemId}`, s))
      setStockAlertSettings(map)
      stockAlertSettingsRef.current = map
    } catch (error) {
      console.error("Failed to load stock alert settings", error)
    } finally {
      setStockAlertSettingsLoaded(true)
    }
  }, [authState])

  const updateStockAlertSetting = useCallback(
    async (itemType: StockAlertSetting["itemType"], itemId: string, enabled: boolean, threshold: number) => {
      if (authState.status !== "authenticated") return
      await upsertStockAlertSetting(authState.user.id, itemType, itemId, enabled, threshold)
      const key = `${itemType}:${itemId}`
      const setting: StockAlertSetting = { itemType, itemId, enabled, threshold }
      setStockAlertSettings((prev) => {
        const next = new Map(prev)
        next.set(key, setting)
        return next
      })
      stockAlertSettingsRef.current = new Map(stockAlertSettingsRef.current).set(key, setting)
    },
    [authState]
  )

  const sendLowStockNotification = useCallback(
    async (itemType: string, itemName: string, currentStock: number, threshold: number) => {
      if (authState.status !== "authenticated") return
      try {
        const session = await (await import("../supabase-client")).supabaseClient.auth.getSession()
        const accessToken = session.data.session?.access_token
        if (!accessToken) return
        await fetch("/api/slack/notify-low-stock", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ itemType, itemName, currentStock, threshold }),
        })
      } catch (error) {
        console.error("Failed to send low stock notification", error)
      }
    },
    [authState]
  )

  const checkAndNotifyLowStock = useCallback(
    (itemType: StockAlertSetting["itemType"], itemId: string, itemName: string, newQuantity: number) => {
      const key = `${itemType}:${itemId}`
      const setting = stockAlertSettingsRef.current.get(key)
      if (!setting?.enabled) return
      if (newQuantity <= setting.threshold) {
        void sendLowStockNotification(itemType, itemName, newQuantity, setting.threshold)
      }
    },
    [sendLowStockNotification]
  )

  const consumeMasterStocksForProductIncrease = useCallback(
    async (productId: string, deltaQuantity: number) => {
      if (authState.status !== "authenticated") return
      if (deltaQuantity <= 0) return

      const materialById = new Map(dataRef.current.materials.map((item) => [item.id, item]))
      const materialConsumeMap = new Map<string, number>()
      dataRef.current.costEntries.materials
        .filter((entry) => entry.productId === productId)
        .forEach((entry) => {
          const material = materialById.get(entry.materialId)
          if (!material) return
          const usage = Math.max(Number(entry.usageRatio) || 0, 0)
          const perProduct = material.usePercentageMode ? usage / 100 : usage
          if (perProduct <= 0) return
          materialConsumeMap.set(entry.materialId, (materialConsumeMap.get(entry.materialId) ?? 0) + perProduct * deltaQuantity)
        })

      const packagingById = new Map(dataRef.current.packagingItems.map((item) => [item.id, item]))
      const packagingConsumeMap = new Map<string, number>()
      dataRef.current.costEntries.packaging
        .filter((entry) => entry.productId === productId)
        .forEach((entry) => {
          const item = packagingById.get(entry.packagingItemId)
          if (!item) return
          const perProduct = Math.max(Number(entry.quantity) || 0, 0)
          if (perProduct <= 0) return
          packagingConsumeMap.set(
            entry.packagingItemId,
            (packagingConsumeMap.get(entry.packagingItemId) ?? 0) + perProduct * deltaQuantity
          )
        })

      const materialInsufficient: string[] = []
      for (const [materialId, consumeAmount] of materialConsumeMap.entries()) {
        const current = materialStocksRef.current.get(materialId) ?? 0
        const next = current - consumeAmount
        const resolvedMaterial = materialById.get(materialId)
        if (next < 0 && resolvedMaterial) {
          materialInsufficient.push(resolvedMaterial.name)
        }
        await upsertMaterialStock(authState.user.id, materialId, next)
        setMaterialStocks((prev) => {
          const map = new Map(prev)
          map.set(materialId, next)
          return map
        })
      }

      const packagingInsufficient: string[] = []
      for (const [packagingItemId, consumeAmount] of packagingConsumeMap.entries()) {
        const current = packagingStocksRef.current.get(packagingItemId) ?? 0
        const next = current - consumeAmount
        const packaging = packagingById.get(packagingItemId)
        if (next < 0 && packaging) {
          packagingInsufficient.push(packaging.name)
        }
        await upsertPackagingStock(authState.user.id, packagingItemId, next)
        setPackagingStocks((prev) => {
          const map = new Map(prev)
          map.set(packagingItemId, next)
          return map
        })
      }

      if (materialInsufficient.length > 0) {
        toast.warning("材料在庫が不足しています", {
          description: `${materialInsufficient.join("、")} が不足しています。マイナス在庫で継続しました。`,
        })
      }

      if (packagingInsufficient.length > 0) {
        toast.warning("梱包材在庫が不足しています", {
          description: `${packagingInsufficient.join("、")} が不足しています。マイナス在庫で継続しました。`,
        })
      }
    },
    [authState, dataRef]
  )

  const setStock = useCallback(
    async (productId: string, quantity: number) => {
      if (authState.status !== "authenticated") return
      const current = stocksRef.current.get(productId) ?? 0
      const next = Math.max(0, quantity)
      const increase = Math.max(0, next - current)
      if (increase > 0) {
        await consumeMasterStocksForProductIncrease(productId, increase)
      }
      await upsertProductStock(authState.user.id, productId, next)
      setStocks((prev) => {
        const map = new Map(prev)
        map.set(productId, next)
        return map
      })
    },
    [authState, consumeMasterStocksForProductIncrease]
  )

  const adjustStock = useCallback(
    async (productId: string, delta: number) => {
      if (authState.status !== "authenticated") return
      const current = stocksRef.current.get(productId) ?? 0
      const next = Math.max(0, current + delta)
      const increase = Math.max(0, next - current)
      if (increase > 0) {
        await consumeMasterStocksForProductIncrease(productId, increase)
      }
      await upsertProductStock(authState.user.id, productId, next)
      setStocks((prev) => {
        const map = new Map(prev)
        map.set(productId, next)
        return map
      })
    },
    [authState, consumeMasterStocksForProductIncrease]
  )

  // Cleanup functions for use in CRUD actions
  const cleanupProductStock = useCallback(
    (productId: string) => {
      setStocks((prev) => {
        const next = new Map(prev)
        next.delete(productId)
        return next
      })
      if (authState.status === "authenticated") {
        void deleteProductStock(authState.user.id, productId).catch((error) => {
          console.warn("Failed to delete product stock on product removal", error)
        })
      }
    },
    [authState]
  )

  const cleanupMaterialStock = useCallback(
    (materialId: string) => {
      setMaterialStocks((prev) => {
        const next = new Map(prev)
        next.delete(materialId)
        return next
      })
      setMaterialStockUnits((prev) => {
        const next = new Map(prev)
        next.delete(materialId)
        return next
      })
      if (authState.status === "authenticated") {
        void deleteMaterialStock(authState.user.id, materialId).catch((error) => {
          console.warn("Failed to delete material stock on removal", error)
        })
      }
    },
    [authState]
  )

  const cleanupPackagingStock = useCallback(
    (packagingItemId: string) => {
      setPackagingStocks((prev) => {
        const next = new Map(prev)
        next.delete(packagingItemId)
        return next
      })
      setPackagingStockUnits((prev) => {
        const next = new Map(prev)
        next.delete(packagingItemId)
        return next
      })
      if (authState.status === "authenticated") {
        void deletePackagingStock(authState.user.id, packagingItemId).catch((error) => {
          console.warn("Failed to delete packaging stock on removal", error)
        })
      }
    },
    [authState]
  )

  return {
    stocks,
    stocksLoaded,
    refreshStocks,
    setStock,
    adjustStock,
    materialStocks,
    materialStockUnits,
    packagingStocks,
    packagingStockUnits,
    masterStocksLoaded,
    setMaterialStock,
    setPackagingStock,
    adjustMaterialStock,
    adjustPackagingStock,
    stockAlertSettings,
    stockAlertSettingsLoaded,
    updateStockAlertSetting,
    checkAndNotifyLowStock,
    refreshMasterStocks,
    refreshStockAlertSettings,
    resetStockState,
    cleanupProductStock,
    cleanupMaterialStock,
    cleanupPackagingStock,
  }
}
