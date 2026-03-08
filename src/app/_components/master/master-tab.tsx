"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import type { AppActions } from "@/lib/app-data"
import type { AppData } from "@/lib/types"

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
}

export function MasterTab({ data, actions, isAuthenticated, materialStocks, materialStockUnits, packagingStocks, packagingStockUnits, masterStocksLoaded, onSetMaterialStock, onSetPackagingStock, onAdjustMaterialStock, onAdjustPackagingStock }: MasterTabProps) {
  const [view, setView] = useState<"register" | "list">(() => {
    if (typeof window === "undefined") return "register"
    const stored = window.localStorage.getItem("cost-app-master-view")
    return stored === "list" ? "list" : "register"
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem("cost-app-master-view", view)
  }, [view])

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">マスタ登録</h1>
          <p className="text-muted-foreground">材料・梱包材・設備などのマスタデータを管理</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={view === "register" ? "default" : "outline"}
            onClick={() => setView("register")}
          >
            マスタ登録
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "list" ? "default" : "outline"}
            onClick={() => setView("list")}
          >
            登録済みマスタ
          </Button>
        </div>
      </div>

      {view === "register" ? (
        <MasterRegisterView
          data={data}
          actions={actions}
          isAuthenticated={isAuthenticated}
          onSetMaterialStock={onSetMaterialStock}
          onSetPackagingStock={onSetPackagingStock}
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
        />
      )}
    </div>
  )
}
