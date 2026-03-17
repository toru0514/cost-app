-- time_records テーブル作成
-- 時間計測データの永続化を可能にする

CREATE TABLE IF NOT EXISTS time_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_name text NOT NULL DEFAULT '',
  total_duration numeric NOT NULL DEFAULT 0,
  laps jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- sync_app_data の ON CONFLICT に必要な UNIQUE 制約
ALTER TABLE time_records
  ADD CONSTRAINT time_records_user_id_id_key UNIQUE (user_id, id);

-- RLS を有効化
ALTER TABLE time_records ENABLE ROW LEVEL SECURITY;

-- 既存テーブルと同じパターンの RLS ポリシー
SELECT ensure_user_owned_policies('time_records');
