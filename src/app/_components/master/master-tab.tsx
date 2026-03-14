"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import type { AppActions } from "@/lib/app-data"
import type { AppData } from "@/lib/types"

import { Breadcrumb } from "../shared/breadcrumb"
import { MasterListView } from "./list/master-list-view"
import { MasterRegisterView } from "./register/master-register-view"

interface MasterTabProps {
  data: AppData
  actions: AppActions
  isAuthenticated: boolean
  materialStocks: Map<string, number>
  materialStockUnits: Map<string, string>
  packagingStocks: Map<string, number>
  packagingStockUnits: Map<string, string>
  masterStocksLoaded: boolean
  onSetMaterialStock: (id: string, quantity: number, stockUnit?: string) => Promise<void>
  onSetPackagingStock: (id: string, quantity: number, stockUnit?: string) => Promise<void>
  onAdjustMaterialStock: (id: string, delta: number) => Promise<void>
  onAdjustPackagingStock: (id: string, delta: number) => Promise<void>
  onRefreshExchangeRates?: () => Promise<void>
}

const SECTION_LABELS: Record<string, string> = {
  category: "カテゴリ",
  material: "材料",
  packaging: "梱包材",
  shipping: "配送",
  fee: "手数料",
  "option-preset": "オプションプリセット",
  labor: "労務・設備",
  equipment: "設備シミュレーション",
  "exchange-rate": "為替レート",
}

export function MasterTab({ data, actions, isAuthenticated, materialStocks, materialStockUnits, packagingStocks, packagingStockUnits, masterStocksLoaded, onSetMaterialStock, onSetPackagingStock, onAdjustMaterialStock, onAdjustPackagingStock, onRefreshExchangeRates }: MasterTabProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const sectionParam = searchParams.get("section")

  const [view, setView] = useState<"register" | "list">(() => {
    if (typeof window === "undefined") return "register"
    const stored = window.localStorage.getItem("cost-app-master-view")
    return stored === "list" ? "list" : "register"
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem("cost-app-master-view", view)
  }, [view])

  const handleSectionFocus = useCallback((sectionKey: string | null) => {
    if (sectionKey) {
      router.replace(`${pathname}?section=${sectionKey}`, { scroll: false })
    } else {
      router.replace(pathname, { scroll: false })
    }
  }, [router, pathname])

  const clearSection = useCallback(() => {
    router.replace(pathname, { scroll: false })
  }, [router, pathname])

  const breadcrumbItems = [
    {
      label: view === "register" ? "マスタ登録" : "登録済みマスタ",
      ...(sectionParam ? { onClick: clearSection } : {}),
    },
    ...(sectionParam && SECTION_LABELS[sectionParam] ? [{ label: SECTION_LABELS[sectionParam] }] : []),
  ]

  return (
    <div className="space-y-6">
      {/* パンくずリスト */}
      <Breadcrumb items={breadcrumbItems} />

      {/* ページヘッダー */}
      <div>
        <h1 className="text-2xl font-semibold">マスタ登録</h1>
        <p className="text-muted-foreground">材料・梱包材・設備などのマスタデータを管理</p>
      </div>

      {/* ツールバー: ビュー切り替え */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setView("register")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            view === "register"
              ? "bg-primary text-primary-foreground"
              : "border bg-transparent text-muted-foreground hover:bg-muted"
          }`}
        >
          マスタ登録
        </button>
        <button
          type="button"
          onClick={() => setView("list")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            view === "list"
              ? "bg-primary text-primary-foreground"
              : "border bg-transparent text-muted-foreground hover:bg-muted"
          }`}
        >
          登録済みマスタ
        </button>
      </div>

      {view === "register" ? (
        <MasterRegisterView
          data={data}
          actions={actions}
          isAuthenticated={isAuthenticated}
          onSetMaterialStock={onSetMaterialStock}
          onSetPackagingStock={onSetPackagingStock}
          onRefreshExchangeRates={onRefreshExchangeRates}
          onSectionFocus={handleSectionFocus}
        />
      ) : (
        <MasterListView
          data={data}
          actions={actions}
          isAuthenticated={isAuthenticated}
          materialStocks={materialStocks}
          materialStockUnits={materialStockUnits}
          packagingStocks={packagingStocks}
          packagingStockUnits={packagingStockUnits}
          masterStocksLoaded={masterStocksLoaded}
          onSetMaterialStock={onSetMaterialStock}
          onSetPackagingStock={onSetPackagingStock}
          onAdjustMaterialStock={onAdjustMaterialStock}
          onAdjustPackagingStock={onAdjustPackagingStock}
          focusSection={sectionParam}
          onSectionFocus={handleSectionFocus}
        />
      )}
    </div>
  )
}
