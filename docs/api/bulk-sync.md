# Bulk Sync API Spec

## 目的
- 一括反映入力、差分取得、反映結果サマリの API 仕様を定義する。

## 対象
- マスタ/商品の一括同期フロー（スプレッドシート → 検証 → 差分 → 反映）。

## 前提
- 認証は Supabase Auth（Cookie/Authorization header）を前提とする。
- 入出力は JSON。
- 失敗時は共通のエラー形式を返す。

## エンドポイント一覧
|用途|Method|Path|概要|
|---|---|---|---|
|差分取得|POST|`/api/bulk-sync/diff`|投入データと現行データの差分を返す|
|反映|POST|`/api/bulk-sync/apply`|差分に基づいて一括反映を実行する|
|結果取得|GET|`/api/bulk-sync/results/{jobId}`|一括反映の結果を取得する|
|書き出し|POST|`/api/bulk-sync/export`|現行データをスプレッドシートへ書き出す|
|読み込み|POST|`/api/bulk-sync/import`|スプレッドシートから読み込み一括反映する|

## 共通ヘッダー
- `Content-Type: application/json`
- `Authorization: Bearer <token>`（Cookie 認証でも可）

## 共通オブジェクト
### `BulkSyncPayload`
```
{
  "categories_large": [ ... ],
  "categories_medium": [ ... ],
  "categories_small": [ ... ],
  "materials": [ ... ],
  "packaging_items": [ ... ],
  "shipping_methods": [ ... ],
  "labor_roles": [ ... ],
  "equipments": [ ... ],
  "fees": [ ... ],
  "option_presets": [ ... ],
  "products": [ ... ]
}
```
- 各配列の要素は `docs/spreadsheet-spec.md` に準拠する。
- `is_deleted = true` の行は削除対象。

### `DiffSummary`
```
{
  "total": 0,
  "create": 0,
  "update": 0,
  "delete": 0
}
```

### `DiffItem`
```
{
  "entity": "materials",
  "operation": "create|update|delete",
  "key": {
    "id": "...",
    "naturalKey": "..."
  },
  "before": { ... },
  "after": { ... },
  "issues": ["..."]
}
```

### `ApplyResult`
```
{
  "jobId": "...",
  "status": "queued|running|completed|failed",
  "summary": {
    "total": 0,
    "success": 0,
    "failed": 0
  },
  "errors": [
    {
      "entity": "materials",
      "rowIndex": 12,
      "message": "...",
      "code": "VALIDATION_ERROR"
    }
  ]
}
```

## 1. 差分取得
### Request
`POST /api/bulk-sync/diff`
```
{
  "payload": { ...BulkSyncPayload... },
  "options": {
    "includeDetails": true
  }
}
```
※ body が空の場合は、`sheet_settings` に設定されたスプレッドシートから読み取ったデータで差分を算出する。

### Response 200
```
{
  "summary": { ...DiffSummary... },
  "items": [ ...DiffItem... ]
}
```

## 2. 一括反映
### Request
`POST /api/bulk-sync/apply`
```
{
  "payload": { ...BulkSyncPayload... },
  "options": {
    "dryRun": false,
    "recordAuditLog": true
  }
}
```

### Response 202
```
{ ...ApplyResult... }
```

## 3. 結果取得
### Request
`GET /api/bulk-sync/results/{jobId}`

### Response 200
```
{ ...ApplyResult... }
```

## 4. 書き出し
### Request
`POST /api/bulk-sync/export`
```
{
  "target": "master|products",
  "mode": "overwrite|append"
}
```
- `overwrite`: 対象シートをクリアしてヘッダー + データを書き込む
- `append`: データ行のみ追記（ヘッダーが無い場合は自動でヘッダー + データを書き込む）

## 5. 読み込み
### Request
`POST /api/bulk-sync/import`
```
{
  "target": "master|products",
  "options": {
    "dryRun": false,
    "recordAuditLog": true
  }
}
```
- body が空の場合も可（オプション無し）
- `sheet_settings` に設定されたスプレッドシートから読み込む
- `target` 指定時は対象シートのみ読み込む（未指定は全シート）

## エラー形式
```
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "details": {
      "entity": "materials",
      "rowIndex": 12,
      "field": "name"
    }
  }
}
```

## エラーコード
- `VALIDATION_ERROR`: 入力検証エラー
- `CONFLICT`: 競合（同一キーの不整合）
- `NOT_FOUND`: 参照先が存在しない
- `UNAUTHORIZED`: 認証エラー
- `FORBIDDEN`: 権限不足
- `INTERNAL`: 予期しないエラー

## 注意事項
- 差分取得は DB への書き込みを行わない。
- 一括反映はサーバー側でトランザクションを確保し、部分失敗は結果に明示する。
- 監査ログ（audit_logs）への記録は `options.recordAuditLog` に従う。
- クライアントは失敗時に最大 2 回まで自動リトライを行う（指数バックオフ）。

## 更新履歴
- 2026-01-27: 初版作成
