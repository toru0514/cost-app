import { notFound } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const sections = {
  cost: { title: "原価サマリ", description: "原価・収支関連のサンプル表示" },
  analytics: { title: "集計データ", description: "集計グラフ・統計の配置確認" },
  product: { title: "商品登録", description: "登録フォームと一覧のレイアウト確認" },
  master: { title: "マスタ登録", description: "カテゴリ・材料・梱包材の管理画面確認" },
  list: { title: "商品/在庫一覧", description: "商品一覧と在庫一覧の統合後レイアウト確認" },
  bulk: { title: "一括処理", description: "インポート/エクスポート関連の導線確認" },
  audit: { title: "監査ログ", description: "履歴表示とフィルター導線の確認" },
} as const

type SectionKey = keyof typeof sections

export default async function UiPrototypeSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (!(section in sections)) {
    notFound()
  }

  const current = sections[section as SectionKey]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{current.title}</CardTitle>
          <CardDescription>{current.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            この画面は #162 のUI検討用プロトタイプです。機能実装前にレイアウトと導線を確認するためのものです。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>レイアウト確認サンプル</CardTitle>
          <CardDescription>横幅利用とカード配置を確認できます</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow>
                  <TableHead>項目</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>メモ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>デスクトップ（展開）</TableCell>
                  <TableCell>アイコン + テキスト</TableCell>
                  <TableCell>案Aに準拠</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>デスクトップ（折りたたみ）</TableCell>
                  <TableCell>アイコンのみ</TableCell>
                  <TableCell>幅を圧縮してコンテンツ領域を拡張</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>モバイル</TableCell>
                  <TableCell>ハンバーガーメニュー</TableCell>
                  <TableCell>左からドロワー表示</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
