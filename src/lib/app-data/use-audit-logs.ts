"use client"

import { useCallback, useRef, useState } from "react"
import type { AuditFilters, AuditLog } from "../types"
import { loadAuditLogs } from "../app-data-sync"

export function useAuditLogs(authUserId: string | null) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditLogsLoading, setAuditLogsLoading] = useState(false)
  const [auditFilters, setAuditFilters] = useState<AuditFilters>({})
  const [auditHasMore, setAuditHasMore] = useState(true)
  const auditLogsIndexRef = useRef(0)

  const refreshAuditLogs = useCallback(async () => {
    if (!authUserId) return
    setAuditLogsLoading(true)
    try {
      const logs = await loadAuditLogs(authUserId, 50, 0, auditFilters)
      auditLogsIndexRef.current = logs.length
      setAuditLogs(logs)
      setAuditHasMore(logs.length === 50)
    } catch (error) {
      console.error("Failed to load audit logs", error)
    } finally {
      setAuditLogsLoading(false)
    }
  }, [authUserId, auditFilters])

  const loadMoreAuditLogs = useCallback(async () => {
    if (!authUserId) return
    setAuditLogsLoading(true)
    try {
      const logs = await loadAuditLogs(authUserId, 50, auditLogsIndexRef.current, auditFilters)
      auditLogsIndexRef.current += logs.length
      setAuditLogs((prev) => [...prev, ...logs])
      setAuditHasMore(logs.length === 50)
    } catch (error) {
      console.error("Failed to load more audit logs", error)
    } finally {
      setAuditLogsLoading(false)
    }
  }, [authUserId, auditFilters])

  const updateAuditFilters = useCallback((next: AuditFilters) => {
    setAuditFilters(next)
  }, [])

  const resetAuditState = useCallback(() => {
    setAuditLogs([])
    setAuditLogsLoading(false)
    auditLogsIndexRef.current = 0
    setAuditHasMore(true)
  }, [])

  return {
    auditLogs,
    auditLogsLoading,
    auditHasMore,
    auditFilters,
    refreshAuditLogs,
    loadMoreAuditLogs,
    updateAuditFilters,
    resetAuditState,
  }
}
