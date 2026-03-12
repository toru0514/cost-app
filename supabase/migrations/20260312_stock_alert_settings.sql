-- 在庫通知設定テーブル
create table if not exists stock_alert_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('product', 'material', 'packaging')),
  item_id text not null,
  enabled boolean not null default false,
  threshold integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);

-- RLS
alter table stock_alert_settings enable row level security;

create policy "Users can manage own alert settings"
  on stock_alert_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
