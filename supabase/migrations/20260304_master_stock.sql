create table if not exists material_stock (
  user_id uuid not null references auth.users(id) on delete cascade,
  material_id text not null,
  quantity numeric not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, material_id)
);

alter table material_stock enable row level security;

create policy "material_stock_own" on material_stock
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists packaging_stock (
  user_id uuid not null references auth.users(id) on delete cascade,
  packaging_item_id text not null,
  quantity numeric not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, packaging_item_id)
);

alter table packaging_stock enable row level security;

create policy "packaging_stock_own" on packaging_stock
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
