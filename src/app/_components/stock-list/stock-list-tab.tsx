"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AppData } from "@/lib/types"

type StockListTabProps = {
  data: AppData
  materialStocks: Map<string, number>
  materialStockUnits: Map<string, string>
  packagingStocks: Map<string, number>
  packagingStockUnits: Map<string, string>
  masterStocksLoaded: boolean
  isAuthenticated: boolean
}

const formatStock = (quantity: number | undefined, unit: string) => {
  if (quantity === undefined) return "未設定"
  return `${quantity} ${unit}`.trim()
}

export function StockListTab({
  data,
  materialStocks,
  materialStockUnits,
  packagingStocks,
  packagingStockUnits,
  masterStocksLoaded,
  isAuthenticated,
}: StockListTabProps) {
  const materialRows = data.materials.map((material) => ({
    id: material.id,
    name: material.name,
    stock: materialStocks.get(material.id),
    unit: materialStockUnits.get(material.id)?.trim() || material.unit,
  }))

  const packagingRows = data.packagingItems.map((item) => ({
    id: item.id,
    name: item.name,
    stock: packagingStocks.get(item.id),
    unit: packagingStockUnits.get(item.id)?.trim() || item.unit,
  }))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>在庫一覧</CardTitle>
          <CardDescription>材料・梱包材・設備の在庫情報を確認できます。</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>材料在庫</CardTitle>
        </CardHeader>
        <CardContent>
          {!isAuthenticated ? (
            <p className="text-sm text-muted-foreground">在庫表示はログイン中のみ利用できます。</p>
          ) : !masterStocksLoaded ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : materialRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">材料が登録されていません。</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead className="text-right">現在残数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materialRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className="text-right">{formatStock(row.stock, row.unit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>梱包材在庫</CardTitle>
        </CardHeader>
        <CardContent>
          {!isAuthenticated ? (
            <p className="text-sm text-muted-foreground">在庫表示はログイン中のみ利用できます。</p>
          ) : !masterStocksLoaded ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : packagingRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">梱包材が登録されていません。</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead className="text-right">現在残数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packagingRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className="text-right">{formatStock(row.stock, row.unit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>設備一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {data.equipments.length === 0 ? (
            <p className="text-sm text-muted-foreground">設備が登録されていません。</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>設備名</TableHead>
                    <TableHead className="text-right">設備在庫</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.equipments.map((equipment) => (
                    <TableRow key={equipment.id}>
                      <TableCell>{equipment.name}</TableCell>
                      <TableCell className="text-right">在庫管理対象外</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
