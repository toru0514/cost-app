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

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request)
  if ("error" in auth) return auth.error
  const { user, supabase } = auth

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
