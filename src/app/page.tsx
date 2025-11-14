"use client"

import { useCallback, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAppData } from "@/lib/app-data"
import { calculateProductUnitCosts, formatCurrency } from "@/lib/calculations"
import type { Product } from "@/lib/types"
import { MasterTab } from "./_components/master/master-tab"
import { ProductTab } from "./_components/product/product-tab"
import { CostTab } from "./_components/cost/cost-tab"
import { AnalyticsTab } from "./_components/analytics/analytics-tab"
import { Copy, Edit3, FileDown, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"


export default function Home() {
  const { data, hydrated, actions } = useAppData()
  const [activeTab, setActiveTab] = useState("cost")
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [copyProductId, setCopyProductId] = useState<string | null>(null)
  const [productSearchQuery, setProductSearchQuery] = useState("")
  const [productCategoryFilter, setProductCategoryFilter] = useState<string | null>(null)
  const [productSortKey, setProductSortKey] = useState("registered-desc")
  const productCostMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateProductUnitCosts>>()
    data.products.forEach((product) => {
      map.set(product.id, calculateProductUnitCosts(product.id, data))
    })
    return map
  }, [data])

  const shippingMethodNameMap = useMemo(() => {
    const map = new Map<string, string>()
    ;(data.shippingMethods ?? []).forEach((method) => {
      map.set(method.id, method.name)
    })
    return map
  }, [data.shippingMethods])

  const equipmentNameMap = useMemo(() => {
    const map = new Map<string, string>()
    data.equipments.forEach((equipment) => {
      map.set(equipment.id, equipment.name)
    })
    return map
  }, [data.equipments])

  const categoryLargeNameMap = useMemo(() => {
    const map = new Map<string | undefined, string>()
    data.categories.large.forEach((category) => {
      map.set(category.id, category.name)
    })
    return map
  }, [data.categories.large])

  const categoryMediumNameMap = useMemo(() => {
    const map = new Map<string | undefined, string>()
    data.categories.medium.forEach((category) => {
      map.set(category.id, category.name)
    })
    return map
  }, [data.categories.medium])

  const categorySmallNameMap = useMemo(() => {
    const map = new Map<string | undefined, string>()
    data.categories.small.forEach((category) => {
      map.set(category.id, category.name)
    })
    return map
  }, [data.categories.small])

  const getShippingText = useCallback(
    (productId: string) => {
      const entries = data.costEntries.logistics.filter((entry) => entry.productId === productId)
      if (entries.length === 0) return "-"
      const names = entries
        .map((entry) => shippingMethodNameMap.get(entry.shippingMethodId))
        .filter((name): name is string => Boolean(name && name.trim().length > 0))
      if (names.length === 0) return "未設定"
      return Array.from(new Set(names)).join(" / ")
    },
    [data.costEntries.logistics, shippingMethodNameMap]
  )

  const getEquipmentText = useCallback(
    (product: Product) => {
      const ids = product.equipmentIds ?? []
      if (ids.length === 0) return "-"
      const names = ids
        .map((id) => equipmentNameMap.get(id))
        .filter((name): name is string => Boolean(name && name.trim().length > 0))
      if (names.length === 0) return "-"
      return Array.from(new Set(names)).join(" / ")
    },
    [equipmentNameMap]
  )

  const handleExportProductsCsv = useCallback(() => {
    if (typeof window === "undefined") return
    const headers = [
      "商品名",
      "大カテゴリ",
      "中カテゴリ",
      "小カテゴリ",
      "配送方法",
      "使用設備",
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
      const shippingText = getShippingText(product.id)
      const equipmentText = getEquipmentText(product)
      return [
        product.name,
        largeName,
        mediumName,
        smallName,
        shippingText,
        equipmentText,
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
  }, [data, getEquipmentText, getShippingText, productCostMap])

  const handleCreateProduct = useCallback(() => {
    setEditingProductId(null)
    setCopyProductId(null)
    setActiveTab("product")
  }, [])

  const handleEditProduct = useCallback(
    (productId: string) => {
      setEditingProductId(productId)
      setCopyProductId(null)
      setActiveTab("product")
    },
    []
  )

  const handleCopyProduct = useCallback(
    (productId: string) => {
      setCopyProductId(productId)
      setEditingProductId(null)
      setActiveTab("product")
    },
    []
  )

  const handleDeleteProduct = useCallback(
    (product: Product) => {
      if (typeof window !== "undefined") {
        const confirmed = window.confirm(`「${product.name}」を削除しますか？関連するコスト明細も削除されます。`)
        if (!confirmed) return
      }
      actions.removeProduct(product.id)
      actions.removeCostEntriesByProduct(product.id)
      toast.success("商品を削除しました", {
        description: `「${product.name}」の情報を削除しました。`,
      })
    },
    [actions]
  )

  const filteredProductEntries = useMemo(() => {
    const normalizedSearch = productSearchQuery.trim().toLowerCase()
    const collator = new Intl.Collator("ja-JP")

    const base = data.products
      .map((product) => {
        const unitCost = productCostMap.get(product.id)?.total ?? 0
        const salePrice = Number(product.salePrice ?? 0)
        const profit = salePrice - unitCost
        const categoryLargeName = categoryLargeNameMap.get(product.categoryLargeId) ?? ""
        const categoryMediumName = categoryMediumNameMap.get(product.categoryMediumId) ?? ""
        const categorySmallName = categorySmallNameMap.get(product.categorySmallId) ?? ""
        const categoryPath = [categoryLargeName, categoryMediumName, categorySmallName].filter(Boolean).join(" / ") || "-"
        const shippingText = getShippingText(product.id)
        const equipmentText = getEquipmentText(product)
        const searchBucket = [
          product.name,
          product.notes ?? "",
          categoryLargeName,
          categoryMediumName,
          categorySmallName,
          shippingText,
          equipmentText,
        ]
          .filter(Boolean)
          .map((text) => text.toLowerCase())
        const matchesSearch = normalizedSearch.length === 0 || searchBucket.some((text) => text.includes(normalizedSearch))
        const matchesCategory = !productCategoryFilter || product.categoryLargeId === productCategoryFilter
        const registeredTime = new Date(product.registeredAt ?? "").getTime() || 0

        return {
          product,
          unitCost,
          salePrice,
          profit,
          categoryPath,
          shippingText,
          equipmentText,
          matchesSearch,
          matchesCategory,
          registeredTime,
        }
      })
      .filter((entry) => entry.matchesSearch && entry.matchesCategory)

    const sorted = [...base].sort((a, b) => {
      switch (productSortKey) {
        case "name-asc":
          return collator.compare(a.product.name, b.product.name)
        case "name-desc":
          return collator.compare(b.product.name, a.product.name)
        case "sale-asc":
          return a.salePrice - b.salePrice
        case "sale-desc":
          return b.salePrice - a.salePrice
        case "profit-asc":
          return a.profit - b.profit
        case "profit-desc":
          return b.profit - a.profit
        case "registered-asc":
          return a.registeredTime - b.registeredTime
        case "registered-desc":
        default:
          return b.registeredTime - a.registeredTime
      }
    })

    return sorted
  }, [
    categoryLargeNameMap,
    categoryMediumNameMap,
    categorySmallNameMap,
    data.products,
    getEquipmentText,
    getShippingText,
    productCategoryFilter,
    productCostMap,
    productSearchQuery,
    productSortKey,
  ])

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
          <TabsTrigger value="analytics">集計データ</TabsTrigger>
          <TabsTrigger value="product">商品登録</TabsTrigger>
          <TabsTrigger value="master">マスタ登録</TabsTrigger>
          <TabsTrigger value="list">商品一覧</TabsTrigger>
        </TabsList>

        <TabsContent value="cost" className="space-y-6">
          <CostTab data={data} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <AnalyticsTab data={data} />
        </TabsContent>

        <TabsContent value="product" className="space-y-6">
          <ProductTab
            data={data}
            actions={actions}
            editingProductId={editingProductId}
            onRequestEditClear={() => setEditingProductId(null)}
            copySourceProductId={copyProductId}
            onRequestCopyClear={() => setCopyProductId(null)}
          />
        </TabsContent>

        <TabsContent value="master" className="space-y-6">
          <MasterTab data={data} actions={actions} />
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>商品一覧</CardTitle>
                  <CardDescription>登録済み商品のカテゴリ・オプション・備考を確認</CardDescription>
                  <p className="text-xs text-muted-foreground">該当 {filteredProductEntries.length} 件</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={handleCreateProduct}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    新規商品を登録
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleExportProductsCsv}
                    disabled={data.products.length === 0}
                  >
                    <FileDown className="mr-1.5 h-4 w-4" />
                    CSVエクスポート
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
                <Input
                  value={productSearchQuery}
                  onChange={(event) => setProductSearchQuery(event.target.value)}
                  placeholder="商品名・備考・設備で検索"
                  className="w-full flex-1 min-w-[220px]"
                />
                <Select
                  value={productCategoryFilter ?? "all"}
                  onValueChange={(value) => setProductCategoryFilter(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="大カテゴリで絞り込み" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべてのカテゴリ</SelectItem>
                    {data.categories.large.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={productSortKey} onValueChange={setProductSortKey}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="並び替え" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="registered-desc">登録が新しい順</SelectItem>
                    <SelectItem value="registered-asc">登録が古い順</SelectItem>
                    <SelectItem value="name-asc">商品名 (昇順)</SelectItem>
                    <SelectItem value="name-desc">商品名 (降順)</SelectItem>
                    <SelectItem value="sale-desc">販売価格が高い順</SelectItem>
                    <SelectItem value="sale-asc">販売価格が低い順</SelectItem>
                    <SelectItem value="profit-desc">粗利が高い順</SelectItem>
                    <SelectItem value="profit-asc">粗利が低い順</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.products.length === 0 ? (
                <p className="text-sm text-muted-foreground">まだ商品がありません。</p>
              ) : filteredProductEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">条件に一致する商品がありません。</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>商品</TableHead>
                      <TableHead>カテゴリ</TableHead>
                    <TableHead>オプション/個数</TableHead>
                    <TableHead>配送方法</TableHead>
                    <TableHead>使用設備</TableHead>
                    <TableHead>販売価格</TableHead>
                    <TableHead>利益</TableHead>
                    <TableHead>備考</TableHead>
                    <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProductEntries.map(({ product, salePrice, profit, categoryPath, shippingText, equipmentText }) => {
                      const optionText = (product.sizeVariants ?? [])
                        .filter((variant) => variant.label?.trim())
                        .map((variant) => `${variant.label}: ${variant.quantity}個`)
                        .join(" / ") || "-"
                      const notesText = product.notes?.trim() || "-"

                      return (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{categoryPath}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{optionText}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{shippingText}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{equipmentText}</TableCell>
                          <TableCell>{formatCurrency(salePrice)}</TableCell>
                          <TableCell className={profit >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(profit)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{notesText}</TableCell>
                          <TableCell className="w-48 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditProduct(product.id)}
                              >
                                <Edit3 className="mr-1 h-4 w-4" />
                                編集
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => handleCopyProduct(product.id)}
                              >
                                <Copy className="mr-1 h-4 w-4" />
                                コピー
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteProduct(product)}
                              >
                                <Trash2 className="mr-1 h-4 w-4" />
                                削除
                              </Button>
                            </div>
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
