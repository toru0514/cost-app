"use client"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  BookOpen,
  Camera,
  FileDown,
  FileUp,
  LogIn,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Timer,
  Users,
  X,
  Menu,
} from "lucide-react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"

export type TabOption = {
  value: string
  label: string
  icon: LucideIcon
}

export type SidebarProps = {
  activeTab: string
  onTabChange: (value: string) => void
  isAuthenticated: boolean
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  mobileNavOpen: boolean
  onMobileNavOpenChange: (open: boolean) => void
  onSeedSample: () => void
  onExportBackup: () => void
  onOpenBackupImport: () => void
  onResetLocalStorage: () => void
  onLogout: () => void
  tabOptions: readonly TabOption[]
}

export function Sidebar({
  activeTab,
  onTabChange,
  isAuthenticated,
  sidebarCollapsed,
  onToggleSidebar,
  mobileNavOpen,
  onMobileNavOpenChange,
  onSeedSample,
  onExportBackup,
  onOpenBackupImport,
  onResetLocalStorage,
  onLogout,
  tabOptions,
}: SidebarProps) {
  const sidebarWidthClass = sidebarCollapsed ? "w-[76px]" : "w-[260px]"

  return (
    <>
      {/* デスクトップサイドバー */}
      <aside className={`hidden h-full overflow-y-auto border-r bg-card p-3 md:flex md:flex-col ${sidebarWidthClass}`}>
        <div className={`mb-3 flex items-center px-1 ${sidebarCollapsed ? "flex-col gap-1" : "justify-between gap-2"}`}>
          {!sidebarCollapsed && <p className="text-sm font-semibold">Cost App</p>}
          <div className={`flex items-center ${sidebarCollapsed ? "flex-col gap-1" : "gap-1"}`}>
            <Button type="button" variant="ghost" size="sm" onClick={onToggleSidebar}>
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
            {!sidebarCollapsed && <ThemeToggle />}
          </div>
        </div>
        <nav className="space-y-1">
          {tabOptions.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onTabChange(tab.value)}
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
          <Link
            href="/guide"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={sidebarCollapsed ? "使い方ガイド" : undefined}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>使い方ガイド</span>}
          </Link>
          {!isAuthenticated && (
            <button
              type="button"
              onClick={onSeedSample}
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
                onClick={onExportBackup}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title={sidebarCollapsed ? "バックアップ" : undefined}
              >
                <FileDown className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">バックアップ</span>}
              </button>
              <button
                type="button"
                onClick={onOpenBackupImport}
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
              onClick={onResetLocalStorage}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              title={sidebarCollapsed ? "データクリア" : undefined}
            >
              <X className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span className="truncate">データクリア</span>}
            </button>
          )}
          <Link
            href="/timetrack"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={sidebarCollapsed ? "時間計測" : undefined}
          >
            <Timer className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>時間計測</span>}
          </Link>
          {isAuthenticated && (
            <Link
              href="/photos"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title={sidebarCollapsed ? "写真管理" : undefined}
            >
              <Camera className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>写真管理</span>}
            </Link>
          )}
          {isAuthenticated && (
            <Link
              href="/teams"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title={sidebarCollapsed ? "チーム" : undefined}
            >
              <Users className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>チーム</span>}
            </Link>
          )}
          {isAuthenticated && (
            <Link
              href="/settings"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title={sidebarCollapsed ? "設定" : undefined}
            >
              <Settings className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>設定</span>}
            </Link>
          )}
          {!isAuthenticated ? (
            <Link
              href="/login"
              className="flex w-full items-center gap-3 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
              title={sidebarCollapsed ? "ログイン" : undefined}
            >
              <LogIn className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>ログイン</span>}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title={sidebarCollapsed ? "ログアウト" : undefined}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>ログアウト</span>}
            </button>
          )}
        </div>
      </aside>

      {/* モバイルドロワーメニュー */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => onMobileNavOpenChange(false)} aria-label="メニューを閉じる" />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r bg-card p-3 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Cost App</p>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <Button type="button" variant="ghost" size="sm" onClick={() => onMobileNavOpenChange(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <nav className="space-y-1">
              {tabOptions.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => onTabChange(tab.value)}
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
              <Link
                href="/guide"
                onClick={() => onMobileNavOpenChange(false)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <BookOpen className="h-4 w-4 shrink-0" />
                <span>使い方ガイド</span>
              </Link>
              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={() => { onSeedSample(); onMobileNavOpenChange(false) }}
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
                    onClick={() => { onExportBackup(); onMobileNavOpenChange(false) }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <FileDown className="h-4 w-4 shrink-0" />
                    <span>バックアップ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { onOpenBackupImport(); onMobileNavOpenChange(false) }}
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
                  onClick={() => { onResetLocalStorage(); onMobileNavOpenChange(false) }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  <X className="h-4 w-4 shrink-0" />
                  <span>データクリア</span>
                </button>
              )}
              <Link
                href="/timetrack"
                onClick={() => onMobileNavOpenChange(false)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Timer className="h-4 w-4 shrink-0" />
                <span>時間計測</span>
              </Link>
              {isAuthenticated && (
                <Link
                  href="/photos"
                  onClick={() => onMobileNavOpenChange(false)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Camera className="h-4 w-4 shrink-0" />
                  <span>写真管理</span>
                </Link>
              )}
              {isAuthenticated && (
                <Link
                  href="/teams"
                  onClick={() => onMobileNavOpenChange(false)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Users className="h-4 w-4 shrink-0" />
                  <span>チーム</span>
                </Link>
              )}
              {isAuthenticated && (
                <Link
                  href="/settings"
                  onClick={() => onMobileNavOpenChange(false)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  <span>設定</span>
                </Link>
              )}
              {!isAuthenticated ? (
                <Link
                  href="/login"
                  onClick={() => onMobileNavOpenChange(false)}
                  className="flex w-full items-center gap-3 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <LogIn className="h-4 w-4 shrink-0" />
                  <span>ログイン</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => { onLogout(); onMobileNavOpenChange(false) }}
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
    </>
  )
}
