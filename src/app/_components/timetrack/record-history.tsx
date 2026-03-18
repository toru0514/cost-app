"use client"

import { useCallback, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { TimeRecord } from "@/lib/types"
import type { Product } from "@/lib/types/product"
import type { ProductProcess } from "@/lib/types/process"
import { formatTime } from "./stopwatch"
import { EditRecordDialog } from "./edit-record-dialog"
import { Pencil, Search, Trash2 } from "lucide-react"

type RecordHistoryProps = {
  records: TimeRecord[]
  onUpdate: (record: TimeRecord) => void
  onRemove: (id: string) => void
  products?: Product[]
  productProcesses?: ProductProcess[]
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function RecordHistory({ records, onUpdate, onRemove, products, productProcesses }: RecordHistoryProps) {
  const [search, setSearch] = useState("")
  const [editingRecord, setEditingRecord] = useState<TimeRecord | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return records
      .filter((r) => !q || r.taskName.toLowerCase().includes(q) || (r.note ?? "").toLowerCase().includes(q))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [records, search])

  const productMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of products ?? []) map.set(p.id, p.name)
    return map
  }, [products])

  const processMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const pp of productProcesses ?? []) map.set(pp.id, pp.name)
    return map
  }, [productProcesses])

  const handleSaveEdit = useCallback(
    (updated: TimeRecord) => {
      onUpdate(updated)
      setEditingRecord(null)
    },
    [onUpdate]
  )

  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        まだ記録がありません。ストップウォッチで計測を開始してください。
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="作業名で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border overflow-x-auto overscroll-x-contain touch-pan-x">
        <Table className="min-w-[880px]">
          <TableHeader>
            <TableRow>
              <TableHead>作業名</TableHead>
              <TableHead>商品</TableHead>
              <TableHead>工程</TableHead>
              <TableHead className="text-right">合計時間</TableHead>
              <TableHead className="text-right">ラップ数</TableHead>
              <TableHead>日時</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{record.taskName}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {record.productId ? productMap.get(record.productId) ?? "—" : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {record.productProcessId ? processMap.get(record.productProcessId) ?? "—" : "—"}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatTime(record.totalDuration)}
                </TableCell>
                <TableCell className="text-right">{record.laps.length}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(record.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingRecord(record)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (window.confirm(`「${record.taskName}」の記録を削除しますか？`)) {
                          onRemove(record.id)
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingRecord && (
        <EditRecordDialog
          record={editingRecord}
          open={!!editingRecord}
          onOpenChange={(open) => !open && setEditingRecord(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  )
}
