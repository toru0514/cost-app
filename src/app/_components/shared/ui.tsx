"use client"

import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function FormSection({
  title,
  description,
  children,
  defaultOpen = false,
  action,
  className = "",
}: {
  title: string
  description?: string
  children: ReactNode
  defaultOpen?: boolean
  action?: ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className={`rounded-lg border bg-card text-card-foreground ${className}`}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button
          type="button"
          className="flex flex-1 items-center justify-between gap-3 text-left"
          onClick={() => setOpen((prev) => !prev)}
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

export function CostDisplay({
  title,
  description,
  rows,
}: {
  title: string
  description: string
  rows: { product: string; detail: string; amount: string }[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだデータがありません。</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品</TableHead>
                <TableHead>内容</TableHead>
                <TableHead>金額</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={`${title}-${index}`}>
                  <TableCell>{row.product}</TableCell>
                  <TableCell>{row.detail}</TableCell>
                  <TableCell className="text-right font-medium">{row.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
