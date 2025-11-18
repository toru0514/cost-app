"use client"

import { useMemo } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { calculateProductUnitCosts, formatCurrency } from "@/lib/calculations"
import type { AppData } from "@/lib/types"

interface CostSummarySectionProps {
  data: AppData
}

export function CostSummarySection({ data }: CostSummarySectionProps) {
  const productSummaries = useMemo(() => {
    return data.products.map((product) => ({
      product,
      costs: calculateProductUnitCosts(product.id, data),
    }))
  }, [data])

  return (
    <Card className="overflow-x-hidden">
      <CardHeader>
        <CardTitle>原価サマリ</CardTitle>
        <CardDescription>カテゴリ別の積み上げと合計を確認できます。</CardDescription>
      </CardHeader>
      <CardContent>
        {productSummaries.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ原価計算対象の商品がありません。</p>
        ) : (
          <div className="relative w-full max-w-full overflow-x-auto overscroll-x-contain">
            <Table className="w-auto min-w-max">
              <TableHeader>
                <TableRow>
                  <TableHead>商品</TableHead>
                  <TableHead>材料</TableHead>
                  <TableHead>梱包</TableHead>
                  <TableHead>人件費</TableHead>
                  <TableHead>外注</TableHead>
                  <TableHead>開発</TableHead>
                  <TableHead>設備</TableHead>
                  <TableHead>物流</TableHead>
                  <TableHead>電気</TableHead>
                  <TableHead>合計</TableHead>
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
                    <TableCell className="font-semibold">{formatCurrency(costs.total)}</TableCell>
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
