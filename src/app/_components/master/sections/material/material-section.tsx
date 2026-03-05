"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { AppActions } from "@/lib/app-data"
import { formatCurrency } from "@/lib/calculations"
import { currencyOptions } from "@/lib/constants"
import type { AppData, Material } from "@/lib/types"
import { createTempId } from "@/lib/utils"
import { toast } from "sonner"
import { FieldHint, FormSection, RegisteredList, type FormSectionOpenSignal } from "../../../shared/ui"

interface MaterialSectionProps {
  data: AppData
  actions: AppActions
  isAuthenticated: boolean
  onSetMaterialStock: (id: string, quantity: number) => Promise<void>
  openSignal?: FormSectionOpenSignal | null
}

const INITIAL_FORM: Omit<Material, "id"> = {
  name: "",
  unit: "kg",
  sizeDescription: "",
  currency: "JPY",
  unitCost: 0,
  unitsPerBatch: 1,
  supplier: "",
  note: "",
}

export function MaterialSection({ data, actions, isAuthenticated, onSetMaterialStock, openSignal }: MaterialSectionProps) {
  const [materialForm, setMaterialForm] = useState<Omit<Material, "id">>(INITIAL_FORM)
  const [initialStock, setInitialStock] = useState<number>(INITIAL_FORM.unitsPerBatch ?? 1)
  const [initialStockOverridden, setInitialStockOverridden] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { addMaterial } = actions

  return (
    <FormSection
      title="材料マスタ"
      description="名称・単位・サイズ・仕入先まで登録し、材料コスト入力時に再利用します。"
      storageKey="master-section-materials"
      openSignal={openSignal}
    >
      <div className="space-y-2">
        <form
          className="grid gap-2"
          onSubmit={async (event) => {
            event.preventDefault()
            if (submitting) return
            const name = materialForm.name.trim()
            if (!name) return
            setSubmitting(true)
            try {
              const id = createTempId()
              addMaterial({ ...materialForm, id, name })
              const normalizedInitialStock = Math.max(0, Number(initialStock) || 0)
              if (isAuthenticated && normalizedInitialStock > 0) {
                try {
                  // material_stock は FK を持たない設計のため、マスタ同期前でも先に upsert できる。
                  await onSetMaterialStock(id, normalizedInitialStock)
                } catch (error) {
                  console.error("Failed to save initial material stock", error)
                  toast.error("初期在庫数の保存に失敗しました")
                }
              }
              setMaterialForm(INITIAL_FORM)
              setInitialStock(INITIAL_FORM.unitsPerBatch ?? 1)
              setInitialStockOverridden(false)
            } finally {
              setSubmitting(false)
            }
          }}
        >
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">材料名</Label>
            <Input
              placeholder="例: キャンバス生地"
              value={materialForm.name}
              onChange={(event) => setMaterialForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">単位</Label>
              <Input
                placeholder="例: m"
                value={materialForm.unit}
                onChange={(event) => setMaterialForm((prev) => ({ ...prev, unit: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">通貨</Label>
              <Select value={materialForm.currency} onValueChange={(value) => setMaterialForm((prev) => ({ ...prev, currency: value }))}>
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
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">セット数量（例: 100枚セットなら100）</Label>
            <NumberInput
              placeholder="例: 100"
              value={materialForm.unitsPerBatch ?? 1}
              min={1}
              onValueChange={(next) => {
                const unitsPerBatch = next === "" ? 1 : Number(next)
                setMaterialForm((prev) => ({ ...prev, unitsPerBatch }))
                if (!initialStockOverridden) {
                  setInitialStock(unitsPerBatch)
                }
              }}
            />
            <FieldHint>仕入れ単位が1ロール=50mなどの場合の個数。1個売りなら1。</FieldHint>
          </div>
          {isAuthenticated ? (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">初期在庫数</Label>
              <NumberInput
                placeholder="例: 100"
                value={initialStock}
                min={0}
                onValueChange={(next) => {
                  setInitialStock(next === "" ? 0 : Number(next))
                  setInitialStockOverridden(true)
                }}
              />
              <FieldHint>
                初期値はセット数量と同じです。手動で上書きできます。0 の場合は在庫テーブルへ保存しません。
              </FieldHint>
            </div>
          ) : null}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">基準単価</Label>
            <NumberInput
              placeholder="例: 320"
              value={materialForm.unitCost}
              onValueChange={(next) => setMaterialForm((prev) => ({ ...prev, unitCost: next === "" ? 0 : next }))}
            />
            <FieldHint>セット価格を入力。セット数量で割った値が商品登録時に使われます。</FieldHint>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">サイズ・容量</Label>
            <Input
              placeholder="例: 50mロール"
              value={materialForm.sizeDescription}
              onChange={(event) => setMaterialForm((prev) => ({ ...prev, sizeDescription: event.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">仕入先</Label>
            <Input
              placeholder="例: FabricMart"
              value={materialForm.supplier}
              onChange={(event) => setMaterialForm((prev) => ({ ...prev, supplier: event.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">備考</Label>
            <Textarea
              placeholder="為替やメモ"
              value={materialForm.note}
              onChange={(event) => setMaterialForm((prev) => ({ ...prev, note: event.target.value }))}
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" size="sm" disabled={submitting}>
              追加
            </Button>
          </div>
        </form>

        <RegisteredList
          title="登録済み 材料"
          items={data.materials.map((material) => {
            const supplier = material.supplier ? ` / ${material.supplier}` : ""
            const unitCostText = formatCurrency(material.unitCost, material.currency)
            const batchText = material.unitsPerBatch && material.unitsPerBatch > 1 ? `${material.unitsPerBatch}単位/セット` : "1単位/セット"
            return `${material.name} / ${unitCostText} / ${material.unit} / ${batchText} / ${material.sizeDescription}${supplier}`
          })}
        />
      </div>
    </FormSection>
  )
}
