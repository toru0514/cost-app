"use client"

import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type { AppActions } from "@/lib/app-data"
import { formatCurrency } from "@/lib/calculations"
import { currencyOptions } from "@/lib/constants"
import type { AppData, Product } from "@/lib/types"
import { DraftCard, FieldHint, FormSection, HintList } from "../shared/ui"
import { ProductBasicsSection } from "./product-basics-section"
import { ProductRealtimeSummary, type ProductCostSummary } from "./product-summary-panel"

const createTempId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 11)

type NumericValue = number | ""

type MaterialCostDraft = {
  id: string
  materialId: string
  usageRatio: number
  description: string
}

type PackagingCostDraft = {
  id: string
  packagingItemId: string
  quantity: number
}

type LaborCostDraft = {
  id: string
  laborRoleId: string
  hours: number
  peopleCount: number
  hourlyRateOverride?: number
}

type OutsourcingCostDraft = {
  id: string
  note: string
  costPerUnit: NumericValue
  currency: string
}

type DevelopmentCostDraft = {
  id: string
  title: string
  prototypeLaborCost: NumericValue
  prototypeMaterialCost: NumericValue
  toolingCost: NumericValue
  amortizationYears: number
}

type EquipmentAllocationDraft = {
  id: string
  equipmentId: string
  allocationRatio: number
  annualQuantity: number
  usageHours: number
}

type LogisticsCostDraft = {
  id: string
  shippingMethodId: string
}

type ElectricityCostDraft = {
  id: string
  costPerUnit: NumericValue
  currency: string
}

interface ProductTabProps {
  data: AppData
  actions: AppActions
  editingProductId?: string | null
  onRequestEditClear?: () => void
  copySourceProductId?: string | null
  onRequestCopyClear?: () => void
}

export function ProductTab({ data, actions, editingProductId, onRequestEditClear, copySourceProductId, onRequestCopyClear }: ProductTabProps) {
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

  const [materialDrafts, setMaterialDrafts] = useState<MaterialCostDraft[]>(buildInitialMaterialDrafts)
  const [packagingDrafts, setPackagingDrafts] = useState<PackagingCostDraft[]>(buildInitialPackagingDrafts)
  const [laborDrafts, setLaborDrafts] = useState<LaborCostDraft[]>(buildInitialLaborDrafts)
  const [outsourcingDrafts, setOutsourcingDrafts] = useState<OutsourcingCostDraft[]>(buildInitialOutsourcingDrafts)
  const [developmentDrafts, setDevelopmentDrafts] = useState<DevelopmentCostDraft[]>(buildInitialDevelopmentDrafts)
  const [equipmentAllocDrafts, setEquipmentAllocDrafts] = useState<EquipmentAllocationDraft[]>(buildInitialEquipmentDrafts)
  const [logisticsDrafts, setLogisticsDrafts] = useState<LogisticsCostDraft[]>(buildInitialLogisticsDrafts)
  const [electricityDrafts, setElectricityDrafts] = useState<ElectricityCostDraft[]>(buildInitialElectricityDrafts)

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

  const createEmptyProductForm = (): Omit<Product, "id"> => ({
    name: "",
    categoryLargeId: "",
    categoryMediumId: "",
    categorySmallId: "",
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

  const [productForm, setProductForm] = useState<Omit<Product, "id">>(createEmptyProductForm)

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

  const hydrateProductFromExisting = useCallback((sourceProductId: string, options?: { copy?: boolean }) => {
    const product = data.products.find((p) => p.id === sourceProductId)
    if (!product) return

    const copyMode = options?.copy ?? false
    const adjustedName = copyMode ? `${product.name} (コピー)` : product.name
    const adjustedDate = copyMode ? new Date().toISOString().slice(0, 10) : product.registeredAt

    const mapOrFallback = <T,>(entries: T[], fallback: () => T) => (entries.length > 0 ? entries : [fallback()])

    const clonedVariants =
      product.sizeVariants && product.sizeVariants.length > 0
        ? product.sizeVariants.map((variant) => ({ label: variant.label, quantity: variant.quantity }))
        : [{ label: "", quantity: 0 }]

    setProductForm({
      name: adjustedName,
      categoryLargeId: product.categoryLargeId ?? "",
      categoryMediumId: product.categoryMediumId ?? "",
      categorySmallId: product.categorySmallId ?? "",
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
        createMaterialDraft
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
        createPackagingDraft
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
        () => createLaborDraft(product.baseManHours)
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
        createOutsourcingDraft
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
        createDevelopmentDraft
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
        createLogisticsDraft
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
        createElectricityDraft
      )
    )

    autoLaborHoursRef.current = product.baseManHours
  }, [
    createDevelopmentDraft,
    createElectricityDraft,
    createLaborDraft,
    createLogisticsDraft,
    createMaterialDraft,
    createOutsourcingDraft,
    createPackagingDraft,
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
  }, [editingProductId, hydrateProductFromExisting])

  useEffect(() => {
    if (!copySourceProductId) return
    hydrateProductFromExisting(copySourceProductId, { copy: true })
    onRequestCopyClear?.()
    onRequestEditClear?.()
  }, [copySourceProductId, hydrateProductFromExisting, onRequestCopyClear, onRequestEditClear])

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
      <Card>
        <CardHeader>
          <CardTitle>商品登録フォーム</CardTitle>
          <CardDescription>カテゴリ・想定生産量・制作工数・オプション（名称＋個数）・備考を設定します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2.6fr)_minmax(280px,1fr)]">
            <form
              className="order-2 space-y-6 lg:order-1"
              onSubmit={(event) => {
                event.preventDefault()
                const missingFields = validateProductForm()
                if (missingFields.length > 0) {
                  toast.error("必須項目が未入力です", {
                    description: `${missingFields.join("、")}を入力してください。`,
                  })
                  return
                }
                const isEditing = Boolean(editingProductId)
                const targetProductId = editingProductId ?? createTempId()
                  const electricityUnitCost =
                    electricityDrafts.find((draft) => Number(draft.costPerUnit) > 0)?.costPerUnit ?? 0
                  const normalizedSizeVariants = productForm.sizeVariants
                    .map((variant) => ({
                      label: variant.label.trim(),
                      quantity: Number(variant.quantity) || 0,
                    }))
                    .filter((variant) => variant.label.length > 0)
                  const normalizedNotes = productForm.notes?.trim() ?? ""

                  const normalizedProduct = {
                    ...productForm,
                    sizeVariants: normalizedSizeVariants,
                    notes: normalizedNotes,
                    baseManHours: Number(productForm.baseManHours) || 0,
                    productionLotSize: Number(productForm.productionLotSize) || 1,
                    expectedProduction: {
                      periodYears: Number(productForm.expectedProduction.periodYears) || 1,
                      quantity: Number(productForm.expectedProduction.quantity) || 1,
                    },
                    defaultElectricityCost: Number(electricityUnitCost) || 0,
                    salePrice: Number(productForm.salePrice) || 0,
                  }
                  if (editingProductId) {
                    removeProduct(editingProductId)
                    removeCostEntriesByProduct(editingProductId)
                  }

                  addProduct({ id: targetProductId, ...normalizedProduct })

                  materialDrafts
                    .filter((draft) => draft.materialId)
                    .forEach((draft) => {
                      const material = data.materials.find((item) => item.id === draft.materialId)
                      if (!material) return
                      const usageRatio = Math.max(Number(draft.usageRatio) || 0, 0)
                      const batchSize = Math.max(material.unitsPerBatch ?? 1, 1)
                      const baseUnitCost = (material.unitCost || 0) / batchSize
                      const costPerUnit = baseUnitCost * (usageRatio / 100)
                      addMaterialCostEntry({
                        productId: targetProductId,
                        materialId: draft.materialId,
                        description: draft.description,
                        usageRatio,
                        costPerUnit,
                        currency: material.currency,
                      })
                    })

                  packagingDrafts
                    .filter((draft) => draft.packagingItemId)
                    .forEach((draft) => {
                      const packagingItem = data.packagingItems.find((item) => item.id === draft.packagingItemId)
                      if (!packagingItem) return
                      const batchSize = Math.max(packagingItem.unitsPerBatch ?? 1, 1)
                      const baseUnitCost = (packagingItem.unitCost || 0) / batchSize
                      addPackagingCostEntry({
                        productId: targetProductId,
                        packagingItemId: draft.packagingItemId,
                        quantity: Number(draft.quantity) || 0,
                        costPerUnit: baseUnitCost,
                        currency: packagingItem.currency,
                      })
                    })

                  laborDrafts
                    .filter((draft) => draft.laborRoleId)
                    .forEach((draft) =>
                      addLaborCostEntry({
                        productId: targetProductId,
                        laborRoleId: draft.laborRoleId,
                        hours: Number(draft.hours) || 0,
                        peopleCount: Number(draft.peopleCount) || 0,
                        hourlyRateOverride: draft.hourlyRateOverride,
                      })
                    )

                  outsourcingDrafts
                    .filter((draft) => draft.note.trim() || Number(draft.costPerUnit) > 0)
                    .forEach((draft) =>
                      addOutsourcingCostEntry({
                        productId: targetProductId,
                        costPerUnit: Number(draft.costPerUnit) || 0,
                        currency: draft.currency,
                        note: draft.note,
                      })
                    )

                  developmentDrafts
                    .filter(
                      (draft) =>
                        Number(draft.prototypeLaborCost) > 0 ||
                        Number(draft.prototypeMaterialCost) > 0 ||
                        Number(draft.toolingCost) > 0
                    )
                    .forEach((draft) =>
                      addDevelopmentCostEntry({
                        productId: targetProductId,
                        title: draft.title.trim() || "開発コスト",
                        prototypeLaborCost: Number(draft.prototypeLaborCost) || 0,
                        prototypeMaterialCost: Number(draft.prototypeMaterialCost) || 0,
                        toolingCost: Number(draft.toolingCost) || 0,
                        amortizationYears: Number(draft.amortizationYears) || 1,
                      })
                    )

                  const totalEquipmentHoursForSubmit = equipmentAllocDrafts.reduce(
                    (sum, draft) => sum + (draft.usageHours || 0),
                    0
                  )

                  equipmentAllocDrafts
                    .filter((draft) => draft.equipmentId)
                    .forEach((draft) => {
                      const usageHours = draft.usageHours || 0
                      const ratio =
                        totalEquipmentHoursForSubmit > 0
                          ? usageHours / totalEquipmentHoursForSubmit
                          : Number(draft.allocationRatio) || 0
                      addEquipmentAllocation({
                        productId: targetProductId,
                        equipmentId: draft.equipmentId,
                        allocationRatio: ratio,
                        annualQuantity:
                          Number(draft.annualQuantity) || normalizedProduct.expectedProduction.quantity,
                        usageHours,
                      })
                    })

                  logisticsDrafts
                    .filter((draft) => draft.shippingMethodId)
                    .forEach((draft) => {
                      const method = shippingMethods.find((item) => item.id === draft.shippingMethodId)
                      if (!method) return
                      addLogisticsCostEntry({
                        productId: targetProductId,
                        shippingMethodId: draft.shippingMethodId,
                        costPerUnit: method.unitCost || 0,
                        currency: method.currency,
                      })
                    })

                  electricityDrafts
                    .filter((draft) => Number(draft.costPerUnit) > 0)
                    .forEach((draft) =>
                      addElectricityCostEntry({
                        productId: targetProductId,
                        costPerUnit: Number(draft.costPerUnit) || 0,
                        currency: draft.currency,
                      })
                    )

                  const resultLabel = normalizedProduct.name || "商品"
                  toast.success(isEditing ? "商品を更新しました" : "商品を登録しました", {
                    description: `「${resultLabel}」の原価情報を保存しました。`,
                  })

                  resetFormState()
                  onRequestEditClear?.()
                }}
              >

                <FormSection
                  title="商品基本情報"
                  description="カテゴリ・生産計画・販売価格・備考を設定"
                  defaultOpen
                >
                  <ProductBasicsSection
                    data={data}
                    productForm={productForm}
                    setProductForm={setProductForm}
                    handleToggleEquipment={handleToggleEquipment}
                  />
                </FormSection>

                <div className="space-y-4">
                  <div>
                    <p className="text-lg font-semibold">原価入力 (商品登録内)</p>
                    <p className="text-sm text-muted-foreground">
                      材料・梱包・人件費などをここで入力すると、原価確認タブには参照専用で反映されます。
                    </p>
                  </div>

                  <FormSection
                    title="材料費"
                    description="材料マスタから選択し、使用率だけ入力すれば単価を自動参照"
                    defaultOpen
                    action={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addDraft(setMaterialDrafts, createMaterialDraft())}
                        disabled={data.materials.length === 0}
                      >
                        行を追加
                      </Button>
                    }
                  >
                    <HintList
                      items={[
                        "材料マスタ: 事前登録した素材を選択（単価・通貨はマスタ値を使用）",
                        "使用率(%): 仕入れたロットのうち1個あたりで使う割合",
                        "用途: 本体用・持ち手用などのメモ",
                      ]}
                    />
                    {data.materials.length === 0 ? (
                      <p className="text-sm text-muted-foreground">材料マスタを登録すると入力できます。</p>
                    ) : materialDrafts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">明細を追加してください。</p>
                    ) : (
                      materialDrafts.map((draft) => {
                        const selectedMaterial = data.materials.find((material) => material.id === draft.materialId)
                        const unitCostLabel = selectedMaterial
                          ? `${formatCurrency(selectedMaterial.unitCost, selectedMaterial.currency)} / ${selectedMaterial.unit ?? "任意単位"}`
                          : "材料マスタで単価を登録すると自動計算されます。"
                        return (
                          <DraftCard key={draft.id} onRemove={() => removeDraft(setMaterialDrafts, draft.id)}>
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">材料</Label>
                                <Select
                                  value={draft.materialId}
                                  onValueChange={(value) =>
                                    updateDraft(setMaterialDrafts, draft.id, {
                                      materialId: value,
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="材料" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {data.materials.map((material) => (
                                      <SelectItem key={material.id} value={material.id}>
                                        {material.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {selectedMaterial?.supplier && (
                                  <p className="text-xs text-muted-foreground">仕入先: {selectedMaterial.supplier}</p>
                                )}
                              </div>
                              <div className="grid gap-2 md:grid-cols-2">
                                <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">使用率 (%)</Label>
                              <NumberInput
                                placeholder="例: 75"
                                value={draft.usageRatio}
                                onValueChange={(next) =>
                                  updateDraft(setMaterialDrafts, draft.id, {
                                    usageRatio: next === "" ? 0 : next,
                                  })
                                }
                              />
                              <FieldHint>仕入れたロットのうち1商品あたりで使う割合。例: 1ロールの25%なら25。</FieldHint>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">用途 (任意)</Label>
                              <Input
                                placeholder="例: 本体用"
                                value={draft.description}
                                onChange={(event) =>
                                  updateDraft(setMaterialDrafts, draft.id, { description: event.target.value })
                                }
                              />
                              <FieldHint>どの部位に使うかなど、後で見返せるメモ。</FieldHint>
                            </div>
                          </div>
                              <p className="text-xs text-muted-foreground">材料単価: {unitCostLabel}</p>
                            </div>
                          </DraftCard>
                        )
                      })
                    )}
                  </FormSection>

                  <FormSection
                    title="梱包材費"
                    description="梱包材マスタを選択し、数量だけ入力すれば単価は自動参照"
                    defaultOpen
                    action={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addDraft(setPackagingDrafts, createPackagingDraft())}
                        disabled={data.packagingItems.length === 0}
                      >
                        行を追加
                      </Button>
                    }
                  >
                    <HintList
                      items={[
                        "梱包材マスタ: 箱・袋などを事前登録（単価/通貨含む）",
                        "数量: 1商品あたりに使う点数や長さ",
                        "単価はマスタ値を自動適用",
                      ]}
                    />
                    {data.packagingItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">梱包材マスタを登録すると入力できます。</p>
                    ) : packagingDrafts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">明細を追加してください。</p>
                    ) : (
                      packagingDrafts.map((draft) => {
                        const selectedItem = data.packagingItems.find((item) => item.id === draft.packagingItemId)
                        const unitCostLabel = selectedItem
                          ? `${formatCurrency(selectedItem.unitCost, selectedItem.currency)} / ${selectedItem.unit}`
                          : "梱包材マスタで単価を登録してください"
                        return (
                          <DraftCard key={draft.id} onRemove={() => removeDraft(setPackagingDrafts, draft.id)}>
                            <div className="grid gap-2 md:grid-cols-2">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">梱包材</Label>
                                <Select
                                  value={draft.packagingItemId}
                                  onValueChange={(value) =>
                                    updateDraft(setPackagingDrafts, draft.id, { packagingItemId: value })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="梱包材" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {data.packagingItems.map((item) => (
                                      <SelectItem key={item.id} value={item.id}>
                                        {item.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">数量</Label>
                              <NumberInput
                                placeholder="例: 1"
                                value={draft.quantity}
                                onValueChange={(next) =>
                                  updateDraft(setPackagingDrafts, draft.id, {
                                    quantity: next === "" ? 0 : next,
                                  })
                                }
                              />
                              <FieldHint>1商品あたりに必要な点数。箱1つなら1、緩衝材を2枚使うなら2。</FieldHint>
                            </div>
                          </div>
                            <p className="text-xs text-muted-foreground">梱包材単価: {unitCostLabel}</p>
                          </DraftCard>
                        )
                      })
                    )}
                  </FormSection>

                  <FormSection
                    title="人件費"
                    description="作業カテゴリごとに工数と人数を設定"
                    action={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addDraft(setLaborDrafts, createLaborDraft(Number(productForm.baseManHours) || 0))}
                        disabled={data.laborRoles.length === 0}
                      >
                        行を追加
                      </Button>
                    }
                  >
                    <HintList
                      items={[
                        "作業カテゴリ: 裁断・縫製などの役割",
                        "工数: 1商品あたりにかかる時間 (時間)",
                        "人数: 同時に作業する人数",
                        "時給(任意): マスタの時給を上書きしたい場合に入力",
                      ]}
                    />
                    {data.laborRoles.length === 0 ? (
                      <p className="text-sm text-muted-foreground">人件費マスタを登録すると入力できます。</p>
                    ) : laborDrafts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">明細を追加してください。</p>
                    ) : (
                      laborDrafts.map((draft) => {
                        const selectedRole = data.laborRoles.find((role) => role.id === draft.laborRoleId)
                        return (
                          <DraftCard key={draft.id} onRemove={() => removeDraft(setLaborDrafts, draft.id)}>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">作業カテゴリ</Label>
                              <Select
                                value={draft.laborRoleId}
                                onValueChange={(value) => updateDraft(setLaborDrafts, draft.id, { laborRoleId: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="作業カテゴリ" />
                                </SelectTrigger>
                                <SelectContent>
                                  {data.laborRoles.map((role) => (
                                    <SelectItem key={role.id} value={role.id}>
                                      {role.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {selectedRole && (
                                <p className="text-xs text-muted-foreground">
                                  標準時給: {formatCurrency(selectedRole.hourlyRate, selectedRole.currency)}
                                </p>
                              )}
                            </div>
                            <div className="grid gap-2 md:grid-cols-3">
                              <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">工数 (時間)</Label>
                              <NumberInput
                                placeholder="例: 0.5"
                                value={draft.hours}
                                onValueChange={(next) =>
                                  updateDraft(setLaborDrafts, draft.id, { hours: next === "" ? 0 : next })
                                }
                              />
                              <FieldHint>1商品を作る際の作業時間。30分なら0.5のように少数で入力。</FieldHint>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">人数</Label>
                              <NumberInput
                                placeholder="例: 1"
                                value={draft.peopleCount}
                                onValueChange={(next) =>
                                  updateDraft(setLaborDrafts, draft.id, { peopleCount: next === "" ? 0 : next })
                                }
                              />
                              <FieldHint>同じ工程を同時に担当する人数（例: 2人で縫製するなら2）。</FieldHint>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">時給 (任意)</Label>
                              <NumberInput
                                placeholder="例: 2000"
                                  value={draft.hourlyRateOverride ?? ""}
                                  onValueChange={(next) =>
                                  updateDraft(setLaborDrafts, draft.id, {
                                    hourlyRateOverride: next === "" ? undefined : next,
                                  })
                                }
                              />
                              <FieldHint>マスタ時給を上書きしたい場合のみ入力。未入力ならマスタ値を使用。</FieldHint>
                            </div>
                            </div>
                          </DraftCard>
                        )
                      })
                    )}
                  </FormSection>

                  <FormSection
                    title="外注費"
                    description="商品1つあたりの外注コスト"
                    action={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addDraft(setOutsourcingDrafts, createOutsourcingDraft())}
                      >
                        行を追加
                      </Button>
                    }
                  >
                    <HintList
                      items={[
                        "外注内容: 作業内容や委託範囲をメモ",
                        "単価: 1商品あたりに支払う費用",
                        "通貨: 支払い通貨 (JPY/USD など)",
                      ]}
                    />
                    {outsourcingDrafts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">明細を追加してください。</p>
                    ) : (
                      outsourcingDrafts.map((draft) => (
                        <DraftCard key={draft.id} onRemove={() => removeDraft(setOutsourcingDrafts, draft.id)}>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">外注内容</Label>
                            <Textarea
                              placeholder="例: 仕上げ縫製を協力工場へ委託"
                              value={draft.note}
                              onChange={(event) => updateDraft(setOutsourcingDrafts, draft.id, { note: event.target.value })}
                            />
                          </div>
                          <div className="grid gap-2 md:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">単価</Label>
                              <NumberInput
                                placeholder="例: 120"
                                value={draft.costPerUnit}
                                onValueChange={(next) =>
                                  updateDraft(setOutsourcingDrafts, draft.id, { costPerUnit: next })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">通貨</Label>
                              <Select
                                value={draft.currency}
                                onValueChange={(value) => updateDraft(setOutsourcingDrafts, draft.id, { currency: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="通貨" />
                                </SelectTrigger>
                                <SelectContent>
                                  {currencyOptions.map((currency) => (
                                    <SelectItem key={currency} value={currency}>
                                      {currency}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </DraftCard>
                      ))
                    )}
                  </FormSection>

                  <FormSection
                    title="開発コスト"
                    description="試作工数・材料費・道具費を入力"
                    action={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addDraft(setDevelopmentDrafts, createDevelopmentDraft())}
                      >
                        行を追加
                      </Button>
                    }
                  >
                    <HintList
                      items={[
                        "試作工数コスト: 試作にかかった人件費トータル",
                        "試作用材料費: 試作で使った素材費",
                        "道具費: 型や治具など一度だけ買うもの",
                        "償却年数: 何年で割って原価化するか",
                      ]}
                    />
                    {developmentDrafts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">明細を追加してください。</p>
                    ) : (
                      developmentDrafts.map((draft) => (
                        <DraftCard key={draft.id} onRemove={() => removeDraft(setDevelopmentDrafts, draft.id)}>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">タイトル</Label>
                            <Input
                              placeholder="例: 写真撮影コスト"
                              value={draft.title}
                              onChange={(event) =>
                                updateDraft(setDevelopmentDrafts, draft.id, { title: event.target.value })
                              }
                            />
                          </div>
                          <div className="grid gap-2 md:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">試作工数コスト</Label>
                              <NumberInput
                                placeholder="例: 150000"
                                value={draft.prototypeLaborCost}
                                onValueChange={(next) =>
                                  updateDraft(setDevelopmentDrafts, draft.id, { prototypeLaborCost: next })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">試作用材料費</Label>
                              <NumberInput
                                placeholder="例: 60000"
                                value={draft.prototypeMaterialCost}
                                onValueChange={(next) =>
                                  updateDraft(setDevelopmentDrafts, draft.id, { prototypeMaterialCost: next })
                                }
                              />
                            </div>
                          </div>
                          <div className="grid gap-2 md:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">道具費</Label>
                              <NumberInput
                                placeholder="例: 40000"
                                value={draft.toolingCost}
                                onValueChange={(next) =>
                                  updateDraft(setDevelopmentDrafts, draft.id, { toolingCost: next })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">償却年数</Label>
                              <NumberInput
                                placeholder="例: 2"
                                value={draft.amortizationYears}
                                onValueChange={(next) =>
                                  updateDraft(setDevelopmentDrafts, draft.id, { amortizationYears: next === "" ? 0 : next })
                                }
                              />
                            </div>
                          </div>
                        </DraftCard>
                      ))
                    )}
                  </FormSection>

                  <FormSection title="設備配賦" description="商品で利用する設備の配賦設定">
                    <HintList
                      items={[
                        "利用率: 設備稼働のうち当該商品の占める割合 (0〜1)",
                        "年間生産数: 設備をこの商品に使う年間数量",
                      ]}
                    />
                    {productForm.equipmentIds.length === 0 ? (
                      <p className="text-sm text-muted-foreground">設備を選択すると配賦割合を入力できます。</p>
                    ) : (
                      equipmentAllocDrafts.map((draft) => {
                        const equipment = data.equipments.find((item) => item.id === draft.equipmentId)
                        if (!equipment) return null
                        const ratio =
                          totalEquipmentHours > 0 && draft.usageHours
                            ? Math.round((draft.usageHours / totalEquipmentHours) * 100)
                            : Math.round(draft.allocationRatio * 100)
                        return (
                          <DraftCard key={draft.id} hideRemove>
                            <p className="text-sm font-medium">{equipment.name}</p>
                            <div className="grid gap-2 md:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">使用時間 (h)</Label>
                              <NumberInput
                                placeholder="例: 0.5"
                                value={draft.usageHours ?? ""}
                                onValueChange={(next) =>
                                  updateDraft(setEquipmentAllocDrafts, draft.id, {
                                    usageHours: next === "" ? undefined : next,
                                  })
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                {totalEquipmentHours > 0
                                  ? `利用率 約${ratio}%`
                                  : "利用率は使用時間から自動計算されます"}
                              </p>
                              <FieldHint>1商品あたりで設備を使用する時間。複数設備で割ると自動的に配賦比率になります。</FieldHint>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">年間生産数</Label>
                              <NumberInput
                                placeholder="例: 3000"
                                value={draft.annualQuantity}
                                onValueChange={(next) =>
                                  updateDraft(setEquipmentAllocDrafts, draft.id, {
                                    annualQuantity: next === "" ? 0 : next,
                                  })
                                }
                              />
                              <FieldHint>この設備を利用して年間に生産する個数。配賦単価の割り算に使います。</FieldHint>
                            </div>
                            </div>
                          </DraftCard>
                        )
                      })
                    )}
                  </FormSection>

                  <FormSection
                    title="物流・配送費"
                    description="配送方法マスタから選択し、単価は自動適用"
                    action={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addDraft(setLogisticsDrafts, createLogisticsDraft())}
                        disabled={shippingMethods.length === 0}
                      >
                        行を追加
                      </Button>
                    }
                  >
                    <HintList
                      items={[
                        "配送方法マスタ: 事前登録した配送パターンを選択",
                        "単価はマスタの基準単価を自動参照",
                        "送料の通貨もマスタ定義を利用",
                      ]}
                    />
                    {shippingMethods.length === 0 ? (
                      <p className="text-sm text-muted-foreground">先に配送方法マスタを登録してください。</p>
                    ) : logisticsDrafts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">明細を追加してください。</p>
                    ) : (
                      logisticsDrafts.map((draft) => {
                        const shippingMethod = shippingMethods.find((method) => method.id === draft.shippingMethodId)
                        const unitCostText = shippingMethod
                          ? `${formatCurrency(shippingMethod.unitCost, shippingMethod.currency)}`
                          : "配送方法を選択してください"
                        return (
                          <DraftCard key={draft.id} onRemove={() => removeDraft(setLogisticsDrafts, draft.id)}>
                            <div className="space-y-2">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">配送方法</Label>
                                <Select
                                  value={draft.shippingMethodId}
                                  onValueChange={(value) =>
                                    updateDraft(setLogisticsDrafts, draft.id, { shippingMethodId: value })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="配送方法" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {shippingMethods.map((method) => (
                                      <SelectItem key={method.id} value={method.id}>
                                        {method.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FieldHint>選択した配送マスタの金額と通貨がそのまま適用されます。</FieldHint>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                単価: {unitCostText}
                                {shippingMethod?.description ? ` / ${shippingMethod.description}` : ""}
                              </p>
                            </div>
                          </DraftCard>
                        )
                      })
                    )}
                  </FormSection>

                  <FormSection
                    title="電気代"
                    description="1個あたりの電力コスト"
                    action={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addDraft(setElectricityDrafts, createElectricityDraft())}
                      >
                        行を追加
                      </Button>
                    }
                  >
                    <HintList
                      items={[
                        "単価: 1商品を作る際にかかる電気料金",
                        "通貨: 支払い通貨",
                      ]}
                    />
                    {electricityDrafts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">明細を追加してください。</p>
                    ) : (
                      electricityDrafts.map((draft) => (
                        <DraftCard key={draft.id} onRemove={() => removeDraft(setElectricityDrafts, draft.id)}>
                          <div className="grid gap-2 md:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">単価</Label>
                              <NumberInput
                                placeholder="例: 25"
                                value={draft.costPerUnit}
                                onValueChange={(next) =>
                                  updateDraft(setElectricityDrafts, draft.id, { costPerUnit: next })
                                }
                              />
                              <FieldHint>電気料金の1個あたり見込み額。月額を個数で割った値など。</FieldHint>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">通貨</Label>
                              <Select
                                value={draft.currency}
                                onValueChange={(value) => updateDraft(setElectricityDrafts, draft.id, { currency: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="通貨" />
                                </SelectTrigger>
                                <SelectContent>
                                  {currencyOptions.map((currency) => (
                                    <SelectItem key={currency} value={currency}>
                                      {currency}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FieldHint>支払い通貨。海外電気料金を登録する場合に指定。</FieldHint>
                            </div>
                          </div>
                        </DraftCard>
                      ))
                    )}
                  </FormSection>
                </div>

                <Button type="submit" className="w-fit">
                  商品を登録
                </Button>
              </form>

              <div className="order-1 lg:order-2">
                <ProductRealtimeSummary summary={costSummary} />
              </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>登録済み商品</CardTitle>
          <CardDescription>想定生産量・設備利用状況の一覧。</CardDescription>
        </CardHeader>
        <CardContent>
          {data.products.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ商品がありません。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>商品名</TableHead>
                  <TableHead>カテゴリ</TableHead>
                  <TableHead>生産計画</TableHead>
                  <TableHead>設備</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      {[product.categoryLargeId, product.categoryMediumId, product.categorySmallId]
                        .map((categoryId) =>
                          data.categories.large.find((c) => c.id === categoryId) ||
                          data.categories.medium.find((c) => c.id === categoryId) ||
                          data.categories.small.find((c) => c.id === categoryId)
                        )
                        .filter(Boolean)
                        .map((category) => (category as { id: string; name: string }).name)
                        .join(" / ") || "-"}
                    </TableCell>
                    <TableCell>
                      {product.expectedProduction.quantity} 個 / {product.expectedProduction.periodYears} 年
                    </TableCell>
                    <TableCell>
                      {product.equipmentIds.length === 0
                        ? "-"
                        : product.equipmentIds
                            .map((id) => data.equipments.find((equipment) => equipment.id === id)?.name ?? "")
                            .filter(Boolean)
                            .join(", ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
