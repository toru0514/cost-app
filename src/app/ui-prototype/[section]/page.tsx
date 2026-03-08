import { notFound } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const sections = {
  cost: { title: "原価サマリ", description: "原価・収支関連のサンプル表示", maxWidth: "max-w-6xl" },
  analytics: { title: "集計データ", description: "集計グラフ・統計の配置確認", maxWidth: "max-w-6xl" },
  product: { title: "商品登録", description: "登録フォームと一覧のレイアウト確認", maxWidth: "max-w-4xl" },
  master: { title: "マスタ登録", description: "カテゴリ・材料・梱包材の管理画面確認", maxWidth: "max-w-5xl" },
  list: { title: "商品/在庫一覧", description: "商品一覧と在庫一覧の統合後レイアウト確認（全幅）", maxWidth: "max-w-full" },
  bulk: { title: "一括処理", description: "インポート/エクスポート関連の導線確認", maxWidth: "max-w-4xl" },
  audit: { title: "監査ログ", description: "履歴表示とフィルター導線の確認（全幅）", maxWidth: "max-w-full" },
} as const

type SectionKey = keyof typeof sections

export default async function UiPrototypeSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (!(section in sections)) {
    notFound()
  }

  const current = sections[section as SectionKey]

  // listセクション用のサンプルテーブル（カラム多め）
  const renderListSample = () => (
    <Card>
      <CardHeader>
        <CardTitle>商品一覧（サンプル: 12カラム）</CardTitle>
        <CardDescription>全幅表示により横スクロールが減少するか確認</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">商品名</TableHead>
                <TableHead className="min-w-[80px]">カテゴリ大</TableHead>
                <TableHead className="min-w-[80px]">カテゴリ中</TableHead>
                <TableHead className="min-w-[80px]">カテゴリ小</TableHead>
                <TableHead className="min-w-[100px]">生産計画</TableHead>
                <TableHead className="min-w-[80px]">設備</TableHead>
                <TableHead className="min-w-[80px] text-right">材料費</TableHead>
                <TableHead className="min-w-[80px] text-right">人件費</TableHead>
                <TableHead className="min-w-[80px] text-right">梱包費</TableHead>
                <TableHead className="min-w-[80px] text-right">原価合計</TableHead>
                <TableHead className="min-w-[60px] text-right">在庫数</TableHead>
                <TableHead className="min-w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">サンプル商品 {i}</TableCell>
                  <TableCell>食品</TableCell>
                  <TableCell>菓子類</TableCell>
                  <TableCell>焼き菓子</TableCell>
                  <TableCell>100個/年</TableCell>
                  <TableCell>オーブンA</TableCell>
                  <TableCell className="text-right">¥{(150 * i).toLocaleString()}</TableCell>
                  <TableCell className="text-right">¥{(80 * i).toLocaleString()}</TableCell>
                  <TableCell className="text-right">¥{(30 * i).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-semibold">¥{(260 * i).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{10 * i}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button className="rounded bg-muted px-2 py-1 text-xs">+</button>
                      <button className="rounded bg-muted px-2 py-1 text-xs">−</button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )

  // productセクション用のフォームサンプル
  const renderProductSample = () => (
    <Card>
      <CardHeader>
        <CardTitle>商品登録フォーム（サンプル）</CardTitle>
        <CardDescription>フォームは狭め（max-w-4xl）で読みやすく</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">商品名</label>
            <input type="text" placeholder="商品名を入力" className="w-full rounded border px-3 py-2 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">カテゴリ</label>
            <select className="w-full rounded border px-3 py-2 text-sm">
              <option>選択してください</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">備考</label>
          <textarea placeholder="備考を入力" className="w-full rounded border px-3 py-2 text-sm" rows={3} />
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{current.title}</CardTitle>
          <CardDescription>{current.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            この画面は #162 のUI検討用プロトタイプです。現在の幅設定: <code className="rounded bg-muted px-1">{current.maxWidth}</code>
          </p>
        </CardContent>
      </Card>

      {section === "list" || section === "audit" ? renderListSample() : null}
      {section === "product" ? renderProductSample() : null}

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
