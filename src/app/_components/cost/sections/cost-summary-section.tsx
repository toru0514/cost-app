"use client"

import { useMemo, useState } from "react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination } from "@/components/ui/table-pagination"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { calculateProductUnitCosts, formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"
import {
  SearchWithScope,
  filterRowsBySearch,
  useSearchWithScope,
  type SearchField,
} from "@/app/_components/shared/search-with-scope"

interface CostSummarySectionProps {
  data: AppData
  exchangeRateMap?: Map<string, number>
}

type SortKey = "product" | "detail" | "amount"
type SortDirection = "asc" | "desc"

export function CostSummarySection({ data, exchangeRateMap }: CostSummarySectionProps) {
  const [sortKey, setSortKey] = useState<SortKey>("product")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const searchFields: SearchField[] = useMemo(
    () => [
      { key: "productName", label: "商品名" },
      { key: "detailText", label: "内容" },
    ],
    []
  )
  const { query, setQuery, checkedFields, setCheckedFields, allFieldKeys } = useSearchWithScope(searchFields)

  const sortLabelMap: Record<SortKey, string> = {
    product: "商品名",
    detail: "内容",
    amount: "金額",
  }

  const allRows = useMemo(() => {
    return data.products.map((product) => {
      const costs = calculateProductUnitCosts(product.id, data, exchangeRateMap)
      const detailText = [
        `材料 ${formatCurrency(costs.material)}`,
        `梱包 ${formatCurrency(costs.packaging)}`,
        `人件費 ${formatCurrency(costs.labor)}`,
        `外注 ${formatCurrency(costs.outsourcing)}`,
        `開発 ${formatCurrency(costs.development)}`,
        `設備 ${formatCurrency(costs.equipment)}`,
        `物流 ${formatCurrency(costs.logistics)}`,
        `電気 ${formatCurrency(costs.electricity)}`,
        `手数料 ${formatCurrency(costs.fees)}`,
      ].join(" / ")
      return { product, costs, detailText, productName: product.name }
    })
  }, [data, exchangeRateMap])

  const filteredRows = useMemo(
    () => filterRowsBySearch(allRows, query, checkedFields, allFieldKeys),
    [allRows, query, checkedFields, allFieldKeys]
  )

  const productSummaries = useMemo(() => {
    const collator = new Intl.Collator("ja-JP")

    return [...filteredRows].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1
      if (sortKey === "amount") return (a.costs.total - b.costs.total) * direction
      if (sortKey === "detail") return collator.compare(a.detailText, b.detailText) * direction
      return collator.compare(a.product.name, b.product.name) * direction
    })
  }, [filteredRows, sortDirection, sortKey])

  const pagination = useTablePagination(productSummaries)

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
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">原価サマリ</h2>
          <p className="text-sm text-muted-foreground">カテゴリ別の積み上げと合計を確認できます。</p>
        </div>
      </div>
      <div className="space-y-3">
        <SearchWithScope
          fields={searchFields}
          query={query}
          onQueryChange={setQuery}
          checkedFields={checkedFields}
          onCheckedFieldsChange={setCheckedFields}
          placeholder="キーワードで絞り込み"
        />
        <p className="text-xs text-muted-foreground">
          並び順: {sortLabelMap[sortKey]}（{sortDirection === "asc" ? "昇順" : "降順"}）
          {query && ` / フィルター: 「${query}」`}
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
                {pagination.pagedRows.map(({ product, costs }) => (
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
            <TablePagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={pagination.onPageChange} />
          </div>
        )}
      </div>
    </section>
  )
}
