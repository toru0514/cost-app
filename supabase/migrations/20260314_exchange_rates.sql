-- 為替レートテーブルを作成
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL DEFAULT 'JPY',
  rate NUMERIC NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, from_currency, to_currency, effective_date)
);

-- RLS を有効化
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- ユーザー自身のデータのみアクセス可能
CREATE POLICY "Users can read own exchange rates"
  ON exchange_rates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exchange rates"
  ON exchange_rates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exchange rates"
  ON exchange_rates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own exchange rates"
  ON exchange_rates FOR DELETE
  USING (auth.uid() = user_id);

-- インデックス
CREATE INDEX IF NOT EXISTS exchange_rates_user_id_idx ON exchange_rates(user_id);
CREATE INDEX IF NOT EXISTS exchange_rates_from_currency_idx ON exchange_rates(from_currency, effective_date DESC);

-- コメント
COMMENT ON TABLE exchange_rates IS '為替レートマスタ: 外貨から基準通貨への換算レートを管理';
COMMENT ON COLUMN exchange_rates.from_currency IS '変換元通貨コード (例: USD, EUR)';
COMMENT ON COLUMN exchange_rates.to_currency IS '変換先通貨コード (デフォルト: JPY)';
COMMENT ON COLUMN exchange_rates.rate IS '為替レート (1 from_currency = rate to_currency)';
COMMENT ON COLUMN exchange_rates.effective_date IS 'レート適用開始日';
