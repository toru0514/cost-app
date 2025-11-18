"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/calculations"

interface RankingRow {
  id: string
  name: string
  totalCost: number
  productCount: number
  quantity: number
  share: number
}

interface CategoryRankingSectionProps {
  rankings: Array<{ level: string; label: string; rows: RankingRow[] }>
}

export function CategoryRankingsSection({ rankings }: CategoryRankingSectionProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {rankings.map((ranking) => (
        <Card key={`ranking-${ranking.level}`}>
          <CardHeader>
            <CardTitle>{ranking.label}別コストランキング</CardTitle>
            <CardDescription>カテゴリ単位で累計コストを比較します。</CardDescription>
          </CardHeader>
          <CardContent>
            {ranking.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">該当データがありません。</p>
            ) : (
              <div className="space-y-4">
                {ranking.rows.map((item, index) => (
                  <div key={`${ranking.level}-${item.id}`} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">#{index + 1}</span>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground">{item.productCount}商品</span>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{formatCurrency(item.totalCost)}</p>
                        <p>{item.share.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(item.share, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
