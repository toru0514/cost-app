"use client"

import { useCallback, useRef, useState, type ChangeEvent } from "react"

import type { AppData } from "@/lib/types"
import { toast } from "sonner"

type UseBackupOptions = {
  data: AppData
  isAuthenticated: boolean
  importGuestData: (data: Partial<AppData>) => boolean
}

export function useBackup({ data, isAuthenticated, importGuestData }: UseBackupOptions) {
  const [pendingBackupRestore, setPendingBackupRestore] = useState<{ fileName: string; data: Partial<AppData> } | null>(null)
  const backupImportInputRef = useRef<HTMLInputElement | null>(null)

  const handleExportBackupJson = useCallback(() => {
    if (typeof window === "undefined" || isAuthenticated) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `cost-app-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success("バックアップを保存しました。")
  }, [data, isAuthenticated])

  const handleOpenBackupImport = useCallback(() => {
    if (isAuthenticated) return
    backupImportInputRef.current?.click()
  }, [isAuthenticated])

  const handleImportBackupJson = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const parsed = JSON.parse(text) as Partial<AppData>
        const hasAppDataShape =
          parsed !== null &&
          typeof parsed === "object" &&
          (Array.isArray(parsed.products) || Array.isArray(parsed.materials) || parsed.categories !== undefined)
        if (!hasAppDataShape) {
          toast.error("バックアップファイルとして認識できません。")
          return
        }
        setPendingBackupRestore({ fileName: file.name, data: parsed })
      } catch (error) {
        console.error("Failed to import backup json", error)
        toast.error("バックアップの復元に失敗しました。JSONファイルを確認してください。")
      } finally {
        event.target.value = ""
      }
    },
    []
  )

  const closeBackupRestoreDialog = useCallback(() => {
    setPendingBackupRestore(null)
  }, [])

  const confirmBackupRestore = useCallback(() => {
    if (!pendingBackupRestore) return
    const imported = importGuestData(pendingBackupRestore.data)
    if (!imported) return
    toast.success("バックアップを復元しました。", { description: `${pendingBackupRestore.fileName} を読み込みました。` })
    setPendingBackupRestore(null)
  }, [importGuestData, pendingBackupRestore])

  return {
    pendingBackupRestore,
    backupImportInputRef,
    handleExportBackupJson,
    handleOpenBackupImport,
    handleImportBackupJson,
    closeBackupRestoreDialog,
    confirmBackupRestore,
  }
}
