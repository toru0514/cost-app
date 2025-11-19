"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"

import { DraftCard, HintList, FormSection } from "../../shared/ui"
import type { DevelopmentCostDraft } from "../types"

interface DevelopmentCostSectionProps {
  drafts: DevelopmentCostDraft[]
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<DevelopmentCostDraft>) => void
  onRemove: (id: string) => void
}

export function DevelopmentCostSection({ drafts, onAdd, onUpdate, onRemove }: DevelopmentCostSectionProps) {
  return (
    <FormSection
      title="開発コスト"
      description="試作工数・材料費・道具費を入力"
      defaultOpen
      action={
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          行を追加
        </Button>
      }
    >
      <HintList
        items={[
          "試作工数コスト: 試作にかかった人件費トータル",
          "試作用材料費: 試作で使った素材費",
          "道具費: 型や治具など一度だけ買うもの",
          "償却年数: 何年で割って原価化するか",
        ]}
      />
      {drafts.length === 0 ? (
        <p className="text-sm text-muted-foreground">明細を追加してください。</p>
      ) : (
        drafts.map((draft) => (
          <DraftCard key={draft.id} onRemove={() => onRemove(draft.id)}>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">タイトル</Label>
              <Input
                placeholder="例: 写真撮影コスト"
                value={draft.title}
                onChange={(event) =>
                  onUpdate(draft.id, {
                    title: event.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">試作工数コスト</Label>
                <NumberInput
                  placeholder="例: 80000"
                  value={draft.prototypeLaborCost}
                  onValueChange={(next) =>
                    onUpdate(draft.id, {
                      prototypeLaborCost: next,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">試作用材料費</Label>
                <NumberInput
                  placeholder="例: 60000"
                  value={draft.prototypeMaterialCost}
                  onValueChange={(next) =>
                    onUpdate(draft.id, {
                      prototypeMaterialCost: next,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">道具費</Label>
                <NumberInput
                  placeholder="例: 40000"
                  value={draft.toolingCost}
                  onValueChange={(next) =>
                    onUpdate(draft.id, {
                      toolingCost: next,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">償却年数</Label>
                <NumberInput
                  placeholder="例: 2"
                  value={draft.amortizationYears}
                  onValueChange={(next) =>
                    onUpdate(draft.id, {
                      amortizationYears: next === "" ? 0 : next,
                    })
                  }
                />
              </div>
            </div>
          </DraftCard>
        ))
      )}
    </FormSection>
  )
}
