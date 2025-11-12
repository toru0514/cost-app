"use client"

import { useCallback, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAppData } from "@/lib/app-data"
import { calculateProductUnitCosts, formatCurrency } from "@/lib/calculations"
import { MasterTab } from "./_components/master/master-tab"
import { ProductTab } from "./_components/product/product-tab"
import { CostTab } from "./_components/cost/cost-tab"


export default function Home() {
  const { data, hydrated, actions } = useAppData()
  const [activeTab, setActiveTab] = useState("cost")
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const productCostMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateProductUnitCosts>>()
    data.products.forEach((product) => {
      map.set(product.id, calculateProductUnitCosts(product.id, data))
    })
    return map
  }, [data])

  const handleExportProductsCsv = useCallback(() => {
    if (typeof window === "undefined") return
    const headers = [
      "商品名",
      "大カテゴリ",
      "中カテゴリ",
      "小カテゴリ",
      "販売価格",
      "原価",
      "利益",
      "オプション",
      "備考",
    ]

    const rows = data.products.map((product) => {
      const largeName = data.categories.large.find((c) => c.id === product.categoryLargeId)?.name ?? ""
      const mediumName = data.categories.medium.find((c) => c.id === product.categoryMediumId)?.name ?? ""
      const smallName = data.categories.small.find((c) => c.id === product.categorySmallId)?.name ?? ""
      const unitCost = productCostMap.get(product.id)?.total ?? 0
      const salePrice = Number(product.salePrice ?? 0)
      const profit = salePrice - unitCost
      const optionText = (product.sizeVariants ?? [])
        .filter((variant) => variant.label?.trim())
        .map((variant) => `${variant.label}: ${variant.quantity}`)
        .join(" / ")
      return [
        product.name,
        largeName,
        mediumName,
        smallName,
        salePrice.toString(),
        unitCost.toString(),
        profit.toString(),
        optionText,
        product.notes ?? "",
      ]
    })

    const escape = (value: string) => {
      const normalized = value.replace(/\r?\n|\r/g, " ").replace(/"/g, '""')
      return `"${normalized}"`
    }

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => escape(cell ?? "")).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `products-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [data, productCostMap])

  if (!hydrated) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center p-10 text-muted-foreground">
        ローカルストレージからデータを読み込み中です...
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl space-y-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Cost App ローカルプロトタイプ</h1>
        <p className="text-muted-foreground">
          ローカルストレージに保存しながら、マスタ登録→商品登録→原価入力→サマリ確認まで体験できる Next.js + shadcn UI の試作です。
        </p>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">マスタ {data.materials.length + data.packagingItems.length + data.laborRoles.length + data.equipments.length} 件</Badge>
          <Badge variant="outline">商品 {data.products.length} 件</Badge>
          <Badge variant="outline">コスト明細 {Object.values(data.costEntries).reduce((sum, list) => sum + list.length, 0)} 件</Badge>
          <Button variant="outline" size="sm" onClick={actions.seedSample}>
            デモデータ投入
          </Button>
          <Button variant="ghost" size="sm" onClick={actions.resetAll}>
            ローカル保存をクリア
          </Button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="cost">原価サマリ</TabsTrigger>
          <TabsTrigger value="product">商品登録</TabsTrigger>
          <TabsTrigger value="master">マスタ登録</TabsTrigger>
          <TabsTrigger value="list">商品一覧</TabsTrigger>
        </TabsList>

        <TabsContent value="cost" className="space-y-6">
          <CostTab data={data} />
        </TabsContent>

        <TabsContent value="product" className="space-y-6">
          <ProductTab
            data={data}
            actions={actions}
            editingProductId={editingProductId}
            onRequestEditClear={() => setEditingProductId(null)}
          />
        </TabsContent>

        <TabsContent value="master" className="space-y-6">
          <MasterTab data={data} actions={actions} />
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
          <Card>
            <CardHeader className="gap-3 md:flex md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>商品一覧</CardTitle>
                <CardDescription>登録済み商品のカテゴリ・オプション・備考を確認</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={handleExportProductsCsv} disabled={data.products.length === 0}>
                CSVエクスポート
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.products.length === 0 ? (
                <p className="text-sm text-muted-foreground">まだ商品がありません。</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>商品</TableHead>
                      <TableHead>カテゴリ</TableHead>
                      <TableHead>オプション/個数</TableHead>
                      <TableHead>販売価格</TableHead>
                      <TableHead>利益</TableHead>
                      <TableHead>備考</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.products.map((product) => {
                      const categoryPath = [
                        data.categories.large.find((c) => c.id === product.categoryLargeId)?.name,
                        data.categories.medium.find((c) => c.id === product.categoryMediumId)?.name,
                        data.categories.small.find((c) => c.id === product.categorySmallId)?.name,
                      ]
                        .filter(Boolean)
                        .join(" / ") || "-"

                      const optionText = (product.sizeVariants ?? [])
                        .filter((variant) => variant.label?.trim())
                        .map((variant) => `${variant.label}: ${variant.quantity}個`)
                        .join(" / ") || "-"
                      const notesText = product.notes?.trim() || "-"
                      const unitCost = productCostMap.get(product.id)?.total ?? 0
                      const salePrice = Number(product.salePrice ?? 0)
                      const profit = salePrice - unitCost

                      return (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{categoryPath}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{optionText}</TableCell>
                          <TableCell>{formatCurrency(salePrice)}</TableCell>
                          <TableCell className={profit >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(profit)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{notesText}</TableCell>
                          <TableCell className="w-20 text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingProductId(product.id)
                                setActiveTab("product")
                              }}
                            >
                              編集
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}
