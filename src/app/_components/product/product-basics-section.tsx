"use client"

import { Dispatch, SetStateAction, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { FieldHint } from "../shared/ui"
import type { AppData, Product, ProductStatus } from "@/lib/types"

const PRODUCT_STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "draft", label: "下書き" },
  { value: "active", label: "販売中" },
  { value: "discontinued", label: "廃番" },
]

interface ProductBasicsSectionProps {
  data: AppData
  productForm: Omit<Product, "id">
  setProductForm: Dispatch<SetStateAction<Omit<Product, "id">>>
  initialStock: number
  onInitialStockChange: (quantity: number) => void
  handleToggleEquipment: (equipmentId: string, checked: boolean) => void
}

export function ProductBasicsSection({
  data,
  productForm,
  setProductForm,
  initialStock,
  onInitialStockChange,
  handleToggleEquipment,
}: ProductBasicsSectionProps) {
  const CATEGORY_NONE_VALUE = "__category-none__"
  const { large: largeCategories, medium: mediumCategories, small: smallCategories } = data.categories
  const categoryOptions = useMemo(() => {
    const options: { label: string; value: string }[] = []
    const mediumsByLarge = mediumCategories.reduce<Record<string, typeof mediumCategories>>((acc, medium) => {
      acc[medium.largeId] = acc[medium.largeId] ? [...acc[medium.largeId], medium] : [medium]
      return acc
    }, {})
    const smallsByMedium = smallCategories.reduce<Record<string, typeof smallCategories>>((acc, small) => {
      acc[small.mediumId] = acc[small.mediumId] ? [...acc[small.mediumId], small] : [small]
      return acc
    }, {})

    largeCategories.forEach((large) => {
      options.push({ label: large.name, value: JSON.stringify({ largeId: large.id }) })
      const mediums = mediumsByLarge[large.id] ?? []
      mediums.forEach((medium) => {
        options.push({
          label: `${large.name} / ${medium.name}`,
          value: JSON.stringify({ largeId: large.id, mediumId: medium.id }),
        })
        const smalls = smallsByMedium[medium.id] ?? []
        smalls.forEach((small) => {
          options.push({
            label: `${large.name} / ${medium.name} / ${small.name}`,
            value: JSON.stringify({ largeId: large.id, mediumId: medium.id, smallId: small.id }),
          })
        })
      })
    })

    return options
  }, [largeCategories, mediumCategories, smallCategories])

  const currentCategoryLabel = useMemo(() => {
    const largeName = productForm.categoryLargeId
      ? largeCategories.find((large) => large.id === productForm.categoryLargeId)?.name
      : undefined
    const mediumName = productForm.categoryMediumId
      ? mediumCategories.find((medium) => medium.id === productForm.categoryMediumId)?.name
      : undefined
    const smallName = productForm.categorySmallId
      ? smallCategories.find((small) => small.id === productForm.categorySmallId)?.name
      : undefined
    const parts = [largeName, mediumName, smallName].filter(Boolean)
    return parts.length ? parts.join(" / ") : undefined
  }, [largeCategories, mediumCategories, smallCategories, productForm.categoryLargeId, productForm.categoryMediumId, productForm.categorySmallId])
  const optionPresets = data.optionPresets ?? []
  const [selectedPresetId, setSelectedPresetId] = useState<string>(optionPresets[0]?.id ?? "")
  const selectedPresetExists = optionPresets.some((preset) => preset.id === selectedPresetId)
  const effectivePresetId = selectedPresetExists ? selectedPresetId : optionPresets[0]?.id ?? ""

  const calculateSizeTotal = (variants: Product["sizeVariants"]) =>
    variants.reduce((sum, variant) => sum + (variant.label.trim() ? Number(variant.quantity) || 0 : 0), 0)

  const updateSizeVariants = (
    updater: (variants: Product["sizeVariants"]) => Product["sizeVariants"]
  ) => {
    setProductForm((prev) => {
      const nextVariants = updater(prev.sizeVariants)
      return {
        ...prev,
        sizeVariants: nextVariants,
        productionLotSize:
          nextVariants.length > 0 ? calculateSizeTotal(nextVariants) : prev.productionLotSize,
      }
    })
  }

  const handleAddSizeVariant = () => {
    updateSizeVariants((variants) => [...variants, { label: "", quantity: 0 }])
  }

  const handleUpdateSizeVariant = (index: number, patch: Partial<{ label: string; quantity: number }>) => {
    updateSizeVariants((variants) =>
      variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...patch } : variant
      )
    )
  }

  const handleRemoveSizeVariant = (index: number) => {
    updateSizeVariants((variants) => variants.filter((_, variantIndex) => variantIndex !== index))
  }

  const handleApplyOptionPreset = () => {
    if (!effectivePresetId) return
    const preset = optionPresets.find((entry) => entry.id === effectivePresetId)
    if (!preset) return
    const normalized = preset.variants.length
      ? preset.variants.map((variant) => ({
          label: variant.label,
          quantity: Number(variant.quantity) || 0,
        }))
      : [{ label: "", quantity: 0 }]
    const total = calculateSizeTotal(normalized)
    setProductForm((prev) => ({
      ...prev,
      sizeVariants: normalized,
      productionLotSize: total > 0 ? total : prev.productionLotSize,
    }))
  }

  return (
    <div className="grid gap-4">
      <Input
        placeholder="商品名"
        value={productForm.name}
        onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
      />
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">ステータス</Label>
        <Select
          value={productForm.status ?? "active"}
          onValueChange={(value) =>
            setProductForm((prev) => ({ ...prev, status: value as ProductStatus }))
          }
        >
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="ステータスを選択" />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">カテゴリ（大 / 中 / 小）</Label>
        <Select
          value={currentCategoryLabel
            ? JSON.stringify({
                largeId: productForm.categoryLargeId,
                mediumId: productForm.categoryMediumId,
                smallId: productForm.categorySmallId,
              })
            : CATEGORY_NONE_VALUE}
          onValueChange={(value) => {
            if (value === CATEGORY_NONE_VALUE) {
              setProductForm((prev) => ({
                ...prev,
                categoryLargeId: undefined,
                categoryMediumId: undefined,
                categorySmallId: undefined,
              }))
              return
            }
            try {
              const parsed = JSON.parse(value) as {
                largeId?: string
                mediumId?: string
                smallId?: string
              }
              setProductForm((prev) => ({
                ...prev,
                categoryLargeId: parsed.largeId,
                categoryMediumId: parsed.mediumId,
                categorySmallId: parsed.smallId,
              }))
            } catch (error) {
              console.warn("Failed to parse category option", error)
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="カテゴリを選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CATEGORY_NONE_VALUE}>未選択</SelectItem>
            {categoryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentCategoryLabel && (
          <p className="text-xs text-muted-foreground">現在: {currentCategoryLabel}</p>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">オプション（名称＋個数）</Label>
          <Button type="button" variant="outline" size="sm" onClick={handleAddSizeVariant}>
            オプションを追加
          </Button>
        </div>
        {productForm.sizeVariants.length === 0 ? (
          <p className="text-xs text-muted-foreground">オプションはまだ登録されていません。</p>
        ) : (
          <div className="space-y-2">
            {productForm.sizeVariants.map((variant, index) => (
              <div key={`size-${index}`} className="flex flex-wrap gap-2 rounded-md border p-3">
                <div className="min-w-[140px] flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">名称</Label>
                  <Input
                    placeholder="例: 真鍮金具"
                    value={variant.label}
                    onChange={(event) =>
                      handleUpdateSizeVariant(index, { label: event.target.value })
                    }
                  />
                </div>
                <div className="w-40 min-w-[120px] space-y-1">
                  <Label className="text-xs text-muted-foreground">数量</Label>
                  <NumberInput
                    placeholder="例: 30"
                    value={variant.quantity}
                    onValueChange={(next) =>
                      handleUpdateSizeVariant(index, { quantity: next === "" ? 0 : next })
                    }
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSizeVariant(index)}
                    disabled={productForm.sizeVariants.length === 1}
                  >
                    削除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          例: S を 50 個、金具変更を 30 個など、名称ごとの個数を入力してください。
        </p>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">オプションプリセットを適用</Label>
        <div className="flex flex-wrap gap-2">
          <Select value={effectivePresetId} onValueChange={setSelectedPresetId} disabled={!optionPresets.length}>
            <SelectTrigger className="min-w-[200px]">
              <SelectValue placeholder="プリセットを選択" />
            </SelectTrigger>
            <SelectContent>
              {optionPresets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            onClick={handleApplyOptionPreset}
            disabled={!effectivePresetId || !optionPresets.length}
          >
            プリセットを適用
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">プリセット適用後は自由に編集できます。</p>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">備考</Label>
        <Textarea
          placeholder="サイズ配分の理由やカスタム要望のメモなど"
          value={productForm.notes ?? ""}
          onChange={(event) => setProductForm((prev) => ({ ...prev, notes: event.target.value }))}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">画像URL</Label>
        <Input
          type="url"
          placeholder="https://example.com/image.jpg"
          value={productForm.imageUrl ?? ""}
          onChange={(event) => setProductForm((prev) => ({ ...prev, imageUrl: event.target.value || undefined }))}
        />
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">制作工数 (時間)</Label>
          <NumberInput
            placeholder="例: 1.5"
            value={productForm.baseManHours}
            onValueChange={(next) =>
              setProductForm((prev) => ({ ...prev, baseManHours: next === "" ? 0 : next }))
            }
          />
          <FieldHint>1商品を完成させるまでの総作業時間。人件費セクションの初期値にも利用します。</FieldHint>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">登録日</Label>
          <Input
            type="date"
            value={productForm.registeredAt}
            onChange={(event) => setProductForm((prev) => ({ ...prev, registeredAt: event.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">想定生産期間 (年)</Label>
          <NumberInput
            placeholder="例: 1"
            value={productForm.expectedProduction.periodYears}
            onValueChange={(next) =>
              setProductForm((prev) => ({
                ...prev,
                expectedProduction: {
                  ...prev.expectedProduction,
                  periodYears: next === "" ? 0 : next,
                },
              }))
            }
          />
          <FieldHint>上記の「期間内生産予定数」と組み合わせて年間生産数を決定します。</FieldHint>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">期間内生産予定数</Label>
          <NumberInput
            placeholder="例: 1000"
            value={productForm.expectedProduction.quantity}
            onValueChange={(next) =>
              setProductForm((prev) => ({
                ...prev,
                expectedProduction: {
                  ...prev.expectedProduction,
                  quantity: next === "" ? 0 : next,
                },
              }))
            }
          />
          <FieldHint>想定期間（下記「生産期間」）で何個生産するか。設備配賦や単価計算に使用します。</FieldHint>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">制作個数 (今回ロット)</Label>
          <NumberInput
            placeholder="例: 20"
            value={productForm.productionLotSize}
            onValueChange={(next) =>
              setProductForm((prev) => ({
                ...prev,
                productionLotSize: next === "" ? 0 : next,
              }))
            }
          />
          <FieldHint>材料使用量サマリで使用する1ロット当たりの個数。サイズ展開の合計値で自動更新されます。</FieldHint>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">初期在庫数</Label>
          <NumberInput
            placeholder="例: 20"
            value={initialStock}
            onValueChange={(next) => onInitialStockChange(next === "" ? 0 : next)}
          />
          <FieldHint>制作個数の値が初期反映されます。必要に応じて変更できます。</FieldHint>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">販売価格 (1個あたり)</Label>
        <NumberInput
          placeholder="例: 9500"
          value={productForm.salePrice}
          enableCommaSeparator
          onValueChange={(next) =>
            setProductForm((prev) => ({
              ...prev,
              salePrice: next === "" ? 0 : next,
            }))
          }
        />
        <FieldHint>商品一覧やシミュレーションで粗利を算出する基準価格。</FieldHint>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">使用する設備 (複数選択)</Label>
        <div className="flex flex-wrap gap-2 rounded-md border p-2">
          {data.equipments.map((equipment) => (
            <label key={equipment.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={productForm.equipmentIds.includes(equipment.id)}
                onChange={(event) => handleToggleEquipment(equipment.id, event.target.checked)}
              />
              {equipment.name}
            </label>
          ))}
          {!data.equipments.length && (
            <p className="text-xs text-muted-foreground">設備マスタを登録すると選択できます。</p>
          )}
        </div>
      </div>
    </div>
  )
}
