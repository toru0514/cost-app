"use client"

import { startTransition, useCallback, useEffect, useState } from "react"

import {
  AppData,
  CategoryLarge,
  CategoryMedium,
  CategorySmall,
  defaultAppData,
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

const STORAGE_KEY = "cost-app-data-v1"

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 11)

type Updater<T> = (state: T) => T

const apply = <T,>(set: React.Dispatch<React.SetStateAction<T>>, updater: Updater<T>) => {
  set(updater)
}

export function useAppData() {
  const [data, setData] = useState<AppData>(defaultAppData)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AppData
        startTransition(() => {
          setData(parsed)
        })
      } catch (error) {
        console.warn("Failed to parse stored data", error)
      }
    }
    startTransition(() => setHydrated(true))
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data, hydrated])

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

  const resetAll = useCallback(() => {
    update(() => emptyAppData)
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [update])

  const seedSample = useCallback(() => {
    update(() => sampleAppData)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleAppData))
    }
  }, [update])

  return {
    data,
    hydrated,
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
