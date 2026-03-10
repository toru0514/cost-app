"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { useAppData } from "@/lib/app-data"
import {
  loadProductListColumnSettings,
  upsertProductListColumnSettings,
} from "@/lib/app-data-sync"
import { calculateProductUnitCosts } from "@/lib/calculations"
import type { AppData, AuditFilters, Product } from "@/lib/types"
import { AnalyticsTab } from "./_components/analytics/analytics-tab"
import { AuditTab } from "./_components/audit/audit-tab"
import { BulkTab } from "./_components/bulk/bulk-tab"
import { CostTab } from "./_components/cost/cost-tab"
import { MasterTab } from "./_components/master/master-tab"
import {
  CustomizableProductTable,
  defaultProductTableColumnSettings,
  normalizeProductTableColumnSettings,
  type ProductTableColumnSettings,
} from "./_components/product-list/customizable-product-table"
import { ProductTab } from "./_components/product/product-tab"
import { StockListTab } from "./_components/stock-list/stock-list-tab"
import { BarChart3, Box, Boxes, ChevronDown, ClipboardList, FileDown, FileText, FileUp, Filter, LayoutDashboard, LogIn, LogOut, Menu, Package, PanelLeftClose, PanelLeftOpen, Plus, Search, X } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"

const tabOptions = [
  { value: "cost", label: "原価サマリ", icon: LayoutDashboard },
  { value: "analytics", label: "集計データ", icon: BarChart3 },
  { value: "product", label: "商品登録", icon: Package },
  { value: "master", label: "マスタ登録", icon: Boxes },
  { value: "list", label: "商品/在庫一覧", icon: ClipboardList },
  { value: "bulk", label: "一括処理", icon: Box },
  { value: "audit", label: "監査ログ", icon: FileText },
] as const

type TabValue = (typeof tabOptions)[number]["value"]

const tabPathMap: Record<TabValue, string> = {
  cost: "/cost",
  analytics: "/analytics",
  product: "/product",
  master: "/master",
  list: "/list",
  bulk: "/bulk",
  audit: "/audit",
}

export default function DashboardPage({ routeTab }: { routeTab: TabValue }) {
  const {
    data,
    hydrated,
    isSaving,
    actions,
    auditLogs,
    auditLogsLoading,
    auditHasMore,
    auditFilters,
    refreshAuditLogs,
    loadMoreAuditLogs,
    updateAuditFilters,
    stocks,
    stocksLoaded,
    setStock,
    adjustStock,
    materialStocks,
    materialStockUnits,
    packagingStocks,
    packagingStockUnits,
    masterStocksLoaded,
    setMaterialStock,
    setPackagingStock,
    adjustMaterialStock,
    adjustPackagingStock,
  } = useAppData()
  const handleAuditFiltersChange = useCallback(
    (next: AuditFilters) => {
      updateAuditFilters(next)
    },
    [updateAuditFilters]
  )
  const router = useRouter()
  const [activeTab, setActiveTabState] = useState<TabValue>(routeTab)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [copyProductId, setCopyProductId] = useState<string | null>(null)
  const [copyProductNonce, setCopyProductNonce] = useState(0)
  const [productSearchQuery, setProductSearchQuery] = useState("")
  const [productCategoryLargeFilter, setProductCategoryLargeFilter] = useState<string | null>(null)
  const [productCategoryMediumFilter, setProductCategoryMediumFilter] = useState<string | null>(null)
  const [productCategorySmallFilter, setProductCategorySmallFilter] = useState<string | null>(null)
  const [productSortKey, setProductSortKey] = useState("registered-desc")
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { state: authState, login, logout, signup, resetPassword } = useAuth()
  const isAuthenticated = authState.status === "authenticated"
  const [loginPanelOpen, setLoginPanelOpen] = useState(false)
  const [loginForm, setLoginForm] = useState({ name: "", email: "", password: "" })
  const [authMode, setAuthMode] = useState<"login" | "signup">("login")
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<Product | null>(null)
  const [pendingBackupRestore, setPendingBackupRestore] = useState<{ fileName: string; data: Partial<AppData> } | null>(null)
  const [productTableColumnSettings, setProductTableColumnSettings] = useState<ProductTableColumnSettings>(
    () => defaultProductTableColumnSettings()
  )
  const backupImportInputRef = useRef<HTMLInputElement | null>(null)
  const importGuestData = actions.importGuestData
  const authUserId = authState.status === "authenticated" ? authState.user.id : null
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

  const handleTabChange = useCallback((value: string) => {
    const nextTab = value as TabValue
    setActiveTabState(nextTab)
    router.push(tabPathMap[nextTab])
    setMobileNavOpen(false)
  }, [router])

  useEffect(() => {
    setActiveTabState(routeTab)
  }, [routeTab])

  const handleCreateProduct = useCallback(() => {
    setEditingProductId(null)
    setCopyProductId(null)
    handleTabChange("product")
  }, [handleTabChange])

  const handleEditProduct = useCallback(
    (productId: string) => {
      setEditingProductId(productId)
      setCopyProductId(null)
      handleTabChange("product")
    },
    [handleTabChange]
  )

  const handleCopyProduct = useCallback(
    (productId: string) => {
      setCopyProductId(productId)
      setCopyProductNonce((nonce) => nonce + 1)
      setEditingProductId(null)
      handleTabChange("product")
    },
    [handleTabChange]
  )

  const handleDeleteProduct = useCallback(
    (product: Product) => {
      setPendingDeleteProduct(product)
    },
    []
  )

  const confirmDeleteProduct = useCallback(() => {
    if (!pendingDeleteProduct) return
    const product = pendingDeleteProduct
    actions.removeProduct(product.id)
    actions.removeCostEntriesByProduct(product.id)
    toast.success("商品を削除しました", {
      description: `「${product.name}」の情報を削除しました。`,
    })
    setPendingDeleteProduct(null)
  }, [actions, pendingDeleteProduct])

  const closeDeleteProductDialog = useCallback(() => {
    setPendingDeleteProduct(null)
  }, [])

  const handleResetLocalStorage = useCallback(() => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("ローカル保存を完全にクリアします。よろしいですか？")
      if (!confirmed) return
    }
    actions.resetAll()
  }, [actions])

  const handleExportBackupJson = useCallback(() => {
    if (typeof window === "undefined" || isAuthenticated) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `cost-app-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success("バックアップを保存しました。")
  }, [data, isAuthenticated])

  const handleOpenBackupImport = useCallback(() => {
    if (isAuthenticated) return
    backupImportInputRef.current?.click()
  }, [isAuthenticated])

  const handleImportBackupJson = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const parsed = JSON.parse(text) as Partial<AppData>
        const hasAppDataShape =
          parsed !== null &&
          typeof parsed === "object" &&
          (Array.isArray(parsed.products) || Array.isArray(parsed.materials) || parsed.categories !== undefined)
        if (!hasAppDataShape) {
          toast.error("バックアップファイルとして認識できません。")
          return
        }
        setPendingBackupRestore({ fileName: file.name, data: parsed })
      } catch (error) {
        console.error("Failed to import backup json", error)
        toast.error("バックアップの復元に失敗しました。JSONファイルを確認してください。")
      } finally {
        event.target.value = ""
      }
    },
    []
  )

  const closeBackupRestoreDialog = useCallback(() => {
    setPendingBackupRestore(null)
  }, [])

  const confirmBackupRestore = useCallback(() => {
    if (!pendingBackupRestore) return
    const imported = importGuestData(pendingBackupRestore.data)
    if (!imported) return
    toast.success("バックアップを復元しました。", { description: `${pendingBackupRestore.fileName} を読み込みました。` })
    setPendingBackupRestore(null)
  }, [importGuestData, pendingBackupRestore])
  const handleLoginSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const email = loginForm.email.trim()
      const password = loginForm.password
      if (!email || !password) {
        toast.error("メールアドレスとパスワードを入力してください。")
        return
      }
      try {
        if (authMode === "signup") {
          const name = loginForm.name.trim()
          if (!name) {
            toast.error("氏名を入力してください。")
            return
          }
          await signup({ email, password, name })
          toast.success("登録しました", { description: `${email} でログインしました。` })
        } else {
          await login({ email, password })
          toast.success("ログインしました", { description: `${email} として利用中です。` })
        }
        setLoginPanelOpen(false)
        setLoginForm({ name: "", email: "", password: "" })
      } catch (error) {
        const message = error instanceof Error ? error.message : "認証に失敗しました。"
        toast.error(message)
      }
    },
    [authMode, loginForm, login, signup]
  )

  const handlePasswordReset = useCallback(async () => {
    if (isSendingReset) return
    const email = loginForm.email.trim()
    if (!email) {
      toast.error("パスワードリセット用のメールアドレスを入力してください。")
      return
    }
    setIsSendingReset(true)
    try {
      await resetPassword(email)
      toast.success("パスワードリセットメールを送信しました。", {
        description: `${email} を確認してください。`,
      })
      setResetPasswordOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "リセットメール送信に失敗しました。"
      toast.error(message)
    } finally {
      setIsSendingReset(false)
    }
  }, [isSendingReset, loginForm.email, resetPassword])

  const handleLogout = useCallback(() => {
    logout()
    toast.message("ゲストモードに戻りました")
  }, [logout])

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
    productSearchQuery,
    productSortKey,
  ])

  const availableMediumCategories = useMemo(
    () =>
      data.categories.medium.filter(
        (category) => !productCategoryLargeFilter || category.largeId === productCategoryLargeFilter
      ),
    [data.categories.medium, productCategoryLargeFilter]
  )

  const availableSmallCategories = useMemo(
    () =>
      data.categories.small.filter((category) => {
        if (productCategoryMediumFilter) {
          return category.mediumId === productCategoryMediumFilter
        }
        if (productCategoryLargeFilter) {
          const medium = data.categories.medium.find((item) => item.id === category.mediumId)
          return medium?.largeId === productCategoryLargeFilter
        }
        return true
      }),
    [data.categories.small, data.categories.medium, productCategoryLargeFilter, productCategoryMediumFilter]
  )

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

  const renderLoading = () => (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-4 p-10 text-muted-foreground">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-transparent" />
      <p>データを読み込み中です...</p>
    </main>
  )

  if (authState.status === "loading" || !hydrated) {
    return renderLoading()
  }

  const tabContentWidthMap: Record<TabValue, string> = {
    cost: "max-w-6xl",
    analytics: "max-w-6xl",
    product: "max-w-4xl",
    master: "max-w-5xl",
    list: "max-w-full",
    bulk: "max-w-4xl",
    audit: "max-w-full",
  }
  const mainMaxWidth = tabContentWidthMap[activeTab]
  const sidebarWidthClass = sidebarCollapsed ? "w-[76px]" : "w-[260px]"

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        {/* サイドバー */}
        <aside className={`hidden sticky top-0 h-screen overflow-y-auto border-r bg-card p-3 md:flex md:flex-col ${sidebarWidthClass}`}>
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            {!sidebarCollapsed && <p className="text-sm font-semibold">Cost App</p>}
            <Button type="button" variant="ghost" size="sm" onClick={() => setSidebarCollapsed((prev) => !prev)}>
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>
          <nav className="space-y-1">
            {tabOptions.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => handleTabChange(tab.value)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${
                    activeTab === tab.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  title={sidebarCollapsed ? tab.label : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{tab.label}</span>}
                </button>
              )
            })}
          </nav>
          <div className="mt-auto space-y-1 border-t pt-3">
            {!isAuthenticated && (
              <button
                type="button"
                onClick={actions.seedSample}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title={sidebarCollapsed ? "デモデータ投入" : undefined}
              >
                <Plus className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">デモデータ投入</span>}
              </button>
            )}
            {!isAuthenticated && (
              <>
                <button
                  type="button"
                  onClick={handleExportBackupJson}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title={sidebarCollapsed ? "バックアップ" : undefined}
                >
                  <FileDown className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">バックアップ</span>}
                </button>
                <button
                  type="button"
                  onClick={handleOpenBackupImport}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title={sidebarCollapsed ? "復元" : undefined}
                >
                  <FileUp className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">復元</span>}
                </button>
              </>
            )}
            {!isAuthenticated && (
              <button
                type="button"
                onClick={handleResetLocalStorage}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                title={sidebarCollapsed ? "データクリア" : undefined}
              >
                <X className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">データクリア</span>}
              </button>
            )}
            {!isAuthenticated ? (
              <button
                type="button"
                onClick={() => setLoginPanelOpen(true)}
                className="flex w-full items-center gap-3 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
                title={sidebarCollapsed ? "ログイン" : undefined}
              >
                <LogIn className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span>ログイン</span>}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title={sidebarCollapsed ? "ログアウト" : undefined}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span>ログアウト</span>}
              </button>
            )}
          </div>
        </aside>

        <input
          ref={backupImportInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportBackupJson}
        />

        <div className="flex min-h-screen flex-1 flex-col">
          {/* スティッキーヘッダー */}
          <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
            <div className="flex h-14 items-center justify-between gap-2 px-3 md:px-6">
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" className="md:hidden" onClick={() => setMobileNavOpen(true)}>
                  <Menu className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold">コスト設計ダッシュボード</span>
                {isSaving && <Badge variant="outline" className="text-xs text-muted-foreground">保存中...</Badge>}
              </div>
              {/* ヘッダー右上: ゲスト時はログインボタン、ログイン時はメールアドレス */}
              <div className="flex items-center gap-2">
                {!isAuthenticated ? (
                  <Button type="button" size="sm" onClick={() => setLoginPanelOpen(true)}>
                    <LogIn className="mr-1.5 h-4 w-4" />
                    ログイン
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">ログイン中: {authState.user.email}</span>
                )}
              </div>
            </div>
          </header>

          <main className={`flex-1 p-4 md:p-6 ${mainMaxWidth}`}>
            {/* ログインパネル */}
            {loginPanelOpen && authState.status !== "authenticated" && (
              <Card className="mb-6 border-primary/50 bg-background/95 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base">ログインして保存を共有</CardTitle>
                  <CardDescription>
                    {authMode === "login" ? "登録済みのメール・パスワードでログインします。" : "新規登録して Supabase 上にデータを保存します。"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-3" onSubmit={handleLoginSubmit}>
                    {authMode === "signup" && (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">氏名</label>
                        <Input
                          value={loginForm.name}
                          onChange={(event) => setLoginForm((prev) => ({ ...prev, name: event.target.value }))}
                          placeholder="例: コスト太郎"
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">メールアドレス</label>
                      <Input
                        type="email"
                        value={loginForm.email}
                        onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
                        placeholder="example@example.com"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">パスワード</label>
                      <Input
                        type="password"
                        value={loginForm.password}
                        onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                        placeholder="8文字以上"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <button
                        type="button"
                        className={`rounded border px-2 py-1 ${authMode === "login" ? "border-primary text-primary" : "border-transparent"}`}
                        onClick={() => {
                          setAuthMode("login")
                          setResetPasswordOpen(false)
                        }}
                      >
                        ログイン
                      </button>
                      <button
                        type="button"
                        className={`rounded border px-2 py-1 ${authMode === "signup" ? "border-primary text-primary" : "border-transparent"}`}
                        onClick={() => {
                          setAuthMode("signup")
                          setResetPasswordOpen(false)
                        }}
                      >
                        新規登録
                      </button>
                    </div>
                    {authMode === "login" && (
                      <div className="space-y-2">
                        <button
                          type="button"
                          className="text-xs text-primary underline underline-offset-2"
                          onClick={() => setResetPasswordOpen((prev) => !prev)}
                        >
                          パスワードを忘れた方はこちら
                        </button>
                        {resetPasswordOpen && (
                          <div className="rounded-md border border-dashed p-3">
                            <p className="mb-2 text-xs text-muted-foreground">
                              入力したメールアドレス宛に、パスワードリセットメールを送信します。
                            </p>
                            <p className="mb-2 text-xs text-muted-foreground">
                              上のメールアドレス欄を入力してから送信してください。
                            </p>
                            <Button type="button" size="sm" variant="outline" onClick={handlePasswordReset} disabled={isSendingReset}>
                              {isSendingReset ? "送信中..." : "リセットメールを送信"}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" size="sm">
                        {authMode === "login" ? "ログイン" : "登録してログイン"}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setLoginPanelOpen(false)}>
                        キャンセル
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="dashboard-table-style">

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
            materialStocks={materialStocks}
            packagingStocks={packagingStocks}
            packagingStockUnits={packagingStockUnits}
            masterStocksLoaded={masterStocksLoaded}
            isAuthenticated={isAuthenticated}
            onSetStock={setStock}
            editingProductId={editingProductId}
            onRequestEditClear={() => setEditingProductId(null)}
            copySourceProductId={copyProductId}
            copyRequestNonce={copyProductNonce}
          />
        </TabsContent>

        <TabsContent value="master" className="space-y-6">
          <MasterTab
            data={data}
            actions={actions}
            isAuthenticated={isAuthenticated}
            materialStocks={materialStocks}
            materialStockUnits={materialStockUnits}
            packagingStocks={packagingStocks}
            packagingStockUnits={packagingStockUnits}
            masterStocksLoaded={masterStocksLoaded}
            onSetMaterialStock={setMaterialStock}
            onSetPackagingStock={setPackagingStock}
            onAdjustMaterialStock={adjustMaterialStock}
            onAdjustPackagingStock={adjustPackagingStock}
          />
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
          <div className="space-y-4">
            {/* ページヘッダー */}
            <div>
              <h1 className="text-2xl font-semibold">商品/在庫一覧</h1>
              <p className="text-muted-foreground">登録済み商品のカテゴリ・オプション・備考を確認</p>
            </div>

            {/* ツールバー */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* 検索ボックス（Searchアイコン付き） */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={productSearchQuery}
                    onChange={(event) => setProductSearchQuery(event.target.value)}
                    placeholder="商品を検索..."
                    className="h-9 w-64 rounded-md border bg-transparent pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
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
                  onClick={handleCreateProduct}
                  className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  新規追加
                </button>
              </div>
            </div>

            {/* テーブル */}
            {data.products.length === 0 ? (
              <p className="text-sm text-muted-foreground">まだ商品がありません。</p>
            ) : filteredProductEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">条件に一致する商品がありません。</p>
            ) : (
              <CustomizableProductTable
                entries={filteredProductEntries}
                isAuthenticated={isAuthenticated}
                stocks={stocks}
                stocksLoaded={stocksLoaded}
                columnSettings={productTableColumnSettings}
                onColumnSettingsChange={handleProductTableColumnSettingsChange}
                onAdjustStock={adjustStock}
                onEdit={handleEditProduct}
                onCopy={handleCopyProduct}
                onDelete={handleDeleteProduct}
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
          />
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <BulkTab data={data} actions={actions} />
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <AuditTab
            logs={auditLogs}
            loading={auditLogsLoading}
            onRefresh={refreshAuditLogs}
            onLoadMore={loadMoreAuditLogs}
            hasMore={auditHasMore}
            filters={auditFilters}
            onFiltersChange={handleAuditFiltersChange}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={pendingDeleteProduct !== null} onOpenChange={(open) => !open && closeDeleteProductDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>商品を削除しますか？</DialogTitle>
            <DialogDescription>
              {pendingDeleteProduct
                ? `「${pendingDeleteProduct.name}」を削除します。関連するコスト明細も削除されます。`
                : "関連するコスト明細も削除されます。"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeDeleteProductDialog}>
              キャンセル
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDeleteProduct}>
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={pendingBackupRestore !== null} onOpenChange={(open) => !open && closeBackupRestoreDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>バックアップを復元しますか？</DialogTitle>
            <DialogDescription>
              現在のデータを上書きします。{pendingBackupRestore ? `対象ファイル: ${pendingBackupRestore.fileName}` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeBackupRestoreDialog}>
              キャンセル
            </Button>
            <Button type="button" variant="destructive" onClick={confirmBackupRestore}>
              復元する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          </main>
        </div>
      </div>

      {/* モバイルドロワーメニュー */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} aria-label="メニューを閉じる" />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r bg-card p-3 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Cost App</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setMobileNavOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="space-y-1">
              {tabOptions.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => handleTabChange(tab.value)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${
                      activeTab === tab.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                )
              })}
            </nav>
            <div className="mt-auto space-y-1 border-t pt-3">
              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={() => { actions.seedSample(); setMobileNavOpen(false) }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span>デモデータ投入</span>
                </button>
              )}
              {!isAuthenticated && (
                <>
                  <button
                    type="button"
                    onClick={() => { handleExportBackupJson(); setMobileNavOpen(false) }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <FileDown className="h-4 w-4 shrink-0" />
                    <span>バックアップ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleOpenBackupImport(); setMobileNavOpen(false) }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <FileUp className="h-4 w-4 shrink-0" />
                    <span>復元</span>
                  </button>
                </>
              )}
              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={() => { handleResetLocalStorage(); setMobileNavOpen(false) }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  <X className="h-4 w-4 shrink-0" />
                  <span>データクリア</span>
                </button>
              )}
              {!isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => { setLoginPanelOpen(true); setMobileNavOpen(false) }}
                  className="flex w-full items-center gap-3 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <LogIn className="h-4 w-4 shrink-0" />
                  <span>ログイン</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { handleLogout(); setMobileNavOpen(false) }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>ログアウト</span>
                </button>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
