"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/calculations"
import type { LaborRole } from "@/lib/types"

import { DraftCard, FieldHint, FormSection, HintList } from "../../shared/ui"
import type { LaborCostDraft } from "../types"

interface LaborCostSectionProps {
  laborRoles: LaborRole[]
  drafts: LaborCostDraft[]
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<LaborCostDraft>) => void
  onRemove: (id: string) => void
}

export function LaborCostSection({ laborRoles, drafts, onAdd, onUpdate, onRemove }: LaborCostSectionProps) {
  return (
    <FormSection
      title="人件費"
      description="作業カテゴリごとに工数と人数を設定"
      action={
        <Button type="button" variant="outline" size="sm" onClick={onAdd} disabled={laborRoles.length === 0}>
          行を追加
        </Button>
      }
    >
      <HintList
        items={[
          "作業カテゴリ: 裁断・縫製などの役割",
          "工数: 1商品あたりにかかる時間 (時間)",
          "人数: 同時に作業する人数",
          "時給(任意): マスタの時給を上書きしたい場合に入力",
        ]}
      />
      {laborRoles.length === 0 ? (
        <p className="text-sm text-muted-foreground">人件費マスタを登録すると入力できます。</p>
      ) : drafts.length === 0 ? (
        <p className="text-sm text-muted-foreground">明細を追加してください。</p>
      ) : (
        drafts.map((draft) => {
          const selectedRole = laborRoles.find((role) => role.id === draft.laborRoleId)
          return (
            <DraftCard key={draft.id} onRemove={() => onRemove(draft.id)}>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">作業カテゴリ</Label>
                <Select
                  value={draft.laborRoleId}
                  onValueChange={(value) =>
                    onUpdate(draft.id, {
                      laborRoleId: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="作業カテゴリ" />
                  </SelectTrigger>
                  <SelectContent>
                    {laborRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRole && (
                  <p className="text-xs text-muted-foreground">
                    標準時給: {formatCurrency(selectedRole.hourlyRate, selectedRole.currency)}
                  </p>
                )}
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">工数 (時間)</Label>
                  <NumberInput
                    placeholder="例: 0.5"
                    value={draft.hours}
                    onValueChange={(next) =>
                      onUpdate(draft.id, {
                        hours: next === "" ? 0 : next,
                      })
                    }
                  />
                  <FieldHint>1商品を作る際の作業時間。30分なら0.5のように少数で入力。</FieldHint>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">人数</Label>
                  <NumberInput
                    placeholder="例: 1"
                    value={draft.peopleCount}
                    onValueChange={(next) =>
                      onUpdate(draft.id, {
                        peopleCount: next === "" ? 0 : next,
                      })
                    }
                  />
                  <FieldHint>同じ工程を同時に担当する人数（例: 2人で縫製するなら2）。</FieldHint>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">時給 (任意)</Label>
                  <NumberInput
                    placeholder="例: 2000"
                    value={draft.hourlyRateOverride ?? ""}
                    onValueChange={(next) =>
                      onUpdate(draft.id, {
                        hourlyRateOverride: next === "" ? undefined : next,
                      })
                    }
                  />
                  <FieldHint>マスタ時給を上書きしたい場合のみ入力。未入力ならマスタ値を使用。</FieldHint>
                </div>
              </div>
            </DraftCard>
          )
        })
      )}
    </FormSection>
  )
}
