import { notFound } from "next/navigation"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Filter, Plus, MoreHorizontal, ChevronDown, LogIn, LogOut, Database, Trash2, Download, Upload, User } from "lucide-react"

const sections = {
  cost: { title: "原価サマリ", description: "原価・収支関連のサンプル表示", maxWidth: "max-w-6xl" },
  analytics: { title: "集計データ", description: "集計グラフ・統計の配置確認", maxWidth: "max-w-6xl" },
  product: { title: "商品登録", description: "登録フォームと一覧のレイアウト確認", maxWidth: "max-w-4xl" },
  master: { title: "マスタ登録", description: "カテゴリ・材料・梱包材の管理画面確認", maxWidth: "max-w-5xl" },
  list: { title: "商品/在庫一覧", description: "商品一覧と在庫一覧の統合後レイアウト確認", maxWidth: "max-w-full" },
  bulk: { title: "一括処理", description: "インポート/エクスポート関連の導線確認", maxWidth: "max-w-4xl" },
  audit: { title: "監査ログ", description: "履歴表示とフィルター導線の確認", maxWidth: "max-w-full" },
  settings: { title: "設定", description: "アカウント・データ管理", maxWidth: "max-w-3xl" },
} as const

type SectionKey = keyof typeof sections

export default async function UiPrototypeSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (!(section in sections)) {
    notFound()
  }

  const current = sections[section as SectionKey]

  // テーブル中心デザイン: 商品一覧
  const renderTableCentricList = () => (
    <div className="space-y-4">
      {/* ツールバー: 検索・フィルター・アクション */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="商品を検索..."
              className="h-9 w-64 rounded-md border bg-transparent pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button className="flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm text-muted-foreground hover:bg-muted">
            <Filter className="h-4 w-4" />
            フィルター
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
        <button className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          新規追加
        </button>
      </div>

      {/* テーブル: カードなしで直接配置 */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[200px] font-semibold">商品名</TableHead>
              <TableHead className="font-semibold">カテゴリ</TableHead>
              <TableHead className="font-semibold">生産計画</TableHead>
              <TableHead className="font-semibold">設備</TableHead>
              <TableHead className="text-right font-semibold">材料費</TableHead>
              <TableHead className="text-right font-semibold">人件費</TableHead>
              <TableHead className="text-right font-semibold">梱包費</TableHead>
              <TableHead className="text-right font-semibold">原価合計</TableHead>
              <TableHead className="text-right font-semibold">在庫</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              { name: "チョコレートケーキ", category: "食品 / 菓子類 / 焼き菓子", plan: "120個/年", equip: "オーブンA", mat: 450, labor: 280, pack: 120, stock: 15 },
              { name: "バニラクッキー", category: "食品 / 菓子類 / 焼き菓子", plan: "200個/年", equip: "オーブンB", mat: 180, labor: 150, pack: 80, stock: 42 },
              { name: "抹茶マフィン", category: "食品 / 菓子類 / 焼き菓子", plan: "80個/年", equip: "オーブンA", mat: 320, labor: 200, pack: 100, stock: 8 },
              { name: "フルーツタルト", category: "食品 / 菓子類 / 生菓子", plan: "60個/年", equip: "冷蔵庫A", mat: 580, labor: 350, pack: 150, stock: 3 },
              { name: "カスタードプリン", category: "食品 / 菓子類 / 生菓子", plan: "150個/年", equip: "冷蔵庫B", mat: 220, labor: 180, pack: 90, stock: 25 },
            ].map((item, i) => (
              <TableRow key={i} className="group">
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-muted-foreground">{item.category}</TableCell>
                <TableCell>{item.plan}</TableCell>
                <TableCell>{item.equip}</TableCell>
                <TableCell className="text-right">¥{item.mat.toLocaleString()}</TableCell>
                <TableCell className="text-right">¥{item.labor.toLocaleString()}</TableCell>
                <TableCell className="text-right">¥{item.pack.toLocaleString()}</TableCell>
                <TableCell className="text-right font-semibold">¥{(item.mat + item.labor + item.pack).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <span className={`inline-flex min-w-[2rem] justify-center rounded px-1.5 py-0.5 text-xs font-medium ${item.stock < 5 ? "bg-red-100 text-red-700" : item.stock < 10 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                    {item.stock}
                  </span>
                </TableCell>
                <TableCell>
                  {/* 行ホバーでアクション表示 */}
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                      <Plus className="h-4 w-4" />
                    </button>
                    <button className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* フッター: ページネーション風 */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>5 件表示中</span>
        <div className="flex items-center gap-2">
          <button className="rounded border px-3 py-1 hover:bg-muted">前へ</button>
          <button className="rounded border px-3 py-1 hover:bg-muted">次へ</button>
        </div>
      </div>
    </div>
  )

  // テーブル中心デザイン: フォーム（カードなし）
  const renderTableCentricForm = () => (
    <div className="space-y-6">
      {/* セクションヘッダー: シンプルな見出し */}
      <div className="border-b pb-4">
        <h2 className="text-lg font-semibold">基本情報</h2>
        <p className="text-sm text-muted-foreground">商品の基本的な情報を入力してください</p>
      </div>

      {/* フォームフィールド: カードなしで直接配置 */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">商品名 <span className="text-red-500">*</span></label>
          <input
            type="text"
            placeholder="例: チョコレートケーキ"
            className="h-10 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">カテゴリ <span className="text-red-500">*</span></label>
          <select className="h-10 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20">
            <option>カテゴリを選択</option>
            <option>食品 / 菓子類</option>
            <option>食品 / 飲料</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">説明</label>
        <textarea
          placeholder="商品の説明を入力..."
          rows={3}
          className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* 別セクション */}
      <div className="border-b pb-4 pt-4">
        <h2 className="text-lg font-semibold">生産情報</h2>
        <p className="text-sm text-muted-foreground">生産計画と使用設備を設定</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">生産数量</label>
          <input
            type="number"
            placeholder="100"
            className="h-10 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">期間（年）</label>
          <input
            type="number"
            placeholder="1"
            className="h-10 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">使用設備</label>
          <select className="h-10 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20">
            <option>設備を選択</option>
            <option>オーブンA</option>
            <option>オーブンB</option>
          </select>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex items-center gap-3 border-t pt-6">
        <button className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          保存する
        </button>
        <button className="rounded-md border px-6 py-2 text-sm font-medium hover:bg-muted">
          キャンセル
        </button>
      </div>
    </div>
  )

  // サマリー表示（テーブル中心版）
  const renderTableCentricSummary = () => (
    <div className="space-y-6">
      {/* 統計サマリー: シンプルなグリッド */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "総商品数", value: "24", sub: "前月比 +3" },
          { label: "平均原価", value: "¥850", sub: "前月比 -2.1%" },
          { label: "在庫総数", value: "156", sub: "低在庫 3件" },
          { label: "月間売上", value: "¥1.2M", sub: "目標達成率 85%" },
        ].map((stat, i) => (
          <div key={i} className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-semibold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* テーブル */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">原価内訳</h2>
          <button className="text-sm text-primary hover:underline">すべて表示</button>
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">商品名</TableHead>
                <TableHead className="text-right font-semibold">材料費</TableHead>
                <TableHead className="text-right font-semibold">人件費</TableHead>
                <TableHead className="text-right font-semibold">その他</TableHead>
                <TableHead className="text-right font-semibold">合計</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { name: "チョコレートケーキ", mat: 450, labor: 280, other: 120, total: 850 },
                { name: "バニラクッキー", mat: 180, labor: 150, other: 80, total: 410 },
                { name: "抹茶マフィン", mat: 320, labor: 200, other: 100, total: 620 },
              ].map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">¥{item.mat.toLocaleString()}</TableCell>
                  <TableCell className="text-right">¥{item.labor.toLocaleString()}</TableCell>
                  <TableCell className="text-right">¥{item.other.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-semibold">¥{item.total.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )

  // 設定ページ（案C: ヘッダー機能を設定ページに移動）
  const renderSettingsPage = () => (
    <div className="space-y-8">
      {/* アカウント */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h2 className="text-lg font-semibold">アカウント</h2>
        </div>
        <div className="rounded-lg border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">ゲストモード</p>
                <p className="text-sm text-muted-foreground">ログインするとデータがクラウドに保存されます</p>
              </div>
            </div>
            <button className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <LogIn className="h-4 w-4" />
              ログイン
            </button>
          </div>
        </div>
      </div>

      {/* データ管理 */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h2 className="text-lg font-semibold">データ管理</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">デモデータ投入</p>
                <p className="text-sm text-muted-foreground">サンプルデータを追加して機能を試す</p>
              </div>
            </div>
            <button className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              投入する
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">ローカル保存をクリア</p>
                <p className="text-sm text-muted-foreground">ブラウザに保存されたデータを削除</p>
              </div>
            </div>
            <button className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
              クリア
            </button>
          </div>
        </div>
      </div>

      {/* バックアップ・復元（ゲストモード時のみ） */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h2 className="text-lg font-semibold">バックアップ・復元</h2>
          <p className="text-sm text-muted-foreground">ゲストモード時のみ利用可能</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center gap-2">
              <Download className="h-5 w-5 text-muted-foreground" />
              <p className="font-medium">バックアップ</p>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">現在のデータをJSONファイルとしてダウンロード</p>
            <button className="w-full rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              ダウンロード
            </button>
          </div>

          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center gap-2">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <p className="font-medium">復元</p>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">バックアップファイルからデータを復元</p>
            <button className="w-full rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              ファイルを選択
            </button>
          </div>
        </div>
      </div>

      {/* アプリ情報 */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h2 className="text-lg font-semibold">アプリ情報</h2>
        </div>
        <div className="rounded-lg border p-4">
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">バージョン</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">マスタ件数</span>
              <span>42件</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">商品件数</span>
              <span>24件</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* ページヘッダー: シンプル */}
      <div>
        <h1 className="text-2xl font-semibold">{current.title}</h1>
        <p className="text-muted-foreground">{current.description}</p>
      </div>

      {/* デザイン案表示（設定ページでは案Cの説明） */}
      {section === "settings" ? (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          ヘッダー機能配置: <strong>案C（設定ページに移動）</strong> - ログイン、デモデータ投入、バックアップ等を設定ページに集約
        </div>
      ) : (
        <div className="rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
          デザイン案: <strong>テーブル中心（Airtable風）</strong> - カードを使わずテーブルを直接配置、行ホバーでアクション表示
        </div>
      )}

      {/* セクション別コンテンツ */}
      {(section === "list" || section === "audit" || section === "master") && renderTableCentricList()}
      {section === "product" && renderTableCentricForm()}
      {(section === "cost" || section === "analytics") && renderTableCentricSummary()}
      {section === "settings" && renderSettingsPage()}
      {section === "bulk" && (
        <div className="space-y-4">
          <div className="rounded-lg border p-6">
            <h2 className="mb-2 text-lg font-semibold">データインポート</h2>
            <p className="mb-4 text-sm text-muted-foreground">CSVファイルから商品データを一括インポート</p>
            <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
              ファイルを選択
            </button>
          </div>
          <div className="rounded-lg border p-6">
            <h2 className="mb-2 text-lg font-semibold">データエクスポート</h2>
            <p className="mb-4 text-sm text-muted-foreground">現在のデータをCSV形式でエクスポート</p>
            <button className="rounded-md border px-4 py-2 text-sm hover:bg-muted">
              エクスポート
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
