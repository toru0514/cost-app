"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/calculations"
import type { PackagingItem } from "@/lib/types"

import { DraftCard, FieldHint, FormSection, HintList } from "../../shared/ui"
import type { PackagingCostDraft } from "../types"

interface PackagingCostSectionProps {
  items: PackagingItem[]
  drafts: PackagingCostDraft[]
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<PackagingCostDraft>) => void
  onRemove: (id: string) => void
}

export function PackagingCostSection({ items, drafts, onAdd, onUpdate, onRemove }: PackagingCostSectionProps) {
  return (
    <FormSection
      title="梱包材費"
      description="梱包材マスタから選択し、数量を設定"
      defaultOpen
      action={
        <Button type="button" variant="outline" size="sm" onClick={onAdd} disabled={items.length === 0}>
          行を追加
        </Button>
      }
    >
      <HintList
        items={[
          "梱包材マスタ: 事前登録した資材から選択",
          "数量: 1商品あたりに使う点数や長さ",
          "単価はマスタ値を自動適用",
        ]}
      />
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">梱包材マスタを登録すると入力できます。</p>
      ) : drafts.length === 0 ? (
        <p className="text-sm text-muted-foreground">明細を追加してください。</p>
      ) : (
        drafts.map((draft) => {
          const selectedItem = items.find((item) => item.id === draft.packagingItemId)
          const unitCostLabel = selectedItem
            ? `${formatCurrency(selectedItem.unitCost, selectedItem.currency)} / ${selectedItem.unit}`
            : "梱包材マスタで単価を登録してください"
          return (
            <DraftCard key={draft.id} onRemove={() => onRemove(draft.id)}>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">梱包材</Label>
                  <Select
                    value={draft.packagingItemId}
                    onValueChange={(value) =>
                      onUpdate(draft.id, {
                        packagingItemId: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="梱包材" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">数量</Label>
                  <NumberInput
                    placeholder="例: 1"
                    value={draft.quantity}
                    onValueChange={(next) =>
                      onUpdate(draft.id, {
                        quantity: next === "" ? 0 : next,
                      })
                    }
                  />
                  <FieldHint>1商品あたりに必要な点数。箱1つなら1、緩衝材を2枚使うなら2。</FieldHint>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">梱包材単価: {unitCostLabel}</p>
            </DraftCard>
          )
        })
      )}
    </FormSection>
  )
}
