create extension if not exists "pgcrypto";

create table if not exists fees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  rate_percent numeric not null default 0,
  fixed_amount numeric not null default 0,
  currency text not null default 'JPY',
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists cost_entries_fees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid,
  fee_id uuid references fees(id) on delete cascade,
  rate_percent numeric not null default 0,
  fixed_amount numeric not null default 0,
  currency text not null default 'JPY',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function set_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'fees_set_updated_at'
  ) then
    create trigger fees_set_updated_at
      before update on fees
      for each row execute procedure set_timestamp_updated_at();
  end if;
  if not exists (
    select 1 from pg_trigger where tgname = 'cost_entries_fees_set_updated_at'
  ) then
    create trigger cost_entries_fees_set_updated_at
      before update on cost_entries_fees
      for each row execute procedure set_timestamp_updated_at();
  end if;
end $$;

alter table fees enable row level security;
alter table cost_entries_fees enable row level security;

do $$
begin
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'fees' and policyname = 'fees_select_own'
  ) then
    drop policy fees_select_own on fees;
  end if;
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'fees' and policyname = 'fees_modify_own'
  ) then
    drop policy fees_modify_own on fees;
  end if;
end $$;

create policy fees_select_own on fees for select using (auth.uid() = user_id);
create policy fees_modify_own on fees for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

do $$
begin
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cost_entries_fees' and policyname = 'cost_entries_fees_select_own'
  ) then
    drop policy cost_entries_fees_select_own on cost_entries_fees;
  end if;
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cost_entries_fees' and policyname = 'cost_entries_fees_modify_own'
  ) then
    drop policy cost_entries_fees_modify_own on cost_entries_fees;
  end if;
end $$;

create policy cost_entries_fees_select_own on cost_entries_fees for select using (auth.uid() = user_id);
create policy cost_entries_fees_modify_own on cost_entries_fees for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
