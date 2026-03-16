"use client"

import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import type { AppData } from "../types"
import { emptyAppData } from "../types"
import type { AuthState } from "../auth"
import { loadUserAppData, saveUserAppData } from "../app-data-sync"
import { normalizeAppData, cloneAppData, hasMeaningfulData, mergeAppData } from "./utils"

const STORAGE_KEY = "cost-app-data-v1"
const MAX_SAVE_RETRIES = 3
const DEBOUNCE_DELAY_MS = 1000

export function usePersistence(
  authState: AuthState,
  data: AppData,
  setData: React.Dispatch<React.SetStateAction<AppData>>,
  refreshAuditLogs: () => Promise<void>,
  initialData?: AppData | null
) {
  const [hydrated, setHydrated] = useState(false)
  const skipSaveCounterRef = useRef(0)
  const dataRef = useRef<AppData>(emptyAppData)
  const lastSyncedDataRef = useRef<AppData>(emptyAppData)
  const [remoteLoadCompleted, setRemoteLoadCompleted] = useState(authState.status !== "authenticated")
  const [remoteLoadFailed, setRemoteLoadFailed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingGuestData, setPendingGuestData] = useState<AppData | null>(null)
  const authUserId = authState.status === "authenticated" ? authState.user.id : null
  const authStatusRef = useRef<AuthState["status"]>(authState.status)
  const previousAuthStatus = authStatusRef.current
  const saveRetryRef = useRef<{ attempts: number; timeoutId: ReturnType<typeof setTimeout> | null }>({ attempts: 0, timeoutId: null })
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hasPendingDebounce, setHasPendingDebounce] = useState(false)

  const clearSaveRetry = useCallback(() => {
    if (saveRetryRef.current.timeoutId) {
      clearTimeout(saveRetryRef.current.timeoutId)
      saveRetryRef.current.timeoutId = null
    }
    saveRetryRef.current.attempts = 0
  }, [])

  const isSavingInFlightRef = useRef(false)

  const persistSupabaseWithRetry = useCallback(() => {
    if (authState.status !== "authenticated") return
    if (!hasMeaningfulData(dataRef.current)) {
      console.warn("Skip saving empty dataset to Supabase")
      return
    }
    if (isSavingInFlightRef.current) return
    const attemptSave = async () => {
      if (authState.status !== "authenticated") return
      if (!hasMeaningfulData(dataRef.current)) return
      isSavingInFlightRef.current = true
      setIsSaving(true)
      try {
        await saveUserAppData(authState.user.id, dataRef.current, lastSyncedDataRef.current)
        lastSyncedDataRef.current = cloneAppData(dataRef.current)
        await refreshAuditLogs()
        clearSaveRetry()
        setIsSaving(false)
        isSavingInFlightRef.current = false
      } catch (error) {
        console.error("Failed to save data to Supabase", error)
        const nextAttempts = saveRetryRef.current.attempts + 1
        saveRetryRef.current.attempts = nextAttempts
        if (nextAttempts === 1) {
          toast.warning("データの保存に失敗しました。再試行中…")
        }
        if (nextAttempts >= MAX_SAVE_RETRIES) {
          toast.error("Supabase への保存に失敗しました。接続を確認して再同期してください。")
          clearSaveRetry()
          setIsSaving(false)
          isSavingInFlightRef.current = false
        } else {
          isSavingInFlightRef.current = false
          saveRetryRef.current.timeoutId = setTimeout(() => {
            void attemptSave()
          }, nextAttempts * 2000)
        }
      }
    }
    if (saveRetryRef.current.timeoutId) {
      clearTimeout(saveRetryRef.current.timeoutId)
      saveRetryRef.current.timeoutId = null
    }
    void attemptSave()
  }, [authState, clearSaveRetry, refreshAuditLogs])

  const debouncedPersist = useMemo(
    () => () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      setHasPendingDebounce(true)
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null
        setHasPendingDebounce(false)
        persistSupabaseWithRetry()
      }, DEBOUNCE_DELAY_MS)
    },
    [persistSupabaseWithRetry]
  )

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      clearSaveRetry()
    }
  }, [clearSaveRetry])

  useEffect(() => {
    if (!isSaving && !hasPendingDebounce) return
    const handler = (e: BeforeUnloadEvent) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
        persistSupabaseWithRetry()
      }
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isSaving, hasPendingDebounce, persistSupabaseWithRetry])

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    authStatusRef.current = authState.status
  }, [authState.status])

  // Hydration effect
  useEffect(() => {
    if (typeof window === "undefined") return
    if (hydrated) return
    if (authState.status === "loading") return
    if (authState.status === "authenticated") {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored && previousAuthStatus !== "authenticated") {
        try {
          const parsed = JSON.parse(stored) as Partial<AppData>
          const normalized = normalizeAppData(parsed)
          if (hasMeaningfulData(normalized)) {
            setPendingGuestData(normalized)
          }
        } catch {
          // ignore parse errors
        }
      }
      window.localStorage.removeItem(STORAGE_KEY)
      setData(emptyAppData)
      startTransition(() => setHydrated(true))
      return
    }
    if (authStatusRef.current === "authenticated") {
      window.localStorage.removeItem(STORAGE_KEY)
      startTransition(() => setHydrated(true))
      return
    }
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<AppData>
        const normalized = normalizeAppData(parsed)
        startTransition(() => {
          setData(normalized)
        })
      } catch (error) {
        console.warn("Failed to parse stored data", error)
      }
    }
    startTransition(() => setHydrated(true))
  }, [authState.status, hydrated, previousAuthStatus, setData])

  useLayoutEffect(() => {
    if (authState.status === "authenticated" && typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY)
    }
    setRemoteLoadCompleted(authState.status !== "authenticated")
  }, [authState.status])

  useEffect(() => {
    if (authState.status === "authenticated") {
      console.log("auth user id:", authState.user.id)
    }
  }, [authState])

  const initialDataRef = useRef(initialData)

  // Remote load effect
  useEffect(() => {
    if (!hydrated) return
    if (!authUserId) {
      setRemoteLoadCompleted(true)
      setRemoteLoadFailed(false)
      return
    }

    // Use server-provided initialData if available (skip client-side fetch)
    if (initialDataRef.current) {
      const serverData = initialDataRef.current
      initialDataRef.current = undefined // only use once
      skipSaveCounterRef.current += 1
      const normalized = normalizeAppData(serverData)
      setData(normalized)
      lastSyncedDataRef.current = cloneAppData(normalized)
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY)
      }
      setRemoteLoadFailed(false)
      setRemoteLoadCompleted(true)
      void refreshAuditLogs()
      return
    }

    let cancelled = false
    setRemoteLoadCompleted(false)
    setRemoteLoadFailed(false)
    ;(async () => {
      try {
        const remote = await loadUserAppData(authUserId)
        if (cancelled) return
        if (!remote) {
          setRemoteLoadFailed(false)
          setRemoteLoadCompleted(true)
          lastSyncedDataRef.current = cloneAppData(emptyAppData)
          await refreshAuditLogs()
          return
        }
        skipSaveCounterRef.current += 1
        clearSaveRetry()
        const normalized = normalizeAppData(remote)
        setData(normalized)
        lastSyncedDataRef.current = cloneAppData(normalized)
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY)
        }
        setRemoteLoadFailed(false)
        setRemoteLoadCompleted(true)
        await refreshAuditLogs()
      } catch (error) {
        console.error("Remote sync failed", error)
        toast.error("Supabase からデータを取得できませんでした。ネットワーク状況を確認してください。")
        setRemoteLoadFailed(true)
        setRemoteLoadCompleted(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authUserId, hydrated, clearSaveRetry, refreshAuditLogs, setData])

  // Save-on-change effect
  useEffect(() => {
    if (!hydrated || !remoteLoadCompleted) return
    if (authState.status === "authenticated" && remoteLoadFailed) return
    if (skipSaveCounterRef.current > 0) {
      skipSaveCounterRef.current -= 1
      return
    }
    if (authState.status === "authenticated") {
      debouncedPersist()
    } else if (authState.status === "guest") {
      if (previousAuthStatus === "authenticated") {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY)
        }
        return
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      }
    }
  }, [
    data,
    hydrated,
    authState,
    remoteLoadCompleted,
    remoteLoadFailed,
    debouncedPersist,
    previousAuthStatus,
  ])

  const mergeGuestData = useCallback(() => {
    if (!pendingGuestData) return
    setData((current) => mergeAppData(current, pendingGuestData))
    setPendingGuestData(null)
    toast.success("ローカルデータをマージしました")
  }, [pendingGuestData, setData])

  const discardGuestData = useCallback(() => {
    setPendingGuestData(null)
    toast.success("ローカルデータを破棄しました")
  }, [])

  return {
    hydrated,
    isSaving,
    pendingGuestData,
    remoteLoadCompleted,
    mergeGuestData,
    discardGuestData,
    dataRef,
  }
}
