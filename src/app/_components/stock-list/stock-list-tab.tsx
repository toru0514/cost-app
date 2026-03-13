"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Bell, BellOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination } from "@/components/ui/table-pagination"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { formatCurrency } from "@/lib/calculations"
import type { AppData, StockAlertSetting } from "@/lib/types"
import {
  SearchWithScope,
  filterRowsBySearch,
  useSearchWithScope,
  type SearchField,
} from "@/app/_components/shared/search-with-scope"
import { ViewToggle } from "@/app/_components/shared/view-toggle"
import { MaterialStockCardGrid, PackagingStockCardGrid, EquipmentCardGrid } from "./stock-card-grids"

type StockListTabProps = {
  data: AppData
  materialStocks: Map<string, number>
  materialStockUnits: Map<string, string>
  packagingStocks: Map<string, number>
  packagingStockUnits: Map<string, string>
  masterStocksLoaded: boolean
  isAuthenticated: boolean
  onAdjustMaterialStock: (id: string, delta: number) => Promise<void>
  onAdjustPackagingStock: (id: string, delta: number) => Promise<void>
  stockAlertSettings: Map<string, StockAlertSetting>
  stockAlertSettingsLoaded: boolean
  onUpdateStockAlertSetting: (
    itemType: StockAlertSetting["itemType"],
    itemId: string,
    enabled: boolean,
    threshold: number
  ) => Promise<void>
  onCheckAndNotifyLowStock: (
    itemType: StockAlertSetting["itemType"],
    itemId: string,
    itemName: string,
    newQuantity: number
  ) => void
}

const formatRoundedQuantity = (quantity: number) => {
  const rounded = Math.round((quantity + Number.EPSILON) * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

const formatStock = (quantity: number | undefined, unit: string) => {
  if (quantity === undefined) return "未設定"
  return `${formatRoundedQuantity(quantity)} ${unit}`.trim()
}

const stockColorClass = (quantity: number | undefined) => {
  if (quantity === undefined) return "bg-muted text-muted-foreground"
  if (quantity < 5) return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
  if (quantity < 10) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
  return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
}

export function StockListTab({
  data,
  materialStocks,
  materialStockUnits,
  packagingStocks,
  packagingStockUnits,
  masterStocksLoaded,
  isAuthenticated,
  onAdjustMaterialStock,
  onAdjustPackagingStock,
  stockAlertSettings,
  stockAlertSettingsLoaded,
  onUpdateStockAlertSetting,
  onCheckAndNotifyLowStock,
}: StockListTabProps) {
  const [adjustAmounts, setAdjustAmounts] = useState<Map<string, string>>(new Map())
  const [busy, setBusy] = useState<string | null>(null)
  const [thresholdInputs, setThresholdInputs] = useState<Map<string, string>>(new Map())

  const [materialViewMode, setMaterialViewMode] = useState<"table" | "grid">(() => {
    if (typeof window === "undefined") return "table"
    return localStorage.getItem("view-mode-stock-materials") === "grid" ? "grid" : "table"
  })
  const [packagingViewMode, setPackagingViewMode] = useState<"table" | "grid">(() => {
    if (typeof window === "undefined") return "table"
    return localStorage.getItem("view-mode-stock-packaging") === "grid" ? "grid" : "table"
  })
  const [equipmentViewMode, setEquipmentViewMode] = useState<"table" | "grid">(() => {
    if (typeof window === "undefined") return "table"
    return localStorage.getItem("view-mode-stock-equipment") === "grid" ? "grid" : "table"
  })

  const handleMaterialViewModeChange = (mode: "table" | "grid") => {
    setMaterialViewMode(mode)
    localStorage.setItem("view-mode-stock-materials", mode)
  }
  const handlePackagingViewModeChange = (mode: "table" | "grid") => {
    setPackagingViewMode(mode)
    localStorage.setItem("view-mode-stock-packaging", mode)
  }
  const handleEquipmentViewModeChange = (mode: "table" | "grid") => {
    setEquipmentViewMode(mode)
    localStorage.setItem("view-mode-stock-equipment", mode)
  }

  // Search fields per section
  const materialSearchFields: SearchField[] = useMemo(
    () => [
      { key: "name", label: "名称" },
      { key: "unit", label: "単位" },
      { key: "unitCost", label: "単価" },
      { key: "supplier", label: "仕入先" },
      { key: "note", label: "備考" },
      { key: "stock", label: "在庫数" },
    ],
    []
  )
  const packagingSearchFields: SearchField[] = useMemo(
    () => [
      { key: "name", label: "名称" },
      { key: "unit", label: "単位" },
      { key: "unitCost", label: "単価" },
      { key: "sizeDescription", label: "仕様" },
      { key: "note", label: "備考" },
      { key: "stock", label: "在庫数" },
    ],
    []
  )
  const equipmentSearchFields: SearchField[] = useMemo(
    () => [
      { key: "name", label: "名称" },
      { key: "acquisitionCost", label: "取得額" },
      { key: "amortizationYears", label: "償却年数" },
      { key: "utilizationRate", label: "使用率" },
      { key: "note", label: "備考" },
    ],
    []
  )

  const materialSearch = useSearchWithScope(materialSearchFields)
  const packagingSearch = useSearchWithScope(packagingSearchFields)
  const equipmentSearch = useSearchWithScope(equipmentSearchFields)

  const getAdjustAmount = (key: string) => Math.max(1, parseInt(adjustAmounts.get(key) ?? "1", 10) || 1)

  const getAlertSetting = (itemType: StockAlertSetting["itemType"], itemId: string) =>
    stockAlertSettings.get(`${itemType}:${itemId}`)

  const getThresholdValue = (itemType: StockAlertSetting["itemType"], itemId: string) => {
    const inputKey = `${itemType}:${itemId}`
    const inputVal = thresholdInputs.get(inputKey)
    if (inputVal !== undefined) return inputVal
    const setting = getAlertSetting(itemType, itemId)
    return String(setting?.threshold ?? 5)
  }

  const handleToggleAlert = async (
    itemType: StockAlertSetting["itemType"],
    itemId: string,
    enabled: boolean
  ) => {
    const threshold = parseInt(getThresholdValue(itemType, itemId), 10) || 5
    try {
      await onUpdateStockAlertSetting(itemType, itemId, enabled, threshold)
      toast.success(enabled ? "在庫通知をONにしました" : "在庫通知をOFFにしました")
    } catch {
      toast.error("通知設定の更新に失敗しました")
    }
  }

  const handleThresholdChange = (itemType: StockAlertSetting["itemType"], itemId: string, value: string) => {
    setThresholdInputs((prev) => {
      const next = new Map(prev)
      next.set(`${itemType}:${itemId}`, value)
      return next
    })
  }

  const handleThresholdBlur = async (itemType: StockAlertSetting["itemType"], itemId: string) => {
    const setting = getAlertSetting(itemType, itemId)
    if (!setting?.enabled) return
    const threshold = Math.max(1, parseInt(getThresholdValue(itemType, itemId), 10) || 5)
    if (threshold === setting.threshold) return
    try {
      await onUpdateStockAlertSetting(itemType, itemId, setting.enabled, threshold)
    } catch {
      toast.error("閾値の更新に失敗しました")
    }
  }

  const handleAddMaterial = async (id: string, name: string) => {
    setBusy(`material:${id}:add`)
    try {
      const delta = getAdjustAmount(`material:${id}`)
      await onAdjustMaterialStock(id, delta)
      const newQty = (materialStocks.get(id) ?? 0) + delta
      onCheckAndNotifyLowStock("material", id, name, Math.max(0, newQty))
    } catch {
      toast.error("材料在庫の追加に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const handleUseMaterial = async (id: string, name: string) => {
    setBusy(`material:${id}:use`)
    try {
      const delta = getAdjustAmount(`material:${id}`)
      await onAdjustMaterialStock(id, -delta)
      const newQty = Math.max(0, (materialStocks.get(id) ?? 0) - delta)
      onCheckAndNotifyLowStock("material", id, name, newQty)
    } catch {
      toast.error("材料在庫の使用に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const handleAddPackaging = async (id: string, name: string) => {
    setBusy(`packaging:${id}:add`)
    try {
      const delta = getAdjustAmount(`packaging:${id}`)
      await onAdjustPackagingStock(id, delta)
      const newQty = (packagingStocks.get(id) ?? 0) + delta
      onCheckAndNotifyLowStock("packaging", id, name, Math.max(0, newQty))
    } catch {
      toast.error("梱包材在庫の追加に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const handleUsePackaging = async (id: string, name: string) => {
    setBusy(`packaging:${id}:use`)
    try {
      const delta = getAdjustAmount(`packaging:${id}`)
      await onAdjustPackagingStock(id, -delta)
      const newQty = Math.max(0, (packagingStocks.get(id) ?? 0) - delta)
      onCheckAndNotifyLowStock("packaging", id, name, newQty)
    } catch {
      toast.error("梱包材在庫の使用に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const materialRows = data.materials.map((material) => ({
    id: material.id,
    name: material.name,
    imageUrl: material.imageUrl,
    unit: material.unit,
    unitCost: material.unitCost,
    currency: material.currency,
    unitsPerBatch: material.unitsPerBatch ?? 1,
    usePercentageMode: material.usePercentageMode ?? false,
    supplier: material.supplier,
    note: material.note,
    stock: materialStocks.get(material.id),
    stockUnit: materialStockUnits.get(material.id)?.trim() || material.unit,
  }))

  const packagingRows = data.packagingItems.map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
    unitCost: item.unitCost,
    currency: item.currency,
    unitsPerBatch: item.unitsPerBatch ?? 1,
    sizeDescription: item.sizeDescription,
    note: item.note,
    imageUrl: item.imageUrl,
    stock: packagingStocks.get(item.id),
    stockUnit: packagingStockUnits.get(item.id)?.trim() || item.unit,
  }))

  const equipmentRows = data.equipments.map((equipment) => ({
    id: equipment.id,
    name: equipment.name,
    acquisitionCost: equipment.acquisitionCost,
    currency: equipment.currency,
    amortizationYears: equipment.amortizationYears,
    utilizationRate: equipment.utilizationRate ?? 100,
    note: equipment.note,
    imageUrl: equipment.imageUrl,
  }))

  const filteredMaterialRows = useMemo(
    () =>
      filterRowsBySearch(materialRows, materialSearch.query, materialSearch.checkedFields, materialSearch.allFieldKeys),
    [materialRows, materialSearch.query, materialSearch.checkedFields, materialSearch.allFieldKeys]
  )

  const filteredPackagingRows = useMemo(
    () =>
      filterRowsBySearch(
        packagingRows,
        packagingSearch.query,
        packagingSearch.checkedFields,
        packagingSearch.allFieldKeys
      ),
    [packagingRows, packagingSearch.query, packagingSearch.checkedFields, packagingSearch.allFieldKeys]
  )

  const filteredEquipmentRows = useMemo(
    () =>
      filterRowsBySearch(
        equipmentRows,
        equipmentSearch.query,
        equipmentSearch.checkedFields,
        equipmentSearch.allFieldKeys
      ),
    [equipmentRows, equipmentSearch.query, equipmentSearch.checkedFields, equipmentSearch.allFieldKeys]
  )

  const materialPagination = useTablePagination(filteredMaterialRows)
  const packagingPagination = useTablePagination(filteredPackagingRows)
  const equipmentPagination = useTablePagination(filteredEquipmentRows)

  const renderAlertCell = (itemType: StockAlertSetting["itemType"], itemId: string) => {
    if (!stockAlertSettingsLoaded) return <span className="text-xs text-muted-foreground">-</span>
    const setting = getAlertSetting(itemType, itemId)
    const enabled = setting?.enabled ?? false
    return (
      <div className="flex items-center gap-1.5">
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => handleToggleAlert(itemType, itemId, checked)}
          aria-label="在庫通知"
        />
        {enabled ? <Bell className="h-3.5 w-3.5 text-amber-500" /> : <BellOff className="h-3.5 w-3.5 text-muted-foreground" />}
        {enabled && (
          <Input
            type="number"
            min={1}
            value={getThresholdValue(itemType, itemId)}
            onChange={(e) => handleThresholdChange(itemType, itemId, e.target.value)}
            onBlur={() => handleThresholdBlur(itemType, itemId)}
            className="h-7 w-14 text-xs"
            title="通知閾値"
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h2 className="text-xl font-semibold">在庫一覧</h2>
        <p className="text-sm text-muted-foreground">材料・梱包材・設備の在庫情報を確認できます。</p>
      </section>

      <section className="min-w-0 space-y-3 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">材料在庫</h3>
          {isAuthenticated && masterStocksLoaded && materialRows.length > 0 && (
            <div className="flex items-center gap-2">
              <SearchWithScope
                fields={materialSearchFields}
                query={materialSearch.query}
                onQueryChange={materialSearch.setQuery}
                checkedFields={materialSearch.checkedFields}
                onCheckedFieldsChange={materialSearch.setCheckedFields}
                placeholder="材料を検索..."
              />
              <ViewToggle value={materialViewMode} onChange={handleMaterialViewModeChange} />
            </div>
          )}
        </div>
        {!isAuthenticated ? (
          <p className="text-sm text-muted-foreground">在庫表示はログイン中のみ利用できます。</p>
        ) : !masterStocksLoaded ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : materialRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">材料が登録されていません。</p>
        ) : filteredMaterialRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">条件に一致する材料がありません。</p>
        ) : materialViewMode === "grid" ? (
          <MaterialStockCardGrid rows={filteredMaterialRows} />
        ) : (
          <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x rounded-lg border">
            <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">名称</TableHead>
                  <TableHead className="font-semibold">単位</TableHead>
                  <TableHead className="font-semibold">単価</TableHead>
                  <TableHead className="font-semibold">セット数</TableHead>
                  <TableHead className="font-semibold">入力モード</TableHead>
                  <TableHead className="font-semibold">仕入先</TableHead>
                  <TableHead className="font-semibold">備考</TableHead>
                  <TableHead className="text-right font-semibold">現在残数</TableHead>
                  <TableHead className="font-semibold">通知</TableHead>
                  <TableHead className="font-semibold">増減量</TableHead>
                  <TableHead>
                    <span className="sr-only">増減操作</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materialPagination.pagedRows.map((row) => (
                  <TableRow key={row.id} className="group">
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-1.5">
                        {row.imageUrl && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={row.imageUrl} alt={row.name} className="h-5 w-5 shrink-0 rounded object-cover" />
                        )}
                        {row.name}
                      </span>
                    </TableCell>
                    <TableCell>{row.unit}</TableCell>
                    <TableCell>{formatCurrency(row.unitCost, row.currency)}</TableCell>
                    <TableCell>{`${row.unitsPerBatch}単位/セット`}</TableCell>
                    <TableCell>{row.usePercentageMode ? "比率入力 (%)" : "数量入力"}</TableCell>
                    <TableCell>{row.supplier || "-"}</TableCell>
                    <TableCell>{row.note || "-"}</TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${stockColorClass(row.stock)}`}>
                        {formatStock(row.stock, row.stockUnit)}
                      </span>
                    </TableCell>
                    <TableCell>{renderAlertCell("material", row.id)}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={adjustAmounts.get(`material:${row.id}`) ?? "1"}
                        onChange={(e) =>
                          setAdjustAmounts((prev) => {
                            const next = new Map(prev)
                            next.set(`material:${row.id}`, e.target.value)
                            return next
                          })
                        }
                        className="h-8 w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 px-0"
                          onClick={() => handleAddMaterial(row.id, row.name)}
                          disabled={busy !== null}
                          title="追加"
                        >
                          +
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 px-0"
                          onClick={() => handleUseMaterial(row.id, row.name)}
                          disabled={busy !== null || (row.stock ?? 0) === 0}
                          title="使用（減算）"
                        >
                          −
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination currentPage={materialPagination.currentPage} totalPages={materialPagination.totalPages} onPageChange={materialPagination.onPageChange} />
          </div>
        )}
      </section>

      <section className="min-w-0 space-y-3 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">梱包材在庫</h3>
          {isAuthenticated && masterStocksLoaded && packagingRows.length > 0 && (
            <div className="flex items-center gap-2">
              <SearchWithScope
                fields={packagingSearchFields}
                query={packagingSearch.query}
                onQueryChange={packagingSearch.setQuery}
                checkedFields={packagingSearch.checkedFields}
                onCheckedFieldsChange={packagingSearch.setCheckedFields}
                placeholder="梱包材を検索..."
              />
              <ViewToggle value={packagingViewMode} onChange={handlePackagingViewModeChange} />
            </div>
          )}
        </div>
        {!isAuthenticated ? (
          <p className="text-sm text-muted-foreground">在庫表示はログイン中のみ利用できます。</p>
        ) : !masterStocksLoaded ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : packagingRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">梱包材が登録されていません。</p>
        ) : filteredPackagingRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">条件に一致する梱包材がありません。</p>
        ) : packagingViewMode === "grid" ? (
          <PackagingStockCardGrid rows={filteredPackagingRows} />
        ) : (
          <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x rounded-lg border">
            <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">名称</TableHead>
                  <TableHead className="font-semibold">単位</TableHead>
                  <TableHead className="font-semibold">単価</TableHead>
                  <TableHead className="font-semibold">セット数</TableHead>
                  <TableHead className="font-semibold">仕様</TableHead>
                  <TableHead className="font-semibold">備考</TableHead>
                  <TableHead className="text-right font-semibold">現在残数</TableHead>
                  <TableHead className="font-semibold">通知</TableHead>
                  <TableHead className="font-semibold">増減量</TableHead>
                  <TableHead>
                    <span className="sr-only">増減操作</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packagingPagination.pagedRows.map((row) => (
                  <TableRow key={row.id} className="group">
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-1.5">
                        {row.imageUrl && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={row.imageUrl} alt={row.name} className="h-5 w-5 shrink-0 rounded object-cover" />
                        )}
                        {row.name}
                      </span>
                    </TableCell>
                    <TableCell>{row.unit}</TableCell>
                    <TableCell>{formatCurrency(row.unitCost, row.currency)}</TableCell>
                    <TableCell>{`${row.unitsPerBatch}単位/セット`}</TableCell>
                    <TableCell>{row.sizeDescription || "-"}</TableCell>
                    <TableCell>{row.note || "-"}</TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${stockColorClass(row.stock)}`}>
                        {formatStock(row.stock, row.stockUnit)}
                      </span>
                    </TableCell>
                    <TableCell>{renderAlertCell("packaging", row.id)}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={adjustAmounts.get(`packaging:${row.id}`) ?? "1"}
                        onChange={(e) =>
                          setAdjustAmounts((prev) => {
                            const next = new Map(prev)
                            next.set(`packaging:${row.id}`, e.target.value)
                            return next
                          })
                        }
                        className="h-8 w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 px-0"
                          onClick={() => handleAddPackaging(row.id, row.name)}
                          disabled={busy !== null}
                          title="追加"
                        >
                          +
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 px-0"
                          onClick={() => handleUsePackaging(row.id, row.name)}
                          disabled={busy !== null || (row.stock ?? 0) === 0}
                          title="使用（減算）"
                        >
                          −
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination currentPage={packagingPagination.currentPage} totalPages={packagingPagination.totalPages} onPageChange={packagingPagination.onPageChange} />
          </div>
        )}
      </section>

      <section className="min-w-0 space-y-3 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">設備一覧</h3>
          {equipmentRows.length > 0 && (
            <div className="flex items-center gap-2">
              <SearchWithScope
                fields={equipmentSearchFields}
                query={equipmentSearch.query}
                onQueryChange={equipmentSearch.setQuery}
                checkedFields={equipmentSearch.checkedFields}
                onCheckedFieldsChange={equipmentSearch.setCheckedFields}
                placeholder="設備を検索..."
              />
              <ViewToggle value={equipmentViewMode} onChange={handleEquipmentViewModeChange} />
            </div>
          )}
        </div>
        {equipmentRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">設備が登録されていません。</p>
        ) : filteredEquipmentRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">条件に一致する設備がありません。</p>
        ) : equipmentViewMode === "grid" ? (
          <EquipmentCardGrid rows={filteredEquipmentRows} />
        ) : (
          <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x rounded-lg border">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">名称</TableHead>
                  <TableHead className="font-semibold">取得額</TableHead>
                  <TableHead className="font-semibold">償却年数</TableHead>
                  <TableHead className="font-semibold">使用率</TableHead>
                  <TableHead className="font-semibold">備考</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipmentPagination.pagedRows.map((equipment) => (
                  <TableRow key={equipment.id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-1.5">
                        {equipment.imageUrl && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={equipment.imageUrl} alt={equipment.name} className="h-5 w-5 shrink-0 rounded object-cover" />
                        )}
                        {equipment.name}
                      </span>
                    </TableCell>
                    <TableCell>{formatCurrency(equipment.acquisitionCost, equipment.currency)}</TableCell>
                    <TableCell>{`${equipment.amortizationYears}年`}</TableCell>
                    <TableCell>{`${equipment.utilizationRate}%`}</TableCell>
                    <TableCell>{equipment.note || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination currentPage={equipmentPagination.currentPage} totalPages={equipmentPagination.totalPages} onPageChange={equipmentPagination.onPageChange} />
          </div>
        )}
      </section>
    </div>
  )
}
