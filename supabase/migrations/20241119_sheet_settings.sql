create table if not exists sheet_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  spreadsheet_id text not null,
  worksheet_title text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table sheet_settings enable row level security;

create policy "Users can manage their sheet settings" on sheet_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
