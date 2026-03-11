"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { calculateProductUnitCosts, formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

interface CostSummarySectionProps {
  data: AppData
}

type SortKey = "product" | "detail" | "amount"
type SortDirection = "asc" | "desc"

type SearchField = "name" | "material" | "packaging" | "labor" | "outsourcing" | "development" | "equipment" | "logistics" | "electricity" | "fees" | "total"

const ALL_SEARCH_FIELDS: SearchField[] = [
  "name",
  "material",
  "packaging",
  "labor",
  "outsourcing",
  "development",
  "equipment",
  "logistics",
  "electricity",
  "fees",
  "total",
]

const SEARCH_FIELD_LABELS: Record<SearchField, string> = {
  name: "商品名",
  material: "材料",
  packaging: "梱包",
  labor: "人件費",
  outsourcing: "外注",
  development: "開発",
  equipment: "設備",
  logistics: "物流",
  electricity: "電気",
  fees: "手数料",
  total: "合計",
}

export function CostSummarySection({ data }: CostSummarySectionProps) {
  const [productFilter, setProductFilter] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("product")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [searchFields, setSearchFields] = useState<Set<SearchField>>(new Set(ALL_SEARCH_FIELDS))

  const sortLabelMap: Record<SortKey, string> = {
    product: "商品名",
    detail: "内容",
    amount: "金額",
  }

  const toggleSearchField = (field: SearchField) => {
    setSearchFields((prev) => {
      const next = new Set(prev)
      if (next.has(field)) {
        next.delete(field)
      } else {
        next.add(field)
      }
      return next
    })
  }

  const allFieldsChecked = searchFields.size === ALL_SEARCH_FIELDS.length

  const getFieldValue = (
    field: SearchField,
    row: { product: { name: string }; costs: Record<string, number> }
  ): string => {
    if (field === "name") return row.product.name.toLowerCase()
    return formatCurrency(row.costs[field] ?? 0).toLowerCase()
  }

  const productSummaries = useMemo(() => {
    const collator = new Intl.Collator("ja-JP")
    const query = productFilter.trim().toLowerCase()
    const rows = data.products.map((product) => {
      const costs = calculateProductUnitCosts(product.id, data)
      const detailText = [
        `材料 ${costs.material}`,
        `梱包 ${costs.packaging}`,
        `人件費 ${costs.labor}`,
        `外注 ${costs.outsourcing}`,
        `開発 ${costs.development}`,
        `設備 ${costs.equipment}`,
        `物流 ${costs.logistics}`,
        `電気 ${costs.electricity}`,
        `手数料 ${costs.fees}`,
      ].join(" / ")
      return { product, costs, detailText }
    })

    const filtered = rows.filter((row) => {
      if (!query) return true
      if (searchFields.size === 0) return true

      const checkedFields = Array.from(searchFields)

      if (allFieldsChecked) {
        // Default (all fields checked): OR logic - match ANY field
        return checkedFields.some((field) => getFieldValue(field, row).includes(query))
      }

      // Specific fields selected: AND logic - must match ALL checked fields
      return checkedFields.every((field) => getFieldValue(field, row).includes(query))
    })

    return filtered.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1
      if (sortKey === "amount") return (a.costs.total - b.costs.total) * direction
      if (sortKey === "detail") return collator.compare(a.detailText, b.detailText) * direction
      return collator.compare(a.product.name, b.product.name) * direction
    })
  }, [data, productFilter, sortDirection, sortKey, searchFields, allFieldsChecked])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(key)
    setSortDirection("asc")
  }

  const renderSortMark = (key: SortKey) => {
    if (sortKey !== key) return ""
    return sortDirection === "asc" ? " ↑" : " ↓"
  }

  return (
    <section className="min-w-0 space-y-3">
      <div>
        <h2 className="text-xl font-semibold">原価サマリ</h2>
        <p className="text-sm text-muted-foreground">カテゴリ別の積み上げと合計を確認できます。</p>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            value={productFilter}
            onChange={(event) => setProductFilter(event.target.value)}
            placeholder="キーワードで絞り込み"
            className="w-full md:w-72"
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0">
                検索範囲{" "}
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs text-primary-foreground">
                  {searchFields.size}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-48 p-3">
              <div className="space-y-2">
                {ALL_SEARCH_FIELDS.map((field) => (
                  <div key={field} className="flex items-center gap-2">
                    <Checkbox
                      id={`search-field-${field}`}
                      checked={searchFields.has(field)}
                      onCheckedChange={() => toggleSearchField(field)}
                    />
                    <Label htmlFor={`search-field-${field}`} className="cursor-pointer text-sm font-normal">
                      {SEARCH_FIELD_LABELS[field]}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <p className="text-xs text-muted-foreground">
          並び順: {sortLabelMap[sortKey]}（{sortDirection === "asc" ? "昇順" : "降順"}）
          {productFilter && ` / フィルター: 「${productFilter}」`}
          {!allFieldsChecked && searchFields.size > 0 && (
            <> / 検索範囲: {Array.from(searchFields).map((f) => SEARCH_FIELD_LABELS[f]).join("、")}</>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => toggleSort("product")}>
            商品名で並び替え
          </button>
          <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => toggleSort("detail")}>
            内容で並び替え
          </button>
          <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => toggleSort("amount")}>
            金額で並び替え
          </button>
        </div>
        {productSummaries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {data.products.length === 0 ? "まだ原価計算対象の商品がありません。" : "条件に一致する商品がありません。"}
          </p>
        ) : (
          <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
            <Table className="cost-summary-table w-auto min-w-max">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">
                    <button type="button" className="font-medium hover:underline" onClick={() => toggleSort("product")}>
                      商品{renderSortMark("product")}
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold">材料</TableHead>
                  <TableHead className="font-semibold">梱包</TableHead>
                  <TableHead className="font-semibold">人件費</TableHead>
                  <TableHead className="font-semibold">外注</TableHead>
                  <TableHead className="font-semibold">開発</TableHead>
                  <TableHead className="font-semibold">設備</TableHead>
                  <TableHead className="font-semibold">物流</TableHead>
                  <TableHead className="font-semibold">電気</TableHead>
                  <TableHead className="font-semibold">手数料</TableHead>
                  <TableHead className="text-right font-semibold">
                    <button type="button" className="font-medium hover:underline" onClick={() => toggleSort("amount")}>
                      合計{renderSortMark("amount")}
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productSummaries.map(({ product, costs }) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{formatCurrency(costs.material)}</TableCell>
                    <TableCell>{formatCurrency(costs.packaging)}</TableCell>
                    <TableCell>{formatCurrency(costs.labor)}</TableCell>
                    <TableCell>{formatCurrency(costs.outsourcing)}</TableCell>
                    <TableCell>{formatCurrency(costs.development)}</TableCell>
                    <TableCell>{formatCurrency(costs.equipment)}</TableCell>
                    <TableCell>{formatCurrency(costs.logistics)}</TableCell>
                    <TableCell>{formatCurrency(costs.electricity)}</TableCell>
                    <TableCell>{formatCurrency(costs.fees)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(costs.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  )
}
