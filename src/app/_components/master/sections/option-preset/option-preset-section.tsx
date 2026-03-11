"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"
import type { AppActions } from "@/lib/app-data"
import type { AppData, ProductSizeVariant } from "@/lib/types"
import { toast } from "sonner"
import { FormSection, RegisteredList, type FormSectionOpenSignal } from "../../../shared/ui"

interface OptionPresetSectionProps {
  data: AppData
  actions: AppActions
  openSignal?: FormSectionOpenSignal | null
}

interface OptionPresetFormState {
  name: string
  variants: ProductSizeVariant[]
}

const INITIAL_FORM: OptionPresetFormState = {
  name: "",
  variants: [{ label: "", quantity: 0 }],
}

export function OptionPresetSection({ data, actions, openSignal }: OptionPresetSectionProps) {
  const [optionPresetForm, setOptionPresetForm] = useState<OptionPresetFormState>(INITIAL_FORM)
  const { addOptionPreset } = actions

  const addVariant = () => {
    setOptionPresetForm((prev) => ({
      ...prev,
      variants: [...prev.variants, { label: "", quantity: 0 }],
    }))
  }

  const updateVariant = (index: number, patch: Partial<ProductSizeVariant>) => {
    setOptionPresetForm((prev) => ({
      ...prev,
      variants: prev.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...patch } : variant
      ),
    }))
  }

  const removeVariant = (index: number) => {
    setOptionPresetForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, variantIndex) => variantIndex !== index),
    }))
  }

  return (
    <FormSection
      title="オプションプリセット"
      description="S/M/L など定型セットを登録し、商品登録で一括インポートできます。"
      storageKey="master-section-option-presets"
      openSignal={openSignal}
    >
      <div className="space-y-3">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            const name = optionPresetForm.name.trim()
            const variants = optionPresetForm.variants
              .map((variant) => ({ label: variant.label.trim(), quantity: Number(variant.quantity) || 0 }))
              .filter((variant) => variant.label.length > 0)
            if (!name || variants.length === 0) return
            addOptionPreset({ name, variants })
            toast.success("オプションプリセットを追加しました", { description: `「${name}」を登録しました。` })
            setOptionPresetForm(INITIAL_FORM)
          }}
        >
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">プリセット名</Label>
            <Input
              placeholder="例: S/M/L 標準"
              value={optionPresetForm.name}
              onChange={(event) => setOptionPresetForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">含めるオプション</Label>
              <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                行を追加
              </Button>
            </div>
            {optionPresetForm.variants.length === 0 ? (
              <p className="text-xs text-muted-foreground">オプションを追加してください。</p>
            ) : (
              <div className="space-y-2">
                {optionPresetForm.variants.map((variant, index) => (
                  <div key={`preset-variant-${index}`} className="flex flex-wrap gap-2 rounded-md border p-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">名称</Label>
                      <Input
                        placeholder="例: S"
                        value={variant.label}
                        onChange={(event) => updateVariant(index, { label: event.target.value })}
                      />
                    </div>
                    <div className="w-full sm:w-32 space-y-1">
                      <Label className="text-xs text-muted-foreground">数量</Label>
                      <NumberInput
                        placeholder="例: 500"
                        value={variant.quantity}
                        onValueChange={(next) => updateVariant(index, { quantity: next === "" ? 0 : next })}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariant(index)}
                        disabled={optionPresetForm.variants.length === 1}
                      >
                        削除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button type="submit" size="sm">
            プリセットを登録
          </Button>
        </form>

        <RegisteredList
          title="登録済み プリセット"
          items={(data.optionPresets ?? []).map((preset) => {
            const detail = preset.variants.map((variant) => `${variant.label}(${variant.quantity})`).join(" / ") || "-"
            return `${preset.name}: ${detail}`
          })}
        />
      </div>
    </FormSection>
  )
}
