"use client"

import { useMemo, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination } from "@/components/ui/table-pagination"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

export type MasterOverviewType =
  | "materials"
  | "packaging"
  | "labor"
  | "equipment"
  | "fees"
  | "shipping"
  | "optionPresets"
  | "categoryLarge"
  | "categoryMedium"
  | "categorySmall"

export type MasterOverviewRow = {
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
  { value: "fees", label: "手数料" },
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

interface MasterOverviewSectionProps {
  data: AppData
}

export function MasterOverviewSection({ data }: MasterOverviewSectionProps) {
  const [masterOverviewType, setMasterOverviewType] = useState<MasterOverviewType>("materials")
  const [masterOverviewSearch, setMasterOverviewSearch] = useState("")
  const [masterOverviewSort, setMasterOverviewSort] = useState("name-asc")

  const overviewBuilders: Record<MasterOverviewType, (appData: AppData) => MasterOverviewRow[]> = useMemo(
    () => ({
      materials: (appData) =>
        appData.materials.map((material) => {
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
        }),
      packaging: (appData) =>
        appData.packagingItems.map((item) => {
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
        }),
      labor: (appData) =>
        appData.laborRoles.map((role) => ({
          id: role.id,
          name: role.name,
          detail: `${formatCurrency(role.hourlyRate, role.currency)} / 時給${role.note ? ` / ${role.note}` : ""}`,
          value: role.hourlyRate,
          currency: role.currency,
          searchText: `${role.name} ${role.note ?? ""}`.toLowerCase(),
        })),
      equipment: (appData) =>
        appData.equipments.map((equipment) => {
          const utilizationRate = equipment.utilizationRate ?? 100
          const detail = `${formatCurrency(equipment.acquisitionCost, equipment.currency)} / ${equipment.amortizationYears}年 / 利用率${utilizationRate}%`
          return {
            id: equipment.id,
            name: equipment.name,
            detail: equipment.note ? `${detail} / ${equipment.note}` : detail,
            value: equipment.acquisitionCost,
            currency: equipment.currency,
            searchText: `${equipment.name} ${equipment.note ?? ""}`.toLowerCase(),
          }
        }),
      fees: (appData) =>
        appData.fees.map((fee) => {
          const detail = `${fee.ratePercent}% + ${formatCurrency(fee.fixedAmount, fee.currency)}`
          return {
            id: fee.id,
            name: fee.name,
            detail: fee.note ? `${detail} / ${fee.note}` : detail,
            value: fee.fixedAmount + fee.ratePercent,
            currency: fee.currency,
            searchText: `${fee.name} ${fee.note ?? ""}`.toLowerCase(),
          }
        }),
      shipping: (appData) =>
        (appData.shippingMethods ?? []).map((method) => ({
          id: method.id,
          name: method.name,
          detail: `${formatCurrency(method.unitCost, method.currency)}${method.description ? ` / ${method.description}` : ""}`,
          value: method.unitCost,
          currency: method.currency,
          searchText: `${method.name} ${method.description ?? ""}`.toLowerCase(),
        })),
      optionPresets: (appData) =>
        (appData.optionPresets ?? []).map((preset) => {
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
        }),
      categoryLarge: (appData) =>
        appData.categories.large.map((category) => ({
          id: category.id,
          name: category.name,
          detail: category.description || "-",
          searchText: `${category.name} ${category.description ?? ""}`.toLowerCase(),
        })),
      categoryMedium: (appData) =>
        appData.categories.medium.map((category) => {
          const parent = appData.categories.large.find((c) => c.id === category.largeId)?.name ?? "-"
          const detail = `${parent} › ${category.description || category.name}`
          return {
            id: category.id,
            name: category.name,
            detail,
            searchText: `${category.name} ${detail}`.toLowerCase(),
          }
        }),
      categorySmall: (appData) =>
        appData.categories.small.map((category) => {
          const parent = appData.categories.medium.find((c) => c.id === category.mediumId)?.name ?? "-"
          const detail = `${parent} › ${category.description || category.name}`
          return {
            id: category.id,
            name: category.name,
            detail,
            searchText: `${category.name} ${detail}`.toLowerCase(),
          }
        }),
    }),
    [],
  )

  const masterOverviewRows = useMemo<MasterOverviewRow[]>(() => {
    const rows = (overviewBuilders[masterOverviewType] ?? overviewBuilders.materials)(data)
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
    data,
    masterOverviewSearch,
    masterOverviewSort,
    masterOverviewType,
    overviewBuilders,
  ])

  const { pagedRows, currentPage, totalPages, onPageChange } = useTablePagination(masterOverviewRows)

  return (
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
          <div className="space-y-2">
          <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
            <Table className="w-auto min-w-max">
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>詳細</TableHead>
                  <TableHead className="w-32 text-right">基準値</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.map((row) => (
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
          <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
