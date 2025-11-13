"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import type { AppActions } from "@/lib/app-data"
import { formatCurrency } from "@/lib/calculations"
import { currencyOptions } from "@/lib/constants"
import type {
  AppData,
  CategoryLarge,
  CategoryMedium,
  CategorySmall,
  Equipment,
  LaborRole,
  Material,
  Product,
  OptionPreset,
  PackagingItem,
  ProductSizeVariant,
  ShippingMethod,
} from "@/lib/types"
import { FieldHint, FormSection, RegisteredList } from "../shared/ui"

interface MasterTabProps {
  data: AppData
  actions: AppActions
}

function MasterRegisterView({ data, actions }: MasterTabProps) {
  const [largeCategory, setLargeCategory] = useState<Omit<CategoryLarge, "id">>({ name: "", description: "" })
  const [mediumCategory, setMediumCategory] = useState<Omit<CategoryMedium, "id">>({
    name: "",
    description: "",
    largeId: "",
  })
  const [smallCategory, setSmallCategory] = useState<Omit<CategorySmall, "id">>({
    name: "",
    description: "",
    mediumId: "",
  })

  const [materialForm, setMaterialForm] = useState<Omit<Material, "id">>({
    name: "",
    unit: "kg",
    sizeDescription: "",
    currency: "JPY",
    unitCost: 0,
    unitsPerBatch: 1,
    supplier: "",
    note: "",
  })

  const [packagingForm, setPackagingForm] = useState<Omit<PackagingItem, "id">>({
    name: "",
    unit: "set",
    sizeDescription: "",
    currency: "JPY",
    unitCost: 0,
    unitsPerBatch: 1,
    note: "",
  })

  const [laborForm, setLaborForm] = useState<Omit<LaborRole, "id">>({
    name: "",
    hourlyRate: 1800,
    currency: "JPY",
    note: "",
  })

  const [equipmentForm, setEquipmentForm] = useState<Omit<Equipment, "id">>({
    name: "",
    acquisitionCost: 0,
    currency: "JPY",
    amortizationYears: 5,
    note: "",
  })

  const [shippingMethodForm, setShippingMethodForm] = useState<Omit<ShippingMethod, "id">>({
    name: "",
    description: "",
    unitCost: 0,
    currency: "JPY",
    note: "",
  })

  const [optionPresetForm, setOptionPresetForm] = useState({
    name: "",
    variants: [{ label: "", quantity: 0 }],
  })
  const [simulationInputs, setSimulationInputs] = useState<
    Record<string, { quantity: number; salePrice: number; utilizationRatio: number }>
  >({})
  const integerFormatter = useMemo(() => new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }), [])
  const formatInteger = (value: number) => integerFormatter.format(Math.round(value))

  const addOptionPresetVariant = () => {
    setOptionPresetForm((prev) => ({
      ...prev,
      variants: [...prev.variants, { label: "", quantity: 0 }],
    }))
  }

  const updateOptionPresetVariant = (index: number, patch: Partial<{ label: string; quantity: number }>) => {
    setOptionPresetForm((prev) => ({
      ...prev,
      variants: prev.variants.map((variant, i) =>
        i === index ? { ...variant, ...patch } : variant
      ),
    }))
  }

  const removeOptionPresetVariant = (index: number) => {
    setOptionPresetForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }))
  }

  const equipmentSimulationData = useMemo(() => {
    return data.equipments.map((equipment) => {
      const allocations = data.costEntries.equipmentAllocations.filter((entry) => entry.equipmentId === equipment.id)
      const annualCost = equipment.acquisitionCost / Math.max(equipment.amortizationYears || 1, 1)
      const totalUsageHours = allocations.reduce((sum, entry) => sum + (entry.usageHours ?? 0), 0)
      const annualAllocation = allocations.reduce((sum, entry) => {
        const ratio =
          totalUsageHours > 0 && entry.usageHours !== undefined
            ? entry.usageHours / totalUsageHours
            : entry.allocationRatio
        return sum + annualCost * ratio
      }, allocations.length > 0 ? 0 : 0)
      const allocationsQuantity = allocations.reduce((sum, entry) => sum + (entry.annualQuantity || 0), 0)
      const relatedProducts = data.products.filter((product) => product.equipmentIds.includes(equipment.id))
      const fallbackAnnualQuantity = relatedProducts.reduce((sum, product) => {
        const years = Math.max(product.expectedProduction.periodYears || 1, 1)
        return sum + (product.expectedProduction.quantity || 0) / years
      }, 0)
      const currentAnnualQuantity = allocationsQuantity || fallbackAnnualQuantity
      const currentUnitCost = annualCost / Math.max(currentAnnualQuantity || 1, 1)
      const baseSalePriceAverage =
        relatedProducts.length > 0
          ? relatedProducts.reduce((sum, product) => sum + (product.salePrice || 0), 0) / relatedProducts.length
          : 10000

      return {
        equipment,
        annualCost,
        annualAllocation,
        currentAnnualQuantity,
        currentUnitCost,
        relatedProducts,
        baseSalePriceAverage,
      }
    })
  }, [data.costEntries.equipmentAllocations, data.equipments, data.products])

  const {
    addLargeCategory,
    addMediumCategory,
    addSmallCategory,
    addMaterial,
    addPackagingItem,
    addLaborRole,
    addEquipment,
    addShippingMethod,
    addOptionPreset,
  } = actions

  const largeOptions = data.categories.large

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <FormSection
          title="カテゴリマスタ"
          description="大・中・小カテゴリを事前登録し、商品登録時に選択できるようにします。"
          defaultOpen
        >
          <div className="space-y-4">
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault()
                if (!largeCategory.name.trim()) return
                addLargeCategory({ ...largeCategory })
                setLargeCategory({ name: "", description: "" })
              }}
            >
              <Label className="text-sm font-semibold">大カテゴリ</Label>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">名称</Label>
                <Input
                  placeholder="例: アパレル"
                  value={largeCategory.name}
                  onChange={(event) => setLargeCategory((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">概要 (任意)</Label>
                <Textarea
                  placeholder="概要"
                  value={largeCategory.description}
                  onChange={(event) => setLargeCategory((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
              <Button type="submit" size="sm">
                追加
              </Button>
            </form>

            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault()
                if (!mediumCategory.name.trim() || !mediumCategory.largeId) return
                addMediumCategory({ ...mediumCategory })
                setMediumCategory({ name: "", description: "", largeId: "" })
              }}
            >
              <Label className="text-sm font-semibold">中カテゴリ</Label>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">親カテゴリ</Label>
                <Select
                  value={mediumCategory.largeId}
                  onValueChange={(value) => setMediumCategory((prev) => ({ ...prev, largeId: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="親カテゴリ" />
                  </SelectTrigger>
                  <SelectContent>
                    {largeOptions.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">名称</Label>
                <Input
                  placeholder="例: トート"
                  value={mediumCategory.name}
                  onChange={(event) => setMediumCategory((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">概要 (任意)</Label>
                <Textarea
                  placeholder="概要"
                  value={mediumCategory.description}
                  onChange={(event) => setMediumCategory((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
              <Button type="submit" size="sm" disabled={!data.categories.large.length}>
                追加
              </Button>
            </form>

            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault()
                if (!smallCategory.name.trim() || !smallCategory.mediumId) return
                addSmallCategory({ ...smallCategory })
                setSmallCategory({ name: "", description: "", mediumId: "" })
              }}
            >
              <Label className="text-sm font-semibold">小カテゴリ</Label>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">親 (中カテゴリ)</Label>
                <Select value={smallCategory.mediumId} onValueChange={(value) => setSmallCategory((prev) => ({ ...prev, mediumId: value }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="親 (中カテゴリ)" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.categories.medium.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">名称</Label>
                <Input
                  placeholder="例: ミニトート"
                  value={smallCategory.name}
                  onChange={(event) => setSmallCategory((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">概要 (任意)</Label>
                <Textarea
                  placeholder="概要"
                  value={smallCategory.description}
                  onChange={(event) => setSmallCategory((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
              <Button type="submit" size="sm" disabled={!data.categories.medium.length}>
                追加
              </Button>
            </form>

            <RegisteredList
              title="登録済み 大カテゴリ"
              items={data.categories.large.map((category) => `${category.name}${category.description ? ` / ${category.description}` : ""}`)}
            />
            <RegisteredList
              title="登録済み 中カテゴリ"
              items={data.categories.medium.map((category) => {
                const parent = data.categories.large.find((c) => c.id === category.largeId)?.name ?? "-"
                return `${parent} › ${category.name}`
              })}
            />
            <RegisteredList
              title="登録済み 小カテゴリ"
              items={data.categories.small.map((category) => {
                const parent = data.categories.medium.find((c) => c.id === category.mediumId)?.name ?? "-"
                return `${parent} › ${category.name}`
              })}
            />
          </div>
        </FormSection>

        <FormSection
          title="材料マスタ"
          description="名称・単位・サイズ・仕入先まで登録し、材料コスト入力時に再利用します。"
        >
      <div className="space-y-2">
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault()
                if (!materialForm.name.trim()) return
                addMaterial({ ...materialForm })
                setMaterialForm({
                  name: "",
                  unit: "kg",
                  sizeDescription: "",
                  currency: "JPY",
                  unitCost: 0,
                  unitsPerBatch: 1,
                  supplier: "",
                  note: "",
                })
              }}
            >
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">材料名</Label>
                <Input
                  placeholder="例: キャンバス生地"
                  value={materialForm.name}
                  onChange={(event) => setMaterialForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">単位</Label>
                  <Input
                    placeholder="例: m"
                    value={materialForm.unit}
                    onChange={(event) => setMaterialForm((prev) => ({ ...prev, unit: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">通貨</Label>
                  <Select value={materialForm.currency} onValueChange={(value) => setMaterialForm((prev) => ({ ...prev, currency: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="通貨" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">セット数量（例: 100枚セットなら100）</Label>
                <NumberInput
                  placeholder="例: 100"
                  value={materialForm.unitsPerBatch ?? 1}
                  min={1}
                  onValueChange={(next) =>
                    setMaterialForm((prev) => ({ ...prev, unitsPerBatch: next === "" ? 1 : Number(next) }))
                  }
                />
                <FieldHint>仕入れ単位が1ロール=50mなどの場合の個数。1個売りなら1。</FieldHint>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">基準単価</Label>
                <NumberInput
                  placeholder="例: 320"
                  value={materialForm.unitCost}
                  onValueChange={(next) => setMaterialForm((prev) => ({ ...prev, unitCost: next === "" ? 0 : next }))}
                />
                <FieldHint>セット価格を入力。セット数量で割った値が商品登録時に使われます。</FieldHint>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">サイズ・容量</Label>
                <Input
                  placeholder="例: 50mロール"
                  value={materialForm.sizeDescription}
                  onChange={(event) => setMaterialForm((prev) => ({ ...prev, sizeDescription: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">仕入先</Label>
                <Input
                  placeholder="例: FabricMart"
                  value={materialForm.supplier}
                  onChange={(event) => setMaterialForm((prev) => ({ ...prev, supplier: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">備考</Label>
                <Textarea
                  placeholder="為替やメモ"
                  value={materialForm.note}
                  onChange={(event) => setMaterialForm((prev) => ({ ...prev, note: event.target.value }))}
                />
              </div>
              <Button type="submit" size="sm">
                追加
              </Button>
            </form>

            <RegisteredList
              title="登録済み 材料"
              items={data.materials.map((material) => {
                const supplier = material.supplier ? ` / ${material.supplier}` : ""
                const unitCostText = formatCurrency(material.unitCost, material.currency)
                const batchText = material.unitsPerBatch && material.unitsPerBatch > 1 ? `${material.unitsPerBatch}単位/セット` : "1単位/セット"
                return `${material.name} / ${unitCostText} / ${material.unit} / ${batchText} / ${material.sizeDescription}${supplier}`
              })}
            />
          </div>
        </FormSection>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FormSection
          title="梱包材マスタ"
          description="段ボールやフィルムなどを登録し、商品登録時に選べるようにします。"
        >
          <div className="space-y-2">
            <form
              className="grid gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                if (!packagingForm.name.trim()) return
                addPackagingItem({ ...packagingForm })
                setPackagingForm({
                  name: "",
                  unit: "set",
                  sizeDescription: "",
                  currency: "JPY",
                  unitCost: 0,
                  unitsPerBatch: 1,
                  note: "",
                })
              }}
            >
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">梱包材名</Label>
                <Input
                  placeholder="例: 段ボールS"
                  value={packagingForm.name}
                  onChange={(event) => setPackagingForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">単位</Label>
                  <Input
                    placeholder="例: 枚"
                    value={packagingForm.unit}
                    onChange={(event) => setPackagingForm((prev) => ({ ...prev, unit: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">通貨</Label>
                  <Select value={packagingForm.currency} onValueChange={(value) => setPackagingForm((prev) => ({ ...prev, currency: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="通貨" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">サイズ/仕様</Label>
                <Input
                  placeholder="例: 320x250x120"
                  value={packagingForm.sizeDescription}
                  onChange={(event) => setPackagingForm((prev) => ({ ...prev, sizeDescription: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">基準単価</Label>
                <NumberInput
                  placeholder="例: 80"
                  value={packagingForm.unitCost}
                  onValueChange={(next) => setPackagingForm((prev) => ({ ...prev, unitCost: next === "" ? 0 : next }))}
                />
                <FieldHint>梱包材を仕入れる際の単価。セット売りの場合は下の数量と合わせて設定。</FieldHint>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">備考</Label>
                <Textarea
                  placeholder="仕入先や材質"
                  value={packagingForm.note}
                  onChange={(event) => setPackagingForm((prev) => ({ ...prev, note: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">セット数量（例: 100枚セットなら100）</Label>
                <NumberInput
                  placeholder="例: 100"
                  value={packagingForm.unitsPerBatch ?? 1}
                  min={1}
                  onValueChange={(next) =>
                    setPackagingForm((prev) => ({ ...prev, unitsPerBatch: next === "" ? 1 : Number(next) }))
                  }
                />
                <FieldHint>仕入れ単位。100枚セットを登録する場合は100と入力。</FieldHint>
              </div>
              <Button type="submit" size="sm">
                追加
              </Button>
            </form>

            <RegisteredList
              title="登録済み 梱包材"
              items={data.packagingItems.map((item) => {
                const unitCostText = formatCurrency(item.unitCost, item.currency)
                const batchText = item.unitsPerBatch && item.unitsPerBatch > 1 ? `${item.unitsPerBatch}単位/セット` : "1単位/セット"
                return `${item.name} / ${unitCostText} / ${item.unit} / ${batchText} / ${item.sizeDescription}`
              })}
            />
          </div>
        </FormSection>

        <FormSection
          title="配送方法マスタ"
          description="宅配便・メール便などの配送手段と送料を登録します。"
        >
          <div className="space-y-2">
            <form
              className="grid gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                if (!shippingMethodForm.name.trim()) return
                addShippingMethod({ ...shippingMethodForm })
                setShippingMethodForm({
                  name: "",
                  description: "",
                  unitCost: 0,
                  currency: "JPY",
                  note: "",
                })
              }}
            >
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">配送方法名</Label>
                <Input
                  placeholder="例: 宅配便"
                  value={shippingMethodForm.name}
                  onChange={(event) => setShippingMethodForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">説明 (任意)</Label>
                <Input
                  placeholder="例: 100サイズ / 佐川"
                  value={shippingMethodForm.description}
                  onChange={(event) => setShippingMethodForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">基準単価</Label>
                  <NumberInput
                    placeholder="例: 180"
                    value={shippingMethodForm.unitCost}
                    onValueChange={(next) => setShippingMethodForm((prev) => ({ ...prev, unitCost: next === "" ? 0 : next }))}
                  />
                  <FieldHint>1件あたりの送料。クール便など追加料金を含める場合はここに入力。</FieldHint>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">通貨</Label>
                  <Select
                    value={shippingMethodForm.currency}
                    onValueChange={(value) => setShippingMethodForm((prev) => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="通貨" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">備考</Label>
                <Textarea
                  placeholder="例: 100サイズまで"
                  value={shippingMethodForm.note}
                  onChange={(event) => setShippingMethodForm((prev) => ({ ...prev, note: event.target.value }))}
                />
              </div>
              <Button type="submit" size="sm">
                追加
              </Button>
            </form>

            <RegisteredList
              title="登録済み 配送方法"
              items={(data.shippingMethods ?? []).map((method) => {
                const unitCostText = formatCurrency(method.unitCost, method.currency)
                return `${method.name} / ${unitCostText}${method.description ? ` / ${method.description}` : ""}`
              })}
            />
          </div>
        </FormSection>

        <FormSection
          title="オプションプリセット"
          description="S/M/L など定型セットを登録し、商品登録で一括インポートできます。"
        >
          <div className="space-y-3">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                const name = optionPresetForm.name.trim()
                const variants = optionPresetForm.variants
                  .map((variant) => ({
                    label: variant.label.trim(),
                    quantity: Number(variant.quantity) || 0,
                  }))
                  .filter((variant) => variant.label.length > 0)
                if (!name || variants.length === 0) return
                addOptionPreset({ name, variants })
                toast.success("オプションプリセットを追加しました", { description: `「${name}」を登録しました。` })
                setOptionPresetForm({ name: "", variants: [{ label: "", quantity: 0 }] })
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
                  <Button type="button" variant="outline" size="sm" onClick={addOptionPresetVariant}>
                    行を追加
                  </Button>
                </div>
                {optionPresetForm.variants.length === 0 ? (
                  <p className="text-xs text-muted-foreground">オプションを追加してください。</p>
                ) : (
                  <div className="space-y-2">
                    {optionPresetForm.variants.map((variant, index) => (
                      <div key={`preset-variant-${index}`} className="flex flex-wrap gap-2 rounded-md border p-3">
                        <div className="min-w-[140px] flex-1 space-y-1">
                          <Label className="text-xs text-muted-foreground">名称</Label>
                          <Input
                            placeholder="例: S"
                            value={variant.label}
                            onChange={(event) =>
                              updateOptionPresetVariant(index, { label: event.target.value })
                            }
                          />
                        </div>
                        <div className="w-32 min-w-[120px] space-y-1">
                          <Label className="text-xs text-muted-foreground">数量</Label>
                          <NumberInput
                            placeholder="例: 500"
                            value={variant.quantity}
                            onValueChange={(next) =>
                              updateOptionPresetVariant(index, { quantity: next === "" ? 0 : next })
                            }
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOptionPresetVariant(index)}
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
                const detail = preset.variants
                  .map((variant) => `${variant.label}(${variant.quantity})`)
                  .join(" / ") || "-"
                return `${preset.name}: ${detail}`
              })}
            />
          </div>
        </FormSection>
      </div>

      <FormSection
        title="人件費 / 設備マスタ"
        description="工数と時給、設備投資のベースをまとめて管理します。"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              if (!laborForm.name.trim()) return
              addLaborRole({ ...laborForm })
              setLaborForm({ name: "", hourlyRate: 1800, currency: "JPY", note: "" })
            }}
          >
            <Label className="text-sm font-semibold">人件費</Label>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">作業カテゴリ</Label>
              <Input
                placeholder="例: 裁断"
                value={laborForm.name}
                onChange={(event) => setLaborForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">時給</Label>
                <NumberInput
                  placeholder="例: 1800"
                  value={laborForm.hourlyRate}
                  onValueChange={(next) => setLaborForm((prev) => ({ ...prev, hourlyRate: next === "" ? 0 : next }))}
                />
                <FieldHint>1時間あたりの標準人件費。原価計算で材料/人数と掛け合わせます。</FieldHint>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">通貨</Label>
                <Select value={laborForm.currency} onValueChange={(value) => setLaborForm((prev) => ({ ...prev, currency: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="通貨" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">備考</Label>
              <Textarea
                placeholder="例: 外部スタッフ"
                value={laborForm.note}
                onChange={(event) => setLaborForm((prev) => ({ ...prev, note: event.target.value }))}
              />
            </div>
            <Button type="submit" size="sm">
              人件費を追加
            </Button>

            <RegisteredList
              title="登録済み 人件費"
              items={data.laborRoles.map((role) => `${role.name} / ${formatCurrency(role.hourlyRate, role.currency)} / ${role.note || "備考なし"}`)}
            />
          </form>

          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              if (!equipmentForm.name.trim()) return
              addEquipment({ ...equipmentForm })
              setEquipmentForm({ name: "", acquisitionCost: 0, currency: "JPY", amortizationYears: 5, note: "" })
            }}
          >
            <Label className="text-sm font-semibold">設備投資</Label>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">設備名</Label>
              <Input
                placeholder="例: 工業用ミシン"
                value={equipmentForm.name}
                onChange={(event) => setEquipmentForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">取得額</Label>
                <NumberInput
                  placeholder="例: 400000"
                  value={equipmentForm.acquisitionCost}
                  onValueChange={(next) => setEquipmentForm((prev) => ({ ...prev, acquisitionCost: next === "" ? 0 : next }))}
                />
                <FieldHint>設備購入（またはリース）にかかった初期費用。</FieldHint>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">償却年数</Label>
                <NumberInput
                  placeholder="例: 5"
                  value={equipmentForm.amortizationYears}
                  onValueChange={(next) =>
                    setEquipmentForm((prev) => ({ ...prev, amortizationYears: next === "" ? 0 : next }))
                  }
                />
                <FieldHint>設備コストを何年に分けて原価化するか。耐用年数の目安を入力。</FieldHint>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">通貨</Label>
              <Select value={equipmentForm.currency} onValueChange={(value) => setEquipmentForm((prev) => ({ ...prev, currency: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="通貨" />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">備考</Label>
              <Textarea
                placeholder="例: リース"
                value={equipmentForm.note}
                onChange={(event) => setEquipmentForm((prev) => ({ ...prev, note: event.target.value }))}
              />
            </div>
            <Button type="submit" size="sm">
              設備を追加
            </Button>

            <RegisteredList
              title="登録済み 設備"
              items={data.equipments.map((equipment) => `${equipment.name} / ${formatCurrency(equipment.acquisitionCost, equipment.currency)} / ${equipment.amortizationYears}年`)}
            />
          </form>
        </div>
      </FormSection>

      <FormSection
        title="設備導入シミュレーション"
        description="年間数量と販売価格を仮入力し、配賦単価と投資回収を比較します。"
      >
        <div className="space-y-4">
          {equipmentSimulationData.length === 0 ? (
            <p className="text-sm text-muted-foreground">設備が登録されると試算できます。</p>
          ) : (
            equipmentSimulationData.map((info) => {
              const {
                equipment,
                annualCost,
                annualAllocation,
                currentAnnualQuantity,
                currentUnitCost,
                relatedProducts,
                baseSalePriceAverage,
              } = info
              const defaultSimulation = {
                quantity: Math.max(Math.round(currentAnnualQuantity) || 1000, 1),
                salePrice: Math.max(Math.round(baseSalePriceAverage) || 10000, 1),
                utilizationRatio: 100,
              }
              const simulationValue = simulationInputs[equipment.id] ?? defaultSimulation
              const simQuantity = Math.max(simulationValue.quantity || 0, 0)
              const simSalePrice = Math.max(simulationValue.salePrice || 0, 0)
              const simUtilizationRatioRaw = simulationValue.utilizationRatio ?? 0
              const simUtilizationRatio = Math.min(Math.max(simUtilizationRatioRaw, 0), 100)
              const simUnitAllocation = annualCost / Math.max(simQuantity || 1, 1)
              const effectiveSalePrice = (simSalePrice * simUtilizationRatio) / 100
              const simAnnualMargin = (effectiveSalePrice - simUnitAllocation) * simQuantity
              const annualRecoveryRate = equipment.acquisitionCost > 0 ? (simAnnualMargin / equipment.acquisitionCost) * 100 : 0
              const paybackYears = simAnnualMargin > 0 ? equipment.acquisitionCost / simAnnualMargin : Infinity
              const paybackText = Number.isFinite(paybackYears) ? `${paybackYears.toFixed(1)}年` : "未達"
              const relatedProductNames = relatedProducts.length
                ? relatedProducts.map((product) => product.name).join(" / ")
                : "対象商品なし"

              const updateSimulationValue = (
                patch: Partial<{ quantity: number; salePrice: number; utilizationRatio: number }>
              ) => {
                setSimulationInputs((prev) => {
                  const current = prev[equipment.id] ?? defaultSimulation
                  const next = { ...current, ...patch }
                  return { ...prev, [equipment.id]: next }
                })
              }

              return (
                <div key={`simulation-${equipment.id}`} className="space-y-4 rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{equipment.name}</p>
                      <p className="text-xs text-muted-foreground">対象商品: {relatedProductNames}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>
                        取得額 {formatCurrency(equipment.acquisitionCost, equipment.currency)} / {equipment.amortizationYears}年償却
                      </p>
                      <p>年間償却額 {formatCurrency(annualCost, equipment.currency)}</p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1 rounded-md border p-3 text-sm">
                      <p className="font-semibold">現在の前提</p>
                      <p>年間数量: {currentAnnualQuantity ? `${formatInteger(currentAnnualQuantity)} 個` : "未設定"}</p>
                      <p>設備単価: {formatCurrency(currentUnitCost, equipment.currency)}</p>
                      <p>年間配賦額: {formatCurrency(annualAllocation, equipment.currency)}</p>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">シミュレーション年間数量</Label>
                        <NumberInput
                          value={simulationValue.quantity}
                          onValueChange={(next) =>
                            updateSimulationValue({ quantity: next === "" ? 0 : Number(next) })
                          }
                          min={0}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">1個あたり販売価格</Label>
                        <NumberInput
                          value={simulationValue.salePrice}
                          onValueChange={(next) =>
                            updateSimulationValue({ salePrice: next === "" ? 0 : Number(next) })
                          }
                          min={0}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">設備利用割合 (%)</Label>
                        <NumberInput
                          value={simulationValue.utilizationRatio}
                          onValueChange={(next) =>
                            updateSimulationValue({ utilizationRatio: next === "" ? 0 : Number(next) })
                          }
                          min={0}
                          max={100}
                        />
                      </div>
                    </div>
                    <div className="space-y-1 rounded-md border p-3 text-sm">
                      <p className="font-semibold">シミュレーション結果</p>
                      <p>設備単価: {formatCurrency(simUnitAllocation, equipment.currency)}</p>
                      <p>有効販売価格: {formatCurrency(effectiveSalePrice, equipment.currency)}</p>
                      <p>利用割合: {simUtilizationRatio.toFixed(1)}%</p>
                      <p>年間粗利: {formatCurrency(simAnnualMargin, equipment.currency)}</p>
                      <p>年間回収率: {simAnnualMargin > 0 && equipment.acquisitionCost > 0 ? `${annualRecoveryRate.toFixed(1)}%` : "-"}</p>
                      <p>回収見込み: {paybackText}</p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </FormSection>
    </div>
  )
}

export function MasterTab({ data, actions }: MasterTabProps) {
  const [view, setView] = useState<"register" | "list">("register")

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant={view === "register" ? "default" : "outline"}
          onClick={() => setView("register")}
        >
          マスタ登録
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "list" ? "default" : "outline"}
          onClick={() => setView("list")}
        >
          登録済みマスタ
        </Button>
      </div>

      {view === "register" ? (
        <MasterRegisterView data={data} actions={actions} />
      ) : (
        <MasterListView data={data} actions={actions} />
      )}
    </div>
  )
}

const createTempId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 11)

function MasterListView({ data, actions }: MasterTabProps) {
  const {
    addLargeCategory,
    updateLargeCategory,
    removeLargeCategory,
    addMediumCategory,
    updateMediumCategory,
    removeMediumCategory,
    addSmallCategory,
    updateSmallCategory,
    removeSmallCategory,
    addMaterial,
    updateMaterial,
    removeMaterial,
    addPackagingItem,
    updatePackagingItem,
    removePackagingItem,
    addShippingMethod,
    updateShippingMethod,
    removeShippingMethod,
    addLaborRole,
    updateLaborRole,
    removeLaborRole,
    addEquipment,
    updateEquipment,
    removeEquipment,
    addOptionPreset,
    updateOptionPreset,
    removeOptionPreset,
  } = actions

  const [editingLarge, setEditingLarge] = useState({ id: null as string | null, name: "", description: "" })
  const [editingMedium, setEditingMedium] = useState({
    id: null as string | null,
    name: "",
    description: "",
    largeId: "",
  })
  const [editingSmall, setEditingSmall] = useState({
    id: null as string | null,
    name: "",
    description: "",
    mediumId: "",
  })
  const [editingMaterial, setEditingMaterial] = useState<Omit<Material, "id"> & { id: string | null }>({
    id: null,
    name: "",
    unit: "kg",
    sizeDescription: "",
    currency: "JPY",
    unitCost: 0,
    unitsPerBatch: 1,
    supplier: "",
    note: "",
  })
  const [editingPackaging, setEditingPackaging] = useState<Omit<PackagingItem, "id"> & { id: string | null }>({
    id: null,
    name: "",
    unit: "set",
    sizeDescription: "",
    currency: "JPY",
    unitCost: 0,
    unitsPerBatch: 1,
    note: "",
  })
  const [editingShipping, setEditingShipping] = useState<Omit<ShippingMethod, "id"> & { id: string | null }>({
    id: null,
    name: "",
    description: "",
    unitCost: 0,
    currency: "JPY",
    note: "",
  })
  const [editingLabor, setEditingLabor] = useState<Omit<LaborRole, "id"> & { id: string | null }>({
    id: null,
    name: "",
    hourlyRate: 1800,
    currency: "JPY",
    note: "",
  })
  const [editingEquipment, setEditingEquipment] = useState<Omit<Equipment, "id"> & { id: string | null }>({
    id: null,
    name: "",
    acquisitionCost: 0,
    currency: "JPY",
    amortizationYears: 5,
    note: "",
  })
  const [editingOptionPreset, setEditingOptionPreset] = useState<{ id: string | null; name: string; variants: ProductSizeVariant[] }>({
    id: null,
    name: "",
    variants: [{ label: "", quantity: 0 }],
  })

  const resetLarge = () => setEditingLarge({ id: null, name: "", description: "" })
  const resetMedium = () => setEditingMedium({ id: null, name: "", description: "", largeId: "" })
  const resetSmall = () => setEditingSmall({ id: null, name: "", description: "", mediumId: "" })
  const resetMaterial = () =>
    setEditingMaterial({ id: null, name: "", unit: "kg", sizeDescription: "", currency: "JPY", unitCost: 0, unitsPerBatch: 1, supplier: "", note: "" })
  const resetPackaging = () =>
    setEditingPackaging({ id: null, name: "", unit: "set", sizeDescription: "", currency: "JPY", unitCost: 0, unitsPerBatch: 1, note: "" })
  const resetShipping = () => setEditingShipping({ id: null, name: "", description: "", unitCost: 0, currency: "JPY", note: "" })
  const resetLabor = () => setEditingLabor({ id: null, name: "", hourlyRate: 1800, currency: "JPY", note: "" })
  const resetEquipment = () =>
    setEditingEquipment({ id: null, name: "", acquisitionCost: 0, currency: "JPY", amortizationYears: 5, note: "" })
  const resetOptionPreset = () =>
    setEditingOptionPreset({ id: null, name: "", variants: [{ label: "", quantity: 0 }] })

  const addEditingOptionPresetVariant = () => {
    setEditingOptionPreset((prev) => ({
      ...prev,
      variants: [...prev.variants, { label: "", quantity: 0 }],
    }))
  }

  const updateEditingOptionPresetVariant = (index: number, patch: Partial<ProductSizeVariant>) => {
    setEditingOptionPreset((prev) => ({
      ...prev,
      variants: prev.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...patch } : variant
      ),
    }))
  }

  const removeEditingOptionPresetVariant = (index: number) => {
    setEditingOptionPreset((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, variantIndex) => variantIndex !== index),
    }))
  }

  const handleLargeSave = () => {
    if (!editingLarge.id) return
    const name = editingLarge.name.trim()
    if (!name) return
    updateLargeCategory({ id: editingLarge.id, name, description: editingLarge.description || undefined })
    toast.success("大カテゴリを更新しました", { description: `「${name}」を更新しました。` })
    resetLarge()
  }

  const handleLargeDelete = () => {
    if (!editingLarge.id) return
    const name = editingLarge.name.trim() || "大カテゴリ"
    removeLargeCategory(editingLarge.id)
    toast.success("大カテゴリを削除しました", { description: `「${name}」を削除しました。` })
    resetLarge()
  }

  const handleLargeCopy = (category: CategoryLarge) => {
    const newId = createTempId()
    const name = `${category.name} (コピー)`
    addLargeCategory({ id: newId, name, description: category.description })
    toast.success("大カテゴリをコピーしました", { description: `「${name}」を作成しました。` })
    setEditingLarge({ id: newId, name, description: category.description ?? "" })
  }

  const handleMediumSave = () => {
    if (!editingMedium.id || !editingMedium.largeId) return
    const name = editingMedium.name.trim()
    if (!name) return
    updateMediumCategory({
      id: editingMedium.id,
      name,
      description: editingMedium.description || undefined,
      largeId: editingMedium.largeId,
    })
    toast.success("中カテゴリを更新しました", { description: `「${name}」を更新しました。` })
    resetMedium()
  }

  const handleMediumDelete = () => {
    if (!editingMedium.id) return
    const name = editingMedium.name.trim() || "中カテゴリ"
    removeMediumCategory(editingMedium.id)
    toast.success("中カテゴリを削除しました", { description: `「${name}」を削除しました。` })
    resetMedium()
  }

  const handleMediumCopy = (category: CategoryMedium) => {
    const newId = createTempId()
    const name = `${category.name} (コピー)`
    addMediumCategory({ id: newId, name, description: category.description, largeId: category.largeId })
    toast.success("中カテゴリをコピーしました", { description: `「${name}」を作成しました。` })
    setEditingMedium({ id: newId, name, description: category.description ?? "", largeId: category.largeId })
  }

  const handleSmallSave = () => {
    if (!editingSmall.id || !editingSmall.mediumId) return
    const name = editingSmall.name.trim()
    if (!name) return
    updateSmallCategory({
      id: editingSmall.id,
      name,
      description: editingSmall.description || undefined,
      mediumId: editingSmall.mediumId,
    })
    toast.success("小カテゴリを更新しました", { description: `「${name}」を更新しました。` })
    resetSmall()
  }

  const handleSmallDelete = () => {
    if (!editingSmall.id) return
    const name = editingSmall.name.trim() || "小カテゴリ"
    removeSmallCategory(editingSmall.id)
    toast.success("小カテゴリを削除しました", { description: `「${name}」を削除しました。` })
    resetSmall()
  }

  const handleSmallCopy = (category: CategorySmall) => {
    const newId = createTempId()
    const name = `${category.name} (コピー)`
    addSmallCategory({ id: newId, name, description: category.description, mediumId: category.mediumId })
    toast.success("小カテゴリをコピーしました", { description: `「${name}」を作成しました。` })
    setEditingSmall({ id: newId, name, description: category.description ?? "", mediumId: category.mediumId })
  }

  const handleMaterialSave = () => {
    const { id, ...rest } = editingMaterial
    if (!id) return
    const name = editingMaterial.name.trim()
    if (!name) return
    updateMaterial({ id, ...rest, name })
    toast.success("材料を更新しました", {
      description: `${name} / ${formatCurrency(editingMaterial.unitCost, editingMaterial.currency)}`,
    })
    resetMaterial()
  }

  const handleMaterialDelete = () => {
    const { id } = editingMaterial
    if (!id) return
    const name = editingMaterial.name.trim() || "材料"
    removeMaterial(id)
    toast.success("材料を削除しました", { description: `「${name}」を削除しました。` })
    resetMaterial()
  }

  const handleMaterialCopy = (material: Material) => {
    const newId = createTempId()
    const name = `${material.name} (コピー)`
    addMaterial({
      id: newId,
      name,
      unit: material.unit,
      sizeDescription: material.sizeDescription,
      currency: material.currency,
      unitCost: material.unitCost,
      unitsPerBatch: material.unitsPerBatch,
      supplier: material.supplier,
      note: material.note,
    })
    toast.success("材料をコピーしました", { description: `「${name}」を作成しました。` })
    setEditingMaterial({
      id: newId,
      name,
      unit: material.unit,
      sizeDescription: material.sizeDescription,
      currency: material.currency,
      unitCost: material.unitCost,
      unitsPerBatch: material.unitsPerBatch ?? 1,
      supplier: material.supplier ?? "",
      note: material.note ?? "",
    })
  }

  const handlePackagingSave = () => {
    const { id, ...rest } = editingPackaging
    if (!id) return
    const name = editingPackaging.name.trim()
    if (!name) return
    updatePackagingItem({ id, ...rest, name })
    toast.success("梱包材を更新しました", {
      description: `${name} / ${formatCurrency(editingPackaging.unitCost, editingPackaging.currency)}`,
    })
    resetPackaging()
  }

  const handlePackagingDelete = () => {
    const { id } = editingPackaging
    if (!id) return
    const name = editingPackaging.name.trim() || "梱包材"
    removePackagingItem(id)
    toast.success("梱包材を削除しました", { description: `「${name}」を削除しました。` })
    resetPackaging()
  }

  const handlePackagingCopy = (item: PackagingItem) => {
    const newId = createTempId()
    const name = `${item.name} (コピー)`
    addPackagingItem({
      id: newId,
      name,
      unit: item.unit,
      sizeDescription: item.sizeDescription,
      currency: item.currency,
      unitCost: item.unitCost,
      unitsPerBatch: item.unitsPerBatch,
      note: item.note,
    })
    toast.success("梱包材をコピーしました", { description: `「${name}」を作成しました。` })
    setEditingPackaging({
      id: newId,
      name,
      unit: item.unit,
      sizeDescription: item.sizeDescription,
      currency: item.currency,
      unitCost: item.unitCost,
      unitsPerBatch: item.unitsPerBatch ?? 1,
      note: item.note ?? "",
    })
  }

  const handleShippingSave = () => {
    const { id, ...rest } = editingShipping
    if (!id) return
    const name = editingShipping.name.trim()
    if (!name) return
    updateShippingMethod({ id, ...rest, name })
    toast.success("配送方法を更新しました", {
      description: `${name} / ${formatCurrency(editingShipping.unitCost, editingShipping.currency)}`,
    })
    resetShipping()
  }

  const handleShippingDelete = () => {
    const { id } = editingShipping
    if (!id) return
    const name = editingShipping.name.trim() || "配送方法"
    removeShippingMethod(id)
    toast.success("配送方法を削除しました", { description: `「${name}」を削除しました。` })
    resetShipping()
  }

  const handleShippingCopy = (method: ShippingMethod) => {
    const newId = createTempId()
    const name = `${method.name} (コピー)`
    addShippingMethod({
      id: newId,
      name,
      description: method.description,
      unitCost: method.unitCost,
      currency: method.currency,
      note: method.note,
    })
    toast.success("配送方法をコピーしました", { description: `「${name}」を作成しました。` })
    setEditingShipping({
      id: newId,
      name,
      description: method.description ?? "",
      unitCost: method.unitCost,
      currency: method.currency,
      note: method.note ?? "",
    })
  }

  const handleLaborSave = () => {
    const { id, ...rest } = editingLabor
    if (!id) return
    const name = editingLabor.name.trim()
    if (!name) return
    updateLaborRole({ id, ...rest, name })
    toast.success("人件費レートを更新しました", {
      description: `${name} / ${formatCurrency(editingLabor.hourlyRate, editingLabor.currency)}`,
    })
    resetLabor()
  }

  const handleLaborDelete = () => {
    const { id } = editingLabor
    if (!id) return
    const name = editingLabor.name.trim() || "人件費"
    removeLaborRole(id)
    toast.success("人件費レートを削除しました", { description: `「${name}」を削除しました。` })
    resetLabor()
  }

  const handleLaborCopy = (role: LaborRole) => {
    const newId = createTempId()
    const name = `${role.name} (コピー)`
    addLaborRole({ id: newId, name, hourlyRate: role.hourlyRate, currency: role.currency, note: role.note })
    toast.success("人件費レートをコピーしました", { description: `「${name}」を作成しました。` })
    setEditingLabor({ id: newId, name, hourlyRate: role.hourlyRate, currency: role.currency, note: role.note ?? "" })
  }

  const handleEquipmentSave = () => {
    const { id, ...rest } = editingEquipment
    if (!id) return
    const name = editingEquipment.name.trim()
    if (!name) return
    updateEquipment({ id, ...rest, name })
    toast.success("設備を更新しました", {
      description: `${name} / ${formatCurrency(editingEquipment.acquisitionCost, editingEquipment.currency)}`,
    })
    resetEquipment()
  }

  const handleEquipmentDelete = () => {
    const { id } = editingEquipment
    if (!id) return
    const name = editingEquipment.name.trim() || "設備"
    removeEquipment(id)
    toast.success("設備を削除しました", { description: `「${name}」を削除しました。` })
    resetEquipment()
  }

  const handleEquipmentCopy = (equipment: Equipment) => {
    const newId = createTempId()
    const name = `${equipment.name} (コピー)`
    addEquipment({
      id: newId,
      name,
      acquisitionCost: equipment.acquisitionCost,
      currency: equipment.currency,
      amortizationYears: equipment.amortizationYears,
      note: equipment.note,
    })
    toast.success("設備をコピーしました", { description: `「${name}」を作成しました。` })
    setEditingEquipment({
      id: newId,
      name,
      acquisitionCost: equipment.acquisitionCost,
      currency: equipment.currency,
      amortizationYears: equipment.amortizationYears,
      note: equipment.note ?? "",
    })
  }

  const handleOptionPresetSave = () => {
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

  const handleOptionPresetDelete = () => {
    const { id } = editingOptionPreset
    if (!id) return
    const name = editingOptionPreset.name.trim() || "プリセット"
    removeOptionPreset(id)
    toast.success("オプションプリセットを削除しました", { description: `「${name}」を削除しました。` })
    resetOptionPreset()
  }

  const handleOptionPresetCopy = (preset: OptionPreset) => {
    const newId = createTempId()
    const name = `${preset.name} (コピー)`
    addOptionPreset({ id: newId, name, variants: preset.variants })
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

  const renderActionButtons = (onSave: () => void, onCancel: () => void, onDelete?: () => void) => (
    <div className="flex gap-2">
      <Button type="button" size="sm" onClick={onSave}>
        保存
      </Button>
      {onDelete && (
        <Button type="button" size="sm" variant="destructive" onClick={onDelete}>
          削除
        </Button>
      )}
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        キャンセル
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>カテゴリ一覧</CardTitle>
          <CardDescription>既存カテゴリをその場で編集できます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="mb-2 font-semibold">大カテゴリ</p>
            {data.categories.large.length === 0 ? (
              <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>概要</TableHead>
                    <TableHead className="w-36 text-right"><span className="sr-only">操作</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.categories.large.map((category) => {
                    const isEditing = editingLarge.id === category.id
                    return (
                      <TableRow key={category.id}>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingLarge.name}
                              onChange={(event) => setEditingLarge((prev) => ({ ...prev, name: event.target.value }))}
                            />
                          ) : (
                            category.name
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Textarea
                              value={editingLarge.description}
                              onChange={(event) => setEditingLarge((prev) => ({ ...prev, description: event.target.value }))}
                            />
                          ) : (
                            category.description || "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            renderActionButtons(handleLargeSave, resetLarge, handleLargeDelete)
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button type="button" size="sm" variant="outline" onClick={() => setEditingLarge({ id: category.id, name: category.name, description: category.description ?? "" })}>
                                編集
                              </Button>
                              <Button type="button" size="sm" variant="secondary" onClick={() => handleLargeCopy(category)}>
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
            )}
          </div>

          <div>
            <p className="mb-2 font-semibold">中カテゴリ</p>
            {data.categories.medium.length === 0 ? (
              <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>親カテゴリ</TableHead>
                    <TableHead>概要</TableHead>
                    <TableHead className="w-36 text-right"><span className="sr-only">操作</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.categories.medium.map((category) => {
                    const isEditing = editingMedium.id === category.id
                    const parentName = data.categories.large.find((c) => c.id === category.largeId)?.name ?? "-"
                    return (
                      <TableRow key={category.id}>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingMedium.name}
                              onChange={(event) => setEditingMedium((prev) => ({ ...prev, name: event.target.value }))}
                            />
                          ) : (
                            category.name
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Select
                              value={editingMedium.largeId}
                              onValueChange={(value) => setEditingMedium((prev) => ({ ...prev, largeId: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="親カテゴリ" />
                              </SelectTrigger>
                              <SelectContent>
                                {data.categories.large.map((large) => (
                                  <SelectItem key={large.id} value={large.id}>
                                    {large.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            parentName
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Textarea
                              value={editingMedium.description}
                              onChange={(event) => setEditingMedium((prev) => ({ ...prev, description: event.target.value }))}
                            />
                          ) : (
                            category.description || "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            renderActionButtons(handleMediumSave, resetMedium, handleMediumDelete)
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setEditingMedium({
                                    id: category.id,
                                    name: category.name,
                                    description: category.description ?? "",
                                    largeId: category.largeId,
                                  })
                                }
                              >
                                編集
                              </Button>
                              <Button type="button" size="sm" variant="secondary" onClick={() => handleMediumCopy(category)}>
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
            )}
          </div>

          <div>
            <p className="mb-2 font-semibold">小カテゴリ</p>
            {data.categories.small.length === 0 ? (
              <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>親カテゴリ</TableHead>
                    <TableHead>概要</TableHead>
                    <TableHead className="w-36 text-right"><span className="sr-only">操作</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.categories.small.map((category) => {
                    const isEditing = editingSmall.id === category.id
                    const parent = data.categories.medium.find((c) => c.id === category.mediumId)?.name ?? "-"
                    return (
                      <TableRow key={category.id}>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingSmall.name}
                              onChange={(event) => setEditingSmall((prev) => ({ ...prev, name: event.target.value }))}
                            />
                          ) : (
                            category.name
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Select
                              value={editingSmall.mediumId}
                              onValueChange={(value) => setEditingSmall((prev) => ({ ...prev, mediumId: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="親カテゴリ" />
                              </SelectTrigger>
                              <SelectContent>
                                {data.categories.medium.map((medium) => (
                                  <SelectItem key={medium.id} value={medium.id}>
                                    {medium.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            parent
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Textarea
                              value={editingSmall.description}
                              onChange={(event) => setEditingSmall((prev) => ({ ...prev, description: event.target.value }))}
                            />
                          ) : (
                            category.description || "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            renderActionButtons(handleSmallSave, resetSmall, handleSmallDelete)
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setEditingSmall({
                                    id: category.id,
                                    name: category.name,
                                    description: category.description ?? "",
                                    mediumId: category.mediumId,
                                  })
                                }
                              >
                                編集
                              </Button>
                              <Button type="button" size="sm" variant="secondary" onClick={() => handleSmallCopy(category)}>
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
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>材料一覧</CardTitle>
          </CardHeader>
          <CardContent>
            {data.materials.length === 0 ? (
              <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>単位</TableHead>
                    <TableHead>単価</TableHead>
                    <TableHead>セット数</TableHead>
                    <TableHead>仕入先</TableHead>
                    <TableHead>備考</TableHead>
                    <TableHead className="w-48 text-right"><span className="sr-only">操作</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.materials.map((material) => {
                    const isEditing = editingMaterial.id === material.id
                    return (
                      <TableRow key={material.id}>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingMaterial.name}
                              onChange={(event) => setEditingMaterial((prev) => ({ ...prev, name: event.target.value }))}
                            />
                          ) : (
                            material.name
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingMaterial.unit}
                              onChange={(event) => setEditingMaterial((prev) => ({ ...prev, unit: event.target.value }))}
                            />
                          ) : (
                            material.unit
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex gap-2">
                              <NumberInput
                                value={editingMaterial.unitCost}
                                onValueChange={(next) => setEditingMaterial((prev) => ({ ...prev, unitCost: next === "" ? 0 : next }))}
                              />
                              <Select
                                value={editingMaterial.currency}
                                onValueChange={(value) => setEditingMaterial((prev) => ({ ...prev, currency: value }))}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue placeholder="通貨" />
                                </SelectTrigger>
                                <SelectContent>
                                  {currencyOptions.map((currency) => (
                                    <SelectItem key={currency} value={currency}>
                                      {currency}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            formatCurrency(material.unitCost, material.currency)
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <NumberInput
                              value={editingMaterial.unitsPerBatch ?? 1}
                              min={1}
                              onValueChange={(next) =>
                                setEditingMaterial((prev) => ({ ...prev, unitsPerBatch: next === "" ? 1 : Number(next) }))
                              }
                            />
                          ) : (
                            material.unitsPerBatch && material.unitsPerBatch > 0 ? `${material.unitsPerBatch}` : "1"
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingMaterial.supplier}
                              onChange={(event) => setEditingMaterial((prev) => ({ ...prev, supplier: event.target.value }))}
                            />
                          ) : (
                            material.supplier || "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Textarea
                              value={editingMaterial.note}
                              onChange={(event) => setEditingMaterial((prev) => ({ ...prev, note: event.target.value }))}
                            />
                          ) : (
                            material.note || "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            renderActionButtons(handleMaterialSave, resetMaterial, handleMaterialDelete)
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setEditingMaterial({
                                    id: material.id,
                                    name: material.name,
                                    unit: material.unit,
                                    sizeDescription: material.sizeDescription,
                                    currency: material.currency,
                                    unitCost: material.unitCost,
                                    unitsPerBatch: material.unitsPerBatch ?? 1,
                                    supplier: material.supplier ?? "",
                                    note: material.note ?? "",
                                  })
                                }
                              >
                                編集
                              </Button>
                              <Button type="button" size="sm" variant="secondary" onClick={() => handleMaterialCopy(material)}>
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>梱包材一覧</CardTitle>
          </CardHeader>
          <CardContent>
            {data.packagingItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>単位</TableHead>
                    <TableHead>単価</TableHead>
                    <TableHead>セット数</TableHead>
                    <TableHead>仕様</TableHead>
                    <TableHead>備考</TableHead>
                    <TableHead className="w-48 text-right"><span className="sr-only">操作</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.packagingItems.map((item) => {
                    const isEditing = editingPackaging.id === item.id
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingPackaging.name}
                              onChange={(event) => setEditingPackaging((prev) => ({ ...prev, name: event.target.value }))}
                            />
                          ) : (
                            item.name
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingPackaging.unit}
                              onChange={(event) => setEditingPackaging((prev) => ({ ...prev, unit: event.target.value }))}
                            />
                          ) : (
                            item.unit
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex gap-2">
                              <NumberInput
                                value={editingPackaging.unitCost}
                                onValueChange={(next) => setEditingPackaging((prev) => ({ ...prev, unitCost: next === "" ? 0 : next }))}
                              />
                              <Select
                                value={editingPackaging.currency}
                                onValueChange={(value) => setEditingPackaging((prev) => ({ ...prev, currency: value }))}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue placeholder="通貨" />
                                </SelectTrigger>
                                <SelectContent>
                                  {currencyOptions.map((currency) => (
                                    <SelectItem key={currency} value={currency}>
                                      {currency}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            formatCurrency(item.unitCost, item.currency)
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <NumberInput
                              value={editingPackaging.unitsPerBatch ?? 1}
                              min={1}
                              onValueChange={(next) =>
                                setEditingPackaging((prev) => ({ ...prev, unitsPerBatch: next === "" ? 1 : Number(next) }))
                              }
                            />
                          ) : (
                            item.unitsPerBatch && item.unitsPerBatch > 0 ? `${item.unitsPerBatch}` : "1"
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingPackaging.sizeDescription}
                              onChange={(event) => setEditingPackaging((prev) => ({ ...prev, sizeDescription: event.target.value }))}
                            />
                          ) : (
                            item.sizeDescription || "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Textarea
                              value={editingPackaging.note}
                              onChange={(event) => setEditingPackaging((prev) => ({ ...prev, note: event.target.value }))}
                            />
                          ) : (
                            item.note || "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            renderActionButtons(handlePackagingSave, resetPackaging, handlePackagingDelete)
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setEditingPackaging({
                                    id: item.id,
                                    name: item.name,
                                    unit: item.unit,
                                    sizeDescription: item.sizeDescription,
                                    currency: item.currency,
                                    unitCost: item.unitCost,
                                    unitsPerBatch: item.unitsPerBatch ?? 1,
                                    note: item.note ?? "",
                                  })
                                }
                              >
                                編集
                              </Button>
                              <Button type="button" size="sm" variant="secondary" onClick={() => handlePackagingCopy(item)}>
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>オプションプリセット一覧</CardTitle>
            <CardDescription>登録済みプリセットの名称や内容を編集できます。</CardDescription>
          </CardHeader>
          <CardContent>
            {(data.optionPresets ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>内容</TableHead>
                    <TableHead className="w-40 text-right"><span className="sr-only">操作</span></TableHead>
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
                                    onChange={(event) =>
                                      updateEditingOptionPresetVariant(index, { label: event.target.value })
                                    }
                                  />
                                  <NumberInput
                                    value={variant.quantity}
                                    onValueChange={(next) =>
                                      updateEditingOptionPresetVariant(index, {
                                        quantity: next === "" ? 0 : next,
                                      })
                                    }
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeEditingOptionPresetVariant(index)}
                                    disabled={editingOptionPreset.variants.length === 1}
                                  >
                                    削除
                                  </Button>
                                </div>
                              ))}
                              <Button type="button" variant="outline" size="sm" onClick={addEditingOptionPresetVariant}>
                                行を追加
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">{detailText}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            renderActionButtons(handleOptionPresetSave, resetOptionPreset, handleOptionPresetDelete)
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
                                        ? preset.variants.map((variant) => ({
                                            label: variant.label,
                                            quantity: variant.quantity,
                                          }))
                                        : [{ label: "", quantity: 0 }],
                                  })
                                }
                              >
                                編集
                              </Button>
                              <Button type="button" size="sm" variant="secondary" onClick={() => handleOptionPresetCopy(preset)}>
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
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>配送方法一覧</CardTitle>
          </CardHeader>
          <CardContent>
            {(data.shippingMethods ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>説明</TableHead>
                    <TableHead>単価</TableHead>
                    <TableHead>備考</TableHead>
                    <TableHead className="w-36 text-right"><span className="sr-only">操作</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.shippingMethods ?? []).map((method) => {
                    const isEditing = editingShipping.id === method.id
                    return (
                      <TableRow key={method.id}>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingShipping.name}
                              onChange={(event) => setEditingShipping((prev) => ({ ...prev, name: event.target.value }))}
                            />
                          ) : (
                            method.name
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingShipping.description ?? ""}
                              onChange={(event) => setEditingShipping((prev) => ({ ...prev, description: event.target.value }))}
                            />
                          ) : (
                            method.description || "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex gap-2">
                              <NumberInput
                                value={editingShipping.unitCost}
                                onValueChange={(next) => setEditingShipping((prev) => ({ ...prev, unitCost: next === "" ? 0 : next }))}
                              />
                              <Select
                                value={editingShipping.currency}
                                onValueChange={(value) => setEditingShipping((prev) => ({ ...prev, currency: value }))}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue placeholder="通貨" />
                                </SelectTrigger>
                                <SelectContent>
                                  {currencyOptions.map((currency) => (
                                    <SelectItem key={currency} value={currency}>
                                      {currency}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            formatCurrency(method.unitCost, method.currency)
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Textarea
                              value={editingShipping.note ?? ""}
                              onChange={(event) => setEditingShipping((prev) => ({ ...prev, note: event.target.value }))}
                            />
                          ) : (
                            method.note || "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            renderActionButtons(handleShippingSave, resetShipping, handleShippingDelete)
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setEditingShipping({
                                    id: method.id,
                                    name: method.name,
                                    description: method.description ?? "",
                                    unitCost: method.unitCost,
                                    currency: method.currency,
                                    note: method.note ?? "",
                                  })
                                }
                              >
                                編集
                              </Button>
                              <Button type="button" size="sm" variant="secondary" onClick={() => handleShippingCopy(method)}>
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>人件費一覧</CardTitle>
          </CardHeader>
          <CardContent>
            {data.laborRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>作業カテゴリ</TableHead>
                    <TableHead>時給</TableHead>
                    <TableHead>備考</TableHead>
                    <TableHead className="w-36 text-right"><span className="sr-only">操作</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.laborRoles.map((role) => {
                    const isEditing = editingLabor.id === role.id
                    return (
                      <TableRow key={role.id}>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingLabor.name}
                              onChange={(event) => setEditingLabor((prev) => ({ ...prev, name: event.target.value }))}
                            />
                          ) : (
                            role.name
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex gap-2">
                              <NumberInput
                                value={editingLabor.hourlyRate}
                                onValueChange={(next) => setEditingLabor((prev) => ({ ...prev, hourlyRate: next === "" ? 0 : next }))}
                              />
                              <Select
                                value={editingLabor.currency}
                                onValueChange={(value) => setEditingLabor((prev) => ({ ...prev, currency: value }))}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue placeholder="通貨" />
                                </SelectTrigger>
                                <SelectContent>
                                  {currencyOptions.map((currency) => (
                                    <SelectItem key={currency} value={currency}>
                                      {currency}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            formatCurrency(role.hourlyRate, role.currency)
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Textarea
                              value={editingLabor.note ?? ""}
                              onChange={(event) => setEditingLabor((prev) => ({ ...prev, note: event.target.value }))}
                            />
                          ) : (
                            role.note || "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            renderActionButtons(handleLaborSave, resetLabor, handleLaborDelete)
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setEditingLabor({
                                    id: role.id,
                                    name: role.name,
                                    hourlyRate: role.hourlyRate,
                                    currency: role.currency,
                                    note: role.note ?? "",
                                  })
                                }
                              >
                                編集
                              </Button>
                              <Button type="button" size="sm" variant="secondary" onClick={() => handleLaborCopy(role)}>
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
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>設備一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {data.equipments.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>取得額</TableHead>
                  <TableHead>償却年数</TableHead>
                  <TableHead>備考</TableHead>
                  <TableHead className="w-36 text-right"><span className="sr-only">操作</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.equipments.map((equipment) => {
                  const isEditing = editingEquipment.id === equipment.id
                  return (
                    <TableRow key={equipment.id}>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingEquipment.name}
                            onChange={(event) => setEditingEquipment((prev) => ({ ...prev, name: event.target.value }))}
                          />
                        ) : (
                          equipment.name
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <NumberInput
                              value={editingEquipment.acquisitionCost}
                              onValueChange={(next) =>
                                setEditingEquipment((prev) => ({ ...prev, acquisitionCost: next === "" ? 0 : next }))
                              }
                            />
                            <Select
                              value={editingEquipment.currency}
                              onValueChange={(value) => setEditingEquipment((prev) => ({ ...prev, currency: value }))}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue placeholder="通貨" />
                              </SelectTrigger>
                              <SelectContent>
                                {currencyOptions.map((currency) => (
                                  <SelectItem key={currency} value={currency}>
                                    {currency}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          formatCurrency(equipment.acquisitionCost, equipment.currency)
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <NumberInput
                            value={editingEquipment.amortizationYears}
                            onValueChange={(next) =>
                              setEditingEquipment((prev) => ({ ...prev, amortizationYears: next === "" ? 0 : next }))
                            }
                          />
                        ) : (
                          `${equipment.amortizationYears}年`
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Textarea
                            value={editingEquipment.note ?? ""}
                            onChange={(event) => setEditingEquipment((prev) => ({ ...prev, note: event.target.value }))}
                          />
                        ) : (
                          equipment.note || "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          renderActionButtons(handleEquipmentSave, resetEquipment, handleEquipmentDelete)
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setEditingEquipment({
                                  id: equipment.id,
                                  name: equipment.name,
                                  acquisitionCost: equipment.acquisitionCost,
                                  currency: equipment.currency,
                                  amortizationYears: equipment.amortizationYears,
                                  note: equipment.note ?? "",
                                })
                              }
                            >
                              編集
                            </Button>
                            <Button type="button" size="sm" variant="secondary" onClick={() => handleEquipmentCopy(equipment)}>
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
