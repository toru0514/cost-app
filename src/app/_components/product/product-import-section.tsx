"use client"

import { useCallback, useMemo, useState } from "react"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { AppActions } from "@/lib/app-data"
import { useAuth } from "@/lib/auth"
import { supabaseClient } from "@/lib/supabase-client"
import type { AppData } from "@/lib/types"

interface ProductImportSectionProps {
  data: AppData
  actions: Pick<AppActions, "addProduct" | "updateProduct">
}

export function ProductImportSection({}: ProductImportSectionProps) {
  const { state: authState } = useAuth()
  const [sheetEmailInput, setSheetEmailInput] = useState("")
  const [targetUserId, setTargetUserId] = useState<string | null>(null)
  const [sheetIdInput, setSheetIdInput] = useState("")
  const [sheetTitleInput, setSheetTitleInput] = useState("")
  const [adminSheetSettings, setAdminSheetSettings] = useState<{ spreadsheetId: string; worksheetTitle: string } | null>(null)
  const [savingSheetSettings, setSavingSheetSettings] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)

  const adminEmailSet = useMemo(() => {
    return new Set(
      (process.env.NEXT_PUBLIC_SHEET_SETTINGS_ADMIN_EMAILS ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  }, [])

  const isSheetAdmin = useMemo(() => {
    if (authState.status !== "authenticated") return false
    const email = authState.user.email.toLowerCase()
    return adminEmailSet.has(email)
  }, [authState, adminEmailSet])

  const resolveUserIdByEmail = useCallback(async () => {
    const email = sheetEmailInput.trim().toLowerCase()
    if (!email) {
      toast.error("メールアドレスを入力してください。")
      return null
    }
    try {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .maybeSingle()
      if (error && error.code !== "PGRST116") {
        throw error
      }
      if (!data?.user_id) {
        toast.error("該当するユーザーが見つかりません。")
        setTargetUserId(null)
        setAdminSheetSettings(null)
        setSheetIdInput("")
        setSheetTitleInput("")
        return null
      }
      setTargetUserId(data.user_id)
      return data.user_id
    } catch (error) {
      console.error(error)
      toast.error("ユーザー検索に失敗しました。", {
        description: error instanceof Error ? error.message : undefined,
      })
      return null
    }
  }, [sheetEmailInput])

  const handleLookupSheetSettings = useCallback(async () => {
    setLookupLoading(true)
    try {
      const userId = await resolveUserIdByEmail()
      if (!userId) return
      const { data, error } = await supabaseClient
        .from("sheet_settings")
        .select("spreadsheet_id, worksheet_title")
        .eq("user_id", userId)
        .maybeSingle()
      if (error && error.code !== "PGRST116") {
        throw error
      }
      if (data?.spreadsheet_id && data?.worksheet_title) {
        const next = { spreadsheetId: data.spreadsheet_id, worksheetTitle: data.worksheet_title }
        setAdminSheetSettings(next)
        setSheetIdInput(data.spreadsheet_id)
        setSheetTitleInput(data.worksheet_title)
      } else {
        setAdminSheetSettings(null)
        setSheetIdInput("")
        setSheetTitleInput("")
        toast.message("シート設定はまだ登録されていません。")
      }
    } catch (error) {
      console.error(error)
      toast.error("シート情報の取得に失敗しました", {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setLookupLoading(false)
    }
  }, [resolveUserIdByEmail])

  const handleSaveSheetSettings = useCallback(async () => {
    if (!targetUserId) {
      toast.error("ユーザーを検索してください。")
      return
    }
    if (!sheetIdInput.trim() || !sheetTitleInput.trim()) {
      toast.error("シートIDとタブ名を入力してください。")
      return
    }

    setSavingSheetSettings(true)
    try {
      const response = await fetch("/api/admin/sheet-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          spreadsheetId: sheetIdInput.trim(),
          worksheetTitle: sheetTitleInput.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error ?? "シート設定の保存に失敗しました")
      }

      const updated = { spreadsheetId: sheetIdInput.trim(), worksheetTitle: sheetTitleInput.trim() }
      setAdminSheetSettings(updated)
      toast.message("シート設定を保存しました。")
    } catch (error) {
      console.error(error)
      toast.error("シート設定の保存に失敗しました。", {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setSavingSheetSettings(false)
    }
  }, [sheetIdInput, sheetTitleInput, targetUserId])

  if (!isSheetAdmin) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>シート設定（管理者用）</CardTitle>
        <CardDescription>対象ユーザーのシートID / タブ名を登録します。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            value={sheetEmailInput}
            onChange={(event) => setSheetEmailInput(event.target.value)}
            placeholder="user@example.com"
          />
          <Button type="button" size="sm" variant="secondary" onClick={handleLookupSheetSettings} disabled={lookupLoading}>
            {lookupLoading ? "検索中..." : "ユーザーを検索"}
          </Button>
        </div>
        {targetUserId ? (
          <p className="text-xs text-muted-foreground break-all">対象ユーザーID: {targetUserId}</p>
        ) : (
          <p className="text-xs text-muted-foreground">検索すると該当ユーザーのシート情報が表示されます。</p>
        )}
        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">スプレッドシートID</Label>
            <Input value={sheetIdInput} onChange={(event) => setSheetIdInput(event.target.value)} placeholder="例: 1Bx8LW..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">タブ名</Label>
            <Input value={sheetTitleInput} onChange={(event) => setSheetTitleInput(event.target.value)} placeholder="例: シート1" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="default" onClick={handleSaveSheetSettings} disabled={savingSheetSettings || !targetUserId}>
            {savingSheetSettings ? "保存中..." : "シート設定を保存"}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={!adminSheetSettings} asChild>
            <a
              href={adminSheetSettings ? `https://docs.google.com/spreadsheets/d/${adminSheetSettings.spreadsheetId}/edit` : undefined}
              target="_blank"
              rel="noreferrer"
            >
              対象シートを開く
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
