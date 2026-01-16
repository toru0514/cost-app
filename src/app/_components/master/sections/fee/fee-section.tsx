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
import type { AppData, Fee } from "@/lib/types"
import { FieldHint, FormSection, RegisteredList, type FormSectionOpenSignal } from "../../../shared/ui"

interface FeeSectionProps {
  data: AppData
  actions: AppActions
  openSignal?: FormSectionOpenSignal | null
}

const INITIAL_FORM: Omit<Fee, "id"> = {
  name: "",
  ratePercent: 5,
  fixedAmount: 0,
  currency: "JPY",
  note: "",
}

export function FeeSection({ data, actions, openSignal }: FeeSectionProps) {
  const [feeForm, setFeeForm] = useState<Omit<Fee, "id">>(INITIAL_FORM)
  const { addFee } = actions

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!feeForm.name.trim()) return
    addFee({ ...feeForm })
    setFeeForm(INITIAL_FORM)
  }

  return (
    <FormSection
      title="手数料マスタ"
      description="販売手数料・決済手数料などを登録して商品登録で選択"
      storageKey="master-section-fees"
      openSignal={openSignal}
    >
      <form className="grid gap-2" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">手数料名</Label>
          <Input
            placeholder="例: ECモール手数料"
            value={feeForm.name}
            onChange={(event) => setFeeForm((prev) => ({ ...prev, name: event.target.value }))}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">料率 (%)</Label>
            <NumberInput
              value={feeForm.ratePercent}
              min={0}
              max={100}
              onValueChange={(next) => setFeeForm((prev) => ({ ...prev, ratePercent: next === "" ? 0 : Number(next) }))}
            />
            <FieldHint>販売価格に対して乗じられる割合。</FieldHint>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">固定額</Label>
            <div className="flex gap-2">
              <NumberInput
                value={feeForm.fixedAmount}
                onValueChange={(next) => setFeeForm((prev) => ({ ...prev, fixedAmount: next === "" ? 0 : Number(next) }))}
              />
              <Select value={feeForm.currency} onValueChange={(value) => setFeeForm((prev) => ({ ...prev, currency: value }))}>
                <SelectTrigger className="w-28">
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
            <FieldHint>件数あたりの固定費用。不要なら0のままでOK。</FieldHint>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">備考</Label>
          <Textarea
            placeholder="例: 決済手数料 3%"
            value={feeForm.note}
            onChange={(event) => setFeeForm((prev) => ({ ...prev, note: event.target.value }))}
          />
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" size="sm">
            追加
          </Button>
        </div>
      </form>

      <RegisteredList
        title="登録済み 手数料"
        items={data.fees.map((fee) => {
          const detail = `${fee.ratePercent}% + ${formatCurrency(fee.fixedAmount, fee.currency)}`
          return `${fee.name} / ${detail}${fee.note ? ` / ${fee.note}` : ""}`
        })}
      />
    </FormSection>
  )
}
