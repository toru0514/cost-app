"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/calculations"
import type { ShippingMethod } from "@/lib/types"

import { DraftCard, FieldHint, FormSection, HintList } from "../../shared/ui"
import type { LogisticsCostDraft } from "../types"

interface LogisticsCostSectionProps {
  shippingMethods: ShippingMethod[]
  drafts: LogisticsCostDraft[]
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<LogisticsCostDraft>) => void
  onRemove: (id: string) => void
}

export function LogisticsCostSection({ shippingMethods, drafts, onAdd, onUpdate, onRemove }: LogisticsCostSectionProps) {
  return (
    <FormSection
      title="物流・配送費"
      description="配送方法マスタから選択し、単価は自動適用"
      action={
        <Button type="button" variant="outline" size="sm" onClick={onAdd} disabled={shippingMethods.length === 0}>
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
      ) : drafts.length === 0 ? (
        <p className="text-sm text-muted-foreground">明細を追加してください。</p>
      ) : (
        drafts.map((draft) => {
          const shippingMethod = shippingMethods.find((method) => method.id === draft.shippingMethodId)
          const unitCostText = shippingMethod
            ? `${formatCurrency(shippingMethod.unitCost, shippingMethod.currency)}`
            : "配送方法を選択してください"
          return (
            <DraftCard key={draft.id} onRemove={() => onRemove(draft.id)}>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">配送方法</Label>
                  <Select
                    value={draft.shippingMethodId}
                    onValueChange={(value) =>
                      onUpdate(draft.id, {
                        shippingMethodId: value,
                      })
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
  )
}
