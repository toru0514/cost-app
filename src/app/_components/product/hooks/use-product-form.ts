"use client"

import { type FormEvent, useCallback, useMemo } from "react"
import { toast } from "sonner"

import type { AppActions } from "@/lib/app-data"
import type { AppData } from "@/lib/types"
import type { ProductCostSummary } from "../product-summary-panel"
import { useProductDraftState, type ProductDraftStateResult } from "./use-product-drafts"

const createTempId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 11)

interface UseProductFormStateArgs {
  data: AppData
  actions: AppActions
  onSetStock?: (productId: string, quantity: number) => Promise<void>
  editingProductId?: string | null
  onRequestEditClear?: () => void
  copySourceProductId?: string | null
  copyRequestNonce?: number
}

export interface ProductFormStateResult extends ProductDraftStateResult {
  costSummary: ProductCostSummary
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function useProductFormState(args: UseProductFormStateArgs): ProductFormStateResult {
  const { data, actions, editingProductId } = args
  const draftState = useProductDraftState(args)
  const {
    shippingMethods,
    productForm,
    initialStock,
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
    resetFormState,
  } = draftState

  const existingEquipmentQuantities = useMemo(() => {
    const map = new Map<string, number>()
    data.costEntries.equipmentAllocations.forEach((entry) => {
      if (editingProductId && entry.productId === editingProductId) return
      const quantity = Math.max(Number(entry.annualQuantity) || 0, 0)
      if (quantity <= 0) return
      map.set(entry.equipmentId, (map.get(entry.equipmentId) ?? 0) + quantity)
    })
    return map
  }, [data.costEntries.equipmentAllocations, editingProductId])

  const costSummary = useMemo<ProductCostSummary>(() => {
    const salePrice = Number(productForm.salePrice) || 0

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
      const expectedQty = Math.max(Number(productForm.expectedProduction.quantity) || 1, 1)
      return sum + total / amortizationYears / expectedQty
    }, 0)

    const equipment = equipmentAllocDrafts.reduce((sum, draft) => {
      const equipment = data.equipments.find((entry) => entry.id === draft.equipmentId)
      if (!equipment) return sum
      const currentAnnualQuantity = Math.max(
        Number(draft.annualQuantity) || Number(productForm.expectedProduction.quantity) || 0,
        0
      )
      const otherAnnualQuantity = existingEquipmentQuantities.get(draft.equipmentId) ?? 0
      const totalAnnualQuantity = Math.max(currentAnnualQuantity + otherAnnualQuantity, 1)
      const amortizationYears = Math.max(equipment.amortizationYears || 1, 1)
      const utilizationRate = Math.min(Math.max(equipment.utilizationRate ?? 100, 0), 100) / 100
      const annualCost = (equipment.acquisitionCost / amortizationYears) * utilizationRate
      const usageHours = draft.usageHours ?? 0
      const ratio = totalEquipmentHours > 0 ? usageHours / totalEquipmentHours : Number(draft.allocationRatio) || 0
      return sum + (annualCost * ratio) / totalAnnualQuantity
    }, 0)

    const logistics = logisticsDrafts.reduce((sum, draft) => {
      const method = shippingMethods.find((item) => item.id === draft.shippingMethodId)
      if (!method) return sum
      return sum + (method.unitCost || 0)
    }, 0)

    const electricity = electricityDrafts.reduce((sum, draft) => sum + (Number(draft.costPerUnit) || 0), 0)

    const fees = feeDrafts.reduce((sum, draft) => {
      const fee = data.fees.find((item) => item.id === draft.feeId)
      if (!fee) return sum
      const rate = Number(fee.ratePercent) || 0
      const fixed = Number(fee.fixedAmount) || 0
      return sum + (salePrice * rate) / 100 + fixed
    }, 0)

    const total =
      material + packaging + labor + outsourcing + development + equipment + logistics + electricity + fees
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
        { key: "fees", label: "手数料", value: fees },
      ],
    }
  }, [
    data.equipments,
    data.laborRoles,
    data.materials,
    data.fees,
    data.packagingItems,
    developmentDrafts,
    existingEquipmentQuantities,
    electricityDrafts,
    feeDrafts,
    equipmentAllocDrafts,
    laborDrafts,
    logisticsDrafts,
    materialDrafts,
    outsourcingDrafts,
    packagingDrafts,
    productForm,
    shippingMethods,
    totalEquipmentHours,
  ])

  const validateProductForm = useCallback(() => {
    const missing: string[] = []
    if (!productForm.name.trim()) missing.push("商品名")
    const periodYears = Number(productForm.expectedProduction.periodYears)
    if (!periodYears || periodYears <= 0) missing.push("想定生産期間")
    const quantity = Number(productForm.expectedProduction.quantity)
    if (!quantity || quantity <= 0) missing.push("想定生産数量")
    const salePrice = Number(productForm.salePrice)
    if (!salePrice || salePrice <= 0) missing.push("販売価格")
    return missing
  }, [productForm])

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const missingFields = validateProductForm()
      if (missingFields.length > 0) {
        toast.error("必須項目が未入力です", {
          description: `${missingFields.join("、")}を入力してください。`,
        })
        return
      }

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
      addFeeCostEntry,
      removeCostEntriesByProduct,
    } = actions

      const isEditing = Boolean(args.editingProductId)
      const targetProductId = args.editingProductId ?? createTempId()
      const electricityUnitCost = electricityDrafts.find((draft) => Number(draft.costPerUnit) > 0)?.costPerUnit ?? 0

      const normalizedSizeVariants = productForm.sizeVariants
        .map((variant) => ({ label: variant.label.trim(), quantity: Number(variant.quantity) || 0 }))
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

      if (isEditing && args.editingProductId) {
        updateProduct({ id: targetProductId, ...normalizedProduct })
        removeCostEntriesByProduct(args.editingProductId)
      } else {
        addProduct({ id: targetProductId, ...normalizedProduct })
        if (args.onSetStock) {
          try {
            const normalizedInitialStock = Math.max(0, Number(initialStock) || 0)
            await args.onSetStock(targetProductId, normalizedInitialStock)
          } catch (error) {
            console.error("Failed to save initial product stock", error)
            toast.error("初期在庫数の保存に失敗しました")
          }
        }
      }

      // cost entries
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
        .filter((draft) => Number(draft.prototypeLaborCost) > 0 || Number(draft.prototypeMaterialCost) > 0 || Number(draft.toolingCost) > 0)
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

      const totalEquipmentHoursForSubmit = equipmentAllocDrafts.reduce((sum, draft) => sum + (draft.usageHours || 0), 0)

      equipmentAllocDrafts
        .filter((draft) => draft.equipmentId)
        .forEach((draft) => {
          const usageHours = draft.usageHours || 0
          const ratio =
            totalEquipmentHoursForSubmit > 0 ? usageHours / totalEquipmentHoursForSubmit : Number(draft.allocationRatio) || 0
          addEquipmentAllocation({
            productId: targetProductId,
            equipmentId: draft.equipmentId,
            allocationRatio: ratio,
            annualQuantity: Number(draft.annualQuantity) || normalizedProduct.expectedProduction.quantity,
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

      feeDrafts
        .filter((draft) => draft.feeId)
        .forEach((draft) => {
          const fee = data.fees.find((item) => item.id === draft.feeId)
          if (!fee) return
          addFeeCostEntry({
            productId: targetProductId,
            feeId: draft.feeId,
            ratePercent: fee.ratePercent,
            fixedAmount: fee.fixedAmount,
            currency: fee.currency,
          })
        })

      toast.success(isEditing ? "商品を更新しました" : "商品を登録しました", {
        description: `「${normalizedProduct.name || "商品"}」の原価情報を保存しました。`,
      })

      resetFormState()
      args.onRequestEditClear?.()
    },
    [
      actions,
      args,
      data.materials,
      data.packagingItems,
      electricityDrafts,
      feeDrafts,
      equipmentAllocDrafts,
      laborDrafts,
      logisticsDrafts,
      materialDrafts,
      outsourcingDrafts,
      packagingDrafts,
      productForm,
      initialStock,
      resetFormState,
      shippingMethods,
      developmentDrafts,
      data.fees,
      validateProductForm,
    ]
  )

  return {
    ...draftState,
    costSummary,
    handleSubmit,
  }
}
