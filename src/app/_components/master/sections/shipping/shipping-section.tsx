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
import type { AppData, ShippingMethod } from "@/lib/types"
import { FieldHint, FormSection, RegisteredList, type FormSectionOpenSignal } from "../../../shared/ui"

interface ShippingSectionProps {
  data: AppData
  actions: AppActions
  openSignal?: FormSectionOpenSignal | null
}

const INITIAL_FORM: Omit<ShippingMethod, "id"> = {
  name: "",
  description: "",
  unitCost: 0,
  currency: "JPY",
  note: "",
}

export function ShippingSection({ data, actions, openSignal }: ShippingSectionProps) {
  const [shippingMethodForm, setShippingMethodForm] = useState<Omit<ShippingMethod, "id">>(INITIAL_FORM)
  const { addShippingMethod } = actions

  return (
    <FormSection
      title="配送方法マスタ"
      description="宅配便・メール便などの配送手段と送料を登録します。"
      storageKey="master-section-shipping"
      openSignal={openSignal}
    >
      <div className="space-y-2">
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (!shippingMethodForm.name.trim()) return
            addShippingMethod({ ...shippingMethodForm })
            setShippingMethodForm(INITIAL_FORM)
          }}
        >
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">配送方法名</Label>
            <Input
              placeholder="例: 宅配便"
              value={shippingMethodForm.name}
              onChange={(event) => setShippingMethodForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">説明 (任意)</Label>
            <Input
              placeholder="例: 100サイズ / 佐川"
              value={shippingMethodForm.description}
              onChange={(event) => setShippingMethodForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">基準単価</Label>
              <NumberInput
                placeholder="例: 180"
                value={shippingMethodForm.unitCost}
                onValueChange={(next) => setShippingMethodForm((prev) => ({ ...prev, unitCost: next === "" ? 0 : next }))}
              />
              <FieldHint>1件あたりの送料。クール便など追加料金を含める場合はここに入力。</FieldHint>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">通貨</Label>
              <Select value={shippingMethodForm.currency} onValueChange={(value) => setShippingMethodForm((prev) => ({ ...prev, currency: value }))}>
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
            <Label className="text-xs text-muted-foreground">備考</Label>
            <Textarea
              placeholder="例: 100サイズまで"
              value={shippingMethodForm.note}
              onChange={(event) => setShippingMethodForm((prev) => ({ ...prev, note: event.target.value }))}
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" size="sm">
              追加
            </Button>
          </div>
        </form>

        <RegisteredList
          title="登録済み 配送方法"
          items={data.shippingMethods.map((method) => {
            const unitCostText = formatCurrency(method.unitCost, method.currency)
            return `${method.name} / ${unitCostText} / ${method.description || "詳細なし"}`
          })}
        />
      </div>
    </FormSection>
  )
}
