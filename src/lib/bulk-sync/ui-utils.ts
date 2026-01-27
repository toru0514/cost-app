import type { BulkSyncPayload } from "./types"

export const parsePayloadJson = (input: string): { payload: BulkSyncPayload | null; error?: string } => {
  const trimmed = input.trim()
  if (!trimmed) {
    return { payload: null, error: "JSON が空です" }
  }
  try {
    const parsed = JSON.parse(trimmed) as BulkSyncPayload
    if (!parsed || typeof parsed !== "object") {
      return { payload: null, error: "JSON の形式が不正です" }
    }
    return { payload: parsed }
  } catch (error) {
    return { payload: null, error: "JSON の解析に失敗しました" }
  }
}
