"use client"

import { useCallback, useEffect, useState } from "react"
import type { AppData } from "../types"
import { emptyAppData } from "../types"
import { useAuth } from "../auth"
import { useAuditLogs } from "./use-audit-logs"
import { useStocks } from "./use-stocks"
import { usePersistence } from "./use-persistence"
import { useExchangeRates } from "./use-exchange-rates"
import { useCrudActions } from "./crud-actions"

export function useAppData(initialData?: AppData | null) {
  const { state: authState } = useAuth()
  const [data, setData] = useState<AppData>(initialData ?? emptyAppData)
  const authUserId = authState.status === "authenticated" ? authState.user.id : null

  const auditLog = useAuditLogs(authUserId)
  const persistence = usePersistence(authState, data, setData, auditLog.refreshAuditLogs, initialData)
  const stockManager = useStocks(authState, persistence.dataRef)
  const exchangeRateManager = useExchangeRates(authState)

  // Reset stock/audit/exchange-rate state on logout
  useEffect(() => {
    if (authState.status !== "authenticated") {
      auditLog.resetAuditState()
      stockManager.resetStockState()
      exchangeRateManager.resetExchangeRateState()
    }
  }, [authState.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load stocks and exchange rates after remote load completes
  useEffect(() => {
    if (persistence.remoteLoadCompleted && authState.status === "authenticated") {
      void stockManager.refreshStocks()
      void stockManager.refreshMasterStocks()
      void stockManager.refreshStockAlertSettings()
      void exchangeRateManager.refreshExchangeRates()
    }
  }, [persistence.remoteLoadCompleted, authState.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback(
    (updater: (prev: AppData) => AppData) => {
      setData(updater)
    },
    [setData]
  )

  const actions = useCrudActions(update, persistence.dataRef, authState, {
    cleanupProductStock: stockManager.cleanupProductStock,
    cleanupMaterialStock: stockManager.cleanupMaterialStock,
    cleanupPackagingStock: stockManager.cleanupPackagingStock,
  })

  return {
    data,
    hydrated: persistence.hydrated,
    isSaving: persistence.isSaving,
    pendingGuestData: persistence.pendingGuestData,
    remoteLoadCompleted: persistence.remoteLoadCompleted,
    mergeGuestData: persistence.mergeGuestData,
    discardGuestData: persistence.discardGuestData,
    auditLogs: auditLog.auditLogs,
    auditLogsLoading: auditLog.auditLogsLoading,
    auditHasMore: auditLog.auditHasMore,
    auditFilters: auditLog.auditFilters,
    refreshAuditLogs: auditLog.refreshAuditLogs,
    loadMoreAuditLogs: auditLog.loadMoreAuditLogs,
    updateAuditFilters: auditLog.updateAuditFilters,
    stocks: stockManager.stocks,
    stocksLoaded: stockManager.stocksLoaded,
    refreshStocks: stockManager.refreshStocks,
    setStock: stockManager.setStock,
    adjustStock: stockManager.adjustStock,
    materialStocks: stockManager.materialStocks,
    materialStockUnits: stockManager.materialStockUnits,
    packagingStocks: stockManager.packagingStocks,
    packagingStockUnits: stockManager.packagingStockUnits,
    masterStocksLoaded: stockManager.masterStocksLoaded,
    setMaterialStock: stockManager.setMaterialStock,
    setPackagingStock: stockManager.setPackagingStock,
    adjustMaterialStock: stockManager.adjustMaterialStock,
    adjustPackagingStock: stockManager.adjustPackagingStock,
    stockAlertSettings: stockManager.stockAlertSettings,
    stockAlertSettingsLoaded: stockManager.stockAlertSettingsLoaded,
    updateStockAlertSetting: stockManager.updateStockAlertSetting,
    checkAndNotifyLowStock: stockManager.checkAndNotifyLowStock,
    exchangeRates: exchangeRateManager.exchangeRates,
    exchangeRatesLoaded: exchangeRateManager.exchangeRatesLoaded,
    refreshExchangeRates: exchangeRateManager.refreshExchangeRates,
    actions,
  }
}

export type AppActions = ReturnType<typeof useAppData>["actions"]
