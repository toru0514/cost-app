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
  materialDrafts: MaterialCostDraft[]
  packagingDrafts: PackagingCostDraft[]
  laborDrafts: LaborCostDraft[]
  outsourcingDrafts: OutsourcingCostDraft[]
  developmentDrafts: DevelopmentCostDraft[]
  equipmentAllocDrafts: EquipmentAllocationDraft[]
  logisticsDrafts: LogisticsCostDraft[]
  electricityDrafts: ElectricityCostDraft[]
  feeDrafts: FeeCostDraft[]
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
    usageRatio: 100,
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

  const resetFormState = useCallback(() => {
    setProductForm(createEmptyProductForm())
    setMaterialDrafts([createMaterialDraft()])
    setPackagingDrafts([createPackagingDraft()])
    setLaborDrafts([createLaborDraft()])
    setOutsourcingDrafts([createOutsourcingDraft()])
    setDevelopmentDrafts([createDevelopmentDraft()])
    setEquipmentAllocDrafts([])
    setLogisticsDrafts([createLogisticsDraft()])
    setElectricityDrafts([createElectricityDraft()])
    setFeeDrafts(data.fees.length ? [createFeeDraft()] : [])
  }, [
    createDevelopmentDraft,
    createElectricityDraft,
    createLaborDraft,
    createLogisticsDraft,
    createMaterialDraft,
    createOutsourcingDraft,
    createPackagingDraft,
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
      })

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
          false
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
          false
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
    materialDrafts,
    packagingDrafts,
    laborDrafts,
    outsourcingDrafts,
    developmentDrafts,
    equipmentAllocDrafts,
    logisticsDrafts,
    electricityDrafts,
    feeDrafts,
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
    resetFormState,
    handleCancelEdit,
  }
}
