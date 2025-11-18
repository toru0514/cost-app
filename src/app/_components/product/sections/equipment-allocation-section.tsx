"use client"

import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"
import type { Equipment } from "@/lib/types"

import { DraftCard, FieldHint, FormSection, HintList } from "../../shared/ui"
import type { EquipmentAllocationDraft } from "../types"

interface EquipmentAllocationSectionProps {
  equipments: Equipment[]
  drafts: EquipmentAllocationDraft[]
  totalUsageHours: number
  hasSelectedEquipment: boolean
  onUpdate: (id: string, patch: Partial<EquipmentAllocationDraft>) => void
}

export function EquipmentAllocationSection({
  equipments,
  drafts,
  totalUsageHours,
  hasSelectedEquipment,
  onUpdate,
}: EquipmentAllocationSectionProps) {
  return (
    <FormSection title="設備配賦" description="商品で利用する設備の配賦設定">
      <HintList
        items={[
          "利用率: 設備稼働のうち当該商品の占める割合 (0〜1)",
          "年間生産数: 設備をこの商品に使う年間数量",
        ]}
      />
      {!hasSelectedEquipment ? (
        <p className="text-sm text-muted-foreground">設備を選択すると配賦割合を入力できます。</p>
      ) : (
        drafts.map((draft) => {
          const equipment = equipments.find((item) => item.id === draft.equipmentId)
          if (!equipment) return null
          const ratio =
            totalUsageHours > 0 && draft.usageHours
              ? Math.round((draft.usageHours / totalUsageHours) * 100)
              : Math.round((draft.allocationRatio || 0) * 100)
          return (
            <DraftCard key={draft.id} hideRemove>
              <p className="text-sm font-medium">{equipment.name}</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">使用時間 (h)</Label>
                  <NumberInput
                    placeholder="例: 0.5"
                    value={draft.usageHours ?? ""}
                    onValueChange={(next) =>
                      onUpdate(draft.id, {
                        usageHours: next === "" ? undefined : next,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {totalUsageHours > 0 ? `利用率 約${ratio}%` : "利用率は使用時間から自動計算されます"}
                  </p>
                  <FieldHint>1商品あたりで設備を使用する時間。複数設備で割ると自動的に配賦比率になります。</FieldHint>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">年間生産数</Label>
                  <NumberInput
                    placeholder="例: 3000"
                    value={draft.annualQuantity}
                    onValueChange={(next) =>
                      onUpdate(draft.id, {
                        annualQuantity: next === "" ? 0 : next,
                      })
                    }
                  />
                  <FieldHint>この設備を利用して年間に生産する個数。配賦単価の割り算に使います。</FieldHint>
                </div>
              </div>
            </DraftCard>
          )
        })
      )}
    </FormSection>
  )
}
