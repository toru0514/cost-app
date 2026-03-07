create table if not exists tab_order_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tab_order text[] not null default '{}'::text[],
  updated_at timestamptz not null default timezone('utc', now())
);

alter table tab_order_settings enable row level security;

create policy "tab_order_settings_own" on tab_order_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
