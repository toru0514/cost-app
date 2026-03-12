"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, useState, type ComponentType, type ReactNode } from "react"
import { BarChart3, Box, Boxes, ClipboardList, Database, Download, FileText, LayoutDashboard, LogIn, LogOut, Menu, Package, PanelLeftClose, PanelLeftOpen, Settings, Trash2, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"

type NavItem = {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { href: "/ui-prototype/cost", label: "原価サマリ", icon: LayoutDashboard },
  { href: "/ui-prototype/analytics", label: "集計データ", icon: BarChart3 },
  { href: "/ui-prototype/product", label: "商品登録", icon: Package },
  { href: "/ui-prototype/master", label: "マスタ登録", icon: Boxes },
  { href: "/ui-prototype/list", label: "商品/在庫一覧", icon: ClipboardList },
  { href: "/ui-prototype/bulk", label: "一括処理", icon: Box },
  { href: "/ui-prototype/audit", label: "監査ログ", icon: FileText },
]

// 案B用: メニュー下部のアクション
type ActionItem = {
  label: string
  icon: ComponentType<{ className?: string }>
  variant?: "default" | "destructive"
}

const guestActions: ActionItem[] = [
  { label: "デモデータ投入", icon: Database },
  { label: "バックアップ", icon: Download },
  { label: "復元", icon: Upload },
  { label: "データクリア", icon: Trash2, variant: "destructive" },
]

const authActions: ActionItem[] = [
  { label: "デモデータ投入", icon: Database },
]

function NavLinks({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            title={collapsed ? item.label : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

// 案B: メニュー下部のアクションボタン
function MenuActions({ collapsed, isGuest }: { collapsed: boolean; isGuest: boolean }) {
  const actions = isGuest ? guestActions : authActions

  return (
    <div className="space-y-1">
      {actions.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.label}
            type="button"
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              item.variant === "destructive"
                ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            title={collapsed ? item.label : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </button>
        )
      })}
    </div>
  )
}

// セクションごとの最適幅設定
const sectionMaxWidths: Record<string, string> = {
  cost: "max-w-6xl",      // サマリーカード + テーブル
  analytics: "max-w-6xl", // グラフ（将来的にグリッド化）
  product: "max-w-4xl",   // 入力フォーム（狭め）
  master: "max-w-5xl",    // リスト/テーブル
  list: "max-w-full",     // 大きなテーブル（全幅）
  bulk: "max-w-4xl",      // ボタン群 + ログ（狭め）
  audit: "max-w-full",    // テーブル（全幅）
  settings: "max-w-3xl",  // 設定ページ（狭め）
}

export function PrototypeShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  // プロトタイプ用: ログイン状態をシミュレート
  const [isGuest, setIsGuest] = useState(true)

  const sidebarWidthClass = useMemo(() => (collapsed ? "w-[76px]" : "w-[240px]"), [collapsed])

  // 現在のセクションに応じた幅を取得
  const currentSection = pathname.split("/").pop() ?? ""
  const contentMaxWidth = sectionMaxWidths[currentSection] ?? "max-w-6xl"

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen overflow-hidden">
        {/* 案B: サイドバーにナビ + アクションを統合 */}
        <aside className={`hidden h-full overflow-y-auto border-r bg-card p-3 md:flex md:flex-col ${sidebarWidthClass}`}>
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            {!collapsed && <p className="text-sm font-semibold">Cost App</p>}
            <Button type="button" variant="ghost" size="sm" onClick={() => setCollapsed((prev) => !prev)}>
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>

          {/* ナビゲーション */}
          <NavLinks collapsed={collapsed} />

          {/* 案B: メニュー下部にアクションを統合 */}
          <div className="mt-auto space-y-2 border-t pt-3">
            <MenuActions collapsed={collapsed} isGuest={isGuest} />

            {/* ログイン/ログアウトボタン */}
            {isGuest ? (
              <button
                type="button"
                onClick={() => setIsGuest(false)}
                className="flex w-full items-center gap-3 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
                title={collapsed ? "ログイン" : undefined}
              >
                <LogIn className="h-4 w-4 shrink-0" />
                {!collapsed && <span>ログイン</span>}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsGuest(true)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title={collapsed ? "ログアウト" : undefined}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!collapsed && <span>ログアウト</span>}
              </button>
            )}
          </div>
        </aside>

        <div className="flex flex-1 flex-col overflow-y-auto">
          <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
            <div className="flex h-14 items-center justify-between gap-2 px-3 md:px-6">
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" className="md:hidden" onClick={() => setMobileOpen(true)}>
                  <Menu className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold">コスト設計ダッシュボード</span>
              </div>
              {/* 案B: ヘッダー右上 - ゲスト時はログインボタン表示 */}
              <div className="flex items-center gap-2">
                {isGuest ? (
                  <Button type="button" size="sm" onClick={() => setIsGuest(false)}>
                    <LogIn className="mr-1.5 h-4 w-4" />
                    ログイン
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">ログイン中: demo@example.com</span>
                )}
              </div>
            </div>
          </header>

          <main className={`flex-1 p-4 md:p-6 ${contentMaxWidth}`}>{children}</main>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} aria-label="メニューを閉じる" />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r bg-card p-3 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Cost App</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <NavLinks collapsed={false} onNavigate={() => setMobileOpen(false)} />

            {/* 案B: モバイルメニュー下部にもアクションを統合 */}
            <div className="mt-auto space-y-2 border-t pt-3">
              <MenuActions collapsed={false} isGuest={isGuest} />
              {isGuest ? (
                <button
                  type="button"
                  onClick={() => { setIsGuest(false); setMobileOpen(false) }}
                  className="flex w-full items-center gap-3 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <LogIn className="h-4 w-4 shrink-0" />
                  <span>ログイン</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setIsGuest(true); setMobileOpen(false) }}
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
