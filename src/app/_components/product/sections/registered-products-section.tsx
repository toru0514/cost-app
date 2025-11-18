"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AppData } from "@/lib/types"

interface RegisteredProductsSectionProps {
  data: AppData
}

export function RegisteredProductsSection({ data }: RegisteredProductsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>登録済み商品</CardTitle>
        <CardDescription>想定生産量・設備利用状況の一覧。</CardDescription>
      </CardHeader>
      <CardContent>
        {data.products.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ商品がありません。</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品名</TableHead>
                <TableHead>カテゴリ</TableHead>
                <TableHead>生産計画</TableHead>
                <TableHead>設備</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.products.map((product) => {
                const categoryLabel = [product.categoryLargeId, product.categoryMediumId, product.categorySmallId]
                  .map((categoryId) =>
                    data.categories.large.find((c) => c.id === categoryId) ||
                    data.categories.medium.find((c) => c.id === categoryId) ||
                    data.categories.small.find((c) => c.id === categoryId)
                  )
                  .filter(Boolean)
                  .map((category) => (category as { id: string; name: string }).name)
                  .join(" / ")
                const equipmentLabel =
                  product.equipmentIds.length === 0
                    ? "-"
                    : product.equipmentIds
                        .map((id) => data.equipments.find((equipment) => equipment.id === id)?.name ?? "")
                        .filter(Boolean)
                        .join(", ")

                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{categoryLabel || "-"}</TableCell>
                    <TableCell>
                      {product.expectedProduction.quantity} 個 / {product.expectedProduction.periodYears} 年
                    </TableCell>
                    <TableCell>{equipmentLabel}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
