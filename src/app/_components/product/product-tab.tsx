"use client"

import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { AppActions } from "@/lib/app-data"
import { formatCurrency } from "@/lib/calculations"
import type { AppData, Product } from "@/lib/types"
import { FormSection } from "../shared/ui"
import { ProductBasicsSection } from "./product-basics-section"
import { ProductRealtimeSummary, type ProductCostSummary } from "./product-summary-panel"
import { ElectricityCostSection } from "./sections/electricity-cost-section"
import { EquipmentAllocationSection } from "./sections/equipment-allocation-section"
import { LaborCostSection } from "./sections/labor-cost-section"
import { LogisticsCostSection } from "./sections/logistics-cost-section"
import { MaterialCostSection } from "./sections/material-cost-section"
import { OutsourcingCostSection } from "./sections/outsourcing-cost-section"
import { PackagingCostSection } from "./sections/packaging-cost-section"
import { DevelopmentCostSection } from "./sections/development-cost-section"
import { RegisteredProductsSection } from "./sections/registered-products-section"
import type {
  DevelopmentCostDraft,
  ElectricityCostDraft,
  EquipmentAllocationDraft,
  LaborCostDraft,
  LogisticsCostDraft,
  MaterialCostDraft,
  NumericValue,
  OutsourcingCostDraft,
  PackagingCostDraft,
} from "./types"

const createTempId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 11)

interface ProductTabProps {
  data: AppData
  actions: AppActions
  editingProductId?: string | null
  onRequestEditClear?: () => void
  copySourceProductId?: string | null
  copyRequestNonce?: number
}

export function ProductTab({ data, actions, editingProductId, onRequestEditClear, copySourceProductId, copyRequestNonce }: ProductTabProps) {
  const shippingMethods = useMemo(() => data.shippingMethods ?? [], [data.shippingMethods])
  const editingProduct = editingProductId
    ? data.products.find((product) => product.id === editingProductId)
    : null

  const createMaterialDraft = useCallback((): MaterialCostDraft => ({
    id: createTempId(),
    materialId: data.materials[0]?.id ?? "",
    usageRatio: 100,
    description: "",
  }), [data.materials])

  const createPackagingDraft = useCallback((): PackagingCostDraft => ({
    id: createTempId(),
    packagingItemId: data.packagingItems[0]?.id ?? "",
    quantity: 1,
  }), [data.packagingItems])

  const createLaborDraft = useCallback(
    (initialHours = 1): LaborCostDraft => ({
      id: createTempId(),
      laborRoleId: data.laborRoles[0]?.id ?? "",
      hours: initialHours,
      peopleCount: 1,
    }),
    [data.laborRoles]
  )

  const createOutsourcingDraft = useCallback((): OutsourcingCostDraft => ({
    id: createTempId(),
    note: "",
    costPerUnit: "",
    currency: "JPY",
  }), [])

  const createDevelopmentDraft = useCallback((): DevelopmentCostDraft => ({
    id: createTempId(),
    title: "",
    prototypeLaborCost: "",
    prototypeMaterialCost: "",
    toolingCost: "",
    amortizationYears: 3,
  }), [])

  const createLogisticsDraft = useCallback((): LogisticsCostDraft => ({
    id: createTempId(),
    shippingMethodId: shippingMethods[0]?.id ?? "",
  }), [shippingMethods])

  const createElectricityDraft = useCallback((): ElectricityCostDraft => ({
    id: createTempId(),
    costPerUnit: "",
    currency: "JPY",
  }), [])

  const buildInitialMaterialDrafts = () => {
    if (!editingProductId) return [createMaterialDraft()]
    const entries = data.costEntries.materials
      .filter((entry) => entry.productId === editingProductId)
      .map((entry) => ({
        id: createTempId(),
        materialId: entry.materialId,
        usageRatio: entry.usageRatio ?? 0,
        description: entry.description ?? "",
      }))
    return entries.length ? entries : [createMaterialDraft()]
  }

  const buildInitialPackagingDrafts = () => {
    if (!editingProductId) return [createPackagingDraft()]
    const entries = data.costEntries.packaging
      .filter((entry) => entry.productId === editingProductId)
      .map((entry) => ({
        id: createTempId(),
        packagingItemId: entry.packagingItemId,
        quantity: entry.quantity,
      }))
    return entries.length ? entries : [createPackagingDraft()]
  }

  const buildInitialLaborDrafts = () => {
    if (!editingProductId || !editingProduct) return [createLaborDraft()]
    const entries = data.costEntries.labor
      .filter((entry) => entry.productId === editingProductId)
      .map((entry) => ({
        id: createTempId(),
        laborRoleId: entry.laborRoleId,
        hours: entry.hours,
        peopleCount: entry.peopleCount,
        hourlyRateOverride: entry.hourlyRateOverride,
      }))
    return entries.length ? entries : [createLaborDraft(editingProduct.baseManHours)]
  }

  const buildInitialOutsourcingDrafts = () => {
    if (!editingProductId) return [createOutsourcingDraft()]
    const entries = data.costEntries.outsourcing
      .filter((entry) => entry.productId === editingProductId)
      .map((entry) => ({
        id: createTempId(),
        note: entry.note ?? "",
        costPerUnit: entry.costPerUnit,
        currency: entry.currency,
      }))
    return entries.length ? entries : [createOutsourcingDraft()]
  }

  const buildInitialDevelopmentDrafts = () => {
    if (!editingProductId) return [createDevelopmentDraft()]
    const entries = data.costEntries.development
      .filter((entry) => entry.productId === editingProductId)
      .map((entry) => ({
        id: createTempId(),
        title: entry.title ?? "",
        prototypeLaborCost: entry.prototypeLaborCost,
        prototypeMaterialCost: entry.prototypeMaterialCost,
        toolingCost: entry.toolingCost,
        amortizationYears: entry.amortizationYears,
      }))
    return entries.length ? entries : [createDevelopmentDraft()]
  }

  const buildInitialEquipmentDrafts = () => {
    if (!editingProductId) return []
    return data.costEntries.equipmentAllocations
      .filter((entry) => entry.productId === editingProductId)
      .map((entry) => ({
        id: createTempId(),
        equipmentId: entry.equipmentId,
        allocationRatio: entry.allocationRatio,
        annualQuantity: entry.annualQuantity,
        usageHours: entry.usageHours ?? 0,
      }))
  }

  const buildInitialLogisticsDrafts = () => {
    if (!editingProductId) return [createLogisticsDraft()]
    const entries = data.costEntries.logistics
      .filter((entry) => entry.productId === editingProductId)
      .map((entry) => ({
        id: createTempId(),
        shippingMethodId: entry.shippingMethodId,
      }))
    return entries.length ? entries : [createLogisticsDraft()]
  }

  const buildInitialElectricityDrafts = () => {
    if (!editingProductId) return [createElectricityDraft()]
    const entries = data.costEntries.electricity
      .filter((entry) => entry.productId === editingProductId)
      .map((entry) => ({
        id: createTempId(),
        costPerUnit: entry.costPerUnit,
        currency: entry.currency,
      }))
    return entries.length ? entries : [createElectricityDraft()]
  }

  const createEmptyProductForm = (): Omit<Product, "id"> => ({
    name: "",
    categoryLargeId: undefined,
    categoryMediumId: undefined,
    categorySmallId: undefined,
    sizeVariants: [{ label: "", quantity: 0 }],
    baseManHours: 0,
    defaultElectricityCost: 0,
    salePrice: 0,
    registeredAt: new Date().toISOString().slice(0, 10),
    notes: "",
    productionLotSize: 1,
    expectedProduction: {
      periodYears: 1,
      quantity: 1000,
    },
    equipmentIds: [],
  })

  const [materialDrafts, setMaterialDrafts] = useState<MaterialCostDraft[]>(buildInitialMaterialDrafts)
  const [packagingDrafts, setPackagingDrafts] = useState<PackagingCostDraft[]>(buildInitialPackagingDrafts)
  const [laborDrafts, setLaborDrafts] = useState<LaborCostDraft[]>(buildInitialLaborDrafts)
  const [outsourcingDrafts, setOutsourcingDrafts] = useState<OutsourcingCostDraft[]>(buildInitialOutsourcingDrafts)
  const [developmentDrafts, setDevelopmentDrafts] = useState<DevelopmentCostDraft[]>(buildInitialDevelopmentDrafts)
  const [equipmentAllocDrafts, setEquipmentAllocDrafts] = useState<EquipmentAllocationDraft[]>(buildInitialEquipmentDrafts)
  const [logisticsDrafts, setLogisticsDrafts] = useState<LogisticsCostDraft[]>(buildInitialLogisticsDrafts)
  const [electricityDrafts, setElectricityDrafts] = useState<ElectricityCostDraft[]>(buildInitialElectricityDrafts)

  const [productForm, setProductForm] = useState<Omit<Product, "id">>(createEmptyProductForm)
  const handleAddMaterialDraft = useCallback(
    () => addDraft(setMaterialDrafts, createMaterialDraft()),
    [createMaterialDraft]
  )
  const handleUpdateMaterialDraft = useCallback(
    (id: string, patch: Partial<MaterialCostDraft>) => updateDraft(setMaterialDrafts, id, patch),
    []
  )
  const handleRemoveMaterialDraft = useCallback((id: string) => removeDraft(setMaterialDrafts, id), [])

  const handleAddPackagingDraft = useCallback(
    () => addDraft(setPackagingDrafts, createPackagingDraft()),
    [createPackagingDraft]
  )
  const handleUpdatePackagingDraft = useCallback(
    (id: string, patch: Partial<PackagingCostDraft>) => updateDraft(setPackagingDrafts, id, patch),
    []
  )
  const handleRemovePackagingDraft = useCallback((id: string) => removeDraft(setPackagingDrafts, id), [])

  const handleAddLaborDraft = useCallback(
    () => addDraft(setLaborDrafts, createLaborDraft(Number(productForm.baseManHours) || 0)),
    [createLaborDraft, productForm.baseManHours]
  )
  const handleUpdateLaborDraft = useCallback(
    (id: string, patch: Partial<LaborCostDraft>) => updateDraft(setLaborDrafts, id, patch),
    []
  )
  const handleRemoveLaborDraft = useCallback((id: string) => removeDraft(setLaborDrafts, id), [])

  const handleAddOutsourcingDraft = useCallback(
    () => addDraft(setOutsourcingDrafts, createOutsourcingDraft()),
    [createOutsourcingDraft]
  )
  const handleUpdateOutsourcingDraft = useCallback(
    (id: string, patch: Partial<OutsourcingCostDraft>) => updateDraft(setOutsourcingDrafts, id, patch),
    []
  )
  const handleRemoveOutsourcingDraft = useCallback((id: string) => removeDraft(setOutsourcingDrafts, id), [])

  const handleAddDevelopmentDraft = useCallback(
    () => addDraft(setDevelopmentDrafts, createDevelopmentDraft()),
    [createDevelopmentDraft]
  )
  const handleUpdateDevelopmentDraft = useCallback(
    (id: string, patch: Partial<DevelopmentCostDraft>) => updateDraft(setDevelopmentDrafts, id, patch),
    []
  )
  const handleRemoveDevelopmentDraft = useCallback((id: string) => removeDraft(setDevelopmentDrafts, id), [])

  const handleUpdateEquipmentDraft = useCallback(
    (id: string, patch: Partial<EquipmentAllocationDraft>) => updateDraft(setEquipmentAllocDrafts, id, patch),
    []
  )

  const handleAddLogisticsDraft = useCallback(
    () => addDraft(setLogisticsDrafts, createLogisticsDraft()),
    [createLogisticsDraft]
  )
  const handleUpdateLogisticsDraft = useCallback(
    (id: string, patch: Partial<LogisticsCostDraft>) => updateDraft(setLogisticsDrafts, id, patch),
    []
  )
  const handleRemoveLogisticsDraft = useCallback((id: string) => removeDraft(setLogisticsDrafts, id), [])

  const handleAddElectricityDraft = useCallback(
    () => addDraft(setElectricityDrafts, createElectricityDraft()),
    [createElectricityDraft]
  )
  const handleUpdateElectricityDraft = useCallback(
    (id: string, patch: Partial<ElectricityCostDraft>) => updateDraft(setElectricityDrafts, id, patch),
    []
  )
  const handleRemoveElectricityDraft = useCallback((id: string) => removeDraft(setElectricityDrafts, id), [])

  const resetFormState = () => {
    setProductForm(createEmptyProductForm())
    setMaterialDrafts([createMaterialDraft()])
    setPackagingDrafts([createPackagingDraft()])
    setLaborDrafts([createLaborDraft()])
    setOutsourcingDrafts([createOutsourcingDraft()])
    setDevelopmentDrafts([createDevelopmentDraft()])
    setEquipmentAllocDrafts([])
    setLogisticsDrafts([createLogisticsDraft()])
    setElectricityDrafts([createElectricityDraft()])
  }



  const addDraft = <T extends { id: string }>(setState: Dispatch<SetStateAction<T[]>>, draft: T) => {
    setState((prev) => [...prev, draft])
  }

  const updateDraft = <T extends { id: string }>(setState: Dispatch<SetStateAction<T[]>>, id: string, patch: Partial<T>) => {
    setState((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removeDraft = <T extends { id: string }>(setState: Dispatch<SetStateAction<T[]>>, id: string) => {
    setState((prev) => prev.filter((item) => item.id !== id))
  }



  useEffect(() => {
    console.log("[productForm] categories", {
      large: productForm.categoryLargeId,
      medium: productForm.categoryMediumId,
      small: productForm.categorySmallId,
    })
  }, [productForm.categoryLargeId, productForm.categoryMediumId, productForm.categorySmallId])

  const handleToggleEquipment = (equipmentId: string, checked: boolean) => {
    setProductForm((prev) => {
      const nextIds = checked
        ? [...prev.equipmentIds, equipmentId]
        : prev.equipmentIds.filter((id) => id !== equipmentId)
      const uniqueIds = checked ? Array.from(new Set(nextIds)) : nextIds
      return { ...prev, equipmentIds: uniqueIds }
    })

    setEquipmentAllocDrafts((prev) => {
      if (checked) {
        if (prev.some((draft) => draft.equipmentId === equipmentId)) {
          return prev
        }
        const nextHours = productForm.baseManHours && productForm.equipmentIds.length + 1 > 0
          ? productForm.baseManHours / (productForm.equipmentIds.length + 1)
          : 1
        return [
          ...prev,
          {
            id: createTempId(),
            equipmentId,
            allocationRatio: 0.5,
            annualQuantity: productForm.expectedProduction.quantity || 1,
            usageHours: nextHours,
          },
        ]
      }
      return prev.filter((draft) => draft.equipmentId !== equipmentId)
    })
  }

  const autoLaborHoursRef = useRef<number>(productForm.baseManHours || 0)

  const validateProductForm = useCallback(() => {
    const missing: string[] = []
    if (!productForm.name.trim()) {
      missing.push("商品名")
    }
    const periodYears = Number(productForm.expectedProduction.periodYears)
    if (!periodYears || periodYears <= 0) {
      missing.push("想定生産期間")
    }
    const quantity = Number(productForm.expectedProduction.quantity)
    if (!quantity || quantity <= 0) {
      missing.push("想定生産数量")
    }
    const salePrice = Number(productForm.salePrice)
    if (!salePrice || salePrice <= 0) {
      missing.push("販売価格")
    }
    return missing
  }, [productForm])

  useEffect(() => {
    const nextHours = Number(productForm.baseManHours) || 0
    if (autoLaborHoursRef.current === nextHours) return
    setLaborDrafts((drafts) =>
      drafts.map((draft) => {
        if (draft.hours === autoLaborHoursRef.current || draft.hours === 0) {
          return { ...draft, hours: nextHours }
        }
        return draft
      })
    )
    autoLaborHoursRef.current = nextHours
  }, [productForm.baseManHours])

  const {
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
    removeCostEntriesByProduct,
  } = actions

  const totalEquipmentHours = equipmentAllocDrafts.reduce((sum, draft) => sum + (draft.usageHours || 0), 0)
  const costSummary = useMemo<ProductCostSummary>(() => {
    const salePrice = Number(productForm.salePrice) || 0
    const expectedQuantity = Math.max(Number(productForm.expectedProduction.quantity) || 1, 1)

    const material = materialDrafts.reduce((sum, draft) => {
      const material = data.materials.find((item) => item.id === draft.materialId)
      if (!material) return sum
      const usageRatio = Math.max(Number(draft.usageRatio) || 0, 0)
      const batchSize = Math.max(material.unitsPerBatch ?? 1, 1)
      const baseUnitCost = (material.unitCost || 0) / batchSize
      return sum + baseUnitCost * (usageRatio / 100)
    }, 0)

    const packaging = packagingDrafts.reduce((sum, draft) => {
      const item = data.packagingItems.find((entry) => entry.id === draft.packagingItemId)
      if (!item) return sum
      const batchSize = Math.max(item.unitsPerBatch ?? 1, 1)
      const baseUnitCost = (item.unitCost || 0) / batchSize
      const quantity = Number(draft.quantity) || 0
      return sum + baseUnitCost * quantity
    }, 0)

    const labor = laborDrafts.reduce((sum, draft) => {
      const role = data.laborRoles.find((entry) => entry.id === draft.laborRoleId)
      const hourlyRate = draft.hourlyRateOverride ?? role?.hourlyRate ?? 0
      const hours = Number(draft.hours) || 0
      const peopleCount = Number(draft.peopleCount) || 0
      return sum + hourlyRate * hours * peopleCount
    }, 0)

    const outsourcing = outsourcingDrafts.reduce((sum, draft) => sum + (Number(draft.costPerUnit) || 0), 0)

    const development = developmentDrafts.reduce((sum, draft) => {
      const laborCost = Number(draft.prototypeLaborCost) || 0
      const materialCost = Number(draft.prototypeMaterialCost) || 0
      const toolingCost = Number(draft.toolingCost) || 0
      const total = laborCost + materialCost + toolingCost
      const amortizationYears = Math.max(Number(draft.amortizationYears) || 1, 1)
      return sum + total / amortizationYears / expectedQuantity
    }, 0)

    const equipment = equipmentAllocDrafts.reduce((sum, draft) => {
      const equipment = data.equipments.find((entry) => entry.id === draft.equipmentId)
      if (!equipment) return sum
      const annualQuantity = Math.max(Number(draft.annualQuantity) || expectedQuantity, 1)
      const amortizationYears = Math.max(equipment.amortizationYears || 1, 1)
      const annualCost = equipment.acquisitionCost / amortizationYears
      const usageHours = draft.usageHours ?? 0
      const ratio =
        totalEquipmentHours > 0 && draft.usageHours !== undefined
          ? usageHours / totalEquipmentHours
          : Number(draft.allocationRatio) || 0
      return sum + (annualCost * ratio) / annualQuantity
    }, 0)

    const logistics = logisticsDrafts.reduce((sum, draft) => {
      const method = shippingMethods.find((item) => item.id === draft.shippingMethodId)
      if (!method) return sum
      return sum + (method.unitCost || 0)
    }, 0)

    const electricity = electricityDrafts.reduce((sum, draft) => sum + (Number(draft.costPerUnit) || 0), 0)

    const total =
      material +
      packaging +
      labor +
      outsourcing +
      development +
      equipment +
      logistics +
      electricity

    const grossProfit = salePrice - total
    const profitMargin = salePrice > 0 ? (grossProfit / salePrice) * 100 : 0

    return {
      salePrice,
      totalCost: total,
      grossProfit,
      profitMargin,
      breakdown: [
        { key: "material", label: "材料費", value: material },
        { key: "packaging", label: "梱包材費", value: packaging },
        { key: "labor", label: "人件費", value: labor },
        { key: "outsourcing", label: "外注費", value: outsourcing },
        { key: "development", label: "開発費", value: development },
        { key: "equipment", label: "設備配賦", value: equipment },
        { key: "logistics", label: "物流費", value: logistics },
        { key: "electricity", label: "電気代", value: electricity },
      ],
    }
  }, [
    data.materials,
    data.packagingItems,
    data.laborRoles,
    data.equipments,
    electricityDrafts,
    equipmentAllocDrafts,
    logisticsDrafts,
    materialDrafts,
    outsourcingDrafts,
    packagingDrafts,
    laborDrafts,
    developmentDrafts,
    productForm,
    shippingMethods,
    totalEquipmentHours,
  ])

  const lastHydratedInfoRef = useRef<{ id: string; copyMode: boolean } | null>(null)
  const needsCategoryRecoveryRef = useRef(false)

  const hydrateProductFromExisting = useCallback(
    (sourceProductId: string, options?: { copy?: boolean; skipCategoryRecovery?: boolean }) => {
      const product = data.products.find((p) => p.id === sourceProductId)
      if (!product) return false

      const copyMode = options?.copy ?? false
      const adjustedName = copyMode ? `${product.name} (コピー)` : product.name
      const adjustedDate = copyMode ? new Date().toISOString().slice(0, 10) : product.registeredAt

    const mapOrFallback = <T,>(entries: T[], fallback: () => T, allowEmpty = false) =>
      entries.length > 0 ? entries : allowEmpty ? [] : [fallback()]

      const expectCategories = Boolean(
        product.categoryLargeId || product.categoryMediumId || product.categorySmallId
      )
      lastHydratedInfoRef.current = { id: sourceProductId, copyMode }
      if (!options?.skipCategoryRecovery) {
        needsCategoryRecoveryRef.current = expectCategories
      }

      const resolvedMediumId =
        product.categoryMediumId ??
      (product.categorySmallId
        ? data.categories.small.find((category) => category.id === product.categorySmallId)?.mediumId
        : undefined)

    const resolvedLargeId =
      product.categoryLargeId ??
      (resolvedMediumId
        ? data.categories.medium.find((category) => category.id === resolvedMediumId)?.largeId
        : undefined)

    const clonedVariants =
      product.sizeVariants && product.sizeVariants.length > 0
        ? product.sizeVariants.map((variant) => ({ label: variant.label, quantity: variant.quantity }))
        : [{ label: "", quantity: 0 }]

      setProductForm({
        name: adjustedName,
        categoryLargeId: resolvedLargeId ?? undefined,
        categoryMediumId: resolvedMediumId ?? undefined,
        categorySmallId: product.categorySmallId ?? undefined,
      sizeVariants: clonedVariants,
      baseManHours: product.baseManHours,
      defaultElectricityCost: product.defaultElectricityCost,
      salePrice: product.salePrice ?? 0,
      registeredAt: adjustedDate,
      notes: product.notes ?? "",
      productionLotSize: product.productionLotSize,
      expectedProduction: {
        periodYears: product.expectedProduction.periodYears,
        quantity: product.expectedProduction.quantity,
      },
      equipmentIds: product.equipmentIds ?? [],
    })

    setMaterialDrafts(
      mapOrFallback(
        data.costEntries.materials
          .filter((entry) => entry.productId === sourceProductId)
          .map((entry) => ({
            id: createTempId(),
            materialId: entry.materialId,
            usageRatio: entry.usageRatio ?? 0,
            description: entry.description ?? "",
          })),
        createMaterialDraft,
        copyMode
      )
    )

    setPackagingDrafts(
      mapOrFallback(
        data.costEntries.packaging
          .filter((entry) => entry.productId === sourceProductId)
          .map((entry) => ({
            id: createTempId(),
            packagingItemId: entry.packagingItemId,
            quantity: entry.quantity,
          })),
        createPackagingDraft,
        copyMode
      )
    )

    setLaborDrafts(
      mapOrFallback(
        data.costEntries.labor
          .filter((entry) => entry.productId === sourceProductId)
          .map((entry) => ({
            id: createTempId(),
            laborRoleId: entry.laborRoleId,
            hours: entry.hours,
            peopleCount: entry.peopleCount,
            hourlyRateOverride: entry.hourlyRateOverride,
          })),
        () => createLaborDraft(product.baseManHours),
        copyMode
      )
    )

    setOutsourcingDrafts(
      mapOrFallback(
        data.costEntries.outsourcing
          .filter((entry) => entry.productId === sourceProductId)
          .map((entry) => ({
            id: createTempId(),
            note: entry.note ?? "",
            costPerUnit: entry.costPerUnit,
            currency: entry.currency,
          })),
        createOutsourcingDraft,
        copyMode
      )
    )

    setDevelopmentDrafts(
      mapOrFallback(
        data.costEntries.development
          .filter((entry) => entry.productId === sourceProductId)
          .map((entry) => ({
            id: createTempId(),
            title: entry.title ?? "",
            prototypeLaborCost: entry.prototypeLaborCost,
            prototypeMaterialCost: entry.prototypeMaterialCost,
            toolingCost: entry.toolingCost,
            amortizationYears: entry.amortizationYears,
          })),
        createDevelopmentDraft,
        copyMode
      )
    )

    setEquipmentAllocDrafts(
      data.costEntries.equipmentAllocations
        .filter((entry) => entry.productId === sourceProductId)
        .map((entry) => ({
          id: createTempId(),
          equipmentId: entry.equipmentId,
          allocationRatio: entry.allocationRatio,
          annualQuantity: entry.annualQuantity,
          usageHours: entry.usageHours ?? 0,
        }))
    )

    setLogisticsDrafts(
      mapOrFallback(
        data.costEntries.logistics
          .filter((entry) => entry.productId === sourceProductId)
          .map((entry) => ({
            id: createTempId(),
            shippingMethodId: entry.shippingMethodId,
          })),
        createLogisticsDraft,
        copyMode
      )
    )

    setElectricityDrafts(
      mapOrFallback(
        data.costEntries.electricity
          .filter((entry) => entry.productId === sourceProductId)
          .map((entry) => ({
            id: createTempId(),
            costPerUnit: entry.costPerUnit,
            currency: entry.currency,
          })),
        createElectricityDraft,
        copyMode
      )
    )

      autoLaborHoursRef.current = product.baseManHours
      return true
    }, [
      createDevelopmentDraft,
      createElectricityDraft,
      createLaborDraft,
      createLogisticsDraft,
      createMaterialDraft,
      createOutsourcingDraft,
      createPackagingDraft,
      data.categories.medium,
      data.categories.small,
      data.costEntries.development,
      data.costEntries.electricity,
      data.costEntries.equipmentAllocations,
      data.costEntries.labor,
      data.costEntries.logistics,
      data.costEntries.materials,
      data.costEntries.outsourcing,
      data.costEntries.packaging,
      data.products,
    ])

  useEffect(() => {
    if (!editingProductId) return
    hydrateProductFromExisting(editingProductId)
  }, [editingProductId, data.products, hydrateProductFromExisting])

  useEffect(() => {
    if (!copySourceProductId) return
    hydrateProductFromExisting(copySourceProductId, { copy: true })
    onRequestEditClear?.()
  }, [copySourceProductId, copyRequestNonce, data.products, hydrateProductFromExisting, onRequestEditClear])

  useEffect(() => {
    if (!needsCategoryRecoveryRef.current) return
    if (productForm.categoryLargeId || productForm.categoryMediumId || productForm.categorySmallId) {
      needsCategoryRecoveryRef.current = false
      return
    }
    const info = lastHydratedInfoRef.current
    if (!info) {
      needsCategoryRecoveryRef.current = false
      return
    }
    const success = hydrateProductFromExisting(info.id, {
      copy: info.copyMode,
      skipCategoryRecovery: true,
    })
    if (!success) {
      needsCategoryRecoveryRef.current = false
    }
  }, [
    productForm.categoryLargeId,
    productForm.categoryMediumId,
    productForm.categorySmallId,
    hydrateProductFromExisting,
  ])

  const handleCancelEdit = () => {
    resetFormState()
    onRequestEditClear?.()
  }

  return (
    <div className="space-y-6">
      {editingProductId && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed bg-muted/60 px-3 py-2 text-sm">
          <span>編集中: {editingProduct?.name ?? "選択中の商品"}</span>
          <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit}>
            編集をやめて新規作成
          </Button>
        </div>
      )}
      <RegisteredProductsSection data={data} />

    </div>
  )
}
