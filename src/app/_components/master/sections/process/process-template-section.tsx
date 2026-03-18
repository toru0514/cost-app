"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { AppActions } from "@/lib/app-data"
import { formatCurrency } from "@/lib/calculations"
import type { AppData, ProcessTemplate } from "@/lib/types"
import { FormSection, RegisteredList, type FormSectionOpenSignal } from "../../../shared/ui"

interface ProcessTemplateSectionProps {
  data: AppData
  actions: AppActions
  openSignal?: FormSectionOpenSignal | null
  onOpen?: () => void
  onClose?: () => void
}

const COLOR_OPTIONS = [
  { name: "slate", bg: "bg-slate-400", value: "slate" },
  { name: "red", bg: "bg-red-400", value: "red" },
  { name: "orange", bg: "bg-orange-400", value: "orange" },
  { name: "amber", bg: "bg-amber-400", value: "amber" },
  { name: "emerald", bg: "bg-emerald-400", value: "emerald" },
  { name: "blue", bg: "bg-blue-400", value: "blue" },
  { name: "violet", bg: "bg-violet-400", value: "violet" },
  { name: "pink", bg: "bg-pink-400", value: "pink" },
] as const

type FormState = {
  name: string
  defaultHourlyRate: number
  parentId: string
  color: string
}

const INITIAL_FORM: FormState = {
  name: "",
  defaultHourlyRate: 1800,
  parentId: "",
  color: "",
}

function buildHierarchyItems(templates: ProcessTemplate[]): { id: string; label: string }[] {
  const topLevel = templates.filter((t) => !t.parentId)
  const children = templates.filter((t) => t.parentId)
  const items: { id: string; label: string }[] = []

  for (const parent of topLevel) {
    const colorLabel = parent.color ? ` [${parent.color}]` : ""
    items.push({ id: parent.id, label: `${parent.name} / ${formatCurrency(parent.defaultHourlyRate, "JPY")}/h${colorLabel}` })
    const subs = children.filter((c) => c.parentId === parent.id)
    for (const sub of subs) {
      const subColorLabel = sub.color ? ` [${sub.color}]` : ""
      items.push({ id: sub.id, label: `  - ${sub.name} / ${formatCurrency(sub.defaultHourlyRate, "JPY")}/h${subColorLabel}` })
    }
  }

  // orphan children (parentId set but parent doesn't exist)
  const topLevelIds = new Set(topLevel.map((t) => t.id))
  const orphans = children.filter((c) => c.parentId && !topLevelIds.has(c.parentId))
  for (const orphan of orphans) {
    const colorLabel = orphan.color ? ` [${orphan.color}]` : ""
    items.push({ id: orphan.id, label: `${orphan.name} / ${formatCurrency(orphan.defaultHourlyRate, "JPY")}/h${colorLabel}` })
  }

  return items
}

export function ProcessTemplateSection({ data, actions, openSignal, onOpen, onClose }: ProcessTemplateSectionProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const { addProcessTemplate, removeProcessTemplate } = actions

  const topLevelTemplates = data.processTemplates.filter((t) => !t.parentId)

  return (
    <FormSection
      title="工程テンプレート"
      description="製造工程のテンプレートを登録します。商品ごとの工程定義で再利用できます。"
      storageKey="master-section-process-template"
      openSignal={openSignal}
      onOpen={onOpen}
      onClose={onClose}
    >
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (!form.name.trim()) return
          addProcessTemplate({
            name: form.name.trim(),
            defaultHourlyRate: form.defaultHourlyRate,
            parentId: form.parentId || undefined,
            color: form.color || undefined,
            sortOrder: data.processTemplates.length,
          })
          setForm(INITIAL_FORM)
        }}
      >
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">工程名</Label>
          <Input
            placeholder="例: 裁断"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">デフォルト時給</Label>
            <NumberInput
              placeholder="例: 1800"
              value={form.defaultHourlyRate}
              onValueChange={(next) => setForm((prev) => ({ ...prev, defaultHourlyRate: next === "" ? 0 : next }))}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">親工程</Label>
            <Select value={form.parentId} onValueChange={(value) => setForm((prev) => ({ ...prev, parentId: value === "__none__" ? "" : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="なし（トップレベル）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">なし（トップレベル）</SelectItem>
                {topLevelTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">カラー</Label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`w-7 h-7 rounded-full ${c.bg} border-2 transition-all ${form.color === c.value ? "border-foreground scale-110" : "border-transparent hover:border-muted-foreground/40"}`}
                title={c.name}
                onClick={() => setForm((prev) => ({ ...prev, color: prev.color === c.value ? "" : c.value }))}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" size="sm">
            工程テンプレートを追加
          </Button>
        </div>

        <RegisteredList
          title="登録済み 工程テンプレート"
          items={buildHierarchyItems(data.processTemplates)}
          onDelete={(id) => removeProcessTemplate(id)}
        />
      </form>
    </FormSection>
  )
}
