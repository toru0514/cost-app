"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/calculations"
import type { Fee } from "@/lib/types"

import { DraftCard, FieldHint, FormSection, HintList } from "../../shared/ui"
import type { FeeCostDraft } from "../types"

interface FeeCostSectionProps {
  fees: Fee[]
  salePrice: number
  drafts: FeeCostDraft[]
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<FeeCostDraft>) => void
  onRemove: (id: string) => void
}

export function FeeCostSection({ fees, salePrice, drafts, onAdd, onUpdate, onRemove }: FeeCostSectionProps) {
  return (
    <FormSection
      title="販売・決済手数料"
      description="販売額に対して発生する手数料をマスタから選択"
      defaultOpen
      action={
        <Button type="button" variant="outline" size="sm" onClick={onAdd} disabled={fees.length === 0}>
          行を追加
        </Button>
      }
    >
      <HintList
        items={[
          "手数料マスタ: ％と固定額を登録しておくと選択のみで適用",
          "計算は「販売価格 × ％ + 固定額」でリアルタイムに反映",
          "販売価格が変われば自動で再計算されます",
        ]}
      />
      {fees.length === 0 ? (
        <p className="text-sm text-muted-foreground">先に手数料マスタを登録してください。</p>
      ) : drafts.length === 0 ? (
        <p className="text-sm text-muted-foreground">明細を追加してください。</p>
      ) : (
        drafts.map((draft) => {
          const fee = fees.find((item) => item.id === draft.feeId)
          const variable = fee ? (salePrice * (fee.ratePercent ?? 0)) / 100 : 0
          const fixed = fee?.fixedAmount ?? 0
          const amount = fee ? formatCurrency(variable + fixed, fee.currency) : "手数料を選択してください"
          return (
            <DraftCard key={draft.id} onRemove={() => onRemove(draft.id)}>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">手数料</Label>
                  <Select
                    value={draft.feeId}
                    onValueChange={(value) =>
                      onUpdate(draft.id, {
                        feeId: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="手数料" />
                    </SelectTrigger>
                    <SelectContent>
                      {fees.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldHint>販売価格 {formatCurrency(salePrice || 0)} をもとに計算されます。</FieldHint>
                </div>
                {fee ? (
                  <p className="text-xs text-muted-foreground">
                    適用: {fee.ratePercent}% + {formatCurrency(fee.fixedAmount, fee.currency)} / 想定単価 {amount}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">手数料を選択してください。</p>
                )}
              </div>
            </DraftCard>
          )
        })
      )}
    </FormSection>
  )
}
