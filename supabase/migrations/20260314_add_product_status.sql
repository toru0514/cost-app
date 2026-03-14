-- 商品ステータスを追加（下書き/販売中/廃番）
-- デフォルト値は 'active'（販売中）

ALTER TABLE products
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- CHECK制約を追加
ALTER TABLE products
ADD CONSTRAINT products_status_check CHECK (status IN ('draft', 'active', 'discontinued'));

-- 既存の商品にデフォルト値を設定
UPDATE products SET status = 'active' WHERE status IS NULL;

-- コメント追加
COMMENT ON COLUMN products.status IS '商品ステータス: draft（下書き）, active（販売中）, discontinued（廃番）';
