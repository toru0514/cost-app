"use client"

import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { AppData, Product } from "@/lib/types"
import type {
  DevelopmentCostDraft,
  ElectricityCostDraft,
  EquipmentAllocationDraft,
  LaborCostDraft,
  LogisticsCostDraft,
  MaterialCostDraft,
  OutsourcingCostDraft,
  PackagingCostDraft,
  FeeCostDraft,
  ProductProcessDraft,
} from "../types"

const createTempId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 11)

const addDraft = <T extends { id: string }>(setState: Dispatch<SetStateAction<T[]>>, draft: T) => {
  setState((prev) => [...prev, draft])
}

const updateDraft = <T extends { id: string }>(
  setState: Dispatch<SetStateAction<T[]>>,
  id: string,
  patch: Partial<T>
) => {
  setState((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
}

const removeDraft = <T extends { id: string }>(setState: Dispatch<SetStateAction<T[]>>, id: string) => {
  setState((prev) => prev.filter((item) => item.id !== id))
}

const mapOrFallback = <T,>(entries: T[], fallback: () => T, allowEmpty = false) =>
  entries.length > 0 ? entries : allowEmpty ? [] : [fallback()]

interface UseProductDraftStateArgs {
  data: AppData
  editingProductId?: string | null
  onRequestEditClear?: () => void
  copySourceProductId?: string | null
  copyRequestNonce?: number
}

export interface ProductDraftStateResult {
  shippingMethods: NonNullable<AppData["shippingMethods"]>
  editingProduct: Product | null
  productForm: Omit<Product, "id">
  setProductForm: Dispatch<SetStateAction<Omit<Product, "id">>>
  initialStock: number
  setInitialStock: (quantity: number) => void
  materialDrafts: MaterialCostDraft[]
  packagingDrafts: PackagingCostDraft[]
  laborDrafts: LaborCostDraft[]
  outsourcingDrafts: OutsourcingCostDraft[]
  developmentDrafts: DevelopmentCostDraft[]
  equipmentAllocDrafts: EquipmentAllocationDraft[]
  logisticsDrafts: LogisticsCostDraft[]
  electricityDrafts: ElectricityCostDraft[]
  feeDrafts: FeeCostDraft[]
  processDrafts: ProductProcessDraft[]
  totalEquipmentHours: number
  handleToggleEquipment: (equipmentId: string, checked: boolean) => void
  handleAddMaterialDraft: () => void
  handleUpdateMaterialDraft: (id: string, patch: Partial<MaterialCostDraft>) => void
  handleRemoveMaterialDraft: (id: string) => void
  handleAddPackagingDraft: () => void
  handleUpdatePackagingDraft: (id: string, patch: Partial<PackagingCostDraft>) => void
  handleRemovePackagingDraft: (id: string) => void
  handleAddLaborDraft: () => void
  handleUpdateLaborDraft: (id: string, patch: Partial<LaborCostDraft>) => void
  handleRemoveLaborDraft: (id: string) => void
  handleAddOutsourcingDraft: () => void
  handleUpdateOutsourcingDraft: (id: string, patch: Partial<OutsourcingCostDraft>) => void
  handleRemoveOutsourcingDraft: (id: string) => void
  handleAddDevelopmentDraft: () => void
  handleUpdateDevelopmentDraft: (id: string, patch: Partial<DevelopmentCostDraft>) => void
  handleRemoveDevelopmentDraft: (id: string) => void
  handleUpdateEquipmentDraft: (id: string, patch: Partial<EquipmentAllocationDraft>) => void
  handleAddLogisticsDraft: () => void
  handleUpdateLogisticsDraft: (id: string, patch: Partial<LogisticsCostDraft>) => void
  handleRemoveLogisticsDraft: (id: string) => void
  handleAddElectricityDraft: () => void
  handleUpdateElectricityDraft: (id: string, patch: Partial<ElectricityCostDraft>) => void
  handleRemoveElectricityDraft: (id: string) => void
  handleAddFeeDraft: () => void
  handleUpdateFeeDraft: (id: string, patch: Partial<FeeCostDraft>) => void
  handleRemoveFeeDraft: (id: string) => void
  handleAddProcessDraft: () => void
  handleAddProcessFromTemplate: (templateId: string) => void
  handleUpdateProcessDraft: (id: string, patch: Partial<ProductProcessDraft>) => void
  handleRemoveProcessDraft: (id: string) => void
  handleAddChildProcess: (parentId: string) => void
  resetFormState: () => void
  handleCancelEdit: () => void
}

export function useProductDraftState({
  data,
  editingProductId,
  onRequestEditClear,
  copySourceProductId,
  copyRequestNonce,
}: UseProductDraftStateArgs): ProductDraftStateResult {
  const shippingMethods = useMemo(() => data.shippingMethods ?? [], [data.shippingMethods])
  const editingProduct = useMemo(
    () => (editingProductId ? data.products.find((product) => product.id === editingProductId) ?? null : null),
    [data.products, editingProductId]
  )

  const createMaterialDraft = useCallback((): MaterialCostDraft => ({
    id: createTempId(),
    materialId: data.materials[0]?.id ?? "",
    usageRatio: 1,
    description: "",
  }), [data.materials])

  const createPackagingDraft = useCallback((): PackagingCostDraft => ({
    id: createTempId(),
    packagingItemId: data.packagingItems[0]?.id ?? "",
    quantity: 1,
  }), [data.packagingItems])

  const createLaborDraft = useCallback(
    (initialHours = 0): LaborCostDraft => ({
      id: createTempId(),
      laborRoleId: data.laborRoles[0]?.id ?? "",
      hours: initialHours,
      peopleCount: 1,
      isAutoLinked: true,
    }),
    [data.laborRoles]
  )

  const createOutsourcingDraft = useCallback(
    (): OutsourcingCostDraft => ({ id: createTempId(), note: "", costPerUnit: "", currency: "JPY" }),
    []
  )

  const createDevelopmentDraft = useCallback(
    (): DevelopmentCostDraft => ({
      id: createTempId(),
      title: "",
      prototypeLaborCost: "",
      prototypeMaterialCost: "",
      toolingCost: "",
      amortizationYears: 3,
    }),
    []
  )

  const createLogisticsDraft = useCallback(
    (): LogisticsCostDraft => ({ id: createTempId(), shippingMethodId: shippingMethods[0]?.id ?? "" }),
    [shippingMethods]
  )

  const createElectricityDraft = useCallback(
    (): ElectricityCostDraft => ({ id: createTempId(), costPerUnit: "", currency: "JPY" }),
    []
  )

  const createFeeDraft = useCallback(
    (): FeeCostDraft => ({ id: createTempId(), feeId: data.fees[0]?.id ?? "" }),
    [data.fees]
  )

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
    imageUrl: "",
    status: "active",
  })

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
    if (!editingProductId) return []
    const entries = data.costEntries.packaging
      .filter((entry) => entry.productId === editingProductId)
      .map((entry) => ({
        id: createTempId(),
        packagingItemId: entry.packagingItemId,
        quantity: entry.quantity,
      }))
    return entries
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
        isAutoLinked: true,
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
    if (!editingProductId) return []
    const entries = data.costEntries.logistics
      .filter((entry) => entry.productId === editingProductId)
      .map((entry) => ({
        id: createTempId(),
        shippingMethodId: entry.shippingMethodId,
      }))
    return entries
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

  const buildInitialFeeDrafts = () => {
    if (!editingProductId) return data.fees.length ? [createFeeDraft()] : []
    const entries = data.costEntries.fees
      .filter((entry) => entry.productId === editingProductId)
      .map((entry) => ({
        id: createTempId(),
        feeId: entry.feeId,
      }))
    if (entries.length > 0) return entries
    return data.fees.length ? [createFeeDraft()] : []
  }

  const [materialDrafts, setMaterialDrafts] = useState<MaterialCostDraft[]>(buildInitialMaterialDrafts)
  const [packagingDrafts, setPackagingDrafts] = useState<PackagingCostDraft[]>(buildInitialPackagingDrafts)
  const [laborDrafts, setLaborDrafts] = useState<LaborCostDraft[]>(buildInitialLaborDrafts)
  const [outsourcingDrafts, setOutsourcingDrafts] = useState<OutsourcingCostDraft[]>(buildInitialOutsourcingDrafts)
  const [developmentDrafts, setDevelopmentDrafts] = useState<DevelopmentCostDraft[]>(buildInitialDevelopmentDrafts)
  const [equipmentAllocDrafts, setEquipmentAllocDrafts] = useState<EquipmentAllocationDraft[]>(buildInitialEquipmentDrafts)
  const [logisticsDrafts, setLogisticsDrafts] = useState<LogisticsCostDraft[]>(buildInitialLogisticsDrafts)
  const [electricityDrafts, setElectricityDrafts] = useState<ElectricityCostDraft[]>(buildInitialElectricityDrafts)
  const [feeDrafts, setFeeDrafts] = useState<FeeCostDraft[]>(buildInitialFeeDrafts)

  const buildInitialProcessDrafts = (): ProductProcessDraft[] => {
    if (!editingProductId) return []
    return data.productProcesses
      .filter((pp) => pp.productId === editingProductId)
      .map((pp) => ({
        id: createTempId(),
        parentId: pp.parentId,
        processTemplateId: pp.processTemplateId,
        name: pp.name,
        hourlyRate: pp.hourlyRate,
        estimatedMinutes: pp.estimatedMinutes,
        sortOrder: pp.sortOrder,
      }))
  }

  const [processDrafts, setProcessDrafts] = useState<ProductProcessDraft[]>(buildInitialProcessDrafts)
  const [productForm, setProductForm] = useState<Omit<Product, "id">>(createEmptyProductForm)
  const [initialStock, setInitialStockValue] = useState<number>(1)
  const [initialStockOverridden, setInitialStockOverridden] = useState(false)

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

  const handleAddLaborDraft = useCallback(() => {
    const baseHours = Number(productForm.baseManHours) || 0
    addDraft(setLaborDrafts, createLaborDraft(baseHours))
  }, [createLaborDraft, productForm.baseManHours])
  const handleUpdateLaborDraft = useCallback((id: string, patch: Partial<LaborCostDraft>) => {
    setLaborDrafts((drafts) =>
      drafts.map((draft) => {
        if (draft.id !== id) return draft
        const shouldUnlink = Object.prototype.hasOwnProperty.call(patch, "hours")
        return {
          ...draft,
          ...patch,
          isAutoLinked: shouldUnlink ? false : draft.isAutoLinked,
        }
      })
    )
  }, [])
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

  const handleAddFeeDraft = useCallback(
    () => addDraft(setFeeDrafts, createFeeDraft()),
    [createFeeDraft]
  )
  const handleUpdateFeeDraft = useCallback(
    (id: string, patch: Partial<FeeCostDraft>) => updateDraft(setFeeDrafts, id, patch),
    []
  )
  const handleRemoveFeeDraft = useCallback((id: string) => removeDraft(setFeeDrafts, id), [])

  const handleAddProcessDraft = useCallback(() => {
    const maxSort = processDrafts.filter((d) => !d.parentId).reduce((max, d) => Math.max(max, d.sortOrder), -1)
    addDraft(setProcessDrafts, {
      id: createTempId(),
      name: "",
      hourlyRate: 0,
      sortOrder: maxSort + 1,
    })
  }, [processDrafts])

  const handleAddProcessFromTemplate = useCallback(
    (templateId: string) => {
      const template = data.processTemplates.find((t) => t.id === templateId)
      if (!template) return
      const maxSort = processDrafts.filter((d) => !d.parentId).reduce((max, d) => Math.max(max, d.sortOrder), -1)
      const parentDraftId = createTempId()
      const parentDraft: ProductProcessDraft = {
        id: parentDraftId,
        processTemplateId: template.id,
        name: template.name,
        hourlyRate: template.defaultHourlyRate,
        sortOrder: maxSort + 1,
      }
      // Also add child templates if any
      const childTemplates = data.processTemplates
        .filter((t) => t.parentId === templateId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      const childDrafts: ProductProcessDraft[] = childTemplates.map((child, index) => ({
        id: createTempId(),
        parentId: parentDraftId,
        processTemplateId: child.id,
        name: child.name,
        hourlyRate: child.defaultHourlyRate,
        sortOrder: index,
      }))
      setProcessDrafts((prev) => [...prev, parentDraft, ...childDrafts])
    },
    [data.processTemplates, processDrafts]
  )

  const handleUpdateProcessDraft = useCallback(
    (id: string, patch: Partial<ProductProcessDraft>) => updateDraft(setProcessDrafts, id, patch),
    []
  )

  const handleRemoveProcessDraft = useCallback((id: string) => {
    // Remove the draft and any children
    setProcessDrafts((prev) => prev.filter((d) => d.id !== id && d.parentId !== id))
  }, [])

  const handleAddChildProcess = useCallback(
    (parentId: string) => {
      const maxSort = processDrafts.filter((d) => d.parentId === parentId).reduce((max, d) => Math.max(max, d.sortOrder), -1)
      addDraft<ProductProcessDraft>(setProcessDrafts, {
        id: createTempId(),
        parentId,
        name: "",
        hourlyRate: 0,
        sortOrder: maxSort + 1,
      })
    },
    [processDrafts]
  )

  const resetFormState = useCallback(() => {
    const emptyProductForm = createEmptyProductForm()
    setProductForm(emptyProductForm)
    setMaterialDrafts([createMaterialDraft()])
    setPackagingDrafts([])
    setLaborDrafts([createLaborDraft()])
    setOutsourcingDrafts([createOutsourcingDraft()])
    setDevelopmentDrafts([createDevelopmentDraft()])
    setEquipmentAllocDrafts([])
    setLogisticsDrafts([])
    setElectricityDrafts([createElectricityDraft()])
    setFeeDrafts(data.fees.length ? [createFeeDraft()] : [])
    setProcessDrafts([])
    setInitialStockValue(emptyProductForm.productionLotSize)
    setInitialStockOverridden(false)
  }, [
    createDevelopmentDraft,
    createElectricityDraft,
    createLaborDraft,
    createMaterialDraft,
    createOutsourcingDraft,
    createFeeDraft,
    data.fees.length,
  ])

  const handleToggleEquipment = useCallback(
    (equipmentId: string, checked: boolean) => {
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
          const divisor = prev.length + 1 || 1
          const nextHours = productForm.baseManHours && divisor > 0 ? productForm.baseManHours / divisor : 1
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
    },
    [productForm.baseManHours, productForm.expectedProduction.quantity]
  )

  const autoLaborHoursRef = useRef<number>(productForm.baseManHours || 0)

  const populateFromProduct = useCallback(
    (productId: string) => {
      const product = data.products.find((p) => p.id === productId)
      if (!product) return null

      setProductForm({
        name: product.name,
        categoryLargeId: product.categoryLargeId ?? undefined,
        categoryMediumId: product.categoryMediumId ?? undefined,
        categorySmallId: product.categorySmallId ?? undefined,
        sizeVariants:
          product.sizeVariants?.map((variant) => ({ label: variant.label, quantity: variant.quantity })) ?? [{ label: "", quantity: 0 }],
        baseManHours: product.baseManHours,
        defaultElectricityCost: product.defaultElectricityCost,
        salePrice: product.salePrice ?? 0,
        registeredAt: product.registeredAt,
        notes: product.notes ?? "",
        productionLotSize: product.productionLotSize,
        expectedProduction: product.expectedProduction,
        equipmentIds: product.equipmentIds ?? [],
        imageUrl: product.imageUrl ?? "",
        status: product.status ?? "active",
      })
      setInitialStockValue(Math.max(0, Number(product.productionLotSize) || 0))
      setInitialStockOverridden(false)

      setMaterialDrafts(
        mapOrFallback(
          data.costEntries.materials
            .filter((entry) => entry.productId === productId)
            .map((entry) => ({
              id: createTempId(),
              materialId: entry.materialId,
              usageRatio: entry.usageRatio ?? 0,
              description: entry.description ?? "",
            })),
          createMaterialDraft,
          false
        )
      )

      setPackagingDrafts(
        mapOrFallback(
          data.costEntries.packaging
            .filter((entry) => entry.productId === productId)
            .map((entry) => ({
              id: createTempId(),
              packagingItemId: entry.packagingItemId,
              quantity: entry.quantity,
            })),
          createPackagingDraft,
          true
        )
      )

      setLaborDrafts(
        mapOrFallback(
          data.costEntries.labor
            .filter((entry) => entry.productId === productId)
            .map((entry) => ({
              id: createTempId(),
              laborRoleId: entry.laborRoleId,
              hours: entry.hours,
              peopleCount: entry.peopleCount,
              hourlyRateOverride: entry.hourlyRateOverride,
              isAutoLinked: true,
            })),
          () => createLaborDraft(product.baseManHours),
          false
        )
      )

      setOutsourcingDrafts(
        mapOrFallback(
          data.costEntries.outsourcing
            .filter((entry) => entry.productId === productId)
            .map((entry) => ({
              id: createTempId(),
              note: entry.note ?? "",
              costPerUnit: entry.costPerUnit,
              currency: entry.currency,
            })),
          createOutsourcingDraft,
          false
        )
      )

      setDevelopmentDrafts(
        mapOrFallback(
          data.costEntries.development
            .filter((entry) => entry.productId === productId)
            .map((entry) => ({
              id: createTempId(),
              title: entry.title ?? "",
              prototypeLaborCost: entry.prototypeLaborCost,
              prototypeMaterialCost: entry.prototypeMaterialCost,
              toolingCost: entry.toolingCost,
              amortizationYears: entry.amortizationYears,
            })),
          createDevelopmentDraft,
          false
        )
      )

      setEquipmentAllocDrafts(
        data.costEntries.equipmentAllocations
          .filter((entry) => entry.productId === productId)
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
            .filter((entry) => entry.productId === productId)
            .map((entry) => ({
              id: createTempId(),
              shippingMethodId: entry.shippingMethodId,
              costPerUnit: entry.costPerUnit,
              currency: entry.currency,
            })),
          createLogisticsDraft,
          true
        )
      )

      setElectricityDrafts(
        mapOrFallback(
          data.costEntries.electricity
            .filter((entry) => entry.productId === productId)
            .map((entry) => ({
              id: createTempId(),
              costPerUnit: entry.costPerUnit,
              currency: entry.currency,
            })),
          createElectricityDraft,
          false
        )
      )

      setFeeDrafts(
        mapOrFallback(
          data.costEntries.fees
            .filter((entry) => entry.productId === productId)
            .map((entry) => ({
              id: createTempId(),
              feeId: entry.feeId,
            })),
          createFeeDraft,
          Boolean(editingProductId) || data.fees.length === 0
        )
      )

      // Load existing product processes as drafts
      // We need to map original IDs to new temp IDs for parent-child relationships
      const existingProcesses = data.productProcesses.filter((pp) => pp.productId === productId)
      const idMap = new Map<string, string>()
      for (const pp of existingProcesses) {
        idMap.set(pp.id, createTempId())
      }
      setProcessDrafts(
        existingProcesses.map((pp) => ({
          id: idMap.get(pp.id)!,
          parentId: pp.parentId ? idMap.get(pp.parentId) : undefined,
          processTemplateId: pp.processTemplateId,
          name: pp.name,
          hourlyRate: pp.hourlyRate,
          estimatedMinutes: pp.estimatedMinutes,
          sortOrder: pp.sortOrder,
        }))
      )

      autoLaborHoursRef.current = product.baseManHours
      return product
    },
    [
      createDevelopmentDraft,
      createElectricityDraft,
      createLaborDraft,
      createLogisticsDraft,
      createMaterialDraft,
      createOutsourcingDraft,
      createPackagingDraft,
      createFeeDraft,
      data.costEntries.development,
      data.costEntries.electricity,
      data.costEntries.equipmentAllocations,
      data.costEntries.labor,
      data.costEntries.logistics,
      data.costEntries.materials,
      data.costEntries.outsourcing,
      data.costEntries.packaging,
      data.costEntries.fees,
      data.productProcesses,
      data.products,
      data.fees.length,
      editingProductId,
    ]
  )

  useEffect(() => {
    if (!editingProductId) return
    // React Compiler warns about state updates inside effects, butここでは商品編集の開始時に
    // 既存データでフォームを初期化する必要があるため抑止する
    // eslint-disable-next-line react-hooks/set-state-in-effect
    populateFromProduct(editingProductId)
  }, [editingProductId, populateFromProduct])

  useEffect(() => {
    if (!copySourceProductId) return
    // コピー機能の初期化も同様にフォームを再構築する必要がある
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const product = populateFromProduct(copySourceProductId)
    if (!product) return

    setProductForm((prev) => ({
      ...prev,
      name: `${product.name} (コピー)`,
      registeredAt: new Date().toISOString().slice(0, 10),
    }))
    onRequestEditClear?.()
  }, [copySourceProductId, copyRequestNonce, onRequestEditClear, populateFromProduct])

  useEffect(() => {
    const nextHours = Number(productForm.baseManHours) || 0
    if (autoLaborHoursRef.current === nextHours) return
    // 自動リンクされた工数行に同期させるための意図的な state 更新
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLaborDrafts((drafts) =>
      drafts.map((draft) => {
        if (draft.isAutoLinked === false) return draft
        if (draft.hours === nextHours) return draft
        return { ...draft, hours: nextHours }
      })
    )
    autoLaborHoursRef.current = nextHours
  }, [productForm.baseManHours])

  useEffect(() => {
    if (initialStockOverridden) return
    const normalizedLotSize = Math.max(0, Number(productForm.productionLotSize) || 0)
    if (initialStock === normalizedLotSize) return
    setInitialStockValue(normalizedLotSize)
  }, [initialStock, initialStockOverridden, productForm.productionLotSize])

  const setInitialStock = useCallback((quantity: number) => {
    setInitialStockValue(Math.max(0, Number(quantity) || 0))
    setInitialStockOverridden(true)
  }, [])

  const handleCancelEdit = useCallback(() => {
    resetFormState()
    onRequestEditClear?.()
  }, [onRequestEditClear, resetFormState])

  const totalEquipmentHours = useMemo(
    () => equipmentAllocDrafts.reduce((sum, draft) => sum + (draft.usageHours || 0), 0),
    [equipmentAllocDrafts]
  )

  return {
    shippingMethods,
    editingProduct,
    productForm,
    setProductForm,
    initialStock,
    setInitialStock,
    materialDrafts,
    packagingDrafts,
    laborDrafts,
    outsourcingDrafts,
    developmentDrafts,
    equipmentAllocDrafts,
    logisticsDrafts,
    electricityDrafts,
    feeDrafts,
    processDrafts,
    totalEquipmentHours,
    handleToggleEquipment,
    handleAddMaterialDraft,
    handleUpdateMaterialDraft,
    handleRemoveMaterialDraft,
    handleAddPackagingDraft,
    handleUpdatePackagingDraft,
    handleRemovePackagingDraft,
    handleAddLaborDraft,
    handleUpdateLaborDraft,
    handleRemoveLaborDraft,
    handleAddOutsourcingDraft,
    handleUpdateOutsourcingDraft,
    handleRemoveOutsourcingDraft,
    handleAddDevelopmentDraft,
    handleUpdateDevelopmentDraft,
    handleRemoveDevelopmentDraft,
    handleUpdateEquipmentDraft,
    handleAddLogisticsDraft,
    handleUpdateLogisticsDraft,
    handleRemoveLogisticsDraft,
    handleAddElectricityDraft,
    handleUpdateElectricityDraft,
    handleRemoveElectricityDraft,
    handleAddFeeDraft,
    handleUpdateFeeDraft,
    handleRemoveFeeDraft,
    handleAddProcessDraft,
    handleAddProcessFromTemplate,
    handleUpdateProcessDraft,
    handleRemoveProcessDraft,
    handleAddChildProcess,
    resetFormState,
    handleCancelEdit,
  }
}
