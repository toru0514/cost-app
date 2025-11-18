"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AppActions } from "@/lib/app-data"
import type { AppData, OptionPreset, ProductSizeVariant } from "@/lib/types"
import { toast } from "sonner"

interface OptionPresetListSectionProps {
  data: AppData
  actions: AppActions
  createTempId: () => string
}

export function OptionPresetListSection({ data, actions, createTempId }: OptionPresetListSectionProps) {
  const [editingOptionPreset, setEditingOptionPreset] = useState<{ id: string | null; name: string; variants: ProductSizeVariant[] }>({
    id: null,
    name: "",
    variants: [{ label: "", quantity: 0 }],
  })

  const { updateOptionPreset, removeOptionPreset, addOptionPreset } = actions

  const resetOptionPreset = () => setEditingOptionPreset({ id: null, name: "", variants: [{ label: "", quantity: 0 }] })

  const addVariant = () => {
    setEditingOptionPreset((prev) => ({
      ...prev,
      variants: [...prev.variants, { label: "", quantity: 0 }],
    }))
  }

  const updateVariant = (index: number, patch: Partial<ProductSizeVariant>) => {
    setEditingOptionPreset((prev) => ({
      ...prev,
      variants: prev.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...patch } : variant
      ),
    }))
  }

  const removeVariant = (index: number) => {
    setEditingOptionPreset((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, variantIndex) => variantIndex !== index),
    }))
  }

  const handlePresetSave = () => {
    const { id } = editingOptionPreset
    if (!id) return
    const name = editingOptionPreset.name.trim()
    const variants = editingOptionPreset.variants
      .map((variant) => ({ label: variant.label.trim(), quantity: Number(variant.quantity) || 0 }))
      .filter((variant) => variant.label.length > 0)
    if (!name || variants.length === 0) return
    updateOptionPreset({ id, name, variants })
    toast.success("オプションプリセットを更新しました", { description: `「${name}」を更新しました。` })
    resetOptionPreset()
  }

  const handlePresetDelete = () => {
    const { id } = editingOptionPreset
    if (!id) return
    const name = editingOptionPreset.name.trim() || "プリセット"
    removeOptionPreset(id)
    toast.success("オプションプリセットを削除しました", { description: `「${name}」を削除しました。` })
    resetOptionPreset()
  }

  const handlePresetCopy = (preset: OptionPreset) => {
    const newId = createTempId()
    const name = `${preset.name} (コピー)`
    addOptionPreset({
      id: newId,
      name,
      variants: preset.variants.map((variant) => ({ label: variant.label, quantity: variant.quantity })),
    })
    toast.success("オプションプリセットをコピーしました", { description: `「${name}」を作成しました。` })
    setEditingOptionPreset({
      id: newId,
      name,
      variants:
        preset.variants.length > 0
          ? preset.variants.map((variant) => ({ label: variant.label, quantity: variant.quantity }))
          : [{ label: "", quantity: 0 }],
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>オプションプリセット一覧</CardTitle>
        <CardDescription>登録済みプリセットの名称や内容を編集できます。</CardDescription>
      </CardHeader>
      <CardContent>
        {(data.optionPresets ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
        ) : (
          <div className="relative w-full max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead className="w-40 text-right">
                    <span className="sr-only">操作</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.optionPresets ?? []).map((preset) => {
                  const isEditing = editingOptionPreset.id === preset.id
                  const detailText =
                    preset.variants.length > 0
                      ? preset.variants.map((variant) => `${variant.label}(${variant.quantity})`).join(" / ")
                      : "-"
                  return (
                    <TableRow key={preset.id}>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingOptionPreset.name}
                            onChange={(event) =>
                              setEditingOptionPreset((prev) => ({ ...prev, name: event.target.value }))
                            }
                          />
                        ) : (
                          preset.name
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="space-y-2">
                            {editingOptionPreset.variants.map((variant, index) => (
                              <div key={`editing-preset-${index}`} className="flex flex-wrap items-center gap-2">
                                <Input
                                  className="min-w-[120px] flex-1"
                                  placeholder="例: S"
                                  value={variant.label}
                                  onChange={(event) => updateVariant(index, { label: event.target.value })}
                                />
                                <NumberInput
                                  value={variant.quantity}
                                  onValueChange={(next) => updateVariant(index, { quantity: next === "" ? 0 : next })}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeVariant(index)}
                                  disabled={editingOptionPreset.variants.length === 1}
                                >
                                  削除
                                </Button>
                              </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                              行を追加
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">{detailText}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <Button type="button" size="sm" onClick={handlePresetSave}>保存</Button>
                            <Button type="button" size="sm" variant="destructive" onClick={handlePresetDelete}>削除</Button>
                            <Button type="button" size="sm" variant="ghost" onClick={resetOptionPreset}>キャンセル</Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setEditingOptionPreset({
                                  id: preset.id,
                                  name: preset.name,
                                  variants:
                                    preset.variants.length > 0
                                      ? preset.variants.map((variant) => ({ label: variant.label, quantity: variant.quantity }))
                                      : [{ label: "", quantity: 0 }],
                                })
                              }
                            >
                              編集
                            </Button>
                            <Button type="button" size="sm" variant="secondary" onClick={() => handlePresetCopy(preset)}>
                              コピー
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
