"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  loadProductListColumnSettings,
  upsertProductListColumnSettings,
} from "@/lib/app-data-sync"
import { calculateProductUnitCosts, calculateEffectiveProfitRate } from "@/lib/calculations"
import type { AppData, Product, StockAlertSetting } from "@/lib/types"
import {
  CustomizableProductTable,
  defaultProductTableColumnSettings,
  normalizeProductTableColumnSettings,
  type ProductTableColumnSettings,
} from "@/app/_components/product-list/customizable-product-table"
import { type SearchField } from "@/app/_components/shared/search-with-scope"
import { TableToolbar } from "@/app/_components/shared/table-toolbar"
import { useTableSort, type SortOption } from "@/hooks/use-table-sort"
import { useTableFilter, type FilterDefinition } from "@/hooks/use-table-filter"
import { StockListTab } from "@/app/_components/stock-list/stock-list-tab"
import { FileDown, Plus } from "lucide-react"
import { toast } from "sonner"
import { ViewToggle } from "@/app/_components/shared/view-toggle"
import { ProductCardGrid } from "@/app/_components/list/product-card-grid"

type ListTabProps = {
  data: AppData
  exchangeRateMap?: Map<string, number>
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
  onBulkDeleteProducts?: (products: Product[]) => void
}

export function ListTab({
  data,
  exchangeRateMap,
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
  onBulkDeleteProducts,
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
      map.set(product.id, calculateProductUnitCosts(product.id, data, exchangeRateMap))
    })
    return map
  }, [data, exchangeRateMap])

  const effectiveProfitMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateEffectiveProfitRate>>()
    data.products.forEach((product) => {
      map.set(product.id, calculateEffectiveProfitRate(product.id, data, exchangeRateMap))
    })
    return map
  }, [data, exchangeRateMap])

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

  const baseCategoryFilterDefinitions = useMemo<FilterDefinition[]>(() => [
    {
      type: "select",
      key: "categoryLargeId",
      label: "大カテゴリ",
      options: data.categories.large.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      type: "select",
      key: "categoryMediumId",
      label: "中カテゴリ",
      options: [],
    },
    {
      type: "select",
      key: "categorySmallId",
      label: "小カテゴリ",
      options: [],
    },
  ], [data.categories.large])

  const categoryFilterFn = useCallback(
    (entry: { product: Product; matchesSearch: boolean; matchesCategory: boolean }, activeFilters: Record<string, unknown>) => {
      const largeId = activeFilters.categoryLargeId as string | undefined
      if (largeId && entry.product.categoryLargeId !== largeId) return false
      const mediumId = activeFilters.categoryMediumId as string | undefined
      if (mediumId && entry.product.categoryMediumId !== mediumId) return false
      const smallId = activeFilters.categorySmallId as string | undefined
      if (smallId && entry.product.categorySmallId !== smallId) return false
      return true
    },
    []
  )

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

  const enrichedProductEntries = useMemo(() => {
    const normalizedSearch = productSearchQuery.trim().toLowerCase()

    return data.products
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
        const registeredTime = new Date(product.registeredAt ?? "").getTime() || 0

        return {
          product,
          unitCost,
          salePrice,
          profit,
          categoryPath,
          shippingText,
          equipmentText,
          effectiveResult: effectiveProfitMap.get(product.id),
          matchesSearch,
          matchesCategory: true,
          registeredTime,
        }
      })
      .filter((entry) => entry.matchesSearch)
  }, [
    categoryLargeNameMap,
    categoryMediumNameMap,
    categorySmallNameMap,
    data.products,
    effectiveProfitMap,
    getEquipmentText,
    getShippingText,
    productCostMap,
    productSearchCheckedFields,
    productSearchFields.length,
    productSearchQuery,
  ])

  const { filteredItems: categoryFilteredEntries, filterValues, setFilter: setFilterRaw, clearFilter, clearFilters, hasActiveFilters } = useTableFilter(enrichedProductEntries, baseCategoryFilterDefinitions, categoryFilterFn)

  // Cascading filter: when parent changes, clear child filters
  const setCascadingFilter = useCallback(
    (key: string, value: unknown) => {
      setFilterRaw(key, value)
      if (key === "categoryLargeId") {
        clearFilter("categoryMediumId")
        clearFilter("categorySmallId")
      } else if (key === "categoryMediumId") {
        clearFilter("categorySmallId")
      }
    },
    [setFilterRaw, clearFilter]
  )

  // Dynamic filter definitions with options based on current selection
  const dynamicFilterDefinitions = useMemo<FilterDefinition[]>(() => {
    const largeId = filterValues.categoryLargeId as string | undefined
    const mediumId = filterValues.categoryMediumId as string | undefined

    const mediumOptions = largeId
      ? data.categories.medium.filter((c) => c.largeId === largeId).map((c) => ({ value: c.id, label: c.name }))
      : data.categories.medium.map((c) => ({ value: c.id, label: c.name }))

    const smallOptions = mediumId
      ? data.categories.small.filter((c) => c.mediumId === mediumId).map((c) => ({ value: c.id, label: c.name }))
      : largeId
        ? data.categories.small
            .filter((c) => {
              const medium = data.categories.medium.find((m) => m.id === c.mediumId)
              return medium?.largeId === largeId
            })
            .map((c) => ({ value: c.id, label: c.name }))
        : data.categories.small.map((c) => ({ value: c.id, label: c.name }))

    return [
      {
        type: "select" as const,
        key: "categoryLargeId",
        label: "大カテゴリ",
        options: data.categories.large.map((c) => ({ value: c.id, label: c.name })),
      },
      {
        type: "select" as const,
        key: "categoryMediumId",
        label: "中カテゴリ",
        options: mediumOptions,
      },
      {
        type: "select" as const,
        key: "categorySmallId",
        label: "小カテゴリ",
        options: smallOptions,
      },
    ]
  }, [filterValues.categoryLargeId, filterValues.categoryMediumId, data.categories])

  const productSortOptions = useMemo<SortOption<(typeof enrichedProductEntries)[number]>[]>(() => [
    { key: "registered", label: "登録日", compareFn: (a, b) => a.registeredTime - b.registeredTime },
    { key: "name", label: "商品名", compareFn: (a, b) => new Intl.Collator("ja-JP").compare(a.product.name, b.product.name) },
    { key: "sale", label: "販売価格", compareFn: (a, b) => a.salePrice - b.salePrice },
    { key: "profit", label: "粗利", compareFn: (a, b) => a.profit - b.profit },
  ], [])

  const { sortedItems: filteredProductEntries, sortKey: productSortKey, sortDirection: productSortDir, setSortKey: setProductSortKey, setSortDirection: setProductSortDir, sortOptions: productSortOpts } = useTableSort(categoryFilteredEntries, productSortOptions, "registered", "desc")

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
        <TableToolbar
          search={{
            fields: productSearchFields,
            query: productSearchQuery,
            onQueryChange: setProductSearchQuery,
            checkedFields: productSearchCheckedFields,
            onCheckedFieldsChange: setProductSearchCheckedFields,
            placeholder: "商品を検索...",
          }}
          filter={{
            filterDefinitions: dynamicFilterDefinitions,
            filterValues,
            setFilter: setCascadingFilter,
            clearFilter,
            clearFilters,
            hasActiveFilters,
          }}
          sort={{
            sortKey: productSortKey,
            sortDirection: productSortDir,
            setSortKey: setProductSortKey,
            setSortDirection: setProductSortDir,
            sortOptions: productSortOpts,
          }}
        >
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
        </TableToolbar>

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
            onBulkDelete={onBulkDeleteProducts}
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
