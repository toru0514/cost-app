"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { currencyOptions } from "@/lib/constants"

import { DraftCard, FieldHint, FormSection, HintList } from "../../shared/ui"
import type { ElectricityCostDraft } from "../types"

interface ElectricityCostSectionProps {
  drafts: ElectricityCostDraft[]
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<ElectricityCostDraft>) => void
  onRemove: (id: string) => void
}

export function ElectricityCostSection({ drafts, onAdd, onUpdate, onRemove }: ElectricityCostSectionProps) {
  return (
    <FormSection
      title="電気代"
      description="1個あたりの電力コスト"
      defaultOpen
      action={
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          行を追加
        </Button>
      }
    >
      <HintList
        items={[
          "単価: 1商品を作る際にかかる電気料金",
          "通貨: 支払い通貨",
        ]}
      />
      {drafts.length === 0 ? (
        <p className="text-sm text-muted-foreground">明細を追加してください。</p>
      ) : (
        drafts.map((draft) => (
          <DraftCard key={draft.id} onRemove={() => onRemove(draft.id)}>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">単価</Label>
                <NumberInput
                  placeholder="例: 25"
                  value={draft.costPerUnit}
                  onValueChange={(next) =>
                    onUpdate(draft.id, {
                      costPerUnit: next,
                    })
                  }
                />
                <FieldHint>電気料金の1個あたり見込み額。月額を個数で割った値など。</FieldHint>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">通貨</Label>
                <Select
                  value={draft.currency}
                  onValueChange={(value) =>
                    onUpdate(draft.id, {
                      currency: value,
                    })
                  }
                >
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
                <FieldHint>支払い通貨。海外電気料金を登録する場合に指定。</FieldHint>
              </div>
            </div>
          </DraftCard>
        ))
      )}
    </FormSection>
  )
}
