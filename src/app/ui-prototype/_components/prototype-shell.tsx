"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, useState, type ComponentType, type ReactNode } from "react"
import { BarChart3, Box, Boxes, ClipboardList, FileText, LayoutDashboard, Menu, Package, PanelLeftClose, PanelLeftOpen, X } from "lucide-react"

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

export function PrototypeShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebarWidthClass = useMemo(() => (collapsed ? "w-[76px]" : "w-[240px]"), [collapsed])

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className={`hidden border-r bg-card p-3 md:flex md:flex-col ${sidebarWidthClass}`}>
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            {!collapsed && <p className="text-sm font-semibold">Cost App</p>}
            <Button type="button" variant="ghost" size="sm" onClick={() => setCollapsed((prev) => !prev)}>
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>
          <NavLinks collapsed={collapsed} />
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
            <div className="flex h-14 items-center justify-between gap-2 px-3 md:px-6">
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" className="md:hidden" onClick={() => setMobileOpen(true)}>
                  <Menu className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold">UIプロトタイプ（案A + ハンバーガー）</span>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm">ログイン</Button>
                <Button type="button" variant="ghost" size="sm" className="hidden sm:inline-flex">デモデータ投入</Button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} aria-label="メニューを閉じる" />
          <aside className="absolute left-0 top-0 h-full w-72 border-r bg-card p-3 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Cost App</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <NavLinks collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  )
}
