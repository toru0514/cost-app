"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { AppActions } from "@/lib/app-data"
import type { AppData } from "@/lib/types"
import { FormSection } from "../shared/ui"
import { ProductBasicsSection } from "./product-basics-section"
import { ProductRealtimeSummary } from "./product-summary-panel"
import { useProductFormState } from "./hooks/use-product-form"
import { ElectricityCostSection } from "./sections/electricity-cost-section"
import { EquipmentAllocationSection } from "./sections/equipment-allocation-section"
import { LaborCostSection } from "./sections/labor-cost-section"
import { LogisticsCostSection } from "./sections/logistics-cost-section"
import { MaterialCostSection } from "./sections/material-cost-section"
import { OutsourcingCostSection } from "./sections/outsourcing-cost-section"
import { PackagingCostSection } from "./sections/packaging-cost-section"
import { DevelopmentCostSection } from "./sections/development-cost-section"
import { FeeCostSection } from "./sections/fee-cost-section"

interface ProductFormPanelProps {
  data: AppData
  actions: AppActions
  onSetStock?: (productId: string, quantity: number) => Promise<void>
  editingProductId?: string | null
  onRequestEditClear?: () => void
  copySourceProductId?: string | null
  copyRequestNonce?: number
}

export function ProductFormPanel(props: ProductFormPanelProps) {
  const {
    data,
    editingProductId,
  } = props

  const {
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
    totalEquipmentHours,
    costSummary,
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
    handleSubmit,
    handleCancelEdit,
  } = useProductFormState(props)

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
            <form className="order-2 space-y-6 lg:order-1" onSubmit={handleSubmit}>
              <FormSection title="商品基本情報" description="カテゴリ・生産計画・販売価格・備考を設定" defaultOpen>
                <ProductBasicsSection
                  data={data}
                  productForm={productForm}
                  setProductForm={setProductForm}
                  initialStock={initialStock}
                  onInitialStockChange={setInitialStock}
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

                <MaterialCostSection
                  materials={data.materials}
                  drafts={materialDrafts}
                  onAdd={handleAddMaterialDraft}
                  onUpdate={handleUpdateMaterialDraft}
                  onRemove={handleRemoveMaterialDraft}
                />

                <PackagingCostSection
                  items={data.packagingItems}
                  drafts={packagingDrafts}
                  onAdd={handleAddPackagingDraft}
                  onUpdate={handleUpdatePackagingDraft}
                  onRemove={handleRemovePackagingDraft}
                />

                <LaborCostSection
                  laborRoles={data.laborRoles}
                  drafts={laborDrafts}
                  onAdd={handleAddLaborDraft}
                  onUpdate={handleUpdateLaborDraft}
                  onRemove={handleRemoveLaborDraft}
                />

                <OutsourcingCostSection
                  drafts={outsourcingDrafts}
                  onAdd={handleAddOutsourcingDraft}
                  onUpdate={handleUpdateOutsourcingDraft}
                  onRemove={handleRemoveOutsourcingDraft}
                />

                <DevelopmentCostSection
                  drafts={developmentDrafts}
                  onAdd={handleAddDevelopmentDraft}
                  onUpdate={handleUpdateDevelopmentDraft}
                  onRemove={handleRemoveDevelopmentDraft}
                />

                <EquipmentAllocationSection
                  equipments={data.equipments}
                  drafts={equipmentAllocDrafts}
                  totalUsageHours={totalEquipmentHours}
                  hasSelectedEquipment={productForm.equipmentIds.length > 0}
                  onUpdate={handleUpdateEquipmentDraft}
                />

                <LogisticsCostSection
                  shippingMethods={shippingMethods}
                  drafts={logisticsDrafts}
                  onAdd={handleAddLogisticsDraft}
                  onUpdate={handleUpdateLogisticsDraft}
                  onRemove={handleRemoveLogisticsDraft}
                />

                <FeeCostSection
                  fees={data.fees}
                  salePrice={Number(productForm.salePrice) || 0}
                  drafts={feeDrafts}
                  onAdd={handleAddFeeDraft}
                  onUpdate={handleUpdateFeeDraft}
                  onRemove={handleRemoveFeeDraft}
                />

                <ElectricityCostSection
                  drafts={electricityDrafts}
                  onAdd={handleAddElectricityDraft}
                  onUpdate={handleUpdateElectricityDraft}
                  onRemove={handleRemoveElectricityDraft}
                />
              </div>

              <Button type="submit" className="w-fit">
                {editingProductId ? "商品を更新" : "商品を登録"}
              </Button>
            </form>

            <div className="order-1 lg:order-2">
              <ProductRealtimeSummary summary={costSummary} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
