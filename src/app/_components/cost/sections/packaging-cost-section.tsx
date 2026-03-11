"use client"

import { useMemo, useState } from "react"

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

interface PackagingCostSectionProps {
  data: AppData
}

type SortKey = "product" | "detail" | "amount"
type SortDirection = "asc" | "desc"
type SummarySortDirection = "asc" | "desc"

export function PackagingCostSection({ data }: PackagingCostSectionProps) {
  const [packagingDetailOpen, setPackagingDetailOpen] = useState(true)
  const [packagingSummaryOpen, setPackagingSummaryOpen] = useState(true)
  const [productFilter, setProductFilter] = useState("all")
  const [packagingFilter, setPackagingFilter] = useState("all")
  const [sortKey, setSortKey] = useState<SortKey>("product")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [summaryProductFilter, setSummaryProductFilter] = useState("all")
  const [summarySortDirection, setSummarySortDirection] = useState<SummarySortDirection>("desc")

  const sortLabelMap: Record<SortKey, string> = {
    product: "商品名",
    detail: "内容",
    amount: "金額",
  }

  const baseRows = useMemo(() => {
    return data.costEntries.packaging.map((entry) => {
      const productName = data.products.find((product) => product.id === entry.productId)?.name ?? "未設定"
      const itemName = data.packagingItems.find((item) => item.id === entry.packagingItemId)?.name ?? "-"
      const detail = `${itemName} × ${entry.quantity}`
      const amountValue = entry.quantity * entry.costPerUnit
      return {
        product: productName,
        packagingName: itemName,
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

  const packagingOptions = useMemo(() => {
    const collator = new Intl.Collator("ja-JP")
    return Array.from(new Set(baseRows.map((row) => row.packagingName))).sort((a, b) => collator.compare(a, b))
  }, [baseRows])

  const rows = useMemo(() => {
    const collator = new Intl.Collator("ja-JP")

    const filtered = baseRows.filter((row) => {
      const productHit = productFilter === "all" || row.product === productFilter
      const packagingHit = packagingFilter === "all" || row.packagingName === packagingFilter
      return productHit && packagingHit
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
  }, [baseRows, packagingFilter, productFilter, sortDirection, sortKey])

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

    data.costEntries.packaging.forEach((entry) => {
      const productName = data.products.find((product) => product.id === entry.productId)?.name ?? "未設定"
      const itemName = data.packagingItems.find((item) => item.id === entry.packagingItemId)?.name ?? "-"
      const amountValue = entry.quantity * entry.costPerUnit
      const productKey = `${entry.productId}:${productName}`
      if (!grouped.has(productKey)) {
        grouped.set(productKey, { product: productName, items: new Map() })
      }
      const current = grouped.get(productKey)
      if (!current) return
      const prev = current.items.get(itemName)
      current.items.set(itemName, {
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
    <div className="space-y-4">
      <section className="space-y-3 rounded-lg border p-4">
        {renderSectionToggle(
          packagingDetailOpen,
          () => setPackagingDetailOpen((prev) => !prev),
          "梱包材費",
          "梱包材の使用数量"
        )}
        {packagingDetailOpen && (
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
            <Select value={packagingFilter} onValueChange={setPackagingFilter}>
              <SelectTrigger>
                <SelectValue placeholder="梱包材名で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">梱包材: すべて</SelectItem>
                {packagingOptions.map((packaging) => (
                  <SelectItem key={`packaging-filter-${packaging}`} value={packaging}>
                    {packaging}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            並び順: {sortLabelMap[sortKey]}（{sortDirection === "asc" ? "昇順" : "降順"}）
            {(productFilter !== "all" || packagingFilter !== "all") &&
              ` / フィルター: 商品「${productFilter === "all" ? "未指定" : productFilter}」、梱包材「${packagingFilter === "all" ? "未指定" : packagingFilter}」`}
          </p>
          {rows.length === 0 ? (
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
                  {rows.map((row, index) => (
                    <TableRow key={`${row.product}-${row.packagingName}-${index}`}>
                      <TableCell>{row.product}</TableCell>
                      <TableCell>{row.detail}</TableCell>
                      <TableCell className="text-right font-medium">{row.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        )}
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        {renderSectionToggle(
          packagingSummaryOpen,
          () => setPackagingSummaryOpen((prev) => !prev),
          "商品別梱包材費合計",
          "商品ごとの梱包材費内訳と合計"
        )}
        {packagingSummaryOpen && (
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
                  {summaryRows.map((row, index) => (
                    <TableRow key={`${row.product}-${index}`}>
                      <TableCell className="font-medium">{row.product}</TableCell>
                      <TableCell>{row.details.map((detail) => detail.text).join(" | ")}</TableCell>
                      <TableCell className="text-right font-semibold">{row.totalText}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        )}
      </section>
    </div>
  )
}
