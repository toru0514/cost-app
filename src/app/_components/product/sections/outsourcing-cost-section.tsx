"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { currencyOptions } from "@/lib/constants"

import { DraftCard, FieldHint, FormSection, HintList } from "../../shared/ui"
import type { OutsourcingCostDraft } from "../types"

interface OutsourcingCostSectionProps {
  drafts: OutsourcingCostDraft[]
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<OutsourcingCostDraft>) => void
  onRemove: (id: string) => void
}

export function OutsourcingCostSection({ drafts, onAdd, onUpdate, onRemove }: OutsourcingCostSectionProps) {
  return (
    <FormSection
      title="外注費"
      description="商品1つあたりの外注コストを登録"
      action={
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          行を追加
        </Button>
      }
    >
      <HintList
        items={[
          "外注先メモ: 委託内容や社名を記載",
          "単価: 商品1個あたりの委託費用",
          "通貨: 支払通貨を選択",
        ]}
      />
      {drafts.length === 0 ? (
        <p className="text-sm text-muted-foreground">明細を追加してください。</p>
      ) : (
        drafts.map((draft) => (
          <DraftCard key={draft.id} onRemove={() => onRemove(draft.id)}>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">委託内容メモ</Label>
                <Textarea
                  value={draft.note}
                  onChange={(event) =>
                    onUpdate(draft.id, {
                      note: event.target.value,
                    })
                  }
                  placeholder="例: 縫製を外注"
                />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">単価</Label>
                  <NumberInput
                    placeholder="例: 150"
                    value={draft.costPerUnit}
                    onValueChange={(next) =>
                      onUpdate(draft.id, {
                        costPerUnit: next,
                      })
                    }
                  />
                  <FieldHint>1商品あたりの外注費。ロット費用を個数で割った値など。</FieldHint>
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
                </div>
              </div>
            </div>
          </DraftCard>
        ))
      )}
    </FormSection>
  )
}
