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
import { FieldHint, FormSection, RegisteredList } from "../../../shared/ui"

interface MaterialSectionProps {
  data: AppData
  actions: AppActions
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

export function MaterialSection({ data, actions }: MaterialSectionProps) {
  const [materialForm, setMaterialForm] = useState<Omit<Material, "id">>(INITIAL_FORM)
  const { addMaterial } = actions

  return (
    <FormSection
      title="材料マスタ"
      description="名称・単位・サイズ・仕入先まで登録し、材料コスト入力時に再利用します。"
      storageKey="master-section-materials"
    >
      <div className="space-y-2">
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (!materialForm.name.trim()) return
            addMaterial({ ...materialForm })
            setMaterialForm(INITIAL_FORM)
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
              onValueChange={(next) =>
                setMaterialForm((prev) => ({ ...prev, unitsPerBatch: next === "" ? 1 : Number(next) }))
              }
            />
            <FieldHint>仕入れ単位が1ロール=50mなどの場合の個数。1個売りなら1。</FieldHint>
          </div>
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
            <Button type="submit" size="sm">
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
