create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'categories_large_user_id_id_key'
  ) then
    alter table categories_large add constraint categories_large_user_id_id_key unique (user_id, id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'categories_medium_user_id_id_key'
  ) then
    alter table categories_medium add constraint categories_medium_user_id_id_key unique (user_id, id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'categories_small_user_id_id_key'
  ) then
    alter table categories_small add constraint categories_small_user_id_id_key unique (user_id, id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'materials_user_id_id_key'
  ) then
    alter table materials add constraint materials_user_id_id_key unique (user_id, id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'packaging_items_user_id_id_key'
  ) then
    alter table packaging_items add constraint packaging_items_user_id_id_key unique (user_id, id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'shipping_methods_user_id_id_key'
  ) then
    alter table shipping_methods add constraint shipping_methods_user_id_id_key unique (user_id, id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'labor_roles_user_id_id_key'
  ) then
    alter table labor_roles add constraint labor_roles_user_id_id_key unique (user_id, id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'equipments_user_id_id_key'
  ) then
    alter table equipments add constraint equipments_user_id_id_key unique (user_id, id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'option_presets_user_id_id_key'
  ) then
    alter table option_presets add constraint option_presets_user_id_id_key unique (user_id, id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'products_user_id_id_key'
  ) then
    alter table products add constraint products_user_id_id_key unique (user_id, id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'cost_entries_materials_user_id_id_key'
  ) then
    alter table cost_entries_materials add constraint cost_entries_materials_user_id_id_key unique (user_id, id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'cost_entries_packaging_user_id_id_key'
  ) then
    alter table cost_entries_packaging add constraint cost_entries_packaging_user_id_id_key unique (user_id, id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'cost_entries_labor_user_id_id_key'
  ) then
    alter table cost_entries_labor add constraint cost_entries_labor_user_id_id_key unique (user_id, id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'cost_entries_outsourcing_user_id_id_key'
  ) then
    alter table cost_entries_outsourcing add constraint cost_entries_outsourcing_user_id_id_key unique (user_id, id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'cost_entries_development_user_id_id_key'
  ) then
    alter table cost_entries_development add constraint cost_entries_development_user_id_id_key unique (user_id, id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'cost_entries_equipment_user_id_id_key'
  ) then
    alter table cost_entries_equipment add constraint cost_entries_equipment_user_id_id_key unique (user_id, id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'cost_entries_logistics_user_id_id_key'
  ) then
    alter table cost_entries_logistics add constraint cost_entries_logistics_user_id_id_key unique (user_id, id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'cost_entries_electricity_user_id_id_key'
  ) then
    alter table cost_entries_electricity add constraint cost_entries_electricity_user_id_id_key unique (user_id, id);
  end if;
end $$;

create or replace function sync_app_data(p_user_id uuid, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
begin
  perform pg_advisory_xact_lock(hashtextextended('sync_app_data', p_user_id::text));

  delete from categories_large where user_id = p_user_id;
  insert into categories_large (id, user_id, name, description)
  select coalesce((value->>'id')::uuid, gen_random_uuid()), p_user_id, value->>'name', nullif(value->>'description','')
  from jsonb_array_elements(coalesce(p_payload->'categories_large', '[]'::jsonb)) as value;

  delete from categories_medium where user_id = p_user_id;
  insert into categories_medium (id, user_id, name, description, large_id)
  select coalesce((value->>'id')::uuid, gen_random_uuid()), p_user_id, value->>'name', nullif(value->>'description',''), (value->>'large_id')::uuid
  from jsonb_array_elements(coalesce(p_payload->'categories_medium', '[]'::jsonb)) as value;

  delete from categories_small where user_id = p_user_id;
  insert into categories_small (id, user_id, name, description, medium_id)
  select coalesce((value->>'id')::uuid, gen_random_uuid()), p_user_id, value->>'name', nullif(value->>'description',''), (value->>'medium_id')::uuid
  from jsonb_array_elements(coalesce(p_payload->'categories_small', '[]'::jsonb)) as value;

  delete from materials where user_id = p_user_id;
  insert into materials (id, user_id, name, unit, size_description, currency, unit_cost, supplier, note, units_per_batch)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         value->>'name',
         value->>'unit',
         value->>'size_description',
         value->>'currency',
         coalesce((value->>'unit_cost')::numeric, 0),
         nullif(value->>'supplier',''),
         nullif(value->>'note',''),
         (value->>'units_per_batch')::numeric
  from jsonb_array_elements(coalesce(p_payload->'materials', '[]'::jsonb)) as value;

  delete from packaging_items where user_id = p_user_id;
  insert into packaging_items (id, user_id, name, unit, size_description, currency, unit_cost, note, units_per_batch)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         value->>'name',
         value->>'unit',
         value->>'size_description',
         value->>'currency',
         coalesce((value->>'unit_cost')::numeric, 0),
         nullif(value->>'note',''),
         (value->>'units_per_batch')::numeric
  from jsonb_array_elements(coalesce(p_payload->'packaging_items', '[]'::jsonb)) as value;

  delete from shipping_methods where user_id = p_user_id;
  insert into shipping_methods (id, user_id, name, unit_cost, currency, note, description)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         value->>'name',
         coalesce((value->>'unit_cost')::numeric, 0),
         value->>'currency',
         nullif(value->>'note',''),
         nullif(value->>'description','')
  from jsonb_array_elements(coalesce(p_payload->'shipping_methods', '[]'::jsonb)) as value;

  delete from labor_roles where user_id = p_user_id;
  insert into labor_roles (id, user_id, name, hourly_rate, currency, note)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         value->>'name',
         coalesce((value->>'hourly_rate')::numeric, 0),
         value->>'currency',
         nullif(value->>'note','')
  from jsonb_array_elements(coalesce(p_payload->'labor_roles', '[]'::jsonb)) as value;

  delete from equipments where user_id = p_user_id;
  insert into equipments (id, user_id, name, acquisition_cost, currency, amortization_years, note)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         value->>'name',
         coalesce((value->>'acquisition_cost')::numeric, 0),
         value->>'currency',
         coalesce((value->>'amortization_years')::int, 1),
         nullif(value->>'note','')
  from jsonb_array_elements(coalesce(p_payload->'equipments', '[]'::jsonb)) as value;

  delete from option_presets where user_id = p_user_id;
  insert into option_presets (id, user_id, name, variants)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         value->>'name',
         coalesce(value->'variants', '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_payload->'option_presets', '[]'::jsonb)) as value;

  delete from products where user_id = p_user_id;
  insert into products (
    id,
    user_id,
    name,
    category_large_id,
    category_medium_id,
    category_small_id,
    size_variants,
    base_man_hours,
    default_electricity_cost,
    sale_price,
    registered_at,
    notes,
    production_lot_size,
    expected_production_period_years,
    expected_production_quantity,
    equipment_ids
  )
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         value->>'name',
         (value->>'category_large_id')::uuid,
         (value->>'category_medium_id')::uuid,
         (value->>'category_small_id')::uuid,
         coalesce(value->'size_variants', '[]'::jsonb),
         coalesce((value->>'base_man_hours')::numeric, 0),
         coalesce((value->>'default_electricity_cost')::numeric, 0),
         coalesce((value->>'sale_price')::numeric, 0),
         (value->>'registered_at')::timestamptz,
         nullif(value->>'notes',''),
         coalesce((value->>'production_lot_size')::numeric, 0),
         coalesce((value->>'expected_production_period_years')::numeric, 1),
         coalesce((value->>'expected_production_quantity')::numeric, 1),
         coalesce(value->'equipment_ids', '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_payload->'products', '[]'::jsonb)) as value;

  delete from cost_entries_materials where user_id = p_user_id;
  insert into cost_entries_materials (id, user_id, product_id, material_id, description, usage_ratio, cost_per_unit, currency)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         (value->>'product_id')::uuid,
         (value->>'material_id')::uuid,
         nullif(value->>'description',''),
         (value->>'usage_ratio')::numeric,
         coalesce((value->>'cost_per_unit')::numeric, 0),
         value->>'currency'
  from jsonb_array_elements(coalesce(p_payload->'cost_entries_materials', '[]'::jsonb)) as value;

  delete from cost_entries_packaging where user_id = p_user_id;
  insert into cost_entries_packaging (id, user_id, product_id, packaging_item_id, quantity, cost_per_unit, currency)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         (value->>'product_id')::uuid,
         (value->>'packaging_item_id')::uuid,
         coalesce((value->>'quantity')::numeric, 0),
         coalesce((value->>'cost_per_unit')::numeric, 0),
         value->>'currency'
  from jsonb_array_elements(coalesce(p_payload->'cost_entries_packaging', '[]'::jsonb)) as value;

  delete from cost_entries_labor where user_id = p_user_id;
  insert into cost_entries_labor (id, user_id, product_id, labor_role_id, hours, people_count, hourly_rate_override)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         (value->>'product_id')::uuid,
         (value->>'labor_role_id')::uuid,
         coalesce((value->>'hours')::numeric, 0),
         coalesce((value->>'people_count')::numeric, 0),
         (value->>'hourly_rate_override')::numeric
  from jsonb_array_elements(coalesce(p_payload->'cost_entries_labor', '[]'::jsonb)) as value;

  delete from cost_entries_outsourcing where user_id = p_user_id;
  insert into cost_entries_outsourcing (id, user_id, product_id, cost_per_unit, currency, note)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         (value->>'product_id')::uuid,
         coalesce((value->>'cost_per_unit')::numeric, 0),
         value->>'currency',
         nullif(value->>'note','')
  from jsonb_array_elements(coalesce(p_payload->'cost_entries_outsourcing', '[]'::jsonb)) as value;

  delete from cost_entries_development where user_id = p_user_id;
  insert into cost_entries_development (id, user_id, product_id, title, prototype_labor_cost, prototype_material_cost, tooling_cost, amortization_years)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         (value->>'product_id')::uuid,
         nullif(value->>'title',''),
         coalesce((value->>'prototype_labor_cost')::numeric, 0),
         coalesce((value->>'prototype_material_cost')::numeric, 0),
         coalesce((value->>'tooling_cost')::numeric, 0),
         coalesce((value->>'amortization_years')::int, 1)
  from jsonb_array_elements(coalesce(p_payload->'cost_entries_development', '[]'::jsonb)) as value;

  delete from cost_entries_equipment where user_id = p_user_id;
  insert into cost_entries_equipment (id, user_id, product_id, equipment_id, allocation_ratio, annual_quantity, usage_hours)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         (value->>'product_id')::uuid,
         (value->>'equipment_id')::uuid,
         coalesce((value->>'allocation_ratio')::numeric, 0),
         coalesce((value->>'annual_quantity')::numeric, 0),
         (value->>'usage_hours')::numeric
  from jsonb_array_elements(coalesce(p_payload->'cost_entries_equipment', '[]'::jsonb)) as value;

  delete from cost_entries_logistics where user_id = p_user_id;
  insert into cost_entries_logistics (id, user_id, product_id, shipping_method_id, cost_per_unit, currency)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         (value->>'product_id')::uuid,
         (value->>'shipping_method_id')::uuid,
         coalesce((value->>'cost_per_unit')::numeric, 0),
         value->>'currency'
  from jsonb_array_elements(coalesce(p_payload->'cost_entries_logistics', '[]'::jsonb)) as value;

  delete from cost_entries_electricity where user_id = p_user_id;
  insert into cost_entries_electricity (id, user_id, product_id, cost_per_unit, currency)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         (value->>'product_id')::uuid,
         coalesce((value->>'cost_per_unit')::numeric, 0),
         value->>'currency'
  from jsonb_array_elements(coalesce(p_payload->'cost_entries_electricity', '[]'::jsonb)) as value;
end;
$$;
