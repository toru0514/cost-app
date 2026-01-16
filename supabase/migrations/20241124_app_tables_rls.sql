create or replace function ensure_user_owned_policies(p_table text) returns void
language plpgsql
as $$
begin
  execute format('alter table %I enable row level security', p_table);

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = p_table
      and policyname = p_table || '_select_own'
  ) then
    execute format('drop policy %I on %I', p_table || '_select_own', p_table);
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = p_table
      and policyname = p_table || '_modify_own'
  ) then
    execute format('drop policy %I on %I', p_table || '_modify_own', p_table);
  end if;

  execute format(
    'create policy %I on %I for select using (auth.uid() = user_id)',
    p_table || '_select_own',
    p_table
  );

  execute format(
    'create policy %I on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
    p_table || '_modify_own',
    p_table
  );
end;
$$;

do $$
declare
  table_name text;
begin
  for table_name in
    select unnest(array[
      'categories_large',
      'categories_medium',
      'categories_small',
      'materials',
      'packaging_items',
      'shipping_methods',
      'labor_roles',
      'equipments',
      'fees',
      'option_presets',
      'products',
      'cost_entries_materials',
      'cost_entries_packaging',
      'cost_entries_labor',
      'cost_entries_outsourcing',
      'cost_entries_development',
      'cost_entries_equipment',
      'cost_entries_logistics',
      'cost_entries_electricity',
      'cost_entries_fees'
    ])
  loop
    perform ensure_user_owned_policies(table_name);
  end loop;
end;
$$;

drop function ensure_user_owned_policies(text);
