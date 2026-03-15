"use client"

import { useMemo } from "react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination } from "@/components/ui/table-pagination"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { calculateProductUnitCosts, formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"
import {
  filterRowsBySearch,
  useSearchWithScope,
  type SearchField,
} from "@/app/_components/shared/search-with-scope"
import { TableToolbar } from "@/app/_components/shared/table-toolbar"
import { useTableSort, type SortOption } from "@/hooks/use-table-sort"

interface CostSummarySectionProps {
  data: AppData
  exchangeRateMap?: Map<string, number>
}

export function CostSummarySection({ data, exchangeRateMap }: CostSummarySectionProps) {

  const searchFields: SearchField[] = useMemo(
    () => [
      { key: "productName", label: "商品名" },
      { key: "detailText", label: "内容" },
    ],
    []
  )
  const { query, setQuery, checkedFields, setCheckedFields, allFieldKeys } = useSearchWithScope(searchFields)

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

  const costSortOptions = useMemo<SortOption<(typeof filteredRows)[number]>[]>(() => [
    { key: "product", label: "商品名", compareFn: (a, b) => new Intl.Collator("ja-JP").compare(a.product.name, b.product.name) },
    { key: "detail", label: "内容", compareFn: (a, b) => new Intl.Collator("ja-JP").compare(a.detailText, b.detailText) },
    { key: "amount", label: "金額", compareFn: (a, b) => a.costs.total - b.costs.total },
  ], [])

  const { sortedItems: productSummaries, sortKey, sortDirection, setSortKey, setSortDirection, toggleSort, renderSortMark, sortOptions: costSortOpts } = useTableSort(filteredRows, costSortOptions, "product", "asc")

  const pagination = useTablePagination(productSummaries)

  return (
    <section className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">原価サマリ</h2>
          <p className="text-sm text-muted-foreground">カテゴリ別の積み上げと合計を確認できます。</p>
        </div>
      </div>
      <div className="space-y-3">
        <TableToolbar
          search={{
            fields: searchFields,
            query,
            onQueryChange: setQuery,
            checkedFields,
            onCheckedFieldsChange: setCheckedFields,
            placeholder: "キーワードで絞り込み",
          }}
          sort={{
            sortKey,
            sortDirection,
            setSortKey,
            setSortDirection,
            sortOptions: costSortOpts,
          }}
        />
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
                    <button type="button" className="hover:underline" onClick={() => toggleSort("product")}>
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
                    <button type="button" className="hover:underline" onClick={() => toggleSort("amount")}>
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
