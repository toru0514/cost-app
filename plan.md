# テーブル機能統一化計画

## 現状分析

### テーブル一覧と現在の機能マトリクス

| ページ / コンポーネント | 検索 | ソート | フィルター | ページネーション | 一括操作 | カラム制御 | ビュー切替 |
|---|---|---|---|---|---|---|---|
| 商品一覧 (`list-tab`) | SearchWithScope | 手動state (名前/価格/利益/登録日) | カテゴリ3階層 | useTablePagination | 一括削除 | ドラッグ並替+表示/非表示 (Supabase保存) | - |
| マスタ8セクション (材料/設備/労務等) | SearchWithScope | **なし** | **なし** | useTablePagination | 一部あり (材料) | **なし** | 一部あり (材料) |
| 監査ログ (`audit-tab`) | **なし** | **なし** | 日付範囲 | Load More方式 | **なし** | **なし** | - |
| コスト分析 (`cost-summary`) | SearchWithScope | 手動state (名前/明細/金額) | **なし** | **なし** | **なし** | **なし** | - |
| 一括同期 (`bulk-sync`) | **なし** | **なし** | **なし** | useTablePagination | **なし** | **なし** | - |
| 在庫管理 (`stock-list`) | SearchWithScope | **なし** | **なし** | useTablePagination | **なし** | **なし** | テーブル/グリッド |
| マスタ概要 (`master-overview`) | SearchWithScope | 手動state (名前/値) | **なし** | useTablePagination | **なし** | **なし** | - |

### 既存の共通部品

- **SearchWithScope** — 検索+スコープ選択。約15箇所で使用済み。完成度高い
- **useTablePagination** — ページネーション。約20箇所で使用済み。完成度高い
- **TablePagination** — ページネーションUI
- **ViewToggle** — テーブル/グリッド切替

### 問題点

1. **ソート**: 各ページで独自実装 (useState + Intl.Collator)。統一フックなし
2. **フィルター**: カテゴリ、日付範囲、マスタ種別など形式がバラバラで共通化されていない
3. **検索**: SearchWithScopeは良く共通化されているが、一部ページ (監査ログ、一括同期) で未導入
4. **ページネーション**: 監査ログだけLoad More方式で他と異なる
5. **テーブルツールバー**: 検索・ソート・フィルターのUI配置がページごとに異なる

---

## 統一化提案

### 方針: 「共通フック + 共通ツールバー」パターン

テーブルライブラリ (TanStack Table等) の導入ではなく、**既存の良い部品を活かして共通フック群とツールバーコンポーネントを整備する**方針を推奨します。

理由:
- 既にSearchWithScope、useTablePaginationが高品質で定着している
- 全テーブルをライブラリに移行するコストが大きい
- 日本語ソート (Intl.Collator) やスコープ検索など独自要件が多い

---

### Step 1: `useTableSort` フックの新設

**場所**: `/src/hooks/use-table-sort.ts`

```ts
// 統一ソートフック
function useTableSort<T>(options: {
  items: T[]
  sortKeys: { key: string; label: string; compareFn?: (a: T, b: T) => number }[]
  defaultSortKey?: string
  defaultDirection?: "asc" | "desc"
}): {
  sortedItems: T[]
  sortKey: string
  sortDirection: "asc" | "desc"
  setSortKey: (key: string) => void
  toggleDirection: () => void
  sortOptions: { key: string; label: string }[]
}
```

- 日本語対応 (`Intl.Collator("ja-JP")`) をデフォルトで組み込み
- 数値・日付・文字列を自動判定してソート
- カスタム比較関数もサポート

**影響範囲**: list-tab, cost-summary, master-overview の手動ソートを置き換え。マスタ8セクション・在庫管理にソート機能を追加。

---

### Step 2: `useTableFilter` フックの新設

**場所**: `/src/hooks/use-table-filter.ts`

```ts
// 統一フィルターフック
function useTableFilter<T>(options: {
  items: T[]
  filters: FilterDefinition[]
}): {
  filteredItems: T[]
  activeFilters: Record<string, unknown>
  setFilter: (key: string, value: unknown) => void
  clearFilters: () => void
  clearFilter: (key: string) => void
  hasActiveFilters: boolean
}

type FilterDefinition =
  | { type: "select"; key: string; label: string; options: { value: string; label: string }[] }
  | { type: "cascading-select"; key: string; label: string; levels: CascadingLevel[] }
  | { type: "date-range"; key: string; label: string }
  | { type: "boolean"; key: string; label: string }
```

- カテゴリの3階層カスケードフィルターを汎用化
- 日付範囲フィルターを汎用化
- Select/Boolean等の基本フィルターも統一

**影響範囲**: list-tabのカテゴリフィルター、audit-tabの日付フィルターを統一フックに移行。フィルター未導入ページに段階的に追加可能に。

---

### Step 3: `<TableToolbar>` コンポーネントの新設

**場所**: `/src/app/_components/shared/table-toolbar.tsx`

```
┌─────────────────────────────────────────────────────────┐
│ [🔍 検索...        ][スコープ▼]  [ソート▼] [フィルター▼] │
│                                                         │
│ (アクティブフィルター: カテゴリ=食品 ×)(日付=3/1~3/15 ×) │
└─────────────────────────────────────────────────────────┘
```

- SearchWithScope / useTableSort / useTableFilter を統合したUI
- 各機能はオプショナル (検索だけ、ソートだけでも使える)
- アクティブフィルターのチップ表示 + 個別クリア
- 既存のSearchWithScopeをラップして後方互換

---

### Step 4: 各ページへの適用

#### Phase 1 — 共通部品作成 + マスタセクション統一 (最も効果大)
- `useTableSort`, `useTableFilter`, `<TableToolbar>` を実装
- マスタ8セクション (同一パターン) にソート機能を一括追加
- マスタ8セクションのツールバーを `<TableToolbar>` に統一

#### Phase 2 — 主要ページへの展開
- **商品一覧**: 既存ソートを `useTableSort` に移行、ツールバーを統一
- **コスト分析**: ソートを `useTableSort` に移行、ページネーション追加
- **在庫管理**: ソート機能追加、ツールバー統一

#### Phase 3 — 残りページ + 拡張
- **監査ログ**: SearchWithScope追加、ソート追加、ページネーションをuseTablePagination方式に統一
- **一括同期**: 検索・ソート追加
- **マスタ概要**: ツールバー統一

---

### 統一後の機能マトリクス (目標)

| ページ | 検索 | ソート | フィルター | ページネーション | ツールバー |
|---|---|---|---|---|---|
| 商品一覧 | SearchWithScope | useTableSort | useTableFilter (カテゴリ) | useTablePagination | TableToolbar |
| マスタ8セクション | SearchWithScope | useTableSort | useTableFilter (将来追加可) | useTablePagination | TableToolbar |
| 監査ログ | SearchWithScope | useTableSort (日時/操作者) | useTableFilter (日付範囲) | useTablePagination | TableToolbar |
| コスト分析 | SearchWithScope | useTableSort | useTableFilter (将来追加可) | useTablePagination | TableToolbar |
| 一括同期 | SearchWithScope | useTableSort | - | useTablePagination | TableToolbar |
| 在庫管理 | SearchWithScope | useTableSort | useTableFilter (将来追加可) | useTablePagination | TableToolbar |
| マスタ概要 | SearchWithScope | useTableSort | useTableFilter (将来追加可) | useTablePagination | TableToolbar |

---

## 実装の優先順位

1. **`useTableSort`** — 最もバラつきが大きく、効果が高い
2. **`<TableToolbar>`** — UI統一の核。検索+ソートだけでもすぐ使える
3. **`useTableFilter`** — フィルターの種類が多く実装コスト高め。後回しでも機能する
4. **各ページ適用** — Phase 1 (マスタ) → Phase 2 (主要) → Phase 3 (残り)

## 設計原則

- **オプトイン**: 全機能を強制しない。必要な機能だけ使える
- **後方互換**: 既存のSearchWithScope、useTablePaginationはそのまま活用
- **段階的移行**: 一度に全ページを変更せず、Phase別に進める
- **日本語ファースト**: ソート・検索で日本語を正しく扱う
