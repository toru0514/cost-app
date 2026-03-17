"use client"

import { useCallback } from "react"
import { toast } from "sonner"
import type {
  AppData,
  CategoryLarge,
  CategoryMedium,
  CategorySmall,
  Material,
  PackagingItem,
  ShippingMethod,
  LaborRole,
  Equipment,
  Fee,
  OptionPreset,
  Product,
  MaterialCostEntry,
  PackagingCostEntry,
  LaborCostEntry,
  OutsourcingCostEntry,
  DevelopmentCostEntry,
  EquipmentAllocationEntry,
  LogisticsCostEntry,
  ElectricityCostEntry,
  FeeCostEntry,
  TimeRecord,
} from "../types"
import { emptyAppData, sampleAppData } from "../types"
import type { AuthState } from "../auth"
import { normalizeAppData } from "./utils"

const STORAGE_KEY = "cost-app-data-v1"

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 11)

type Updater = (fn: (prev: AppData) => AppData) => void

type StockCleanup = {
  cleanupProductStock: (productId: string) => void
  cleanupMaterialStock: (materialId: string) => void
  cleanupPackagingStock: (packagingItemId: string) => void
}

export function useCrudActions(
  update: Updater,
  dataRef: React.RefObject<AppData>,
  authState: AuthState,
  stockCleanup: StockCleanup
) {
  // --- Categories ---
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

  // --- Bulk Categories ---
  const bulkRemoveLargeCategories = useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    update((prev) => {
      const mediumIdsToRemove = new Set(
        prev.categories.medium.filter((c) => idSet.has(c.largeId)).map((c) => c.id)
      )
      const smallIdsToRemove = new Set(
        prev.categories.small.filter((c) => mediumIdsToRemove.has(c.mediumId)).map((c) => c.id)
      )
      return {
        ...prev,
        categories: {
          ...prev.categories,
          large: prev.categories.large.filter((c) => !idSet.has(c.id)),
          medium: prev.categories.medium.filter((c) => !mediumIdsToRemove.has(c.id)),
          small: prev.categories.small.filter((c) => !smallIdsToRemove.has(c.id)),
        },
        products: prev.products.map((product) => ({
          ...product,
          categoryLargeId: product.categoryLargeId && idSet.has(product.categoryLargeId) ? null : product.categoryLargeId,
          categoryMediumId: product.categoryMediumId && mediumIdsToRemove.has(product.categoryMediumId) ? null : product.categoryMediumId,
          categorySmallId: product.categorySmallId && smallIdsToRemove.has(product.categorySmallId) ? null : product.categorySmallId,
        })),
      }
    })
  }, [update])

  const bulkRemoveMediumCategories = useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    update((prev) => {
      const smallIdsToRemove = new Set(
        prev.categories.small.filter((c) => idSet.has(c.mediumId)).map((c) => c.id)
      )
      return {
        ...prev,
        categories: {
          ...prev.categories,
          medium: prev.categories.medium.filter((c) => !idSet.has(c.id)),
          small: prev.categories.small.filter((c) => !smallIdsToRemove.has(c.id)),
        },
        products: prev.products.map((product) => ({
          ...product,
          categoryMediumId: product.categoryMediumId && idSet.has(product.categoryMediumId) ? null : product.categoryMediumId,
          categorySmallId: product.categorySmallId && smallIdsToRemove.has(product.categorySmallId) ? null : product.categorySmallId,
        })),
      }
    })
  }, [update])

  const bulkRemoveSmallCategories = useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    update((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        small: prev.categories.small.filter((c) => !idSet.has(c.id)),
      },
      products: prev.products.map((product) => ({
        ...product,
        categorySmallId: product.categorySmallId && idSet.has(product.categorySmallId) ? null : product.categorySmallId,
      })),
    }))
  }, [update])

  // --- Master data ---
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
  }, [update, dataRef])

  const removeMaterial = useCallback((id: string) => {
    update((prev) => ({
      ...prev,
      materials: prev.materials.filter((material) => material.id !== id),
      costEntries: {
        ...prev.costEntries,
        materials: prev.costEntries.materials.filter((entry) => entry.materialId !== id),
      },
    }))
    stockCleanup.cleanupMaterialStock(id)
  }, [update, stockCleanup])

  const bulkUpdateMaterials = useCallback((ids: string[], updates: Partial<Pick<Material, "supplier" | "currency" | "unit" | "usePercentageMode">>) => {
    const idSet = new Set(ids)
    update((prev) => ({
      ...prev,
      materials: prev.materials.map((material) =>
        idSet.has(material.id) ? { ...material, ...updates } : material
      ),
    }))
  }, [update])

  const bulkRemoveMaterials = useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    update((prev) => ({
      ...prev,
      materials: prev.materials.filter((material) => !idSet.has(material.id)),
      costEntries: {
        ...prev.costEntries,
        materials: prev.costEntries.materials.filter((entry) => !idSet.has(entry.materialId)),
      },
    }))
    ids.forEach((id) => stockCleanup.cleanupMaterialStock(id))
  }, [update, stockCleanup])

  // --- Bulk Packaging ---
  const bulkUpdatePackagingItems = useCallback((ids: string[], updates: Partial<Pick<PackagingItem, "currency" | "unit">>) => {
    const idSet = new Set(ids)
    update((prev) => ({
      ...prev,
      packagingItems: prev.packagingItems.map((item) =>
        idSet.has(item.id) ? { ...item, ...updates } : item
      ),
    }))
  }, [update])

  const bulkRemovePackagingItems = useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    update((prev) => ({
      ...prev,
      packagingItems: prev.packagingItems.filter((item) => !idSet.has(item.id)),
      costEntries: {
        ...prev.costEntries,
        packaging: prev.costEntries.packaging.filter((entry) => !idSet.has(entry.packagingItemId)),
      },
    }))
    ids.forEach((id) => stockCleanup.cleanupPackagingStock(id))
  }, [update, stockCleanup])

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
  }, [update, dataRef])

  const removePackagingItem = useCallback((id: string) => {
    update((prev) => ({
      ...prev,
      packagingItems: prev.packagingItems.filter((item) => item.id !== id),
      costEntries: {
        ...prev.costEntries,
        packaging: prev.costEntries.packaging.filter((entry) => entry.packagingItemId !== id),
      },
    }))
    stockCleanup.cleanupPackagingStock(id)
  }, [update, stockCleanup])

  // --- Bulk Shipping ---
  const bulkUpdateShippingMethods = useCallback((ids: string[], updates: Partial<Pick<ShippingMethod, "currency">>) => {
    const idSet = new Set(ids)
    update((prev) => ({
      ...prev,
      shippingMethods: (prev.shippingMethods ?? []).map((method) =>
        idSet.has(method.id) ? { ...method, ...updates } : method
      ),
    }))
  }, [update])

  const bulkRemoveShippingMethods = useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    update((prev) => ({
      ...prev,
      shippingMethods: (prev.shippingMethods ?? []).filter((method) => !idSet.has(method.id)),
      costEntries: {
        ...prev.costEntries,
        logistics: prev.costEntries.logistics.filter((entry) => !idSet.has(entry.shippingMethodId)),
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
    const affected = dataRef.current.costEntries.logistics.filter((entry) => entry.shippingMethodId === input.id).length
    if (affected > 0) {
      toast.info(`コスト明細 ${affected} 件が「${input.name}」を参照しています。単価は自動更新されません。`)
    }
    update((prev) => ({
      ...prev,
      shippingMethods: (prev.shippingMethods ?? []).map((method) => (method.id === input.id ? input : method)),
    }))
  }, [update, dataRef])

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

  // --- Bulk Labor ---
  const bulkUpdateLaborRoles = useCallback((ids: string[], updates: Partial<Pick<LaborRole, "currency">>) => {
    const idSet = new Set(ids)
    update((prev) => ({
      ...prev,
      laborRoles: prev.laborRoles.map((role) =>
        idSet.has(role.id) ? { ...role, ...updates } : role
      ),
    }))
  }, [update])

  const bulkRemoveLaborRoles = useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    update((prev) => ({
      ...prev,
      laborRoles: prev.laborRoles.filter((role) => !idSet.has(role.id)),
      costEntries: {
        ...prev.costEntries,
        labor: prev.costEntries.labor.filter((entry) => !idSet.has(entry.laborRoleId)),
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
  }, [update, dataRef])

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

  // --- Bulk Option Presets ---
  const bulkRemoveOptionPresets = useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    update((prev) => ({
      ...prev,
      optionPresets: (prev.optionPresets ?? []).filter((preset) => !idSet.has(preset.id)),
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

  // --- Bulk Equipment ---
  const bulkUpdateEquipments = useCallback((ids: string[], updates: Partial<Pick<Equipment, "currency">>) => {
    const idSet = new Set(ids)
    update((prev) => ({
      ...prev,
      equipments: prev.equipments.map((equipment) =>
        idSet.has(equipment.id) ? { ...equipment, ...updates } : equipment
      ),
    }))
  }, [update])

  const bulkRemoveEquipments = useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    update((prev) => ({
      ...prev,
      equipments: prev.equipments.filter((equipment) => !idSet.has(equipment.id)),
      products: prev.products.map((product) => ({
        ...product,
        equipmentIds: product.equipmentIds.filter((equipmentId) => !idSet.has(equipmentId)),
      })),
      costEntries: {
        ...prev.costEntries,
        equipmentAllocations: prev.costEntries.equipmentAllocations.filter((entry) => !idSet.has(entry.equipmentId)),
      },
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
  }, [update, dataRef])

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

  // --- Bulk Fees ---
  const bulkUpdateFees = useCallback((ids: string[], updates: Partial<Pick<Fee, "currency">>) => {
    const idSet = new Set(ids)
    update((prev) => ({
      ...prev,
      fees: prev.fees.map((fee) =>
        idSet.has(fee.id) ? { ...fee, ...updates } : fee
      ),
    }))
  }, [update])

  const bulkRemoveFees = useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    update((prev) => ({
      ...prev,
      fees: prev.fees.filter((fee) => !idSet.has(fee.id)),
      costEntries: {
        ...prev.costEntries,
        fees: prev.costEntries.fees.filter((entry) => !idSet.has(entry.feeId)),
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
  }, [update, dataRef])

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

  // --- Products ---
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

  const removeProduct = useCallback(
    (productId: string) => {
      update((prev) => ({
        ...prev,
        products: prev.products.filter((product) => product.id !== productId),
      }))
      stockCleanup.cleanupProductStock(productId)
    },
    [update, stockCleanup]
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

  // --- Cost entries ---
  const addMaterialCostEntry = useCallback(
    (input: Omit<MaterialCostEntry, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({
        ...prev,
        costEntries: { ...prev.costEntries, materials: [...prev.costEntries.materials, { id: id ?? createId(), ...rest }] },
      }))
    },
    [update]
  )

  const addPackagingCostEntry = useCallback(
    (input: Omit<PackagingCostEntry, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({
        ...prev,
        costEntries: { ...prev.costEntries, packaging: [...prev.costEntries.packaging, { id: id ?? createId(), ...rest }] },
      }))
    },
    [update]
  )

  const addLaborCostEntry = useCallback(
    (input: Omit<LaborCostEntry, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({
        ...prev,
        costEntries: { ...prev.costEntries, labor: [...prev.costEntries.labor, { id: id ?? createId(), ...rest }] },
      }))
    },
    [update]
  )

  const addOutsourcingCostEntry = useCallback(
    (input: Omit<OutsourcingCostEntry, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({
        ...prev,
        costEntries: { ...prev.costEntries, outsourcing: [...prev.costEntries.outsourcing, { id: id ?? createId(), ...rest }] },
      }))
    },
    [update]
  )

  const addDevelopmentCostEntry = useCallback(
    (input: Omit<DevelopmentCostEntry, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({
        ...prev,
        costEntries: { ...prev.costEntries, development: [...prev.costEntries.development, { id: id ?? createId(), ...rest }] },
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
          equipmentAllocations: [...prev.costEntries.equipmentAllocations, { id: id ?? createId(), ...rest }],
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
        costEntries: { ...prev.costEntries, logistics: [...prev.costEntries.logistics, { id: id ?? createId(), ...rest }] },
      }))
    },
    [update]
  )

  const addElectricityCostEntry = useCallback(
    (input: Omit<ElectricityCostEntry, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({
        ...prev,
        costEntries: { ...prev.costEntries, electricity: [...prev.costEntries.electricity, { id: id ?? createId(), ...rest }] },
      }))
    },
    [update]
  )

  const addFeeCostEntry = useCallback(
    (input: Omit<FeeCostEntry, "id"> & { id?: string }) => {
      const { id, ...rest } = input
      update((prev) => ({
        ...prev,
        costEntries: { ...prev.costEntries, fees: [...prev.costEntries.fees, { id: id ?? createId(), ...rest }] },
      }))
    },
    [update]
  )

  // --- Time Records ---
  const addTimeRecord = useCallback(
    (input: Omit<TimeRecord, "id"> & { id?: string }) => {
      const { id: inputId, ...rest } = input
      const record: TimeRecord = { ...rest, id: inputId ?? createId() }
      update((prev) => ({
        ...prev,
        timeRecords: [...(prev.timeRecords ?? []), record],
      }))
    },
    [update]
  )

  const updateTimeRecord = useCallback(
    (input: TimeRecord) => {
      update((prev) => ({
        ...prev,
        timeRecords: (prev.timeRecords ?? []).map((r) => (r.id === input.id ? input : r)),
      }))
    },
    [update]
  )

  const removeTimeRecord = useCallback(
    (id: string) => {
      update((prev) => ({
        ...prev,
        timeRecords: (prev.timeRecords ?? []).filter((r) => r.id !== id),
      }))
    },
    [update]
  )

  const bulkRemoveTimeRecords = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids)
      update((prev) => ({
        ...prev,
        timeRecords: (prev.timeRecords ?? []).filter((r) => !idSet.has(r.id)),
      }))
    },
    [update]
  )

  // --- Utility actions ---
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
    bulkUpdateMaterials,
    bulkRemoveMaterials,
    bulkRemoveLargeCategories,
    bulkRemoveMediumCategories,
    bulkRemoveSmallCategories,
    addPackagingItem,
    updatePackagingItem,
    removePackagingItem,
    bulkUpdatePackagingItems,
    bulkRemovePackagingItems,
    addShippingMethod,
    updateShippingMethod,
    removeShippingMethod,
    bulkUpdateShippingMethods,
    bulkRemoveShippingMethods,
    addLaborRole,
    updateLaborRole,
    removeLaborRole,
    bulkUpdateLaborRoles,
    bulkRemoveLaborRoles,
    addOptionPreset,
    updateOptionPreset,
    removeOptionPreset,
    bulkRemoveOptionPresets,
    addEquipment,
    updateEquipment,
    removeEquipment,
    bulkUpdateEquipments,
    bulkRemoveEquipments,
    addFee,
    updateFee,
    removeFee,
    bulkUpdateFees,
    bulkRemoveFees,
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
    addTimeRecord,
    updateTimeRecord,
    removeTimeRecord,
    bulkRemoveTimeRecords,
    resetAll,
    seedSample,
    importGuestData,
  }
}
