create table if not exists product_stock (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  quantity integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, product_id)
);

alter table product_stock enable row level security;

create policy "product_stock_select_own" on product_stock
  for select
  using (auth.uid() = user_id);

create policy "product_stock_modify_own" on product_stock
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
