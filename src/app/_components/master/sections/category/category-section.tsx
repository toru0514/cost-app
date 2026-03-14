"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { AppActions } from "@/lib/app-data"
import type { AppData, CategoryLarge, CategoryMedium, CategorySmall } from "@/lib/types"
import { FormSection, RegisteredList, type FormSectionOpenSignal } from "../../../shared/ui"

interface CategorySectionProps {
  data: AppData
  actions: AppActions
  openSignal?: FormSectionOpenSignal | null
  onOpen?: () => void
}

export function CategorySection({ data, actions, openSignal, onOpen }: CategorySectionProps) {
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

  const { addLargeCategory, addMediumCategory, addSmallCategory } = actions
  const largeOptions = data.categories.large

  return (
    <FormSection
      title="カテゴリマスタ"
      description="大・中・小カテゴリを事前登録し、商品登録時に選択できるようにします。"
      storageKey="master-section-categories"
      openSignal={openSignal}
      onOpen={onOpen}
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
          <div className="flex justify-end pt-2">
            <Button type="submit" size="sm">
              追加
            </Button>
          </div>
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
          <div className="flex justify-end pt-2">
            <Button type="submit" size="sm" disabled={!data.categories.large.length}>
              追加
            </Button>
          </div>
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
            <Select
              value={smallCategory.mediumId}
              onValueChange={(value) => setSmallCategory((prev) => ({ ...prev, mediumId: value }))}
            >
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
            <Label className="text-xs text-muted-foreground">概要 (任意)
            </Label>
            <Textarea
              placeholder="概要"
              value={smallCategory.description}
              onChange={(event) => setSmallCategory((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" size="sm" disabled={!data.categories.medium.length}>
              追加
            </Button>
          </div>
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
  )
}
