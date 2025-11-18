create table if not exists sync_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  device_info text,
  metadata jsonb default '{}'::jsonb
);

alter table sync_audit_logs enable row level security;

create policy "Users can insert their audit logs" on sync_audit_logs
  for insert
  with check (auth.uid() = user_id);

create policy "Users can view their audit logs" on sync_audit_logs
  for select
  using (auth.uid() = user_id);
