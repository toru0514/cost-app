"use client"

import { useCallback, useMemo, useRef, useState, type ChangeEvent } from "react"

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAppData } from "@/lib/app-data"
import { calculateProductUnitCosts, formatCurrency } from "@/lib/calculations"
import type { AppData, AuditFilters, Product } from "@/lib/types"
import { MasterTab } from "./_components/master/master-tab"
import { ProductTab } from "./_components/product/product-tab"
import { CostTab } from "./_components/cost/cost-tab"
import { AnalyticsTab } from "./_components/analytics/analytics-tab"
import { AuditTab } from "./_components/audit/audit-tab"
import { BulkTab } from "./_components/bulk/bulk-tab"
import { StockTab } from "./_components/stock/stock-tab"
import { Copy, Edit3, FileDown, FileUp, Menu, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"

const tabOptions = [
  { value: "cost", label: "原価サマリ" },
  { value: "analytics", label: "集計データ" },
  { value: "product", label: "商品登録" },
  { value: "master", label: "マスタ登録" },
  { value: "list", label: "商品一覧" },
  { value: "stock", label: "在庫" },
  { value: "bulk", label: "一括処理" },
  { value: "audit", label: "監査ログ" },
]


export default function Home() {
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
    refreshStocks,
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
  const [activeTab, setActiveTabState] = useState(() => {
    if (typeof window === "undefined") return "cost"
    return window.localStorage.getItem("cost-app-active-tab") ?? "cost"
  })
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [copyProductId, setCopyProductId] = useState<string | null>(null)
  const [copyProductNonce, setCopyProductNonce] = useState(0)
  const [productSearchQuery, setProductSearchQuery] = useState("")
  const [productCategoryLargeFilter, setProductCategoryLargeFilter] = useState<string | null>(null)
  const [productCategoryMediumFilter, setProductCategoryMediumFilter] = useState<string | null>(null)
  const [productCategorySmallFilter, setProductCategorySmallFilter] = useState<string | null>(null)
  const [productSortKey, setProductSortKey] = useState("registered-desc")
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { state: authState, login, logout, signup, resetPassword } = useAuth()
  const isAuthenticated = authState.status === "authenticated"
  const [loginPanelOpen, setLoginPanelOpen] = useState(false)
  const [loginForm, setLoginForm] = useState({ name: "", email: "", password: "" })
  const [authMode, setAuthMode] = useState<"login" | "signup">("login")
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<Product | null>(null)
  const [pendingBackupRestore, setPendingBackupRestore] = useState<{ fileName: string; data: Partial<AppData> } | null>(null)
  const backupImportInputRef = useRef<HTMLInputElement | null>(null)
  const importGuestData = actions.importGuestData
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
    setActiveTabState(value)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cost-app-active-tab", value)
    }
    setMobileNavOpen(false)
  }, [])

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

  const renderLoading = () => (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-4 p-10 text-muted-foreground">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-transparent" />
      <p>データを読み込み中です...</p>
    </main>
  )

  if (authState.status === "loading" || !hydrated) {
    return renderLoading()
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl space-y-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">コスト設計ダッシュボード</h1>
        <p className="text-muted-foreground">
          マスタ登録から商品原価の入力、分析カードの確認までを一元管理できるダッシュボードです。
        </p>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">マスタ {data.materials.length + data.packagingItems.length + data.laborRoles.length + data.equipments.length} 件</Badge>
          <Badge variant="outline">商品 {data.products.length} 件</Badge>
          <Badge variant="outline">コスト明細 {Object.values(data.costEntries).reduce((sum, list) => sum + list.length, 0)} 件</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={actions.seedSample}
            disabled={isAuthenticated}
            title={isAuthenticated ? "ログイン中は利用できません" : undefined}
          >
            デモデータ投入
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetLocalStorage}
            disabled={isAuthenticated}
            title={isAuthenticated ? "ログイン中は利用できません" : undefined}
          >
            ローカル保存をクリア
          </Button>
          {!isAuthenticated ? (
            <>
              <Button variant="outline" size="sm" onClick={handleExportBackupJson}>
                <FileDown className="mr-1.5 h-4 w-4" />
                バックアップ
              </Button>
              <Button variant="outline" size="sm" onClick={handleOpenBackupImport}>
                <FileUp className="mr-1.5 h-4 w-4" />
                復元
              </Button>
              <input
                ref={backupImportInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImportBackupJson}
              />
            </>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isAuthenticated ? "default" : "outline"}>
            {isAuthenticated ? `ログイン中: ${authState.user.name ?? authState.user.email}` : "ゲストモード"}
          </Badge>
          {isSaving && (
            <Badge variant="outline" className="text-muted-foreground">
              保存中...
            </Badge>
          )}
          {!isAuthenticated ? (
            <Button type="button" size="sm" onClick={() => setLoginPanelOpen((prev) => !prev)}>
              ログイン
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={handleLogout}>
              ログアウト
            </Button>
          )}
        </div>
        <Button type="button" variant="outline" className="mt-2 w-full md:hidden" onClick={() => setMobileNavOpen(true)}>
          <Menu className="mr-2 h-4 w-4" />
          メニューを開く
        </Button>
        {loginPanelOpen && authState.status !== "authenticated" && (
          <Card className="mt-3 border-primary/50 bg-background/95 shadow-lg">
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
      </header>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 px-4 pb-8 pt-16 md:hidden">
          <div className="mx-auto max-w-sm rounded-2xl bg-background p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">移動先を選択</p>
              <Button type="button" size="sm" variant="ghost" onClick={() => setMobileNavOpen(false)}>
                閉じる
              </Button>
            </div>
            <div className="space-y-2">
              {tabOptions.map((tab) => (
                <Button
                  key={tab.value}
                  type="button"
                  variant={activeTab === tab.value ? "secondary" : "outline"}
                  className="w-full justify-between"
                  onClick={() => handleTabChange(tab.value)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="hidden md:inline-flex">
          <TabsTrigger value="cost">原価サマリ</TabsTrigger>
          <TabsTrigger value="analytics">集計データ</TabsTrigger>
          <TabsTrigger value="product">商品登録</TabsTrigger>
          <TabsTrigger value="master">マスタ登録</TabsTrigger>
          <TabsTrigger value="list">商品一覧</TabsTrigger>
          <TabsTrigger value="bulk">一括処理</TabsTrigger>
          <TabsTrigger value="audit">監査ログ</TabsTrigger>
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
            stocks={stocks}
            stocksLoaded={stocksLoaded}
            isAuthenticated={isAuthenticated}
            onAdjustStock={adjustStock}
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
                  value={productCategoryLargeFilter ?? "all"}
                  onValueChange={handleCategoryLargeFilterChange}
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
                <Select
                  value={productCategoryMediumFilter ?? "all"}
                  onValueChange={handleCategoryMediumFilterChange}
                >
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="中カテゴリで絞り込み" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての中カテゴリ</SelectItem>
                    {availableMediumCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={productCategorySmallFilter ?? "all"}
                  onValueChange={handleCategorySmallFilterChange}
                >
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="小カテゴリで絞り込み" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての小カテゴリ</SelectItem>
                    {availableSmallCategories.map((category) => (
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
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>商品</TableHead>
                      <TableHead>カテゴリ</TableHead>
                    <TableHead>オプション/個数</TableHead>
                    <TableHead>配送方法</TableHead>
                    <TableHead>使用設備</TableHead>
                    <TableHead>制作ロット数</TableHead>
                    <TableHead>想定生産数</TableHead>
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
                          <TableCell className="text-xs text-muted-foreground">{product.productionLotSize ?? 0}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{product.expectedProduction?.quantity ?? 0}</TableCell>
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
                                className="w-full sm:w-auto"
                                onClick={() => handleEditProduct(product.id)}
                              >
                                <Edit3 className="mr-1 h-4 w-4" />
                                編集
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="w-full sm:w-auto"
                                onClick={() => handleCopyProduct(product.id)}
                              >
                                <Copy className="mr-1 h-4 w-4" />
                                コピー
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                className="w-full sm:w-auto"
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="space-y-6">
          <StockTab
            data={data}
            products={data.products}
            stocks={stocks}
            stocksLoaded={stocksLoaded}
            materialStocks={materialStocks}
            masterStocksLoaded={masterStocksLoaded}
            isAuthenticated={isAuthenticated}
            onAdjust={adjustStock}
            onSet={setStock}
            onRefresh={refreshStocks}
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
  )
}
