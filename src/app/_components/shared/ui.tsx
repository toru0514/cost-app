"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export type FormSectionOpenSignal = { value: boolean; nonce: number }

export function FormSection({
  title,
  description,
  children,
  defaultOpen = false,
  action,
  className = "",
  storageKey,
  openSignal,
  onOpen,
  onClose,
}: {
  title: string
  description?: string
  children: ReactNode
  defaultOpen?: boolean
  action?: ReactNode
  className?: string
  storageKey?: string
  openSignal?: FormSectionOpenSignal | null
  onOpen?: () => void
  onClose?: () => void
}) {
  const [open, setOpen] = useState(() => {
    if (storageKey && typeof window !== "undefined") {
      const stored = window.localStorage.getItem(storageKey)
      if (stored === "open") return true
      if (stored === "closed") return false
    }
    return defaultOpen
  })

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return
    window.localStorage.setItem(storageKey, open ? "open" : "closed")
  }, [open, storageKey])

  useEffect(() => {
    if (!openSignal) return
    // フォームセクションを外部シグナルで展開/格納する意図的な更新
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(openSignal.value)
  }, [openSignal])

  return (
    <section className={`rounded-lg border bg-card text-card-foreground ${className}`}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button
          type="button"
          className="flex flex-1 items-center justify-between gap-3 text-left"
          onClick={() => {
            setOpen((prev) => {
              const next = !prev
              if (next) onOpen?.()
              else onClose?.()
              return next
            })
          }}
        >
          <div>
            <p className="font-semibold">{title}</p>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <span className="text-xs text-muted-foreground">{open ? "閉じる" : "開く"}</span>
        </button>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {open && <div className="border-t p-4 space-y-4">{children}</div>}
    </section>
  )
}

type RegisteredItem = {
  id: string
  label: string
}

export function HintList({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
      {items.map((item, index) => (
        <li key={`hint-${index}`}>{item}</li>
      ))}
    </ul>
  )
}

export function DraftCard({ children, onRemove, hideRemove }: { children: ReactNode; onRemove?: () => void; hideRemove?: boolean }) {
  return (
    <div className="space-y-3 rounded-md border border-dashed p-3">
      <div className="space-y-3">{children}</div>
      {!hideRemove && onRemove && (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            行を削除
          </Button>
        </div>
      )}
    </div>
  )
}

export function RegisteredList({
  title,
  items,
  onEdit,
  emptyLabel,
}: {
  title: string
  items: (RegisteredItem | string)[]
  onEdit?: (id: string) => void
  emptyLabel?: string
}) {
  return (
    <div className="space-y-1 text-sm">
      <p className="font-semibold text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel ?? "まだ登録がありません。"}</p>
      ) : (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {items.map((rawItem, index) => {
            const normalized =
              typeof rawItem === "string"
                ? { id: `${title}-${index}`, label: rawItem }
                : rawItem
            return (
              <li
                key={normalized.id}
                className="flex items-center justify-between gap-2 rounded border border-transparent px-2 py-1 hover:border-muted"
              >
                <span className="flex-1">{normalized.label}</span>
                {onEdit && (
                  <Button type="button" size="sm" variant="outline" onClick={() => onEdit(normalized.id)}>
                    編集
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function FieldHint({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="text-xs text-muted-foreground">{children}</p>
}

export function CostDisplay({
  title,
  description,
  rows,
}: {
  title: string
  description: string
  rows: { product: string; detail: string; amount: string }[]
}) {
  const [productFilter, setProductFilter] = useState("")
  const [sortKey, setSortKey] = useState<"product" | "detail" | "amount">("product")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const sortLabelMap: Record<"product" | "detail" | "amount", string> = {
    product: "商品名",
    detail: "内容",
    amount: "金額",
  }

  const displayedRows = useMemo(() => {
    const collator = new Intl.Collator("ja-JP")
    const query = productFilter.trim().toLowerCase()
    const filtered = rows
      .map((row) => ({
        ...row,
        amountValue: Number(row.amount.replace(/[^\d.-]/g, "")) || 0,
      }))
      .filter((row) => !query || row.product.toLowerCase().includes(query))

    return filtered.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1
      if (sortKey === "amount") return (a.amountValue - b.amountValue) * direction
      if (sortKey === "detail") return collator.compare(a.detail, b.detail) * direction
      return collator.compare(a.product, b.product) * direction
    })
  }, [productFilter, rows, sortDirection, sortKey])

  const toggleSort = (key: "product" | "detail" | "amount") => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(key)
    setSortDirection("asc")
  }

  const renderSortMark = (key: "product" | "detail" | "amount") => {
    if (sortKey !== key) return ""
    return sortDirection === "asc" ? " ↑" : " ↓"
  }

  return (
    <section className="min-w-0 space-y-3 rounded-lg border p-4">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-3">
        <Input
          value={productFilter}
          onChange={(event) => setProductFilter(event.target.value)}
          placeholder="商品名で絞り込み"
          className="w-full md:w-72"
        />
        <p className="text-xs text-muted-foreground">
          並び順: {sortLabelMap[sortKey]}（{sortDirection === "asc" ? "昇順" : "降順"}）
          {productFilter && ` / フィルター: 商品「${productFilter}」`}
        </p>
        {displayedRows.length === 0 ? (
          <EmptyState
            title={rows.length === 0 ? "まだデータがありません。" : "条件に一致するデータがありません。"}
            description={rows.length > 0 ? "検索条件を変更してください。" : undefined}
          />
        ) : (
          <div className="relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x">
            <Table className="w-auto min-w-max">
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button type="button" className="font-medium hover:underline" onClick={() => toggleSort("product")}>
                      商品{renderSortMark("product")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" className="font-medium hover:underline" onClick={() => toggleSort("detail")}>
                      内容{renderSortMark("detail")}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button type="button" className="font-medium hover:underline" onClick={() => toggleSort("amount")}>
                      金額{renderSortMark("amount")}
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedRows.map((row, index) => (
                  <TableRow key={`${title}-${index}`}>
                    <TableCell>{row.product}</TableCell>
                    <TableCell>{row.detail}</TableCell>
                    <TableCell className="text-right font-medium">{row.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  )
}
