import { NextResponse } from "next/server"

import { authenticateApiRequest } from "@/lib/server/api-auth"

export const runtime = "nodejs"

type HistoryLog = {
  id: string
  createdAt: string
  action: string
  summary: {
    total: number
    success: number
    failed: number
    create: number
    update: number
    delete: number
  } | null
  hasPreviousData: boolean
}

type DiffDetailItem = {
  entity: string
  operation: "create" | "update" | "delete"
  key: string
  changes?: { field: string; before: unknown; after: unknown }[]
}

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request)
  if ("error" in auth) return auth.error
  const { supabase } = auth

  const url = new URL(request.url)
  const logId = url.searchParams.get("logId")

  // 特定のログの詳細を取得する場合
  if (logId) {
    try {
      const { data: log, error: logError } = await supabase
        .from("sync_audit_logs")
        .select("id, metadata, created_at")
        .eq("id", logId)
        .single()

      if (logError || !log) {
        return NextResponse.json({ error: "Log not found" }, { status: 404 })
      }

      const metadata = (log.metadata ?? {}) as Record<string, unknown>
      const diffItems = (metadata.diffItems as DiffDetailItem[]) ?? []
      const summary = (metadata.summary as HistoryLog["summary"]) ?? null

      return NextResponse.json({
        id: log.id,
        createdAt: log.created_at,
        action: (metadata.action as string) ?? "unknown",
        summary,
        diffItems,
      })
    } catch (error) {
      console.error("Failed to load bulk sync history detail", error)
      return NextResponse.json({ error: "Failed to load history detail" }, { status: 500 })
    }
  }

  // 履歴一覧の取得
  try {
    const { data: logs, error: logsError } = await supabase
      .from("sync_audit_logs")
      .select("id, metadata, created_at")
      .in("metadata->>action", ["bulk_sync_apply", "bulk_sync_import"])
      .order("created_at", { ascending: false })
      .limit(50)

    if (logsError) {
      console.error("Failed to load bulk sync history", logsError)
      return NextResponse.json({ error: "Failed to load history" }, { status: 500 })
    }

    const history: HistoryLog[] = (logs ?? []).map((log) => {
      const metadata = (log.metadata ?? {}) as Record<string, unknown>
      return {
        id: log.id as string,
        createdAt: log.created_at as string,
        action: (metadata.action as string) ?? "unknown",
        summary: (metadata.summary as HistoryLog["summary"]) ?? null,
        hasPreviousData: !!metadata.previousData,
      }
    })

    return NextResponse.json({ history })
  } catch (error) {
    console.error("Failed to load bulk sync history", error)
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 })
  }
}
