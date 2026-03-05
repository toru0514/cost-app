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
import type { AppData, PackagingItem } from "@/lib/types"
import { createTempId } from "@/lib/utils"
import { toast } from "sonner"
import { FieldHint, FormSection, RegisteredList, type FormSectionOpenSignal } from "../../../shared/ui"

interface PackagingSectionProps {
  data: AppData
  actions: AppActions
  isAuthenticated: boolean
  onSetPackagingStock: (id: string, quantity: number, stockUnit?: string) => Promise<void>
  openSignal?: FormSectionOpenSignal | null
}

const INITIAL_FORM: Omit<PackagingItem, "id"> = {
  name: "",
  unit: "set",
  sizeDescription: "",
  currency: "JPY",
  unitCost: 0,
  unitsPerBatch: 1,
  note: "",
}

export function PackagingSection({ data, actions, isAuthenticated, onSetPackagingStock, openSignal }: PackagingSectionProps) {
  const [packagingForm, setPackagingForm] = useState<Omit<PackagingItem, "id">>(INITIAL_FORM)
  const [initialStock, setInitialStock] = useState<number>(INITIAL_FORM.unitsPerBatch ?? 1)
  const [initialStockOverridden, setInitialStockOverridden] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { addPackagingItem } = actions

  return (
    <FormSection
      title="梱包材マスタ"
      description="段ボールやフィルムなどを登録し、商品登録時に選べるようにします。"
      storageKey="master-section-packaging"
      openSignal={openSignal}
    >
      <div className="space-y-2">
        <form
          className="grid gap-2"
          onSubmit={async (event) => {
            event.preventDefault()
            if (submitting) return
            const name = packagingForm.name.trim()
            if (!name) return
            setSubmitting(true)
            try {
              const id = createTempId()
              addPackagingItem({ ...packagingForm, id, name })
              const normalizedInitialStock = Math.max(0, Number(initialStock) || 0)
              if (isAuthenticated && normalizedInitialStock > 0) {
                try {
                  // packaging_stock は FK を持たない設計のため、マスタ同期前でも先に upsert できる。
                  await onSetPackagingStock(id, normalizedInitialStock)
                } catch (error) {
                  console.error("Failed to save initial packaging stock", error)
                  toast.error("初期在庫数の保存に失敗しました")
                }
              }
              setPackagingForm(INITIAL_FORM)
              setInitialStock(INITIAL_FORM.unitsPerBatch ?? 1)
              setInitialStockOverridden(false)
            } finally {
              setSubmitting(false)
            }
          }}
        >
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">梱包材名</Label>
            <Input
              placeholder="例: 段ボールS"
              value={packagingForm.name}
              onChange={(event) => setPackagingForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">単位</Label>
              <Input
                placeholder="例: 枚"
                value={packagingForm.unit}
                onChange={(event) => setPackagingForm((prev) => ({ ...prev, unit: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">通貨</Label>
              <Select value={packagingForm.currency} onValueChange={(value) => setPackagingForm((prev) => ({ ...prev, currency: value }))}>
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
            <Label className="text-xs text-muted-foreground">サイズ/仕様</Label>
            <Input
              placeholder="例: 320x250x120"
              value={packagingForm.sizeDescription}
              onChange={(event) => setPackagingForm((prev) => ({ ...prev, sizeDescription: event.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">基準単価</Label>
            <NumberInput
              placeholder="例: 80"
              value={packagingForm.unitCost}
              onValueChange={(next) => setPackagingForm((prev) => ({ ...prev, unitCost: next === "" ? 0 : next }))}
            />
            <FieldHint>梱包材を仕入れる際の単価。セット売りの場合は下の数量と合わせて設定。</FieldHint>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">備考</Label>
            <Textarea
              placeholder="仕入先や材質"
              value={packagingForm.note}
              onChange={(event) => setPackagingForm((prev) => ({ ...prev, note: event.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">セット数量（例: 100枚セットなら100）</Label>
            <NumberInput
              placeholder="例: 100"
              value={packagingForm.unitsPerBatch ?? 1}
              min={1}
              onValueChange={(next) => {
                const unitsPerBatch = next === "" ? 1 : Number(next)
                setPackagingForm((prev) => ({ ...prev, unitsPerBatch }))
                if (!initialStockOverridden) {
                  setInitialStock(unitsPerBatch)
                }
              }}
            />
            <FieldHint>仕入れ単位。100枚セットを登録する場合は100と入力。</FieldHint>
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
          <div className="flex justify-end pt-2">
            <Button type="submit" size="sm" disabled={submitting}>
              追加
            </Button>
          </div>
        </form>

        <RegisteredList
          title="登録済み 梱包材"
          items={data.packagingItems.map((item) => {
            const unitCostText = formatCurrency(item.unitCost, item.currency)
            const batchText = item.unitsPerBatch && item.unitsPerBatch > 1 ? `${item.unitsPerBatch}単位/セット` : "1単位/セット"
            return `${item.name} / ${unitCostText} / ${item.unit} / ${batchText} / ${item.sizeDescription}`
          })}
        />
      </div>
    </FormSection>
  )
}
