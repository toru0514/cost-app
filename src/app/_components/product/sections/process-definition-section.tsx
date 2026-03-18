"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ProcessTemplate } from "@/lib/types/process"

import { DraftCard, FieldHint, FormSection, HintList } from "../../shared/ui"
import type { ProductProcessDraft } from "../types"

interface ProcessDefinitionSectionProps {
  processTemplates: ProcessTemplate[]
  drafts: ProductProcessDraft[]
  onAdd: () => void
  onAddFromTemplate: (templateId: string) => void
  onUpdate: (id: string, patch: Partial<ProductProcessDraft>) => void
  onRemove: (id: string) => void
  onAddChild: (parentId: string) => void
}

export type { ProductProcessDraft }

export function ProcessDefinitionSection({
  processTemplates,
  drafts,
  onAdd,
  onAddFromTemplate,
  onUpdate,
  onRemove,
  onAddChild,
}: ProcessDefinitionSectionProps) {
  const parentDrafts = drafts
    .filter((d) => !d.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const childrenOf = (parentId: string) =>
    drafts
      .filter((d) => d.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <FormSection
      title="工程定義"
      description="この商品の製造工程と工程別時給を定義します"
      defaultOpen
      action={
        <div className="flex items-center gap-2">
          <Select
            value=""
            onValueChange={(templateId) => onAddFromTemplate(templateId)}
          >
            <SelectTrigger className="w-auto min-w-[160px]">
              <SelectValue placeholder="テンプレートから追加" />
            </SelectTrigger>
            <SelectContent>
              {processTemplates.map((tpl) => (
                <SelectItem key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            カスタム工程を追加
          </Button>
        </div>
      }
    >
      <HintList
        items={[
          "工程名: 裁断・縫製・仕上げなどの工程名称",
          "時給: 工程ごとの時給単価（テンプレートから継承、上書き可）",
          "見積時間(分): 1商品あたりの見積もり作業時間（分）",
          "小工程: 親工程の下に子工程を追加して階層管理が可能",
        ]}
      />
      {drafts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          工程を追加してください。テンプレートから選択するか、カスタム工程を作成できます。
        </p>
      ) : (
        parentDrafts.map((draft) => {
          const children = childrenOf(draft.id)
          return (
            <div key={draft.id} className="space-y-2">
              <ProcessDraftCard
                draft={draft}
                processTemplates={processTemplates}
                onUpdate={onUpdate}
                onRemove={onRemove}
              />
              {children.length > 0 && (
                <div className="ml-6 space-y-2">
                  {children.map((child) => (
                    <ProcessDraftCard
                      key={child.id}
                      draft={child}
                      processTemplates={processTemplates}
                      onUpdate={onUpdate}
                      onRemove={onRemove}
                      isChild
                    />
                  ))}
                </div>
              )}
              <div className="ml-6">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddChild(draft.id)}
                >
                  +小工程
                </Button>
              </div>
            </div>
          )
        })
      )}
    </FormSection>
  )
}

function ProcessDraftCard({
  draft,
  processTemplates,
  onUpdate,
  onRemove,
  isChild,
}: {
  draft: ProductProcessDraft
  processTemplates: ProcessTemplate[]
  onUpdate: (id: string, patch: Partial<ProductProcessDraft>) => void
  onRemove: (id: string) => void
  isChild?: boolean
}) {
  const linkedTemplate = processTemplates.find(
    (tpl) => tpl.id === draft.processTemplateId
  )

  return (
    <DraftCard onRemove={() => onRemove(draft.id)}>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          {isChild ? "小工程名" : "工程名"}
        </Label>
        <Input
          placeholder="例: 裁断"
          value={draft.name}
          onChange={(e) => onUpdate(draft.id, { name: e.target.value })}
        />
        {linkedTemplate && (
          <p className="text-xs text-muted-foreground">
            テンプレート: {linkedTemplate.name}
          </p>
        )}
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">時給 (円)</Label>
          <NumberInput
            placeholder="例: 1500"
            value={draft.hourlyRate}
            onValueChange={(next) =>
              onUpdate(draft.id, {
                hourlyRate: next === "" ? 0 : next,
              })
            }
          />
          <FieldHint>
            {linkedTemplate
              ? `テンプレート既定値: ${linkedTemplate.defaultHourlyRate}円。上書き可能。`
              : "この工程の時給単価を入力。"}
          </FieldHint>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">見積時間 (分)</Label>
          <NumberInput
            placeholder="例: 30"
            value={draft.estimatedMinutes ?? ""}
            onValueChange={(next) =>
              onUpdate(draft.id, {
                estimatedMinutes: next === "" ? undefined : next,
              })
            }
          />
          <FieldHint>1商品あたりの見積もり作業時間（分単位）。</FieldHint>
        </div>
      </div>
    </DraftCard>
  )
}
