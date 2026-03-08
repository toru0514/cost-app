"use client"

import { useMemo, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

interface PackagingCostSectionProps {
  data: AppData
}

type SortKey = "product" | "detail" | "amount"
type SortDirection = "asc" | "desc"

export function PackagingCostSection({ data }: PackagingCostSectionProps) {
  const [productFilter, setProductFilter] = useState("")
  const [packagingFilter, setPackagingFilter] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("product")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const sortLabelMap: Record<SortKey, string> = {
    product: "商品名",
    detail: "内容",
    amount: "金額",
  }

  const rows = useMemo(() => {
    const productQuery = productFilter.trim().toLowerCase()
    const packagingQuery = packagingFilter.trim().toLowerCase()
    const collator = new Intl.Collator("ja-JP")

    const base = data.costEntries.packaging.map((entry) => {
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

    const filtered = base.filter((row) => {
      const productHit = !productQuery || row.product.toLowerCase().includes(productQuery)
      const packagingHit = !packagingQuery || row.packagingName.toLowerCase().includes(packagingQuery)
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
  }, [data, packagingFilter, productFilter, sortDirection, sortKey])

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

  return (
    <Card className="overflow-x-hidden">
      <CardHeader>
        <CardTitle>梱包材費</CardTitle>
        <CardDescription>梱包材の使用数量</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-2">
          <Input
            value={productFilter}
            onChange={(event) => setProductFilter(event.target.value)}
            placeholder="商品名で絞り込み"
          />
          <Input
            value={packagingFilter}
            onChange={(event) => setPackagingFilter(event.target.value)}
            placeholder="梱包材名で絞り込み"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          並び順: {sortLabelMap[sortKey]}（{sortDirection === "asc" ? "昇順" : "降順"}）
          {(productFilter || packagingFilter) && ` / フィルター: 商品「${productFilter || "未指定"}」、梱包材「${packagingFilter || "未指定"}」`}
        </p>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">条件に一致するデータがありません。</p>
        ) : (
          <div className="relative w-full max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
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
      </CardContent>
    </Card>
  )
}
