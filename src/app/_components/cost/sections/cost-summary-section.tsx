"use client"

import { useMemo, useState } from "react"

import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { calculateProductUnitCosts, formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

interface CostSummarySectionProps {
  data: AppData
}

type SortKey = "product" | "detail" | "amount"
type SortDirection = "asc" | "desc"

export function CostSummarySection({ data }: CostSummarySectionProps) {
  const [productFilter, setProductFilter] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("product")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const sortLabelMap: Record<SortKey, string> = {
    product: "商品名",
    detail: "内容",
    amount: "金額",
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

    const filtered = rows.filter((row) => !query || row.product.name.toLowerCase().includes(query))

    return filtered.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1
      if (sortKey === "amount") return (a.costs.total - b.costs.total) * direction
      if (sortKey === "detail") return collator.compare(a.detailText, b.detailText) * direction
      return collator.compare(a.product.name, b.product.name) * direction
    })
  }, [data, productFilter, sortDirection, sortKey])

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
        <Input
          value={productFilter}
          onChange={(event) => setProductFilter(event.target.value)}
          placeholder="商品名で絞り込み"
          className="w-full md:w-72"
        />
        <p className="text-xs text-muted-foreground">
          並び順: {sortLabelMap[sortKey]}（{sortDirection === "asc" ? "昇順" : "降順"}）
          {productFilter && ` / フィルター: 商品「${productFilter}」`}
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
