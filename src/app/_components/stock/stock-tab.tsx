"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AppData, Product } from "@/lib/types"

import { MaterialStockSimulator } from "./material-stock-simulator"

type StockTabProps = {
  data: AppData
  products: Product[]
  stocks: Map<string, number>
  stocksLoaded: boolean
  materialStocks: Map<string, number>
  masterStocksLoaded: boolean
  isAuthenticated: boolean
  onAdjust: (productId: string, delta: number) => Promise<void>
  onSet: (productId: string, quantity: number) => Promise<void>
  onRefresh: () => Promise<void>
}

export function StockTab({ data, products, stocks, stocksLoaded, materialStocks, masterStocksLoaded, isAuthenticated, onAdjust, onSet, onRefresh }: StockTabProps) {
  const [adjustAmounts, setAdjustAmounts] = useState<Map<string, string>>(new Map())
  const [busy, setBusy] = useState<string | null>(null)
  const [editingStock, setEditingStock] = useState<{ productId: string; value: string } | null>(null)

  const getAdjustAmount = (productId: string) => {
    const raw = adjustAmounts.get(productId) ?? "1"
    return Math.max(1, parseInt(raw, 10) || 1)
  }

  const handleAdd = async (productId: string) => {
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

  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>在庫管理</CardTitle>
            <CardDescription>商品ごとの在庫数を確認・増減できます。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">在庫管理はログイン中のみ利用できます。</p>
              <p className="mt-1 text-xs text-muted-foreground">ログインすると在庫数が Supabase に保存され、複数端末で共有されます。</p>
            </div>
          </CardContent>
        </Card>
        <MaterialStockSimulator
          data={data}
          materialStocks={materialStocks}
          masterStocksLoaded={masterStocksLoaded}
          isAuthenticated={isAuthenticated}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>在庫管理</CardTitle>
            <CardDescription>商品ごとの在庫数を確認・増減できます。</CardDescription>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={onRefresh} disabled={busy !== null}>
            最新を取得
          </Button>
        </CardHeader>
        <CardContent>
          {!stocksLoaded ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground">商品が登録されていません。</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品名</TableHead>
                    <TableHead className="text-right">現在庫数</TableHead>
                    <TableHead>増減量</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const quantity = stocks.get(product.id) ?? 0
                    const isEditing = editingStock?.productId === product.id
                    const isBusy = busy?.startsWith(product.id) ?? false

                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                type="number"
                                min={0}
                                value={editingStock.value}
                                onChange={(e) => setEditingStock({ productId: product.id, value: e.target.value })}
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
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingStock(null)}
                                disabled={isBusy}
                              >
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
                          <Input
                            type="number"
                            min={1}
                            value={adjustAmounts.get(product.id) ?? "1"}
                            onChange={(e) =>
                              setAdjustAmounts((prev) => {
                                const next = new Map(prev)
                                next.set(product.id, e.target.value)
                                return next
                              })
                            }
                            className="h-8 w-20"
                          />
                        </TableCell>
                        <TableCell>
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
                              disabled={isBusy || isEditing || quantity === 0}
                            >
                              −使用
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <MaterialStockSimulator
        data={data}
        materialStocks={materialStocks}
        masterStocksLoaded={masterStocksLoaded}
        isAuthenticated={isAuthenticated}
      />
    </div>
  )
}
