"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/calculations"
import type { Material } from "@/lib/types"

import { DraftCard, FieldHint, FormSection, HintList } from "../../shared/ui"
import type { MaterialCostDraft } from "../types"

interface MaterialCostSectionProps {
  materials: Material[]
  drafts: MaterialCostDraft[]
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<MaterialCostDraft>) => void
  onRemove: (id: string) => void
}

export function MaterialCostSection({ materials, drafts, onAdd, onUpdate, onRemove }: MaterialCostSectionProps) {
  return (
    <FormSection
      title="材料費"
      description="材料マスタから選択し、使用率だけ入力すれば単価を自動参照"
      defaultOpen
      action={
        <Button type="button" variant="outline" size="sm" onClick={onAdd} disabled={materials.length === 0}>
          行を追加
        </Button>
      }
    >
      <HintList
        items={[
          "材料マスタ: 事前登録した素材を選択（単価・通貨はマスタ値を使用）",
          "使用率(%): 仕入れたロットのうち1個あたりで使う割合",
          "用途: 本体用・持ち手用などのメモ",
        ]}
      />
      {materials.length === 0 ? (
        <p className="text-sm text-muted-foreground">材料マスタを登録すると入力できます。</p>
      ) : drafts.length === 0 ? (
        <p className="text-sm text-muted-foreground">明細を追加してください。</p>
      ) : (
        drafts.map((draft) => {
          const selectedMaterial = materials.find((material) => material.id === draft.materialId)
          const unitCostLabel = selectedMaterial
            ? `${formatCurrency(selectedMaterial.unitCost, selectedMaterial.currency)} / ${selectedMaterial.unit ?? "任意単位"}`
            : "材料マスタで単価を登録すると自動計算されます。"
          return (
            <DraftCard key={draft.id} onRemove={() => onRemove(draft.id)}>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">材料</Label>
                  <Select
                    value={draft.materialId}
                    onValueChange={(value) =>
                      onUpdate(draft.id, {
                        materialId: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="材料" />
                    </SelectTrigger>
                    <SelectContent>
                      {materials.map((material) => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedMaterial?.supplier && (
                    <p className="text-xs text-muted-foreground">仕入先: {selectedMaterial.supplier}</p>
                  )}
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">使用率 (%)</Label>
                    <NumberInput
                      placeholder="例: 75"
                      value={draft.usageRatio}
                      onValueChange={(next) =>
                        onUpdate(draft.id, {
                          usageRatio: next === "" ? 0 : next,
                        })
                      }
                    />
                    <FieldHint>仕入れたロットのうち1商品あたりで使う割合。例: 1ロールの25%なら25。</FieldHint>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">用途メモ</Label>
                    <Textarea
                      value={draft.description}
                      onChange={(event) =>
                        onUpdate(draft.id, {
                          description: event.target.value,
                        })
                      }
                      placeholder="例: 本体表地用"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">材料単価: {unitCostLabel}</p>
              </div>
            </DraftCard>
          )
        })
      )}
    </FormSection>
  )
}
