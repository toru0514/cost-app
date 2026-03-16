"use client"

import { useMemo, useState } from "react"

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination } from "@/components/ui/table-pagination"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"
import {
  SearchWithScope,
  filterRowsBySearch,
  useSearchWithScope,
  type SearchField,
} from "@/app/_components/shared/search-with-scope"

interface MaterialCostSectionProps {
  data: AppData
}

type SortKey = "product" | "detail" | "amount"
type SortDirection = "asc" | "desc"
type SummarySortDirection = "asc" | "desc"

export function MaterialCostSection({ data }: MaterialCostSectionProps) {
  const [materialDetailOpen, setMaterialDetailOpen] = useState(true)
  const [materialSummaryOpen, setMaterialSummaryOpen] = useState(true)
  const [productFilter, setProductFilter] = useState("all")
  const [materialFilter, setMaterialFilter] = useState("all")
  const [sortKey, setSortKey] = useState<SortKey>("product")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [summaryProductFilter, setSummaryProductFilter] = useState("all")
  const [summarySortDirection, setSummarySortDirection] = useState<SummarySortDirection>("desc")

  const detailSearchFields: SearchField[] = useMemo(
    () => [
      { key: "productName", label: "商品名" },
      { key: "materialName", label: "材料名" },
    ],
    []
  )
  const detailSearch = useSearchWithScope(detailSearchFields)

  const sortLabelMap: Record<SortKey, string> = {
    product: "商品名",
    detail: "内容",
    amount: "金額",
  }

  const baseRows = useMemo(() => {
    return data.costEntries.materials.map((entry) => {
      const productName = data.products.find((product) => product.id === entry.productId)?.name ?? "未設定"
      const materialName = data.materials.find((m) => m.id === entry.materialId)?.name ?? "-"
      const detail = materialName
      const amountValue = entry.costPerUnit
      return {
        product: productName,
        materialName,
        detail,
        amount: formatCurrency(amountValue, entry.currency),
        amountValue,
      }
    })
  }, [data])

  const productOptions = useMemo(() => {
    const collator = new Intl.Collator("ja-JP")
    return Array.from(new Set(baseRows.map((row) => row.product))).sort((a, b) => collator.compare(a, b))
  }, [baseRows])

  const materialOptions = useMemo(() => {
    const collator = new Intl.Collator("ja-JP")
    return Array.from(new Set(baseRows.map((row) => row.materialName))).sort((a, b) => collator.compare(a, b))
  }, [baseRows])

  const rows = useMemo(() => {
    const collator = new Intl.Collator("ja-JP")

    const filtered = baseRows.filter((row) => {
      const productHit = productFilter === "all" || row.product === productFilter
      const materialHit = materialFilter === "all" || row.materialName === materialFilter
      return productHit && materialHit
    })

    return filtered.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1
      if (sortKey === "amount") {
        return (a.amountValue - b.amountValue) * direction
      }
      if (sortKey === "detail") {
        return collator.compare(a.detail, b.detail) * direction
      }
      return collator.compare(a.product, b.product) * direction
    })
  }, [baseRows, materialFilter, productFilter, sortDirection, sortKey])

  const searchableDetailRows = useMemo(
    () => rows.map((row, i) => ({ _index: i, productName: row.product, materialName: row.materialName })),
    [rows]
  )

  const searchFilteredRows = useMemo(() => {
    const filtered = filterRowsBySearch(
      searchableDetailRows,
      detailSearch.query,
      detailSearch.checkedFields,
      detailSearch.allFieldKeys
    )
    const filteredIndices = new Set(filtered.map((r) => r._index as number))
    return rows.filter((_, i) => filteredIndices.has(i))
  }, [rows, searchableDetailRows, detailSearch.query, detailSearch.checkedFields, detailSearch.allFieldKeys])

  const detailPagination = useTablePagination(searchFilteredRows)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prevDirection) => (prevDirection === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(key)
    setSortDirection("asc")
  }

  const renderSortMark = (key: SortKey) => {
    if (sortKey !== key) return ""
    return sortDirection === "asc" ? " ↑" : " ↓"
  }

  const summaryRows = useMemo(() => {
    const collator = new Intl.Collator("ja-JP")
    const grouped = new Map<string, { product: string; items: Map<string, { amountValue: number; currency: string }> }>()

    data.costEntries.materials.forEach((entry) => {
      const productName = data.products.find((product) => product.id === entry.productId)?.name ?? "未設定"
      const materialName = data.materials.find((m) => m.id === entry.materialId)?.name ?? "-"
      const amountValue = entry.costPerUnit
      const productKey = `${entry.productId}:${productName}`
      if (!grouped.has(productKey)) {
        grouped.set(productKey, { product: productName, items: new Map() })
      }
      const current = grouped.get(productKey)
      if (!current) return
      const prev = current.items.get(materialName)
      current.items.set(materialName, {
        amountValue: (prev?.amountValue ?? 0) + amountValue,
        currency: prev?.currency ?? entry.currency,
      })
    })

    const summaries = Array.from(grouped.values()).map((group) => {
      const details = Array.from(group.items.entries())
        .sort((a, b) => collator.compare(a[0], b[0]))
        .map(([itemName, value]) => ({
          text: `${itemName}: ${formatCurrency(value.amountValue, value.currency)}`,
          amountValue: value.amountValue,
          currency: value.currency,
        }))
      const totalValue = details.reduce((sum, detail) => sum + detail.amountValue, 0)
      const totalCurrency = details[0]?.currency ?? "JPY"
      return {
        product: group.product,
        details,
        totalValue,
        totalText: formatCurrency(totalValue, totalCurrency),
      }
    })

    const filtered = summaries.filter((row) => summaryProductFilter === "all" || row.product === summaryProductFilter)

    return filtered.sort((a, b) => {
      const direction = summarySortDirection === "asc" ? 1 : -1
      return (a.totalValue - b.totalValue) * direction
    })
  }, [data, summaryProductFilter, summarySortDirection])

  const summaryPagination = useTablePagination(summaryRows)

  const renderSectionToggle = (isOpen: boolean, toggle: () => void, title: string, description: string) => (
    <div
      className="flex items-center justify-between cursor-pointer select-none rounded-md px-2 py-1 hover:bg-muted/50"
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          toggle()
        }
      }}
    >
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 pointer-events-none" aria-hidden="true">
        {isOpen ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
      </Button>
    </div>
  )

  return (
    <div className="min-w-0 space-y-4">
      <section className="min-w-0 space-y-3 rounded-lg border p-4">
        {renderSectionToggle(
          materialDetailOpen,
          () => setMaterialDetailOpen((prev) => !prev),
          "材料費",
          "材料の使用コスト"
        )}
        {materialDetailOpen && (
          <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger>
                <SelectValue placeholder="商品名で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">商品: すべて</SelectItem>
                {productOptions.map((product) => (
                  <SelectItem key={`product-filter-${product}`} value={product}>
                    {product}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={materialFilter} onValueChange={setMaterialFilter}>
              <SelectTrigger>
                <SelectValue placeholder="材料名で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">材料: すべて</SelectItem>
                {materialOptions.map((material) => (
                  <SelectItem key={`material-filter-${material}`} value={material}>
                    {material}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SearchWithScope
            fields={detailSearchFields}
            query={detailSearch.query}
            onQueryChange={detailSearch.setQuery}
            checkedFields={detailSearch.checkedFields}
            onCheckedFieldsChange={detailSearch.setCheckedFields}
            placeholder="材料費を検索..."
          />
          <p className="text-xs text-muted-foreground">
            並び順: {sortLabelMap[sortKey]}（{sortDirection === "asc" ? "昇順" : "降順"}）
            {(productFilter !== "all" || materialFilter !== "all") &&
              ` / フィルター: 商品「${productFilter === "all" ? "未指定" : productFilter}」、材料「${materialFilter === "all" ? "未指定" : materialFilter}」`}
          </p>
          {searchFilteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">条件に一致するデータがありません。</p>
          ) : (
            <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
              <Table className="w-auto min-w-max">
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button type="button" className="font-medium hover:underline" onClick={() => toggleSort("product")}>
                        商品{renderSortMark("product")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" className="font-medium hover:underline" onClick={() => toggleSort("detail")}>
                        内容{renderSortMark("detail")}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button type="button" className="font-medium hover:underline" onClick={() => toggleSort("amount")}>
                        金額{renderSortMark("amount")}
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailPagination.pagedRows.map((row, index) => (
                    <TableRow key={`${row.product}-${row.materialName}-${index}`}>
                      <TableCell>{row.product}</TableCell>
                      <TableCell>{row.detail}</TableCell>
                      <TableCell className="text-right font-medium">{row.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination currentPage={detailPagination.currentPage} totalPages={detailPagination.totalPages} onPageChange={detailPagination.onPageChange} />
            </div>
          )}
        </div>
        )}
      </section>

      <section className="min-w-0 space-y-3 rounded-lg border p-4">
        {renderSectionToggle(
          materialSummaryOpen,
          () => setMaterialSummaryOpen((prev) => !prev),
          "商品別材料費合計",
          "商品ごとの材料費内訳と合計"
        )}
        {materialSummaryOpen && (
          <div className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Select value={summaryProductFilter} onValueChange={setSummaryProductFilter}>
              <SelectTrigger className="md:max-w-xs">
                <SelectValue placeholder="商品名で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">商品: すべて</SelectItem>
                {productOptions.map((product) => (
                  <SelectItem key={`summary-product-filter-${product}`} value={product}>
                    {product}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              className="text-left text-sm font-medium hover:underline md:text-right"
              onClick={() => setSummarySortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
            >
              合計で並び替え（{summarySortDirection === "asc" ? "昇順" : "降順"}）
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            並び順: 合計（{summarySortDirection === "asc" ? "昇順" : "降順"}）
            {summaryProductFilter !== "all" && ` / フィルター: 商品「${summaryProductFilter}」`}
          </p>
          {summaryRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">条件に一致するデータがありません。</p>
          ) : (
            <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
              <Table className="w-auto min-w-max">
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead>内訳</TableHead>
                    <TableHead className="text-right">合計</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryPagination.pagedRows.map((row, index) => (
                    <TableRow key={`${row.product}-${index}`}>
                      <TableCell className="font-medium">{row.product}</TableCell>
                      <TableCell>{row.details.map((detail) => detail.text).join(" | ")}</TableCell>
                      <TableCell className="text-right font-semibold">{row.totalText}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination currentPage={summaryPagination.currentPage} totalPages={summaryPagination.totalPages} onPageChange={summaryPagination.onPageChange} />
            </div>
          )}
        </div>
        )}
      </section>
    </div>
  )
}
