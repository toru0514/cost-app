"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import type { AppActions } from "@/lib/app-data"
import type { AppData } from "@/lib/types"
import { createTempId } from "@/lib/utils"

import { CategoryListSection } from "../sections/category"
import { EquipmentListSection } from "../sections/equipment"
import { LaborListSection } from "../sections/labor"
import { MaterialListSection } from "../sections/material"
import { OptionPresetListSection } from "../sections/option-preset"
import { PackagingListSection } from "../sections/packaging"
import { ShippingListSection } from "../sections/shipping"
import { FeeListSection } from "../sections/fee"

interface MasterListViewProps {
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

type MasterListSectionKey =
  | "category"
  | "material"
  | "packaging"
  | "optionPreset"
  | "shipping"
  | "fee"
  | "labor"
  | "equipment"

const defaultOpenState: Record<MasterListSectionKey, boolean> = {
  category: true,
  material: true,
  packaging: true,
  optionPreset: true,
  shipping: true,
  fee: true,
  labor: true,
  equipment: true,
}

const MASTER_LIST_OPEN_STATE_STORAGE_KEY = "cost-app-master-list-open-state"

const loadMasterListOpenState = (): Record<MasterListSectionKey, boolean> => {
  if (typeof window === "undefined") return defaultOpenState
  try {
    const raw = window.localStorage.getItem(MASTER_LIST_OPEN_STATE_STORAGE_KEY)
    if (!raw) return defaultOpenState
    const parsed = JSON.parse(raw) as Partial<Record<MasterListSectionKey, unknown>>
    return {
      category: typeof parsed.category === "boolean" ? parsed.category : defaultOpenState.category,
      material: typeof parsed.material === "boolean" ? parsed.material : defaultOpenState.material,
      packaging: typeof parsed.packaging === "boolean" ? parsed.packaging : defaultOpenState.packaging,
      optionPreset: typeof parsed.optionPreset === "boolean" ? parsed.optionPreset : defaultOpenState.optionPreset,
      shipping: typeof parsed.shipping === "boolean" ? parsed.shipping : defaultOpenState.shipping,
      fee: typeof parsed.fee === "boolean" ? parsed.fee : defaultOpenState.fee,
      labor: typeof parsed.labor === "boolean" ? parsed.labor : defaultOpenState.labor,
      equipment: typeof parsed.equipment === "boolean" ? parsed.equipment : defaultOpenState.equipment,
    }
  } catch {
    return defaultOpenState
  }
}

export function MasterListView({ data, actions, isAuthenticated, materialStocks, materialStockUnits, packagingStocks, packagingStockUnits, masterStocksLoaded, onSetMaterialStock, onSetPackagingStock, onAdjustMaterialStock, onAdjustPackagingStock }: MasterListViewProps) {
  const [openState, setOpenState] = useState<Record<MasterListSectionKey, boolean>>(() => loadMasterListOpenState())

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(MASTER_LIST_OPEN_STATE_STORAGE_KEY, JSON.stringify(openState))
  }, [openState])

  const setAllOpenState = (value: boolean) => {
    setOpenState({
      category: value,
      material: value,
      packaging: value,
      optionPreset: value,
      shipping: value,
      fee: value,
      labor: value,
      equipment: value,
    })
  }

  const toggleSection = (key: MasterListSectionKey) => {
    setOpenState((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const renderSectionToggle = (key: MasterListSectionKey, label: string) => (
    <div className="flex justify-end">
      <Button type="button" size="sm" variant="ghost" onClick={() => toggleSection(key)}>
        {label}を{openState[key] ? "閉じる" : "開く"}
      </Button>
    </div>
  )

  return (
    <div className="master-list-table-style space-y-6">
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setAllOpenState(true)}>
          全て開く
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAllOpenState(false)}>
          全て閉じる
        </Button>
      </div>

      <div className="space-y-2">
        {renderSectionToggle("category", "カテゴリ一覧")}
        {openState.category && <CategoryListSection data={data} actions={actions} createTempId={createTempId} />}
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          {renderSectionToggle("material", "材料一覧")}
          {openState.material && (
            <MaterialListSection
              data={data}
              actions={actions}
              createTempId={createTempId}
              isAuthenticated={isAuthenticated}
              materialStocks={materialStocks}
              materialStockUnits={materialStockUnits}
              masterStocksLoaded={masterStocksLoaded}
              onSetMaterialStock={onSetMaterialStock}
              onAdjustMaterialStock={onAdjustMaterialStock}
            />
          )}
        </div>

        <div className="space-y-2">
          {renderSectionToggle("packaging", "梱包材一覧")}
          {openState.packaging && (
            <PackagingListSection
              data={data}
              actions={actions}
              createTempId={createTempId}
              isAuthenticated={isAuthenticated}
              packagingStocks={packagingStocks}
              packagingStockUnits={packagingStockUnits}
              masterStocksLoaded={masterStocksLoaded}
              onSetPackagingStock={onSetPackagingStock}
              onAdjustPackagingStock={onAdjustPackagingStock}
            />
          )}
        </div>

        <div className="space-y-2">
          {renderSectionToggle("optionPreset", "オプション一覧")}
          {openState.optionPreset && <OptionPresetListSection data={data} actions={actions} createTempId={createTempId} />}
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          {renderSectionToggle("shipping", "配送一覧")}
          {openState.shipping && <ShippingListSection data={data} actions={actions} createTempId={createTempId} />}
        </div>

        <div className="space-y-2">
          {renderSectionToggle("fee", "手数料一覧")}
          {openState.fee && <FeeListSection data={data} actions={actions} createTempId={createTempId} />}
        </div>

        <div className="space-y-2">
          {renderSectionToggle("labor", "人件費一覧")}
          {openState.labor && <LaborListSection data={data} actions={actions} createTempId={createTempId} />}
        </div>

        <div className="space-y-2">
          {renderSectionToggle("equipment", "設備一覧")}
          {openState.equipment && <EquipmentListSection data={data} actions={actions} createTempId={createTempId} />}
        </div>
      </div>
    </div>
  )
}
