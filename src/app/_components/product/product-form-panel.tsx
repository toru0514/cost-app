"use client"

import { useRef, useState, type FormEvent, type MouseEvent } from "react"

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
  materialStocks: Map<string, number>
  packagingStocks: Map<string, number>
  packagingStockUnits: Map<string, string>
  masterStocksLoaded: boolean
  isAuthenticated: boolean
  onSetStock?: (productId: string, quantity: number) => Promise<void>
  editingProductId?: string | null
  onRequestEditClear?: () => void
  copySourceProductId?: string | null
  copyRequestNonce?: number
}

export function ProductFormPanel(props: ProductFormPanelProps) {
  const {
    data,
    materialStocks,
    packagingStocks,
    packagingStockUnits,
    masterStocksLoaded,
    isAuthenticated,
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

  const [currentStep, setCurrentStep] = useState(1)
  const formTopRef = useRef<HTMLDivElement | null>(null)
  const totalSteps = 4
  const stepDefinitions = [
    { id: 1, title: "商品基本情報" },
    { id: 2, title: "直接材料費" },
    { id: 3, title: "製造コスト" },
    { id: 4, title: "物流・販売コスト" },
  ] as const

  const scrollToFormTop = () => {
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleStepBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1))
    scrollToFormTop()
  }

  const handleStepNext = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault()
    setCurrentStep((prev) => Math.min(totalSteps, prev + 1))
    scrollToFormTop()
  }

  const handleSkipToEnd = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault()
    setCurrentStep(totalSteps)
    scrollToFormTop()
  }

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null
    const isFinalSubmit = submitter?.getAttribute("data-submit-intent") === "final"
    if (!isFinalSubmit || currentStep < totalSteps) return
    handleSubmit(event)
  }

  return (
    <div className="space-y-6">
      <div ref={formTopRef} />
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
          <ol className="grid gap-2 text-xs sm:grid-cols-4">
            {stepDefinitions.map((step) => {
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id
              return (
                <li
                  key={step.id}
                  className={`rounded-md border px-2 py-2 ${
                    isActive
                      ? "border-primary bg-primary/10 font-semibold text-foreground"
                      : isCompleted
                        ? "border-emerald-500/40 bg-emerald-500/5 text-foreground"
                        : "border-border text-muted-foreground"
                  }`}
                >
                  <p className="text-[11px]">Step {step.id}</p>
                  <p>{step.title}</p>
                </li>
              )
            })}
          </ol>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 overflow-hidden lg:grid-cols-[minmax(0,2.6fr)_minmax(280px,1fr)]">
            <form className="order-2 space-y-6 lg:order-1" onSubmit={handleFormSubmit}>
              {currentStep === 1 && (
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
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <p className="text-lg font-semibold">原価入力 (商品登録内)</p>
                    <p className="text-sm text-muted-foreground">
                      材料・梱包・人件費などをここで入力すると、原価確認タブには参照専用で反映されます。
                    </p>
                  </div>
                  <MaterialCostSection
                    materials={data.materials}
                    materialStocks={materialStocks}
                    masterStocksLoaded={masterStocksLoaded}
                    isAuthenticated={isAuthenticated}
                    drafts={materialDrafts}
                    onAdd={handleAddMaterialDraft}
                    onUpdate={handleUpdateMaterialDraft}
                    onRemove={handleRemoveMaterialDraft}
                  />
                  <PackagingCostSection
                    items={data.packagingItems}
                    packagingStocks={packagingStocks}
                    packagingStockUnits={packagingStockUnits}
                    masterStocksLoaded={masterStocksLoaded}
                    isAuthenticated={isAuthenticated}
                    drafts={packagingDrafts}
                    onAdd={handleAddPackagingDraft}
                    onUpdate={handleUpdatePackagingDraft}
                    onRemove={handleRemovePackagingDraft}
                  />
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <p className="text-lg font-semibold">製造コスト入力</p>
                    <p className="text-sm text-muted-foreground">人件費・外注費・開発費・設備配賦を設定します。</p>
                  </div>
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
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <p className="text-lg font-semibold">物流・販売コスト入力</p>
                    <p className="text-sm text-muted-foreground">物流費・販売手数料・電気代を設定します。</p>
                  </div>
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
              )}

              <div className="flex flex-wrap gap-2">
                {currentStep > 1 && (
                  <Button type="button" variant="outline" onClick={handleStepBack}>
                    戻る
                  </Button>
                )}
                {currentStep < totalSteps ? (
                  <>
                    <Button type="button" onClick={handleStepNext}>
                      次へ
                    </Button>
                    <Button type="button" variant="outline" onClick={handleSkipToEnd}>
                      最終ステップへ
                    </Button>
                  </>
                ) : (
                  <Button type="submit" data-submit-intent="final">
                    {editingProductId ? "商品を更新" : "商品を登録"}
                  </Button>
                )}
              </div>
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
