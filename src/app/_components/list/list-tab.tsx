"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  loadProductListColumnSettings,
  upsertProductListColumnSettings,
} from "@/lib/app-data-sync"
import { calculateProductUnitCosts } from "@/lib/calculations"
import type { AppData, Product, StockAlertSetting } from "@/lib/types"
import {
  CustomizableProductTable,
  defaultProductTableColumnSettings,
  normalizeProductTableColumnSettings,
  type ProductTableColumnSettings,
} from "@/app/_components/product-list/customizable-product-table"
import { SearchWithScope, type SearchField } from "@/app/_components/shared/search-with-scope"
import { StockListTab } from "@/app/_components/stock-list/stock-list-tab"
import { ChevronDown, FileDown, Filter, Plus } from "lucide-react"
import { toast } from "sonner"
import { ViewToggle } from "@/app/_components/shared/view-toggle"
import { ProductCardGrid } from "@/app/_components/list/product-card-grid"

type ListTabProps = {
  data: AppData
  isAuthenticated: boolean
  authUserId: string | null
  stocks: Map<string, number>
  stocksLoaded: boolean
  materialStocks: Map<string, number>
  materialStockUnits: Map<string, string>
  packagingStocks: Map<string, number>
  packagingStockUnits: Map<string, string>
  masterStocksLoaded: boolean
  adjustStock: (productId: string, delta: number) => Promise<void>
  adjustMaterialStock: (id: string, delta: number) => Promise<void>
  adjustPackagingStock: (id: string, delta: number) => Promise<void>
  stockAlertSettings: Map<string, StockAlertSetting>
  stockAlertSettingsLoaded: boolean
  updateStockAlertSetting: (itemType: StockAlertSetting["itemType"], itemId: string, enabled: boolean, threshold: number) => Promise<void>
  checkAndNotifyLowStock: (itemType: StockAlertSetting["itemType"], itemId: string, itemName: string, newQuantity: number) => void
  onCreateProduct: () => void
  onEditProduct: (productId: string) => void
  onCopyProduct: (productId: string) => void
  onDeleteProduct: (product: Product) => void
}

export function ListTab({
  data,
  isAuthenticated,
  authUserId,
  stocks,
  stocksLoaded,
  materialStocks,
  materialStockUnits,
  packagingStocks,
  packagingStockUnits,
  masterStocksLoaded,
  adjustStock,
  adjustMaterialStock,
  adjustPackagingStock,
  stockAlertSettings,
  stockAlertSettingsLoaded,
  updateStockAlertSetting,
  checkAndNotifyLowStock,
  onCreateProduct,
  onEditProduct,
  onCopyProduct,
  onDeleteProduct,
}: ListTabProps) {
  const [productSearchQuery, setProductSearchQuery] = useState("")
  const productSearchFields: SearchField[] = useMemo(
    () => [
      { key: "name", label: "商品名" },
      { key: "notes", label: "備考" },
      { key: "categoryLarge", label: "大カテゴリ" },
      { key: "categoryMedium", label: "中カテゴリ" },
      { key: "categorySmall", label: "小カテゴリ" },
      { key: "shipping", label: "送料" },
      { key: "equipment", label: "設備" },
    ],
    []
  )
  const [productSearchCheckedFields, setProductSearchCheckedFields] = useState<Set<string>>(
    () => new Set(["name", "notes", "categoryLarge", "categoryMedium", "categorySmall", "shipping", "equipment"])
  )
  const [productCategoryLargeFilter, setProductCategoryLargeFilter] = useState<string | null>(null)
  const [productCategoryMediumFilter, setProductCategoryMediumFilter] = useState<string | null>(null)
  const [productCategorySmallFilter, setProductCategorySmallFilter] = useState<string | null>(null)
  const [productSortKey, setProductSortKey] = useState("registered-desc")
  const [productTableColumnSettings, setProductTableColumnSettings] = useState<ProductTableColumnSettings>(
    () => defaultProductTableColumnSettings()
  )
  const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
    if (typeof window === "undefined") return "table"
    const stored = localStorage.getItem("view-mode-products")
    if (stored === "grid" || stored === "table") return stored
    return window.innerWidth < 768 ? "grid" : "table"
  })

  const handleViewModeChange = (next: "table" | "grid") => {
    setViewMode(next)
    localStorage.setItem("view-mode-products", next)
  }

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
      "制作ロット数",
      "想定生産数",
      "販売価格",
      "原価",
      "利益",
      "オプション",
      "備考",
      "材料費",
      "梱包費",
      "人件費",
      "外注費",
      "開発費",
      "設備費",
      "物流費",
      "電気代",
      "手数料",
    ]

    const rows = data.products.map((product) => {
      const largeName = data.categories.large.find((c) => c.id === product.categoryLargeId)?.name ?? ""
      const mediumName = data.categories.medium.find((c) => c.id === product.categoryMediumId)?.name ?? ""
      const smallName = data.categories.small.find((c) => c.id === product.categorySmallId)?.name ?? ""
      const costs = productCostMap.get(product.id)
      const unitCost = costs?.total ?? 0
      const salePrice = Number(product.salePrice ?? 0)
      const profit = salePrice - unitCost
      const optionText = (product.sizeVariants ?? [])
        .filter((variant) => variant.label?.trim())
        .map((variant) => `${variant.label}: ${variant.quantity}`)
        .join(" / ")
      const shippingText = getShippingText(product.id)
      const equipmentText = getEquipmentText(product)
      const productionLotSize = Number(product.productionLotSize ?? 0)
      const expectedProductionQuantity = Number(product.expectedProduction?.quantity ?? 0)
      return [
        product.name,
        largeName,
        mediumName,
        smallName,
        shippingText,
        equipmentText,
        productionLotSize.toString(),
        expectedProductionQuantity.toString(),
        salePrice.toString(),
        unitCost.toString(),
        profit.toString(),
        optionText,
        product.notes ?? "",
        (costs?.material ?? 0).toString(),
        (costs?.packaging ?? 0).toString(),
        (costs?.labor ?? 0).toString(),
        (costs?.outsourcing ?? 0).toString(),
        (costs?.development ?? 0).toString(),
        (costs?.equipment ?? 0).toString(),
        (costs?.logistics ?? 0).toString(),
        (costs?.electricity ?? 0).toString(),
        (costs?.fees ?? 0).toString(),
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

  const filteredProductEntries = useMemo(() => {
    const normalizedSearch = productSearchQuery.trim().toLowerCase()
    const collator = new Intl.Collator("ja-JP")

    const base = data.products
      .map((product) => {
        const unitCost = productCostMap.get(product.id)?.total ?? 0
        const salePrice = Number(product.salePrice ?? 0)
        const profit = salePrice - unitCost
        const categoryLargeName = categoryLargeNameMap.get(product.categoryLargeId ?? undefined) ?? ""
        const categoryMediumName = categoryMediumNameMap.get(product.categoryMediumId ?? undefined) ?? ""
        const categorySmallName = categorySmallNameMap.get(product.categorySmallId ?? undefined) ?? ""
        const categoryPath = [categoryLargeName, categoryMediumName, categorySmallName].filter(Boolean).join(" / ") || "-"
        const shippingText = getShippingText(product.id)
        const equipmentText = getEquipmentText(product)
        const allChecked = productSearchCheckedFields.size === 0 || productSearchCheckedFields.size === productSearchFields.length
        const searchEntries: Array<{ key: string; value: string }> = [
          { key: "name", value: product.name },
          { key: "notes", value: product.notes ?? "" },
          { key: "categoryLarge", value: categoryLargeName },
          { key: "categoryMedium", value: categoryMediumName },
          { key: "categorySmall", value: categorySmallName },
          { key: "shipping", value: shippingText },
          { key: "equipment", value: equipmentText },
        ]
        const activeEntries = allChecked
          ? searchEntries
          : searchEntries.filter((e) => productSearchCheckedFields.has(e.key))
        const matchesSearch =
          normalizedSearch.length === 0 ||
          activeEntries.some((e) => e.value.toLowerCase().includes(normalizedSearch))
        const matchesCategory =
          (!productCategoryLargeFilter || product.categoryLargeId === productCategoryLargeFilter) &&
          (!productCategoryMediumFilter || product.categoryMediumId === productCategoryMediumFilter) &&
          (!productCategorySmallFilter || product.categorySmallId === productCategorySmallFilter)
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
    productCategoryLargeFilter,
    productCategoryMediumFilter,
    productCategorySmallFilter,
    productCostMap,
    productSearchCheckedFields,
    productSearchFields.length,
    productSearchQuery,
    productSortKey,
  ])

  const handleCategoryLargeFilterChange = useCallback((value: string) => {
    const next = value === "all" ? null : value
    setProductCategoryLargeFilter(next)
    setProductCategoryMediumFilter(null)
    setProductCategorySmallFilter(null)
  }, [])

  const handleCategoryMediumFilterChange = useCallback((value: string) => {
    const next = value === "all" ? null : value
    setProductCategoryMediumFilter(next)
    setProductCategorySmallFilter(null)
  }, [])

  const handleCategorySmallFilterChange = useCallback((value: string) => {
    setProductCategorySmallFilter(value === "all" ? null : value)
  }, [])

  const handleProductTableColumnSettingsChange = useCallback(
    (next: ProductTableColumnSettings) => {
      const normalized = normalizeProductTableColumnSettings(next)
      setProductTableColumnSettings(normalized)
      if (!authUserId) return
      void upsertProductListColumnSettings(authUserId, normalized.columnOrder, normalized.hiddenColumns).catch((error) => {
        console.error("Failed to save product list column settings", error)
        toast.error("カラム設定の保存に失敗しました")
      })
    },
    [authUserId]
  )

  useEffect(() => {
    let cancelled = false
    if (!authUserId) {
      setProductTableColumnSettings(defaultProductTableColumnSettings())
      return () => {
        cancelled = true
      }
    }
    ;(async () => {
      try {
        const loaded = await loadProductListColumnSettings(authUserId)
        if (cancelled) return
        if (!loaded) {
          setProductTableColumnSettings(defaultProductTableColumnSettings())
          return
        }
        setProductTableColumnSettings(normalizeProductTableColumnSettings(loaded))
      } catch (error) {
        console.error("Failed to load product list column settings", error)
        if (!cancelled) {
          setProductTableColumnSettings(defaultProductTableColumnSettings())
          toast.error("カラム設定の読み込みに失敗しました")
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authUserId])

  return (
    <>
      <div className="space-y-4">
        {/* ページヘッダー */}
        <div>
          <h1 className="text-2xl font-semibold">商品/在庫一覧</h1>
          <p className="text-muted-foreground">登録済み商品のカテゴリ・オプション・備考を確認</p>
        </div>

        {/* ツールバー */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* 検索ボックス（検索範囲選択付き） */}
            <SearchWithScope
              fields={productSearchFields}
              query={productSearchQuery}
              onQueryChange={setProductSearchQuery}
              checkedFields={productSearchCheckedFields}
              onCheckedFieldsChange={setProductSearchCheckedFields}
              placeholder="商品を検索..."
            />
            {/* フィルターボタン（カテゴリ・ソート用Popover的に） */}
            <Select value={productCategoryLargeFilter ?? "all"} onValueChange={handleCategoryLargeFilterChange}>
              <SelectTrigger className="h-9 w-auto gap-1.5 border px-3">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="カテゴリ" />
                <ChevronDown className="h-3 w-3" />
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
              <SelectTrigger className="h-9 w-auto gap-1.5 border px-3">
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
          <div className="flex items-center gap-2">
            <ViewToggle value={viewMode} onChange={handleViewModeChange} />
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
            <button
              type="button"
              onClick={onCreateProduct}
              className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              新規追加
            </button>
          </div>
        </div>

        {/* 商品一覧セクション */}
        <section className="space-y-1">
          <h2 className="text-xl font-semibold">商品一覧</h2>
        </section>
        {data.products.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ商品がありません。</p>
        ) : filteredProductEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">条件に一致する商品がありません。</p>
        ) : viewMode === "grid" ? (
          <ProductCardGrid
            entries={filteredProductEntries}
            onEdit={onEditProduct}
            onCopy={onCopyProduct}
            onDelete={onDeleteProduct}
          />
        ) : (
          <CustomizableProductTable
            entries={filteredProductEntries}
            isAuthenticated={isAuthenticated}
            stocks={stocks}
            stocksLoaded={stocksLoaded}
            columnSettings={productTableColumnSettings}
            onColumnSettingsChange={handleProductTableColumnSettingsChange}
            onAdjustStock={adjustStock}
            onEdit={onEditProduct}
            onCopy={onCopyProduct}
            onDelete={onDeleteProduct}
            stockAlertSettings={stockAlertSettings}
            stockAlertSettingsLoaded={stockAlertSettingsLoaded}
            onUpdateStockAlertSetting={updateStockAlertSetting}
            onCheckAndNotifyLowStock={checkAndNotifyLowStock}
          />
        )}
      </div>

      <StockListTab
        data={data}
        materialStocks={materialStocks}
        materialStockUnits={materialStockUnits}
        packagingStocks={packagingStocks}
        packagingStockUnits={packagingStockUnits}
        masterStocksLoaded={masterStocksLoaded}
        isAuthenticated={isAuthenticated}
        onAdjustMaterialStock={adjustMaterialStock}
        onAdjustPackagingStock={adjustPackagingStock}
        stockAlertSettings={stockAlertSettings}
        stockAlertSettingsLoaded={stockAlertSettingsLoaded}
        onUpdateStockAlertSetting={updateStockAlertSetting}
        onCheckAndNotifyLowStock={checkAndNotifyLowStock}
      />
    </>
  )
}
