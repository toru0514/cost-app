create extension if not exists "pgcrypto";

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'id'
  )
  and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'user_id'
  ) then
    execute 'alter table profiles rename column id to user_id';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'created_at'
  ) then
    alter table profiles add column created_at timestamptz not null default now();
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'updated_at'
  ) then
    alter table profiles add column updated_at timestamptz not null default now();
  end if;
end $$;

alter table profiles enable row level security;

do $$
begin
  if exists (
    select 1 from pg_trigger where tgname = 'profiles_set_updated_at'
  ) then
    execute 'drop trigger profiles_set_updated_at on profiles';
  end if;
end $$;

create or replace function set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on profiles
for each row
execute procedure set_profiles_updated_at();

alter table profiles disable row level security;
alter table profiles enable row level security;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Profiles select own'
  ) then
    drop policy "Profiles select own" on profiles;
  end if;
end $$;

create policy "Profiles select own"
  on profiles for select
  using (auth.uid() = user_id);

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Profiles upsert own'
  ) then
    drop policy "Profiles upsert own" on profiles;
  end if;
end $$;

create policy "Profiles upsert own"
  on profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, name, email)
  values (new.id, new.raw_user_meta_data->>'name', new.email)
  on conflict (user_id) do update set
    name = excluded.name,
    email = excluded.email;
  return new;
end;
$$;

do $$
begin
  if exists (
    select 1 from pg_trigger
    where tgname = 'handle_new_user'
  ) then
    execute 'drop trigger handle_new_user on auth.users';
  end if;
end $$;

create trigger handle_new_user
after insert on auth.users
for each row execute procedure public.handle_new_user();
