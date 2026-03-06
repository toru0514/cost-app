create table if not exists product_list_column_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  column_order text[] not null default '{}'::text[],
  hidden_columns text[] not null default '{}'::text[],
  updated_at timestamptz not null default timezone('utc', now())
);

alter table product_list_column_settings enable row level security;

create policy "product_list_column_settings_own" on product_list_column_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
