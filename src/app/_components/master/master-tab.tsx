"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AppActions } from "@/lib/app-data"
import { formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"
import { CategoryListSection, CategorySection } from "./sections/category"
import { EquipmentListSection, EquipmentSimulationSection } from "./sections/equipment"
import { LaborEquipmentSection, LaborListSection } from "./sections/labor"
import { MaterialListSection, MaterialSection } from "./sections/material"
import { OptionPresetListSection, OptionPresetSection } from "./sections/option-preset"
import { PackagingListSection, PackagingSection } from "./sections/packaging"
import { ShippingListSection, ShippingSection } from "./sections/shipping"

type MasterOverviewType =
  | "materials"
  | "packaging"
  | "labor"
  | "equipment"
  | "shipping"
  | "optionPresets"
  | "categoryLarge"
  | "categoryMedium"
  | "categorySmall"

type MasterOverviewRow = {
  id: string
  name: string
  detail: string
  value?: number
  currency?: string
  searchText: string
}

const MASTER_OVERVIEW_TYPE_OPTIONS: { value: MasterOverviewType; label: string }[] = [
  { value: "materials", label: "材料" },
  { value: "packaging", label: "梱包材" },
  { value: "labor", label: "人件費" },
  { value: "equipment", label: "設備" },
  { value: "shipping", label: "配送方法" },
  { value: "optionPresets", label: "オプションプリセット" },
  { value: "categoryLarge", label: "カテゴリ (大)" },
  { value: "categoryMedium", label: "カテゴリ (中)" },
  { value: "categorySmall", label: "カテゴリ (小)" },
]

const MASTER_OVERVIEW_SORT_OPTIONS = [
  { value: "name-asc", label: "名称 (昇順)" },
  { value: "name-desc", label: "名称 (降順)" },
  { value: "value-desc", label: "基準値が高い順" },
  { value: "value-asc", label: "基準値が低い順" },
]

interface MasterTabProps {
  data: AppData
  actions: AppActions
}

function MasterRegisterView({ data, actions }: MasterTabProps) {
  const [masterOverviewType, setMasterOverviewType] = useState<MasterOverviewType>("materials")
  const [masterOverviewSearch, setMasterOverviewSearch] = useState("")
  const [masterOverviewSort, setMasterOverviewSort] = useState("name-asc")

  const masterOverviewRows = useMemo<MasterOverviewRow[]>(() => {
    const buildRows = (): MasterOverviewRow[] => {
      switch (masterOverviewType) {
        case "packaging":
          return data.packagingItems.map((item) => {
            const detailParts = [
              `${formatCurrency(item.unitCost, item.currency)} / ${item.unit}`,
              item.sizeDescription,
              item.note,
            ].filter(Boolean)
            return {
              id: item.id,
              name: item.name,
              detail: detailParts.join(" / ") || "-",
              value: item.unitCost,
              currency: item.currency,
              searchText: `${item.name} ${detailParts.join(" ")}`.toLowerCase(),
            }
          })
        case "labor":
          return data.laborRoles.map((role) => ({
            id: role.id,
            name: role.name,
            detail: `${formatCurrency(role.hourlyRate, role.currency)} / 時給${role.note ? ` / ${role.note}` : ""}`,
            value: role.hourlyRate,
            currency: role.currency,
            searchText: `${role.name} ${role.note ?? ""}`.toLowerCase(),
          }))
        case "equipment":
          return data.equipments.map((equipment) => {
            const detail = `${formatCurrency(equipment.acquisitionCost, equipment.currency)} / ${equipment.amortizationYears}年`
            return {
              id: equipment.id,
              name: equipment.name,
              detail: equipment.note ? `${detail} / ${equipment.note}` : detail,
              value: equipment.acquisitionCost,
              currency: equipment.currency,
              searchText: `${equipment.name} ${equipment.note ?? ""}`.toLowerCase(),
            }
          })
        case "shipping":
          return (data.shippingMethods ?? []).map((method) => ({
            id: method.id,
            name: method.name,
            detail: `${formatCurrency(method.unitCost, method.currency)}${method.description ? ` / ${method.description}` : ""}`,
            value: method.unitCost,
            currency: method.currency,
            searchText: `${method.name} ${method.description ?? ""}`.toLowerCase(),
          }))
        case "optionPresets":
          return (data.optionPresets ?? []).map((preset) => {
            const variantCount = preset.variants.length
            const totalQuantity = preset.variants.reduce((sum, variant) => sum + (Number(variant.quantity) || 0), 0)
            const detail = `${variantCount}種類 / 合計 ${totalQuantity} 個`
            return {
              id: preset.id,
              name: preset.name,
              detail,
              value: totalQuantity,
              searchText: `${preset.name} ${detail}`.toLowerCase(),
            }
          })
        case "categoryLarge":
          return data.categories.large.map((category) => ({
            id: category.id,
            name: category.name,
            detail: category.description || "-",
            searchText: `${category.name} ${category.description ?? ""}`.toLowerCase(),
          }))
        case "categoryMedium":
          return data.categories.medium.map((category) => {
            const parent = data.categories.large.find((c) => c.id === category.largeId)?.name ?? "-"
            const detail = `${parent} › ${category.description || category.name}`
            return {
              id: category.id,
              name: category.name,
              detail,
              searchText: `${category.name} ${detail}`.toLowerCase(),
            }
          })
        case "categorySmall":
          return data.categories.small.map((category) => {
            const parent = data.categories.medium.find((c) => c.id === category.mediumId)?.name ?? "-"
            const detail = `${parent} › ${category.description || category.name}`
            return {
              id: category.id,
              name: category.name,
              detail,
              searchText: `${category.name} ${detail}`.toLowerCase(),
            }
          })
        case "materials":
        default:
          return data.materials.map((material) => {
            const detailParts = [
              `${formatCurrency(material.unitCost, material.currency)} / ${material.unit}`,
              material.sizeDescription,
              material.supplier ? `仕入先: ${material.supplier}` : "",
            ].filter(Boolean)
            return {
              id: material.id,
              name: material.name,
              detail: detailParts.join(" / ") || "-",
              value: material.unitCost,
              currency: material.currency,
              searchText: `${material.name} ${detailParts.join(" ")}`.toLowerCase(),
            }
          })
      }
    }

    const rows = buildRows()
    const normalizedSearch = masterOverviewSearch.trim().toLowerCase()
    const filtered = normalizedSearch.length
      ? rows.filter((row) => row.searchText.includes(normalizedSearch))
      : rows
    const collator = new Intl.Collator("ja-JP")
    return filtered.sort((a, b) => {
      switch (masterOverviewSort) {
        case "name-desc":
          return collator.compare(b.name, a.name)
        case "value-asc":
          return (a.value ?? 0) - (b.value ?? 0)
        case "value-desc":
          return (b.value ?? 0) - (a.value ?? 0)
        case "name-asc":
        default:
          return collator.compare(a.name, b.name)
      }
    })
  }, [
    data.categories.large,
    data.categories.medium,
    data.categories.small,
    data.equipments,
    data.laborRoles,
    data.materials,
    data.optionPresets,
    data.packagingItems,
    data.shippingMethods,
    masterOverviewSearch,
    masterOverviewSort,
    masterOverviewType,
  ])

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <CategorySection data={data} actions={actions} />

        <MaterialSection data={data} actions={actions} />
      </div>

      <div className="space-y-6">
        <PackagingSection data={data} actions={actions} />

        <ShippingSection data={data} actions={actions} />

        <OptionPresetSection data={data} actions={actions} />
      </div>

      <LaborEquipmentSection data={data} actions={actions} />

      <EquipmentSimulationSection data={data} />

      <Card>
        <CardHeader>
          <CardTitle>マスタ一覧検索</CardTitle>
          <CardDescription>検索・フィルタ・ソートでマスタ登録を素早く参照</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
            <Input
              value={masterOverviewSearch}
              onChange={(event) => setMasterOverviewSearch(event.target.value)}
              placeholder="キーワードで検索 (名称・備考など)"
              className="w-full flex-1 min-w-[220px]"
            />
            <Select value={masterOverviewType} onValueChange={(value) => setMasterOverviewType(value as MasterOverviewType)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="種類を選択" />
              </SelectTrigger>
              <SelectContent>
                {MASTER_OVERVIEW_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={masterOverviewSort} onValueChange={setMasterOverviewSort}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="並び替え" />
              </SelectTrigger>
              <SelectContent>
                {MASTER_OVERVIEW_SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {masterOverviewRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">条件に一致するマスタはありません。</p>
          ) : (
            <div className="relative w-full max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
              <Table className="w-auto min-w-max">
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>詳細</TableHead>
                    <TableHead className="w-32 text-right">基準値</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {masterOverviewRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium whitespace-nowrap">{row.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.detail || "-"}</TableCell>
                      <TableCell className="w-32 whitespace-nowrap text-right">
                        {row.value !== undefined
                          ? row.currency
                            ? formatCurrency(row.value, row.currency)
                            : row.value.toLocaleString()
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function MasterTab({ data, actions }: MasterTabProps) {
  const [view, setView] = useState<"register" | "list">(() => {
    if (typeof window === "undefined") return "register"
    const stored = window.localStorage.getItem("cost-app-master-view")
    return stored === "list" ? "list" : "register"
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem("cost-app-master-view", view)
  }, [view])

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
  return (
    <div className="space-y-6">
      <CategoryListSection data={data} actions={actions} createTempId={createTempId} />

      <div className="space-y-6">
        <MaterialListSection data={data} actions={actions} createTempId={createTempId} />

        <PackagingListSection data={data} actions={actions} createTempId={createTempId} />
        <OptionPresetListSection data={data} actions={actions} createTempId={createTempId} />
      </div>

      <div className="space-y-6">
        <ShippingListSection data={data} actions={actions} createTempId={createTempId} />
        <LaborListSection data={data} actions={actions} createTempId={createTempId} />
        <EquipmentListSection data={data} actions={actions} createTempId={createTempId} />
      </div>
    </div>
  )
}
