"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  BarChart3,
  Box,
  Boxes,
  Camera,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
  X,
} from "lucide-react"
import Link from "next/link"

type AuthPageLayoutProps = {
  children: React.ReactNode
  title: string
  activeMenu?: "teams" | "settings" | "photos"
}

export function AuthPageLayout({ children, title, activeMenu }: AuthPageLayoutProps) {
  const { state: authState, logout } = useAuth()
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    router.push("/cost")
  }

  const sidebarWidthClass = sidebarCollapsed ? "w-[76px]" : "w-[260px]"
  const userEmail = authState.status === "authenticated" ? authState.user?.email : null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* デスクトップサイドバー */}
      <aside className={`hidden h-full overflow-y-auto border-r bg-card p-3 md:flex md:flex-col ${sidebarWidthClass}`}>
        <div className={`mb-3 flex items-center px-1 ${sidebarCollapsed ? "flex-col gap-1" : "justify-between gap-2"}`}>
          {!sidebarCollapsed && <p className="text-sm font-semibold">Cost App</p>}
          <div className={`flex items-center ${sidebarCollapsed ? "flex-col gap-1" : "gap-1"}`}>
            <ThemeToggle />
            <Button type="button" variant="ghost" size="sm" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <nav className="space-y-1">
          <Link
            href="/cost"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={sidebarCollapsed ? "原価サマリ" : undefined}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span>原価サマリ</span>}
          </Link>
          <Link
            href="/analytics"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={sidebarCollapsed ? "集計データ" : undefined}
          >
            <BarChart3 className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span>集計データ</span>}
          </Link>
          <Link
            href="/product"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={sidebarCollapsed ? "商品登録" : undefined}
          >
            <Package className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span>商品登録</span>}
          </Link>
          <Link
            href="/master"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={sidebarCollapsed ? "マスタ登録" : undefined}
          >
            <Boxes className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span>マスタ登録</span>}
          </Link>
          <Link
            href="/list"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={sidebarCollapsed ? "商品/在庫一覧" : undefined}
          >
            <ClipboardList className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span>商品/在庫一覧</span>}
          </Link>
          <Link
            href="/bulk"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={sidebarCollapsed ? "一括処理" : undefined}
          >
            <Box className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span>一括処理</span>}
          </Link>
          <Link
            href="/audit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={sidebarCollapsed ? "監査ログ" : undefined}
          >
            <FileText className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span>監査ログ</span>}
          </Link>
        </nav>
        <div className="mt-auto space-y-1 border-t pt-3">
          <Link
            href="/photos"
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              activeMenu === "photos"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            title={sidebarCollapsed ? "写真管理" : undefined}
          >
            <Camera className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>写真管理</span>}
          </Link>
          <Link
            href="/teams"
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              activeMenu === "teams"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            title={sidebarCollapsed ? "チーム" : undefined}
          >
            <Users className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>チーム</span>}
          </Link>
          <Link
            href="/settings"
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              activeMenu === "settings"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            title={sidebarCollapsed ? "設定" : undefined}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>設定</span>}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={sidebarCollapsed ? "ログアウト" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>ログアウト</span>}
          </button>
        </div>
      </aside>

      {/* モバイルドロワーメニュー */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} aria-label="メニューを閉じる" />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r bg-card p-3 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Cost App</p>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <Button type="button" variant="ghost" size="sm" onClick={() => setMobileNavOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <nav className="space-y-1">
              <Link
                href="/cost"
                onClick={() => setMobileNavOpen(false)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LayoutDashboard className="h-5 w-5 shrink-0" />
                <span>原価サマリ</span>
              </Link>
              <Link
                href="/analytics"
                onClick={() => setMobileNavOpen(false)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <BarChart3 className="h-5 w-5 shrink-0" />
                <span>集計データ</span>
              </Link>
              <Link
                href="/product"
                onClick={() => setMobileNavOpen(false)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Package className="h-5 w-5 shrink-0" />
                <span>商品登録</span>
              </Link>
              <Link
                href="/master"
                onClick={() => setMobileNavOpen(false)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Boxes className="h-5 w-5 shrink-0" />
                <span>マスタ登録</span>
              </Link>
              <Link
                href="/list"
                onClick={() => setMobileNavOpen(false)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ClipboardList className="h-5 w-5 shrink-0" />
                <span>商品/在庫一覧</span>
              </Link>
              <Link
                href="/bulk"
                onClick={() => setMobileNavOpen(false)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Box className="h-5 w-5 shrink-0" />
                <span>一括処理</span>
              </Link>
              <Link
                href="/audit"
                onClick={() => setMobileNavOpen(false)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <FileText className="h-5 w-5 shrink-0" />
                <span>監査ログ</span>
              </Link>
            </nav>
            <div className="mt-auto space-y-1 border-t pt-3">
              <Link
                href="/photos"
                onClick={() => setMobileNavOpen(false)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  activeMenu === "photos"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Camera className="h-4 w-4 shrink-0" />
                <span>写真管理</span>
              </Link>
              <Link
                href="/teams"
                onClick={() => setMobileNavOpen(false)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  activeMenu === "teams"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Users className="h-4 w-4 shrink-0" />
                <span>チーム</span>
              </Link>
              <Link
                href="/settings"
                onClick={() => setMobileNavOpen(false)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  activeMenu === "settings"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span>設定</span>
              </Link>
              <button
                type="button"
                onClick={() => { handleLogout(); setMobileNavOpen(false) }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>ログアウト</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* メインコンテンツ */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ヘッダー */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          {userEmail && (
            <div className="text-sm text-muted-foreground">
              {userEmail}
            </div>
          )}
        </header>

        {/* ページコンテンツ */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
