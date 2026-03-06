"use client"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AppData } from "@/lib/types"
import { toast } from "sonner"

interface RegisteredProductsSectionProps {
  data: AppData
  readOnly?: boolean
  stocks?: Map<string, number>
  stocksLoaded?: boolean
  isAuthenticated?: boolean
  onAdjust?: (productId: string, delta: number) => Promise<void>
  onSet?: (productId: string, quantity: number) => Promise<void>
}

export function RegisteredProductsSection({
  data,
  readOnly = false,
  stocks,
  stocksLoaded,
  isAuthenticated,
  onAdjust,
  onSet,
}: RegisteredProductsSectionProps) {
  const [adjustAmounts, setAdjustAmounts] = useState<Map<string, string>>(new Map())
  const [busy, setBusy] = useState<string | null>(null)
  const [editingStock, setEditingStock] = useState<{ productId: string; value: string } | null>(null)
  const stockMap = stocks ?? new Map<string, number>()
  const stockLoaded = stocksLoaded ?? false
  const canOperateStock = !readOnly
  const authenticated = isAuthenticated ?? false

  const getAdjustAmount = (productId: string) => {
    const raw = adjustAmounts.get(productId) ?? "1"
    return Math.max(1, parseInt(raw, 10) || 1)
  }

  const handleAdd = async (productId: string) => {
    if (!onAdjust) return
    setBusy(productId + "_add")
    try {
      await onAdjust(productId, getAdjustAmount(productId))
    } catch {
      toast.error("在庫の追加に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const handleUse = async (productId: string) => {
    if (!onAdjust) return
    setBusy(productId + "_use")
    try {
      await onAdjust(productId, -getAdjustAmount(productId))
    } catch {
      toast.error("在庫の使用に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const handleSetStock = async (productId: string) => {
    if (!onSet) return
    if (!editingStock || editingStock.productId !== productId) return
    const quantity = Math.max(0, parseInt(editingStock.value, 10) || 0)
    setBusy(productId + "_set")
    try {
      await onSet(productId, quantity)
      setEditingStock(null)
    } catch {
      toast.error("在庫の設定に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>登録済み商品</CardTitle>
        <CardDescription>想定生産量・設備利用状況の一覧。</CardDescription>
      </CardHeader>
      <CardContent>
        {data.products.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ商品がありません。</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品名</TableHead>
                <TableHead>カテゴリ</TableHead>
                <TableHead>生産計画</TableHead>
                <TableHead>設備</TableHead>
                {canOperateStock ? (
                  <>
                    <TableHead className="text-right">現在庫数</TableHead>
                    <TableHead>増減量</TableHead>
                    <TableHead>
                      <span className="sr-only">在庫操作</span>
                    </TableHead>
                  </>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.products.map((product) => {
                const categoryLabel = [product.categoryLargeId, product.categoryMediumId, product.categorySmallId]
                  .map((categoryId) =>
                    data.categories.large.find((c) => c.id === categoryId) ||
                    data.categories.medium.find((c) => c.id === categoryId) ||
                    data.categories.small.find((c) => c.id === categoryId)
                  )
                  .filter(Boolean)
                  .map((category) => (category as { id: string; name: string }).name)
                  .join(" / ")
                const equipmentLabel =
                  product.equipmentIds.length === 0
                    ? "-"
                    : product.equipmentIds
                        .map((id) => data.equipments.find((equipment) => equipment.id === id)?.name ?? "")
                        .filter(Boolean)
                        .join(", ")
                const quantity = stockMap.get(product.id) ?? 0
                const isEditing = editingStock?.productId === product.id
                const isBusy = busy?.startsWith(product.id) ?? false

                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{categoryLabel || "-"}</TableCell>
                    <TableCell>
                      {product.expectedProduction.quantity} 個 / {product.expectedProduction.periodYears} 年
                    </TableCell>
                    <TableCell>{equipmentLabel}</TableCell>
                    {canOperateStock ? (
                      <>
                        <TableCell className="text-right">
                          {!authenticated ? (
                            "-"
                          ) : !stockLoaded ? (
                            "..."
                          ) : isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                type="number"
                                min={0}
                                value={editingStock.value}
                                onChange={(event) => setEditingStock({ productId: product.id, value: event.target.value })}
                                className="h-8 w-24 text-right"
                              />
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSetStock(product.id)}
                                disabled={isBusy}
                              >
                                確定
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingStock(null)} disabled={isBusy}>
                                キャンセル
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="cursor-pointer rounded px-2 py-0.5 text-sm font-semibold hover:bg-muted"
                              onClick={() => setEditingStock({ productId: product.id, value: String(quantity) })}
                              title="クリックして直接編集"
                            >
                              <Badge variant={quantity === 0 ? "outline" : "secondary"} className="text-sm">
                                {quantity}
                              </Badge>
                            </button>
                          )}
                        </TableCell>
                        <TableCell>
                          {authenticated ? (
                            <Input
                              type="number"
                              min={1}
                              value={adjustAmounts.get(product.id) ?? "1"}
                              onChange={(event) =>
                                setAdjustAmounts((prev) => {
                                  const next = new Map(prev)
                                  next.set(product.id, event.target.value)
                                  return next
                                })
                              }
                              className="h-8 w-20"
                            />
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {authenticated ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAdd(product.id)}
                                disabled={isBusy || isEditing}
                              >
                                +追加
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUse(product.id)}
                                disabled={isBusy || isEditing || !stockLoaded || quantity === 0}
                              >
                                −使用
                              </Button>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </>
                    ) : null}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
