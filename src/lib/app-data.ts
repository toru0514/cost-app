"use client"

import { startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { toast } from "sonner"

import {
  AppData,
  AuditFilters,
  AuditLog,
  CategoryLarge,
  CategoryMedium,
  CategorySmall,
  DevelopmentCostEntry,
  ElectricityCostEntry,
  Equipment,
  EquipmentAllocationEntry,
  LaborRole,
  LaborCostEntry,
  LogisticsCostEntry,
  Material,
  MaterialCostEntry,
  Fee,
  FeeCostEntry,
  OutsourcingCostEntry,
  PackagingCostEntry,
  PackagingItem,
  Product,
  OptionPreset,
  ShippingMethod,
  emptyAppData,
  sampleAppData,
} from "./types"
import { useAuth } from "./auth"
import type { AuthState } from "./auth"
import type { StockAlertSetting } from "./types"
import {
  deletePackagingStock,
  deleteMaterialStock,
  deleteProductStock,
  loadAuditLogs,
  loadMaterialStocks,
  loadPackagingStocks,
  loadProductStocks,
  loadStockAlertSettings,
  loadUserAppData,
  saveUserAppData,
  upsertMaterialStock,
  upsertPackagingStock,
  upsertProductStock,
  upsertStockAlertSetting,
} from "./app-data-sync"

const STORAGE_KEY = "cost-app-data-v1"

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 11)

const cloneAppData = (dataset: AppData): AppData => JSON.parse(JSON.stringify(dataset))

const ensureArray = <T,>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : [])

const normalizeAppData = (dataset?: Partial<AppData> | null): AppData => {
  const source = dataset ?? {}
  const categories = (source.categories ?? {}) as Partial<AppData["categories"]>
  const costEntries = (source.costEntries ?? {}) as Partial<AppData["costEntries"]>

  return {
    categories: {
      large: ensureArray(categories.large),
      medium: ensureArray(categories.medium),
      small: ensureArray(categories.small),
    },
    materials: ensureArray(source.materials),
    packagingItems: ensureArray(source.packagingItems),
    shippingMethods: ensureArray(source.shippingMethods),
    laborRoles: ensureArray(source.laborRoles),
    equipments: ensureArray(source.equipments),
    fees: ensureArray(source.fees),
    optionPresets: ensureArray(source.optionPresets),
    products: ensureArray(source.products),
    costEntries: {
      materials: ensureArray(costEntries.materials),
      packaging: ensureArray(costEntries.packaging),
      labor: ensureArray(costEntries.labor),
      outsourcing: ensureArray(costEntries.outsourcing),
      development: ensureArray(costEntries.development),
      equipmentAllocations: ensureArray(costEntries.equipmentAllocations),
      logistics: ensureArray(costEntries.logistics),
      electricity: ensureArray(costEntries.electricity),
      fees: ensureArray(costEntries.fees),
    },
  }
}

type Updater<T> = (state: T) => T

const apply = <T,>(set: React.Dispatch<React.SetStateAction<T>>, updater: Updater<T>) => {
  set(updater)
}

const hasMeaningfulData = (dataset: AppData) => {
  if (dataset.products.length > 0) return true
  if (dataset.materials.length > 0) return true
  if (dataset.packagingItems.length > 0) return true
  if ((dataset.shippingMethods ?? []).length > 0) return true
  if (dataset.laborRoles.length > 0) return true
  if (dataset.equipments.length > 0) return true
  if (dataset.fees.length > 0) return true
  if (dataset.optionPresets.length > 0) return true
  if (dataset.categories.large.length > 0) return true
  if (dataset.categories.medium.length > 0) return true
  if (dataset.categories.small.length > 0) return true
  const entries = dataset.costEntries
  if (entries.materials.length > 0) return true
  if (entries.packaging.length > 0) return true
  if (entries.labor.length > 0) return true
  if (entries.outsourcing.length > 0) return true
  if (entries.development.length > 0) return true
  if (entries.equipmentAllocations.length > 0) return true
  if (entries.logistics.length > 0) return true
  if (entries.electricity.length > 0) return true
  if (entries.fees.length > 0) return true
  return false
}

const mergeAppData = (base: AppData, guest: AppData): AppData => {
  const mergeById = <T extends { id: string }>(baseArr: T[], guestArr: T[]): T[] => {
    const existingIds = new Set(baseArr.map((item) => item.id))
    const newItems = guestArr.filter((item) => !existingIds.has(item.id))
    return [...baseArr, ...newItems]
  }
  return {
    categories: {
      large: mergeById(base.categories.large, guest.categories.large),
      medium: mergeById(base.categories.medium, guest.categories.medium),
      small: mergeById(base.categories.small, guest.categories.small),
    },
    materials: mergeById(base.materials, guest.materials),
    packagingItems: mergeById(base.packagingItems, guest.packagingItems),
    shippingMethods: mergeById(base.shippingMethods, guest.shippingMethods),
    laborRoles: mergeById(base.laborRoles, guest.laborRoles),
    equipments: mergeById(base.equipments, guest.equipments),
    fees: mergeById(base.fees, guest.fees),
    optionPresets: mergeById(base.optionPresets, guest.optionPresets),
    products: mergeById(base.products, guest.products),
    costEntries: {
      materials: mergeById(base.costEntries.materials, guest.costEntries.materials),
      packaging: mergeById(base.costEntries.packaging, guest.costEntries.packaging),
      labor: mergeById(base.costEntries.labor, guest.costEntries.labor),
      outsourcing: mergeById(base.costEntries.outsourcing, guest.costEntries.outsourcing),
      development: mergeById(base.costEntries.development, guest.costEntries.development),
      equipmentAllocations: mergeById(base.costEntries.equipmentAllocations, guest.costEntries.equipmentAllocations),
      logistics: mergeById(base.costEntries.logistics, guest.costEntries.logistics),
      electricity: mergeById(base.costEntries.electricity, guest.costEntries.electricity),
      fees: mergeById(base.costEntries.fees, guest.costEntries.fees),
    },
  }
}

const MAX_SAVE_RETRIES = 3

export function useAppData() {
  const { state: authState } = useAuth()
  const [data, setData] = useState<AppData>(emptyAppData)
  const [hydrated, setHydrated] = useState(false)
  const skipSaveCounterRef = useRef(0)
  const dataRef = useRef<AppData>(emptyAppData)
  const lastSyncedDataRef = useRef<AppData>(emptyAppData)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditLogsLoading, setAuditLogsLoading] = useState(false)
  const [auditFilters, setAuditFilters] = useState<AuditFilters>({})
  const [auditHasMore, setAuditHasMore] = useState(true)
  const auditLogsIndexRef = useRef(0)
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
  // Stock alert settings: key = `${itemType}:${itemId}`
  const [stockAlertSettings, setStockAlertSettings] = useState<Map<string, StockAlertSetting>>(new Map())
  const stockAlertSettingsRef = useRef<Map<string, StockAlertSetting>>(new Map())
  const [stockAlertSettingsLoaded, setStockAlertSettingsLoaded] = useState(false)
  const [remoteLoadCompleted, setRemoteLoadCompleted] = useState(authState.status !== "authenticated")
  const [remoteLoadFailed, setRemoteLoadFailed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingGuestData, setPendingGuestData] = useState<AppData | null>(null)
  // Stable primitives derived from authState — used as deps instead of the full object
  // to prevent load effect re-runs when only the object reference changes (e.g. TOKEN_REFRESHED).
  const authUserId = authState.status === "authenticated" ? authState.user.id : null
  const authStatusRef = useRef<AuthState["status"]>(authState.status)
  const previousAuthStatus = authStatusRef.current
  const saveRetryRef = useRef<{ attempts: number; timeoutId: ReturnType<typeof setTimeout> | null }>({ attempts: 0, timeoutId: null })

  const clearSaveRetry = useCallback(() => {
    if (saveRetryRef.current.timeoutId) {
      clearTimeout(saveRetryRef.current.timeoutId)
      saveRetryRef.current.timeoutId = null
    }
    saveRetryRef.current.attempts = 0
  }, [])

  const refreshAuditLogs = useCallback(async () => {
    if (!authUserId) return
    setAuditLogsLoading(true)
    try {
      const logs = await loadAuditLogs(authUserId, 50, 0, auditFilters)
      auditLogsIndexRef.current = logs.length
      setAuditLogs(logs)
      setAuditHasMore(logs.length === 50)
    } catch (error) {
      console.error("Failed to load audit logs", error)
    } finally {
      setAuditLogsLoading(false)
    }
  }, [authUserId, auditFilters])

  const loadMoreAuditLogs = useCallback(async () => {
    if (authState.status !== "authenticated") return
    setAuditLogsLoading(true)
    try {
      const logs = await loadAuditLogs(authState.user.id, 50, auditLogsIndexRef.current, auditFilters)
      auditLogsIndexRef.current += logs.length
      setAuditLogs((prev) => [...prev, ...logs])
      setAuditHasMore(logs.length === 50)
    } catch (error) {
      console.error("Failed to load more audit logs", error)
    } finally {
      setAuditLogsLoading(false)
    }
  }, [authState, auditFilters])

  const persistSupabaseWithRetry = useCallback(() => {
    if (authState.status !== "authenticated") return
    if (!hasMeaningfulData(dataRef.current)) {
      console.warn("Skip saving empty dataset to Supabase")
      return
    }
    const attemptSave = async () => {
      if (authState.status !== "authenticated") return
      if (!hasMeaningfulData(dataRef.current)) return
      setIsSaving(true)
      try {
        await saveUserAppData(authState.user.id, dataRef.current, lastSyncedDataRef.current)
        lastSyncedDataRef.current = cloneAppData(dataRef.current)
        await refreshAuditLogs()
        clearSaveRetry()
        setIsSaving(false)
      } catch (error) {
        console.error("Failed to save data to Supabase", error)
        const nextAttempts = saveRetryRef.current.attempts + 1
        saveRetryRef.current.attempts = nextAttempts
        if (nextAttempts >= MAX_SAVE_RETRIES) {
          toast.error("Supabase への保存に失敗しました。接続を確認して再同期してください。")
          clearSaveRetry()
          setIsSaving(false)
        } else {
          saveRetryRef.current.timeoutId = setTimeout(() => {
            void attemptSave()
          }, nextAttempts * 2000)
        }
      }
    }
    clearSaveRetry()
    void attemptSave()
  }, [authState, clearSaveRetry, refreshAuditLogs])

  useEffect(() => {
    return () => {
      clearSaveRetry()
    }
  }, [clearSaveRetry])

  useEffect(() => {
    if (!isSaving) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isSaving])

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    if (authState.status !== "authenticated") {
      setAuditLogs([])
      setAuditLogsLoading(false)
      auditLogsIndexRef.current = 0
      setAuditHasMore(true)
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
    }
  }, [authState.status])

  const updateAuditFilters = useCallback((next: AuditFilters) => {
    setAuditFilters(next)
  }, [])

  useEffect(() => {
    stocksRef.current = stocks
  }, [stocks])

  useEffect(() => {
    materialStocksRef.current = materialStocks
  }, [materialStocks])

  useEffect(() => {
    packagingStocksRef.current = packagingStocks
  }, [packagingStocks])

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
          materials
            .flatMap((s) => {
              const unit = typeof s.stockUnit === "string" ? s.stockUnit.trim() : ""
              return unit.length > 0 ? [[s.materialId, unit] as const] : []
            })
        )
      )
      setPackagingStocks(new Map(packaging.map((s) => [s.packagingItemId, s.quantity])))
      setPackagingStockUnits(
        new Map(
          packaging
            .flatMap((s) => {
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
      const normalizedStockUnit =
        typeof stockUnit === "string" ? stockUnit.trim() : undefined
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
      const normalizedStockUnit =
        typeof stockUnit === "string" ? stockUnit.trim() : undefined
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
        const session = await (await import("./supabase-client")).supabaseClient.auth.getSession()
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

  useEffect(() => {
    if (remoteLoadCompleted && authState.status === "authenticated") {
      void refreshStocks()
      void refreshMasterStocks()
      void refreshStockAlertSettings()
    }
  }, [remoteLoadCompleted, authState.status, refreshStocks, refreshMasterStocks, refreshStockAlertSettings])

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
    [authState]
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

  useEffect(() => {
    authStatusRef.current = authState.status
  }, [authState.status])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (hydrated) return
    if (authState.status === "loading") return
    if (authState.status === "authenticated") {
      // ゲスト→ログイン遷移時: ローカルデータがあればマージ確認用に保持
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored && previousAuthStatus !== "authenticated") {
        try {
          const parsed = JSON.parse(stored) as Partial<AppData>
          const normalized = normalizeAppData(parsed)
          if (hasMeaningfulData(normalized)) {
            setPendingGuestData(normalized)
          }
        } catch {
          // ignore parse errors
        }
      }
      skipSaveCounterRef.current += 1
      window.localStorage.removeItem(STORAGE_KEY)
      setData(emptyAppData)
      startTransition(() => setHydrated(true))
      return
    }
    if (authStatusRef.current === "authenticated") {
      window.localStorage.removeItem(STORAGE_KEY)
      startTransition(() => setHydrated(true))
      return
    }
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<AppData>
        const normalized = normalizeAppData(parsed)
        startTransition(() => {
          setData(normalized)
        })
      } catch (error) {
        console.warn("Failed to parse stored data", error)
      }
    }
    startTransition(() => setHydrated(true))
  }, [authState.status, hydrated, previousAuthStatus])

  useLayoutEffect(() => {
    if (authState.status === "authenticated" && typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY)
    }
    setRemoteLoadCompleted(authState.status !== "authenticated")
  }, [authState.status])

  useEffect(() => {
    if (authState.status === "authenticated") {
      console.log("auth user id:", authState.user.id)
    }
  }, [authState])

  useEffect(() => {
    if (!hydrated) return
    if (!authUserId) {
      setRemoteLoadCompleted(true)
      setRemoteLoadFailed(false)
      return
    }
    let cancelled = false
    setRemoteLoadCompleted(false)
    setRemoteLoadFailed(false)
    ;(async () => {
      try {
        const remote = await loadUserAppData(authUserId)
        if (cancelled) return
        if (!remote) {
          setRemoteLoadFailed(false)
          setRemoteLoadCompleted(true)
          lastSyncedDataRef.current = cloneAppData(emptyAppData)
          await refreshAuditLogs()
          return
        }
        skipSaveCounterRef.current += 1
        clearSaveRetry()
        const normalized = normalizeAppData(remote)
        setData(normalized)
        lastSyncedDataRef.current = cloneAppData(normalized)
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY)
        }
        setRemoteLoadFailed(false)
        setRemoteLoadCompleted(true)
        await refreshAuditLogs()
      } catch (error) {
        console.error("Remote sync failed", error)
        toast.error("Supabase からデータを取得できませんでした。ネットワーク状況を確認してください。")
        setRemoteLoadFailed(true)
        setRemoteLoadCompleted(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authUserId, hydrated, clearSaveRetry, refreshAuditLogs])

  useEffect(() => {
    if (!hydrated || !remoteLoadCompleted) return
    if (authState.status === "authenticated" && remoteLoadFailed) return
    if (skipSaveCounterRef.current > 0) {
      skipSaveCounterRef.current -= 1
      return
    }
    if (authState.status === "authenticated") {
      persistSupabaseWithRetry()
    } else if (authState.status === "guest") {
      if (previousAuthStatus === "authenticated") {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY)
        }
        return
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      }
    }
  }, [
    data,
    hydrated,
    authState,
    remoteLoadCompleted,
    remoteLoadFailed,
    persistSupabaseWithRetry,
    previousAuthStatus,
  ])

  const update = useCallback(
    (updater: Updater<AppData>) => {
      apply(setData, updater)
    },
    [setData]
  )

  const addLargeCategory = useCallback((input: Omit<CategoryLarge, "id"> & { id?: string }) => {
    const { id, ...rest } = input
    update((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        large: [...prev.categories.large, { id: id ?? createId(), ...rest }],
      },
    }))
  }, [update])

  const updateLargeCategory = useCallback((input: CategoryLarge) => {
    update((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        large: prev.categories.large.map((category) => (category.id === input.id ? input : category)),
      },
    }))
  }, [update])

  const removeLargeCategory = useCallback((id: string) => {
    update((prev) => {
      const mediumIdsToRemove = new Set(
        prev.categories.medium.filter((category) => category.largeId === id).map((category) => category.id)
      )
      const smallIdsToRemove = new Set(
        prev.categories.small
          .filter((category) => mediumIdsToRemove.has(category.mediumId))
          .map((category) => category.id)
      )

      return {
        ...prev,
        categories: {
          ...prev.categories,
          large: prev.categories.large.filter((category) => category.id !== id),
          medium: prev.categories.medium.filter((category) => !mediumIdsToRemove.has(category.id)),
          small: prev.categories.small.filter((category) => !smallIdsToRemove.has(category.id)),
        },
        products: prev.products.map((product) => ({
          ...product,
          categoryLargeId: product.categoryLargeId === id ? null : product.categoryLargeId,
          categoryMediumId: product.categoryMediumId && mediumIdsToRemove.has(product.categoryMediumId) ? null : product.categoryMediumId,
          categorySmallId: product.categorySmallId && smallIdsToRemove.has(product.categorySmallId) ? null : product.categorySmallId,
        })),
      }
    })
  }, [update])

  const addMediumCategory = useCallback(
    (input: Omit<CategoryMedium, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({
        ...prev,
        categories: {
          ...prev.categories,
          medium: [...prev.categories.medium, { id: id ?? createId(), ...rest }],
        },
      }))
    },
    [update]
  )

  const updateMediumCategory = useCallback((input: CategoryMedium) => {
    update((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        medium: prev.categories.medium.map((category) => (category.id === input.id ? input : category)),
      },
    }))
  }, [update])

  const removeMediumCategory = useCallback((id: string) => {
    update((prev) => {
      const smallIdsToRemove = new Set(
        prev.categories.small.filter((category) => category.mediumId === id).map((category) => category.id)
      )

      return {
        ...prev,
        categories: {
          ...prev.categories,
          medium: prev.categories.medium.filter((category) => category.id !== id),
          small: prev.categories.small.filter((category) => !smallIdsToRemove.has(category.id)),
        },
        products: prev.products.map((product) => ({
          ...product,
          categoryMediumId: product.categoryMediumId === id ? null : product.categoryMediumId,
          categorySmallId: product.categorySmallId && smallIdsToRemove.has(product.categorySmallId) ? null : product.categorySmallId,
        })),
      }
    })
  }, [update])

  const addSmallCategory = useCallback(
    (input: Omit<CategorySmall, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({
        ...prev,
        categories: {
          ...prev.categories,
          small: [...prev.categories.small, { id: id ?? createId(), ...rest }],
        },
      }))
    },
    [update]
  )

  const updateSmallCategory = useCallback((input: CategorySmall) => {
    update((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        small: prev.categories.small.map((category) => (category.id === input.id ? input : category)),
      },
    }))
  }, [update])

  const removeSmallCategory = useCallback((id: string) => {
    update((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        small: prev.categories.small.filter((category) => category.id !== id),
      },
      products: prev.products.map((product) => ({
        ...product,
        categorySmallId: product.categorySmallId === id ? null : product.categorySmallId,
      })),
    }))
  }, [update])

  const addMaterial = useCallback(
    (input: Omit<Material, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({ ...prev, materials: [...prev.materials, { id: id ?? createId(), ...rest }] }))
    },
    [update]
  )

  const updateMaterial = useCallback((input: Material) => {
    const affected = dataRef.current.costEntries.materials.filter((entry) => entry.materialId === input.id).length
    if (affected > 0) {
      toast.info(`コスト明細 ${affected} 件が「${input.name}」を参照しています。単価は自動更新されません。`)
    }
    update((prev) => ({
      ...prev,
      materials: prev.materials.map((material) => (material.id === input.id ? input : material)),
    }))
  }, [update])

  const removeMaterial = useCallback((id: string) => {
    update((prev) => ({
      ...prev,
      materials: prev.materials.filter((material) => material.id !== id),
      costEntries: {
        ...prev.costEntries,
        materials: prev.costEntries.materials.filter((entry) => entry.materialId !== id),
      },
    }))
    setMaterialStocks((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
    setMaterialStockUnits((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
    if (authState.status === "authenticated") {
      void deleteMaterialStock(authState.user.id, id).catch((error) => {
        console.warn("Failed to delete material stock on removal", error)
      })
    }
  }, [update, authState])

  const addPackagingItem = useCallback(
    (input: Omit<PackagingItem, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({
        ...prev,
        packagingItems: [...prev.packagingItems, { id: id ?? createId(), ...rest }],
      }))
    },
    [update]
  )

  const updatePackagingItem = useCallback((input: PackagingItem) => {
    const affected = dataRef.current.costEntries.packaging.filter((entry) => entry.packagingItemId === input.id).length
    if (affected > 0) {
      toast.info(`コスト明細 ${affected} 件が「${input.name}」を参照しています。単価は自動更新されません。`)
    }
    update((prev) => ({
      ...prev,
      packagingItems: prev.packagingItems.map((item) => (item.id === input.id ? input : item)),
    }))
  }, [update])

  const removePackagingItem = useCallback((id: string) => {
    update((prev) => ({
      ...prev,
      packagingItems: prev.packagingItems.filter((item) => item.id !== id),
      costEntries: {
        ...prev.costEntries,
        packaging: prev.costEntries.packaging.filter((entry) => entry.packagingItemId !== id),
      },
    }))
    setPackagingStocks((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
    setPackagingStockUnits((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
    if (authState.status === "authenticated") {
      void deletePackagingStock(authState.user.id, id).catch((error) => {
        console.warn("Failed to delete packaging stock on removal", error)
      })
    }
  }, [update, authState])

  const addShippingMethod = useCallback(
    (input: Omit<ShippingMethod, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({
        ...prev,
        shippingMethods: [...(prev.shippingMethods ?? []), { id: id ?? createId(), ...rest }],
      }))
    },
    [update]
  )

  const updateShippingMethod = useCallback((input: ShippingMethod) => {
    const affected = dataRef.current.costEntries.logistics.filter((entry) => entry.shippingMethodId === input.id).length
    if (affected > 0) {
      toast.info(`コスト明細 ${affected} 件が「${input.name}」を参照しています。単価は自動更新されません。`)
    }
    update((prev) => ({
      ...prev,
      shippingMethods: (prev.shippingMethods ?? []).map((method) => (method.id === input.id ? input : method)),
    }))
  }, [update])

  const removeShippingMethod = useCallback((id: string) => {
    update((prev) => ({
      ...prev,
      shippingMethods: (prev.shippingMethods ?? []).filter((method) => method.id !== id),
      costEntries: {
        ...prev.costEntries,
        logistics: prev.costEntries.logistics.filter((entry) => entry.shippingMethodId !== id),
      },
    }))
  }, [update])

  const addLaborRole = useCallback(
    (input: Omit<LaborRole, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({ ...prev, laborRoles: [...prev.laborRoles, { id: id ?? createId(), ...rest }] }))
    },
    [update]
  )

  const updateLaborRole = useCallback((input: LaborRole) => {
    const affected = dataRef.current.costEntries.labor.filter((entry) => entry.laborRoleId === input.id).length
    if (affected > 0) {
      toast.info(`コスト明細 ${affected} 件が「${input.name}」を参照しています。時給は自動更新されません。`)
    }
    update((prev) => ({
      ...prev,
      laborRoles: prev.laborRoles.map((role) => (role.id === input.id ? input : role)),
    }))
  }, [update])

  const removeLaborRole = useCallback((id: string) => {
    update((prev) => ({
      ...prev,
      laborRoles: prev.laborRoles.filter((role) => role.id !== id),
      costEntries: {
        ...prev.costEntries,
        labor: prev.costEntries.labor.filter((entry) => entry.laborRoleId !== id),
      },
    }))
  }, [update])

  const addOptionPreset = useCallback(
    (input: Omit<OptionPreset, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      const sanitizedVariants = rest.variants.map((variant) => ({
        label: variant.label.trim(),
        quantity: Number(variant.quantity) || 0,
      }))
      update((prev) => {
        const currentPresets = prev.optionPresets ?? []
        return {
          ...prev,
          optionPresets: [...currentPresets, { id: id ?? createId(), name: rest.name, variants: sanitizedVariants }],
        }
      })
    },
    [update]
  )

  const updateOptionPreset = useCallback((input: OptionPreset) => {
    update((prev) => {
      const currentPresets = prev.optionPresets ?? []
      return {
        ...prev,
        optionPresets: currentPresets.map((preset) => (preset.id === input.id ? input : preset)),
      }
    })
  }, [update])

  const removeOptionPreset = useCallback((id: string) => {
    update((prev) => ({
      ...prev,
      optionPresets: (prev.optionPresets ?? []).filter((preset) => preset.id !== id),
    }))
  }, [update])

  const addEquipment = useCallback(
    (input: Omit<Equipment, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({ ...prev, equipments: [...prev.equipments, { id: id ?? createId(), ...rest }] }))
    },
    [update]
  )

  const updateEquipment = useCallback((input: Equipment) => {
    const affected = dataRef.current.costEntries.equipmentAllocations.filter((entry) => entry.equipmentId === input.id).length
    if (affected > 0) {
      toast.info(`コスト明細 ${affected} 件が「${input.name}」を参照しています。償却コストは自動更新されません。`)
    }
    update((prev) => ({
      ...prev,
      equipments: prev.equipments.map((equipment) => (equipment.id === input.id ? input : equipment)),
    }))
  }, [update])

  const removeEquipment = useCallback((id: string) => {
    update((prev) => ({
      ...prev,
      equipments: prev.equipments.filter((equipment) => equipment.id !== id),
      products: prev.products.map((product) => ({
        ...product,
        equipmentIds: product.equipmentIds.filter((equipmentId) => equipmentId !== id),
      })),
      costEntries: {
        ...prev.costEntries,
        equipmentAllocations: prev.costEntries.equipmentAllocations.filter((entry) => entry.equipmentId !== id),
      },
    }))
  }, [update])

  const addFee = useCallback(
    (input: Omit<Fee, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({ ...prev, fees: [...prev.fees, { id: id ?? createId(), ...rest }] }))
    },
    [update]
  )

  const updateFee = useCallback((input: Fee) => {
    const affected = dataRef.current.costEntries.fees.filter((entry) => entry.feeId === input.id).length
    if (affected > 0) {
      toast.info(`コスト明細 ${affected} 件が「${input.name}」を参照しています。手数料は自動更新されません。`)
    }
    update((prev) => ({
      ...prev,
      fees: prev.fees.map((fee) => (fee.id === input.id ? input : fee)),
    }))
  }, [update])

  const removeFee = useCallback((id: string) => {
    update((prev) => ({
      ...prev,
      fees: prev.fees.filter((fee) => fee.id !== id),
      costEntries: {
        ...prev.costEntries,
        fees: prev.costEntries.fees.filter((entry) => entry.feeId !== id),
      },
    }))
  }, [update])

  const addProduct = useCallback(
    (input: Omit<Product, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({ ...prev, products: [...prev.products, { id: id ?? createId(), ...rest }] }))
    },
    [update]
  )

  const updateProduct = useCallback((input: Product) => {
    update((prev) => ({
      ...prev,
      products: prev.products.map((product) => (product.id === input.id ? input : product)),
    }))
  }, [update])

  const addMaterialCostEntry = useCallback(
    (input: Omit<MaterialCostEntry, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({
        ...prev,
        costEntries: {
          ...prev.costEntries,
          materials: [...prev.costEntries.materials, { id: id ?? createId(), ...rest }],
        },
      }))
    },
    [update]
  )

  const addPackagingCostEntry = useCallback(
    (input: Omit<PackagingCostEntry, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({
        ...prev,
        costEntries: {
          ...prev.costEntries,
          packaging: [...prev.costEntries.packaging, { id: id ?? createId(), ...rest }],
        },
      }))
    },
    [update]
  )

  const addLaborCostEntry = useCallback(
    (input: Omit<LaborCostEntry, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({
        ...prev,
        costEntries: {
          ...prev.costEntries,
          labor: [...prev.costEntries.labor, { id: id ?? createId(), ...rest }],
        },
      }))
    },
    [update]
  )

  const addOutsourcingCostEntry = useCallback(
    (input: Omit<OutsourcingCostEntry, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({
        ...prev,
        costEntries: {
          ...prev.costEntries,
          outsourcing: [...prev.costEntries.outsourcing, { id: id ?? createId(), ...rest }],
        },
      }))
    },
    [update]
  )

  const addDevelopmentCostEntry = useCallback(
    (input: Omit<DevelopmentCostEntry, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({
        ...prev,
        costEntries: {
          ...prev.costEntries,
          development: [...prev.costEntries.development, { id: id ?? createId(), ...rest }],
        },
      }))
    },
    [update]
  )

  const addEquipmentAllocation = useCallback(
    (input: Omit<EquipmentAllocationEntry, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({
        ...prev,
        costEntries: {
          ...prev.costEntries,
          equipmentAllocations: [
            ...prev.costEntries.equipmentAllocations,
            { id: id ?? createId(), ...rest },
          ],
        },
      }))
    },
    [update]
  )

  const addLogisticsCostEntry = useCallback(
    (input: Omit<LogisticsCostEntry, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({
        ...prev,
        costEntries: {
          ...prev.costEntries,
          logistics: [...prev.costEntries.logistics, { id: id ?? createId(), ...rest }],
        },
      }))
    },
    [update]
  )

  const addElectricityCostEntry = useCallback(
    (input: Omit<ElectricityCostEntry, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({
        ...prev,
        costEntries: {
          ...prev.costEntries,
          electricity: [...prev.costEntries.electricity, { id: id ?? createId(), ...rest }],
        },
      }))
    },
    [update]
  )

  const addFeeCostEntry = useCallback(
    (input: Omit<FeeCostEntry, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({
        ...prev,
        costEntries: {
          ...prev.costEntries,
          fees: [...prev.costEntries.fees, { id: id ?? createId(), ...rest }],
        },
      }))
    },
    [update]
  )

  const removeProduct = useCallback(
    (productId: string) => {
      update((prev) => ({
        ...prev,
        products: prev.products.filter((product) => product.id !== productId),
      }))
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
    [update, authState]
  )

  const removeCostEntriesByProduct = useCallback(
    (productId: string) => {
      update((prev) => ({
        ...prev,
        costEntries: {
          materials: prev.costEntries.materials.filter((entry) => entry.productId !== productId),
          packaging: prev.costEntries.packaging.filter((entry) => entry.productId !== productId),
          labor: prev.costEntries.labor.filter((entry) => entry.productId !== productId),
          outsourcing: prev.costEntries.outsourcing.filter((entry) => entry.productId !== productId),
          development: prev.costEntries.development.filter((entry) => entry.productId !== productId),
          equipmentAllocations: prev.costEntries.equipmentAllocations.filter((entry) => entry.productId !== productId),
          logistics: prev.costEntries.logistics.filter((entry) => entry.productId !== productId),
          electricity: prev.costEntries.electricity.filter((entry) => entry.productId !== productId),
          fees: prev.costEntries.fees.filter((entry) => entry.productId !== productId),
        },
      }))
    },
    [update]
  )

  const mergeGuestData = useCallback(() => {
    if (!pendingGuestData) return
    setData((current) => mergeAppData(current, pendingGuestData))
    setPendingGuestData(null)
    toast.success("ローカルデータをマージしました")
  }, [pendingGuestData])

  const discardGuestData = useCallback(() => {
    setPendingGuestData(null)
    toast.success("ローカルデータを破棄しました")
  }, [])

  const resetAll = useCallback(() => {
    if (authState.status === "authenticated") {
      toast.error("ログイン中はリセットできません")
      return
    }
    update(() => emptyAppData)
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [update, authState])

  const seedSample = useCallback(() => {
    if (authState.status === "authenticated") {
      toast.error("ログイン中はデモデータを投入できません")
      return
    }
    update(() => sampleAppData)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleAppData))
    }
  }, [update, authState])

  const importGuestData = useCallback(
    (dataset?: Partial<AppData> | null) => {
      if (authState.status === "authenticated") {
        toast.error("ログイン中は復元できません")
        return false
      }

      const normalized = normalizeAppData(dataset)
      update(() => normalized)
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
      }
      return true
    },
    [update, authState]
  )

  return {
    data,
    hydrated,
    isSaving,
    pendingGuestData,
    remoteLoadCompleted,
    mergeGuestData,
    discardGuestData,
    auditLogs,
    auditLogsLoading,
    auditHasMore,
    auditFilters,
    refreshAuditLogs,
    loadMoreAuditLogs,
    updateAuditFilters,
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
    actions: {
      addLargeCategory,
      updateLargeCategory,
      removeLargeCategory,
      addMediumCategory,
      updateMediumCategory,
      removeMediumCategory,
      addSmallCategory,
      updateSmallCategory,
      removeSmallCategory,
      addMaterial,
      updateMaterial,
      removeMaterial,
      addPackagingItem,
      updatePackagingItem,
      removePackagingItem,
      addShippingMethod,
      updateShippingMethod,
      removeShippingMethod,
      addLaborRole,
      updateLaborRole,
      removeLaborRole,
      addOptionPreset,
      updateOptionPreset,
      removeOptionPreset,
      addEquipment,
      updateEquipment,
      removeEquipment,
      addFee,
      updateFee,
      removeFee,
      addProduct,
      updateProduct,
      addMaterialCostEntry,
      addPackagingCostEntry,
      addLaborCostEntry,
      addOutsourcingCostEntry,
      addDevelopmentCostEntry,
      addEquipmentAllocation,
      addLogisticsCostEntry,
      addElectricityCostEntry,
      addFeeCostEntry,
      removeProduct,
      removeCostEntriesByProduct,
      resetAll,
      seedSample,
      importGuestData,
    },
  }
}

export type AppActions = ReturnType<typeof useAppData>["actions"]
