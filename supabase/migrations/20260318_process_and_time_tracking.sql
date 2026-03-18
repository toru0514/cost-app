-- 工程テンプレート（マスタ）: 大工程・小工程の2階層
CREATE TABLE IF NOT EXISTS process_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  parent_id UUID REFERENCES process_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_hourly_rate NUMERIC NOT NULL DEFAULT 0,
  color TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE process_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own process_templates" ON process_templates
  FOR ALL USING (auth.uid() = user_id);

-- 商品別工程: 各商品に紐づく工程定義（大工程・小工程の2階層）
CREATE TABLE IF NOT EXISTS product_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES product_processes(id) ON DELETE CASCADE,
  process_template_id UUID REFERENCES process_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  hourly_rate NUMERIC NOT NULL DEFAULT 0,
  estimated_minutes NUMERIC,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE product_processes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own product_processes" ON product_processes
  FOR ALL USING (auth.uid() = user_id);

-- time_records に商品・工程紐付けカラム追加
ALTER TABLE time_records
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_process_id UUID REFERENCES product_processes(id) ON DELETE SET NULL;
