# Spreadsheet Spec

## 目的
- スプレッドシート連携の仕様・前提・Done条件を文書化して、後から見返せるようにする。

## 範囲
- 本文書は「マスタデータのスプレッドシート同期機能」および関連するサブイシューで合意した仕様を対象とする。

## 共通ルール
- 1 行 = 1 レコード、1 行目はヘッダー行とする。
- 文字コードは UTF-8、数値は数値セルで入力する。
- `id` は UUID を想定。空欄の場合は新規作成として扱い、同期時に UUID を自動発番する。
- `is_deleted` が `TRUE` の行は削除対象とする。
- `currency` は `JPY` をデフォルトとし、未指定の場合は `JPY` とみなす。
- 日付は `YYYY-MM-DD`、日時は `YYYY-MM-DDTHH:mm:ssZ` を推奨。
- `size_variants` / `variants` は JSON 形式または簡易形式を許容（後述）。

## シート構成
|シート名|用途|
|---|---|
|`categories_large`|商品カテゴリ（大）|
|`categories_medium`|商品カテゴリ（中）|
|`categories_small`|商品カテゴリ（小）|
|`materials`|材料マスタ|
|`packaging_items`|梱包材マスタ|
|`shipping_methods`|配送方法マスタ|
|`labor_roles`|時給レートマスタ|
|`equipments`|設備マスタ|
|`fees`|手数料マスタ|
|`option_presets`|サイズ/オプションのプリセット|
|`products`|商品マスタ|

## 判定ルール（キー/削除）
### キーの優先順位
1. `id` が入力されている場合は `id` をキーとして更新/削除する。
2. `id` が空欄の場合はシートごとの自然キーで突合する。

### 自然キー
|シート名|自然キー|
|---|---|
|`categories_large`|`name`|
|`categories_medium`|`large_name` + `name`|
|`categories_small`|`large_name` + `medium_name` + `name`|
|`materials`|`name` + `supplier` (supplier が無い場合は `name` のみ)|
|`packaging_items`|`name`|
|`shipping_methods`|`name`|
|`labor_roles`|`name`|
|`equipments`|`name`|
|`fees`|`name`|
|`option_presets`|`name`|
|`products`|`product_name`|

### 削除判定
- `is_deleted = TRUE` の行は削除対象とする。
- 削除時は `id` がある場合は `id` を優先し、無い場合は自然キーで削除対象を特定する。

## シート定義

### `categories_large`
|列名|型/形式|必須|説明|
|---|---|---|---|
|`id`|UUID|任意|既存更新用 ID。空欄なら新規作成。|
|`name`|文字列|必須|カテゴリ名。|
|`description`|文字列|任意|説明。|
|`is_deleted`|TRUE/FALSE|任意|削除フラグ。|

### `categories_medium`
|列名|型/形式|必須|説明|
|---|---|---|---|
|`id`|UUID|任意|既存更新用 ID。空欄なら新規作成。|
|`large_id`|UUID|任意|親のカテゴリ(大) ID。|
|`large_name`|文字列|任意|親のカテゴリ(大) 名称。`large_id` が無い場合に使用。|
|`name`|文字列|必須|カテゴリ名。|
|`description`|文字列|任意|説明。|
|`is_deleted`|TRUE/FALSE|任意|削除フラグ。|

### `categories_small`
|列名|型/形式|必須|説明|
|---|---|---|---|
|`id`|UUID|任意|既存更新用 ID。空欄なら新規作成。|
|`medium_id`|UUID|任意|親のカテゴリ(中) ID。|
|`large_name`|文字列|任意|親カテゴリ(大)名。`medium_id` が無い場合に使用。|
|`medium_name`|文字列|任意|親カテゴリ(中)名。`medium_id` が無い場合に使用。|
|`name`|文字列|必須|カテゴリ名。|
|`description`|文字列|任意|説明。|
|`is_deleted`|TRUE/FALSE|任意|削除フラグ。|

### `materials`
|列名|型/形式|必須|説明|
|---|---|---|---|
|`id`|UUID|任意|既存更新用 ID。空欄なら新規作成。|
|`name`|文字列|必須|材料名。|
|`unit`|文字列|任意|単位（例: kg, 個）。|
|`size_description`|文字列|任意|規格・サイズ。|
|`currency`|通貨コード|任意|通貨（既定: JPY）。|
|`unit_cost`|数値|任意|単価。|
|`units_per_batch`|数値|任意|ロット数/入数。|
|`supplier`|文字列|任意|仕入先。|
|`note`|文字列|任意|備考。|
|`is_deleted`|TRUE/FALSE|任意|削除フラグ。|

### `packaging_items`
|列名|型/形式|必須|説明|
|---|---|---|---|
|`id`|UUID|任意|既存更新用 ID。空欄なら新規作成。|
|`name`|文字列|必須|梱包材名。|
|`unit`|文字列|任意|単位（例: 個, 枚）。|
|`size_description`|文字列|任意|規格・サイズ。|
|`currency`|通貨コード|任意|通貨（既定: JPY）。|
|`unit_cost`|数値|任意|単価。|
|`units_per_batch`|数値|任意|ロット数/入数。|
|`note`|文字列|任意|備考。|
|`is_deleted`|TRUE/FALSE|任意|削除フラグ。|

### `shipping_methods`
|列名|型/形式|必須|説明|
|---|---|---|---|
|`id`|UUID|任意|既存更新用 ID。空欄なら新規作成。|
|`name`|文字列|必須|配送方法名。|
|`description`|文字列|任意|説明。|
|`unit_cost`|数値|任意|単価。|
|`currency`|通貨コード|任意|通貨（既定: JPY）。|
|`note`|文字列|任意|備考。|
|`is_deleted`|TRUE/FALSE|任意|削除フラグ。|

### `labor_roles`
|列名|型/形式|必須|説明|
|---|---|---|---|
|`id`|UUID|任意|既存更新用 ID。空欄なら新規作成。|
|`name`|文字列|必須|作業ロール名。|
|`hourly_rate`|数値|任意|時給。|
|`currency`|通貨コード|任意|通貨（既定: JPY）。|
|`note`|文字列|任意|備考。|
|`is_deleted`|TRUE/FALSE|任意|削除フラグ。|

### `equipments`
|列名|型/形式|必須|説明|
|---|---|---|---|
|`id`|UUID|任意|既存更新用 ID。空欄なら新規作成。|
|`name`|文字列|必須|設備名。|
|`acquisition_cost`|数値|任意|取得額。|
|`currency`|通貨コード|任意|通貨（既定: JPY）。|
|`amortization_years`|数値|任意|償却年数。|
|`utilization_rate`|数値|任意|稼働率（%）。未指定は 100 とする。|
|`note`|文字列|任意|備考。|
|`is_deleted`|TRUE/FALSE|任意|削除フラグ。|

### `fees`
|列名|型/形式|必須|説明|
|---|---|---|---|
|`id`|UUID|任意|既存更新用 ID。空欄なら新規作成。|
|`name`|文字列|必須|手数料名。|
|`rate_percent`|数値|任意|料率（%）。|
|`fixed_amount`|数値|任意|固定額。|
|`currency`|通貨コード|任意|通貨（既定: JPY）。|
|`note`|文字列|任意|備考。|
|`is_deleted`|TRUE/FALSE|任意|削除フラグ。|

### `option_presets`
|列名|型/形式|必須|説明|
|---|---|---|---|
|`id`|UUID|任意|既存更新用 ID。空欄なら新規作成。|
|`name`|文字列|必須|プリセット名。|
|`variants`|JSON / 簡易形式|任意|例: `[{"label":"S","quantity":100}]` または `S:100|M:200`。|
|`is_deleted`|TRUE/FALSE|任意|削除フラグ。|

### `products`
|列名|型/形式|必須|説明|
|---|---|---|---|
|`id`|UUID|任意|既存更新用 ID。空欄なら新規作成。|
|`status`|文字列|任意|`registered` / `new` / `delete` のいずれか。登録状況の目視用（`is_deleted` が優先）。|
|`product_name`|文字列|必須|商品名。|
|`category_large`|文字列|任意|カテゴリ(大)名。|
|`category_medium`|文字列|任意|カテゴリ(中)名。|
|`category_small`|文字列|任意|カテゴリ(小)名。|
|`sale_price`|数値|必須|販売価格。|
|`base_man_hours`|数値|必須|工数(時間)。|
|`expected_period_years`|数値|任意|想定期間(年)。未指定は 1。|
|`expected_quantity`|数値|必須|想定生産数。|
|`size_variants`|JSON / 簡易形式|任意|例: `[{"label":"M","quantity":500}]` または `S:400|L:400`。|
|`default_electricity_cost`|数値|任意|商品単位の電気代。|
|`production_lot_size`|数値|任意|生産ロット数。未指定は 1。|
|`equipment_names`|文字列|任意|使用設備名を `|` 区切りで列挙。|
|`notes`|文字列|任意|備考。|
|`is_deleted`|TRUE/FALSE|任意|削除フラグ。|

## 補足
- `equipment_names` は `equipments` シートの `name` と突合して解決する。
- `size_variants` / `variants` の簡易形式は `ラベル:数量` を `|` で連結する。
- 数値項目が空欄の場合は `null` として扱う（`sale_price` など必須項目はエラー）。
- `status` は表示用の補助列。`is_deleted = TRUE` の場合は `status` よりも削除が優先される。
- 登録済み判別は `id` があれば `registered` とみなし、`id` が空で `product_name` が一致する場合は `registered` 扱いとする。

## 合意した Done 条件
- TODO: サブイシューで合意した Done 条件を箇条書きで記載する。

## 更新履歴
- 2026-01-27: 初版作成
