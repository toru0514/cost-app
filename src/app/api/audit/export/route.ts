import { NextResponse } from "next/server"

import { authenticateApiRequest } from "@/lib/server/api-auth"

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request)
  if ("error" in auth) return auth.error
  const { user, supabase } = auth

  const url = new URL(request.url)
  const from = url.searchParams.get("from") ?? undefined
  const to = url.searchParams.get("to") ?? undefined

  let query = supabase
    .from("sync_audit_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (from) {
    query = query.gte("created_at", from)
  }
  if (to) {
    query = query.lte("created_at", to)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data ?? []).map((log) => ({
    id: log.id,
    created_at: log.created_at,
    device_info: log.device_info ?? "",
    metadata: JSON.stringify(log.metadata ?? {}),
  }))

  const headers = Object.keys(rows[0] || { id: "", created_at: "", device_info: "", metadata: "" })
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => headers.map((key) => JSON.stringify(row[key as keyof typeof row] ?? "")).join(",")),
  ].join("\n")

  const response = new NextResponse(csvContent)
  response.headers.set("Content-Type", "text/csv; charset=utf-8")
  response.headers.set(
    "Content-Disposition",
    `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`
  )
  return response
}
