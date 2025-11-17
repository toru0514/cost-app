"use client"

import { startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { toast } from "sonner"

import {
  AppData,
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
import { loadUserAppData, saveUserAppData } from "./app-data-sync"

const STORAGE_KEY = "cost-app-data-v1"

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 11)

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
  return false
}

const MAX_SAVE_RETRIES = 3

export function useAppData() {
  const { state: authState } = useAuth()
  const [data, setData] = useState<AppData>(emptyAppData)
  const [hydrated, setHydrated] = useState(false)
  const skipNextSaveRef = useRef(false)
  const dataRef = useRef<AppData>(emptyAppData)
  const [pendingRemoteData, setPendingRemoteData] = useState<AppData | null>(null)
  const [hasLocalGuestData, setHasLocalGuestData] = useState(false)
  const [remoteLoadCompleted, setRemoteLoadCompleted] = useState(authState.status !== "authenticated")
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

  const persistSupabaseWithRetry = useCallback(() => {
    if (authState.status !== "authenticated") return
    const attemptSave = async () => {
      if (authState.status !== "authenticated") return
      try {
        await saveUserAppData(authState.user.id, dataRef.current)
        clearSaveRetry()
      } catch (error) {
        console.error("Failed to save data to Supabase", error)
        const nextAttempts = saveRetryRef.current.attempts + 1
        saveRetryRef.current.attempts = nextAttempts
        if (nextAttempts >= MAX_SAVE_RETRIES) {
          toast.error("Supabase への保存に失敗しました。接続を確認して再同期してください。")
          clearSaveRetry()
        } else {
          saveRetryRef.current.timeoutId = setTimeout(() => {
            void attemptSave()
          }, nextAttempts * 2000)
        }
      }
    }
    clearSaveRetry()
    void attemptSave()
  }, [authState, clearSaveRetry])

  useEffect(() => {
    return () => {
      clearSaveRetry()
    }
  }, [clearSaveRetry])

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    authStatusRef.current = authState.status
  }, [authState.status])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (hydrated) return
    if (authState.status === "loading") return
    if (authState.status === "authenticated") {
      skipNextSaveRef.current = true
      window.localStorage.removeItem(STORAGE_KEY)
      setHasLocalGuestData(false)
      setData(emptyAppData)
      startTransition(() => setHydrated(true))
      return
    }
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AppData
        startTransition(() => {
          setData(parsed)
        })
        setHasLocalGuestData(true)
      } catch (error) {
        console.warn("Failed to parse stored data", error)
      }
    }
    startTransition(() => setHydrated(true))
  }, [authState.status, hydrated])

  useLayoutEffect(() => {
    setRemoteLoadCompleted(authState.status !== "authenticated")
  }, [authState.status])

  useEffect(() => {
    if (!hydrated) return
    if (authState.status !== "authenticated") {
      setPendingRemoteData(null)
      setRemoteLoadCompleted(true)
      return
    }
    let cancelled = false
    setRemoteLoadCompleted(false)
    ;(async () => {
      try {
        const remote = await loadUserAppData(authState.user.id)
        if (cancelled) return
        if (!remote) {
          if (hasMeaningfulData(dataRef.current)) {
            await saveUserAppData(authState.user.id, dataRef.current)
            if (typeof window !== "undefined") {
              window.localStorage.removeItem(STORAGE_KEY)
            }
            setHasLocalGuestData(false)
          }
          setRemoteLoadCompleted(true)
          return
        }
        if (!hasLocalGuestData || !hasMeaningfulData(dataRef.current)) {
          skipNextSaveRef.current = true
          setData(remote)
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(STORAGE_KEY)
          }
          setHasLocalGuestData(false)
        } else {
          clearSaveRetry()
          setPendingRemoteData(remote)
        }
        setRemoteLoadCompleted(true)
      } catch (error) {
        console.error("Remote sync failed", error)
        toast.error("Supabase からデータを取得できませんでした。ネットワーク状況を確認してください。")
        setRemoteLoadCompleted(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authState, hydrated, hasLocalGuestData, clearSaveRetry])

  useEffect(() => {
    if (!hydrated || pendingRemoteData || !remoteLoadCompleted) return
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
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
  }, [data, hydrated, authState, pendingRemoteData, remoteLoadCompleted, persistSupabaseWithRetry, previousAuthStatus])

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
    update((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        large: prev.categories.large.filter((category) => category.id !== id),
      },
    }))
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
    update((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        medium: prev.categories.medium.filter((category) => category.id !== id),
      },
    }))
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
  }, [update])

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
  }, [update])

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

  const addProduct = useCallback(
    (input: Omit<Product, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({ ...prev, products: [...prev.products, { id: id ?? createId(), ...rest }] }))
    },
    [update]
  )

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

  const removeProduct = useCallback(
    (productId: string) => {
      update((prev) => ({
        ...prev,
        products: prev.products.filter((product) => product.id !== productId),
      }))
    },
    [update]
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
        },
      }))
    },
    [update]
  )

  const resolveSyncConflict = useCallback(
    async (choice: "local" | "remote") => {
      if (authState.status !== "authenticated" || !pendingRemoteData) return
      if (choice === "remote") {
        skipNextSaveRef.current = true
        setData(pendingRemoteData)
      } else {
        try {
          await saveUserAppData(authState.user.id, dataRef.current)
          toast.success("Supabase のデータを現在の内容で更新しました")
        } catch (error) {
          console.error("Failed to overwrite Supabase data", error)
          toast.error("Supabase への上書きに失敗しました。再度お試しください。")
        }
      }
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY)
      }
      setHasLocalGuestData(false)
      setPendingRemoteData(null)
      setRemoteLoadCompleted(true)
    },
    [authState, pendingRemoteData]
  )

  const resetAll = useCallback(() => {
    update(() => emptyAppData)
    if (typeof window !== "undefined" && authState.status !== "authenticated") {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [update, authState])

  const seedSample = useCallback(() => {
    update(() => sampleAppData)
    if (typeof window !== "undefined" && authState.status !== "authenticated") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleAppData))
    }
  }, [update, authState])

  return {
    data,
    hydrated,
    syncConflict: Boolean(pendingRemoteData),
    resolveSyncConflict,
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
      addProduct,
      addMaterialCostEntry,
      addPackagingCostEntry,
      addLaborCostEntry,
      addOutsourcingCostEntry,
      addDevelopmentCostEntry,
      addEquipmentAllocation,
      addLogisticsCostEntry,
      addElectricityCostEntry,
      removeProduct,
      removeCostEntriesByProduct,
      resetAll,
      seedSample,
    },
  }
}

export type AppActions = ReturnType<typeof useAppData>["actions"]
