"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { useAppData } from "@/lib/app-data"
import { buildExchangeRateMap } from "@/lib/calculations"
import type { AppData, AuditFilters, Product } from "@/lib/types"
import { AnalyticsTab } from "./_components/analytics/analytics-tab"
import { AuditTab } from "./_components/audit/audit-tab"
import { BulkTab } from "./_components/bulk/bulk-tab"
import { CostTab } from "./_components/cost/cost-tab"
import { ListTab } from "./_components/list/list-tab"
import { MasterTab } from "./_components/master/master-tab"
import { ProductTab } from "./_components/product/product-tab"
import { ConfirmationDialogs } from "./_components/shared/confirmation-dialogs"
import { KeyboardShortcutsDialog } from "./_components/shared/keyboard-shortcuts-dialog"
import { LoginPanel } from "./_components/shared/login-panel"
import { NotificationBell } from "./_components/shared/notification-bell"
import { OnboardingBanner } from "./_components/shared/onboarding-banner"
import { Sidebar } from "./_components/shared/sidebar"
import { useBackup } from "./_components/shared/use-backup"
import { BarChart3, Box, Boxes, ClipboardList, FileText, LayoutDashboard, LogIn, Menu, Package } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import { useRouter, useSearchParams } from "next/navigation"

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

export default function DashboardPage({ routeTab, initialData }: { routeTab: TabValue; initialData?: AppData | null }) {
  const {
    data,
    hydrated,
    isSaving,
    pendingGuestData,
    remoteLoadCompleted,
    mergeGuestData,
    discardGuestData,
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
    stockAlertSettings,
    stockAlertSettingsLoaded,
    updateStockAlertSetting,
    checkAndNotifyLowStock,
    exchangeRates,
    refreshExchangeRates,
  } = useAppData(initialData)

  const exchangeRateMap = useMemo(() => buildExchangeRateMap(exchangeRates), [exchangeRates])

  const handleAuditFiltersChange = useCallback(
    (next: AuditFilters) => {
      updateAuditFilters(next)
    },
    [updateAuditFilters]
  )

  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTabState] = useState<TabValue>(routeTab)
  const [editingProductId, setEditingProductId] = useState<string | null>(() => searchParams.get("edit"))
  const [copyProductId, setCopyProductId] = useState<string | null>(() => searchParams.get("copy"))
  const [copyProductNonce, setCopyProductNonce] = useState(() => searchParams.get("copy") ? 1 : 0)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const { state: authState, logout } = useAuth()
  const isAuthenticated = authState.status === "authenticated"
  const authUserId = isAuthenticated ? authState.user.id : null
  const [loginPanelOpen, setLoginPanelOpen] = useState(false)
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<Product | null>(null)
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false)
  const [pendingBulkDeleteProducts, setPendingBulkDeleteProducts] = useState<Product[] | null>(null)

  const importGuestData = actions.importGuestData
  const backup = useBackup({ data, isAuthenticated, importGuestData })

  const handleTabChange = useCallback((value: string) => {
    const nextTab = value as TabValue
    setActiveTabState(nextTab)
    router.push(tabPathMap[nextTab])
    setMobileNavOpen(false)
  }, [router])

  useEffect(() => {
    setActiveTabState(routeTab)
  }, [routeTab])

  // グローバルキーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 入力中は無視
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return
      }

      const mod = e.metaKey || e.ctrlKey
      // Ctrl/Cmd+K: 検索フォーカス
      if (mod && e.key === "k") {
        e.preventDefault()
        const searchInput = document.querySelector<HTMLInputElement>("[data-search-input]")
        searchInput?.focus()
      }
      // ?: ショートカットヘルプを表示（Shift+/で入力される）
      if (e.key === "?" && !mod) {
        e.preventDefault()
        setShortcutsDialogOpen(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
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
      router.push(`/product?edit=${encodeURIComponent(productId)}`)
    },
    [router]
  )

  const handleCopyProduct = useCallback(
    (productId: string) => {
      setCopyProductId(productId)
      setCopyProductNonce((nonce) => nonce + 1)
      setEditingProductId(null)
      router.push(`/product?copy=${encodeURIComponent(productId)}`)
    },
    [router]
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

  const handleBulkDeleteProducts = useCallback(
    (products: Product[]) => {
      setPendingBulkDeleteProducts(products)
    },
    []
  )

  const confirmBulkDeleteProducts = useCallback(() => {
    if (!pendingBulkDeleteProducts || pendingBulkDeleteProducts.length === 0) return
    pendingBulkDeleteProducts.forEach((product) => {
      actions.removeProduct(product.id)
      actions.removeCostEntriesByProduct(product.id)
    })
    toast.success(`${pendingBulkDeleteProducts.length}件の商品を削除しました`)
    setPendingBulkDeleteProducts(null)
  }, [actions, pendingBulkDeleteProducts])

  const closeBulkDeleteDialog = useCallback(() => {
    setPendingBulkDeleteProducts(null)
  }, [])

  const handleResetLocalStorage = useCallback(() => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("ローカル保存を完全にクリアします。よろしいですか？")
      if (!confirmed) return
    }
    actions.resetAll()
  }, [actions])

  const handleLogout = useCallback(() => {
    logout()
    toast.message("ゲストモードに戻りました")
  }, [logout])

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
    master: "max-w-7xl",
    list: "max-w-full",
    bulk: "max-w-4xl",
    audit: "max-w-full",
  }
  const mainMaxWidth = tabContentWidthMap[activeTab]

  return (
    <div className="bg-background">
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isAuthenticated={isAuthenticated}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
          mobileNavOpen={mobileNavOpen}
          onMobileNavOpenChange={setMobileNavOpen}
          onSeedSample={actions.seedSample}
          onExportBackup={backup.handleExportBackupJson}
          onOpenBackupImport={backup.handleOpenBackupImport}
          onResetLocalStorage={handleResetLocalStorage}
          onLoginOpen={() => setLoginPanelOpen(true)}
          onLogout={handleLogout}
          tabOptions={tabOptions}
        />

        <input
          ref={backup.backupImportInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={backup.handleImportBackupJson}
        />

        <div className="flex flex-1 flex-col overflow-y-auto min-w-0">
          {/* スティッキーヘッダー */}
          <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
            <div className="flex h-14 items-center justify-between gap-2 px-3 md:px-6">
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="icon" className="md:hidden h-10 w-10" onClick={() => setMobileNavOpen(true)}>
                  <Menu className="h-7 w-7" />
                </Button>
                <div className="flex items-center gap-1.5">
                  <span className="hidden text-xs text-muted-foreground sm:inline">Cost App</span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">/</span>
                  <span className="text-xs font-semibold md:text-sm">
                    {tabOptions.find((t) => t.value === activeTab)?.label ?? activeTab}
                  </span>
                  {isSaving && <Badge variant="outline" className="text-xs text-muted-foreground">保存中...</Badge>}
                </div>
              </div>
              {/* ヘッダー右上: ゲスト時はログインボタン、ログイン時はメールアドレス */}
              <div className="flex items-center gap-2">
                <NotificationBell isAuthenticated={isAuthenticated} />
                {!isAuthenticated ? (
                  <Button type="button" size="sm" onClick={() => setLoginPanelOpen(true)}>
                    <LogIn className="mr-1.5 h-4 w-4" />
                    ログイン
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">ログイン中<span className="hidden sm:inline">: {authState.user.email}</span></span>
                )}
              </div>
            </div>
          </header>

          <main className={`flex-1 min-w-0 overflow-x-hidden p-4 pr-10 md:p-6 ${mainMaxWidth}`}>
            {/* オンボーディングバナー（初回訪問時のみ表示） */}
            <OnboardingBanner
              onNavigateToMaster={() => handleTabChange("master")}
              onNavigateToProduct={handleCreateProduct}
              isAuthenticated={isAuthenticated}
              hasExistingData={data.products.length > 0 || data.materials.length > 0}
              hasMasterData={data.materials.length > 0 || data.packagingItems.length > 0 || data.equipments.length > 0}
              hasProductData={data.products.length > 0}
            />

            {/* ログインパネル */}
            {loginPanelOpen && authState.status !== "authenticated" && (
              <LoginPanel onClose={() => setLoginPanelOpen(false)} />
            )}

            <Tabs value={activeTab} onValueChange={handleTabChange} className="dashboard-table-style">
              <TabsContent value="cost" className="space-y-6">
                <CostTab data={data} exchangeRateMap={exchangeRateMap} />
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <AnalyticsTab data={data} exchangeRateMap={exchangeRateMap} />
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
                  onRequestEditClear={() => {
                    setEditingProductId(null)
                    setCopyProductId(null)
                    if (searchParams.get("edit") || searchParams.get("copy")) {
                      router.replace("/product")
                    }
                  }}
                  copySourceProductId={copyProductId}
                  copyRequestNonce={copyProductNonce}
                />
              </TabsContent>

              <TabsContent value="master" className="space-y-6">
                <MasterTab
                  data={data}
                  actions={actions}
                  isAuthenticated={isAuthenticated}
                  onRefreshExchangeRates={refreshExchangeRates}
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
                <ListTab
                  data={data}
                  exchangeRateMap={exchangeRateMap}
                  isAuthenticated={isAuthenticated}
                  authUserId={authUserId}
                  stocks={stocks}
                  stocksLoaded={stocksLoaded}
                  materialStocks={materialStocks}
                  materialStockUnits={materialStockUnits}
                  packagingStocks={packagingStocks}
                  packagingStockUnits={packagingStockUnits}
                  masterStocksLoaded={masterStocksLoaded}
                  adjustStock={adjustStock}
                  adjustMaterialStock={adjustMaterialStock}
                  adjustPackagingStock={adjustPackagingStock}
                  stockAlertSettings={stockAlertSettings}
                  stockAlertSettingsLoaded={stockAlertSettingsLoaded}
                  updateStockAlertSetting={updateStockAlertSetting}
                  checkAndNotifyLowStock={checkAndNotifyLowStock}
                  onCreateProduct={handleCreateProduct}
                  onEditProduct={handleEditProduct}
                  onCopyProduct={handleCopyProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onBulkDeleteProducts={handleBulkDeleteProducts}
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

            <ConfirmationDialogs
              pendingDeleteProduct={pendingDeleteProduct}
              onCloseDeleteProduct={closeDeleteProductDialog}
              onConfirmDeleteProduct={confirmDeleteProduct}
              pendingBackupRestore={backup.pendingBackupRestore}
              onCloseBackupRestore={backup.closeBackupRestoreDialog}
              onConfirmBackupRestore={backup.confirmBackupRestore}
              pendingGuestData={pendingGuestData}
              remoteLoadCompleted={remoteLoadCompleted}
              onDiscardGuestData={discardGuestData}
              onMergeGuestData={mergeGuestData}
              bulkDelete={pendingBulkDeleteProducts ? {
                open: true,
                itemCount: pendingBulkDeleteProducts.length,
                itemType: "商品",
                onClose: closeBulkDeleteDialog,
                onConfirm: confirmBulkDeleteProducts,
              } : null}
            />
            <KeyboardShortcutsDialog
              open={shortcutsDialogOpen}
              onOpenChange={setShortcutsDialogOpen}
            />
          </main>
        </div>
      </div>
    </div>
  )
}
