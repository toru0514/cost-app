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
  packagingStocks: Map<string, number>
  masterStocksLoaded: boolean
  onSetMaterialStock: (id: string, quantity: number) => Promise<void>
  onSetPackagingStock: (id: string, quantity: number) => Promise<void>
  onAdjustMaterialStock: (id: string, delta: number) => Promise<void>
  onAdjustPackagingStock: (id: string, delta: number) => Promise<void>
}

export function MasterTab({ data, actions, isAuthenticated, materialStocks, packagingStocks, masterStocksLoaded, onSetMaterialStock, onSetPackagingStock, onAdjustMaterialStock, onAdjustPackagingStock }: MasterTabProps) {
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
      <div className="flex justify-end gap-2">
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

      {view === "register" ? (
        <MasterRegisterView data={data} actions={actions} />
      ) : (
        <MasterListView
          data={data}
          actions={actions}
          isAuthenticated={isAuthenticated}
          materialStocks={materialStocks}
          packagingStocks={packagingStocks}
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
