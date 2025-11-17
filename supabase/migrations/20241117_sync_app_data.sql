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
  v_state text;
  v_message text;
  v_detail text;
  v_hint text;
  v_stage text := 'init';
begin
  begin
    perform pg_advisory_xact_lock(
      hashtext('sync_app_data'),
      hashtext(p_user_id::text)
    );

  v_stage := 'categories_large';
  delete from categories_large where user_id = p_user_id;
  insert into categories_large (id, user_id, name, description)
  select coalesce((value->>'id')::uuid, gen_random_uuid()), p_user_id, value->>'name', nullif(value->>'description','')
  from jsonb_array_elements(coalesce(p_payload->'categories_large', '[]'::jsonb)) as value;

  v_stage := 'categories_medium';
  delete from categories_medium where user_id = p_user_id;
  insert into categories_medium (id, user_id, name, description, large_id)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         value->>'name',
         nullif(value->>'description',''),
         nullif(value->>'large_id','')::uuid
  from jsonb_array_elements(coalesce(p_payload->'categories_medium', '[]'::jsonb)) as value;

  v_stage := 'categories_small';
  delete from categories_small where user_id = p_user_id;
  insert into categories_small (id, user_id, name, description, medium_id)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         value->>'name',
         nullif(value->>'description',''),
         nullif(value->>'medium_id','')::uuid
  from jsonb_array_elements(coalesce(p_payload->'categories_small', '[]'::jsonb)) as value;

  v_stage := 'materials';
  delete from materials where user_id = p_user_id;
  insert into materials (id, user_id, name, unit, size_description, currency, unit_cost, supplier, note, units_per_batch)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         value->>'name',
         value->>'unit',
         value->>'size_description',
         value->>'currency',
         coalesce(nullif(value->>'unit_cost','')::numeric, 0),
         nullif(value->>'supplier',''),
         nullif(value->>'note',''),
         nullif(value->>'units_per_batch','')::numeric
  from jsonb_array_elements(coalesce(p_payload->'materials', '[]'::jsonb)) as value;

  v_stage := 'packaging_items';
  delete from packaging_items where user_id = p_user_id;
  insert into packaging_items (id, user_id, name, unit, size_description, currency, unit_cost, note, units_per_batch)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         value->>'name',
         value->>'unit',
         value->>'size_description',
         value->>'currency',
         coalesce(nullif(value->>'unit_cost','')::numeric, 0),
         nullif(value->>'note',''),
         nullif(value->>'units_per_batch','')::numeric
  from jsonb_array_elements(coalesce(p_payload->'packaging_items', '[]'::jsonb)) as value;

  v_stage := 'shipping_methods';
  delete from shipping_methods where user_id = p_user_id;
  insert into shipping_methods (id, user_id, name, unit_cost, currency, note, description)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         value->>'name',
         coalesce(nullif(value->>'unit_cost','')::numeric, 0),
         value->>'currency',
         nullif(value->>'note',''),
         nullif(value->>'description','')
  from jsonb_array_elements(coalesce(p_payload->'shipping_methods', '[]'::jsonb)) as value;

  v_stage := 'labor_roles';
  delete from labor_roles where user_id = p_user_id;
  insert into labor_roles (id, user_id, name, hourly_rate, currency, note)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         value->>'name',
         coalesce(nullif(value->>'hourly_rate','')::numeric, 0),
         value->>'currency',
         nullif(value->>'note','')
  from jsonb_array_elements(coalesce(p_payload->'labor_roles', '[]'::jsonb)) as value;

  v_stage := 'equipments';
  delete from equipments where user_id = p_user_id;
  insert into equipments (id, user_id, name, acquisition_cost, currency, amortization_years, note)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         value->>'name',
         coalesce(nullif(value->>'acquisition_cost','')::numeric, 0),
         value->>'currency',
         coalesce(nullif(value->>'amortization_years','')::int, 1),
         nullif(value->>'note','')
  from jsonb_array_elements(coalesce(p_payload->'equipments', '[]'::jsonb)) as value;

  v_stage := 'option_presets';
  delete from option_presets where user_id = p_user_id;
  insert into option_presets (id, user_id, name, variants)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         value->>'name',
         coalesce(value->'variants', '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_payload->'option_presets', '[]'::jsonb)) as value;

  v_stage := 'products';
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
         nullif(value->>'category_large_id','')::uuid,
         nullif(value->>'category_medium_id','')::uuid,
         nullif(value->>'category_small_id','')::uuid,
         coalesce(value->'size_variants', '[]'::jsonb),
         coalesce(nullif(value->>'base_man_hours','')::numeric, 0),
         coalesce(nullif(value->>'default_electricity_cost','')::numeric, 0),
         coalesce(nullif(value->>'sale_price','')::numeric, 0),
         nullif(value->>'registered_at','')::timestamptz,
         nullif(value->>'notes',''),
         coalesce(nullif(value->>'production_lot_size','')::numeric, 0),
         coalesce(nullif(value->>'expected_production_period_years','')::numeric, 1),
         coalesce(nullif(value->>'expected_production_quantity','')::numeric, 1),
         coalesce(
           (select array_agg(elem)
              from jsonb_array_elements_text(coalesce(value->'equipment_ids', '[]'::jsonb)) as elem),
           array[]::text[]
         )
  from jsonb_array_elements(coalesce(p_payload->'products', '[]'::jsonb)) as value;

  v_stage := 'cost_entries_materials';
  delete from cost_entries_materials where user_id = p_user_id;
  insert into cost_entries_materials (id, user_id, product_id, material_id, description, usage_ratio, cost_per_unit, currency)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         nullif(value->>'product_id','')::uuid,
         nullif(value->>'material_id','')::uuid,
         nullif(value->>'description',''),
         nullif(value->>'usage_ratio','')::numeric,
         coalesce(nullif(value->>'cost_per_unit','')::numeric, 0),
         value->>'currency'
  from jsonb_array_elements(coalesce(p_payload->'cost_entries_materials', '[]'::jsonb)) as value;

  v_stage := 'cost_entries_packaging';
  delete from cost_entries_packaging where user_id = p_user_id;
  insert into cost_entries_packaging (id, user_id, product_id, packaging_item_id, quantity, cost_per_unit, currency)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         nullif(value->>'product_id','')::uuid,
         nullif(value->>'packaging_item_id','')::uuid,
         coalesce(nullif(value->>'quantity','')::numeric, 0),
         coalesce(nullif(value->>'cost_per_unit','')::numeric, 0),
         value->>'currency'
  from jsonb_array_elements(coalesce(p_payload->'cost_entries_packaging', '[]'::jsonb)) as value;

  v_stage := 'cost_entries_labor';
  delete from cost_entries_labor where user_id = p_user_id;
  insert into cost_entries_labor (id, user_id, product_id, labor_role_id, hours, people_count, hourly_rate_override)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         nullif(value->>'product_id','')::uuid,
         nullif(value->>'labor_role_id','')::uuid,
         coalesce(nullif(value->>'hours','')::numeric, 0),
         coalesce(nullif(value->>'people_count','')::numeric, 0),
         nullif(value->>'hourly_rate_override','')::numeric
  from jsonb_array_elements(coalesce(p_payload->'cost_entries_labor', '[]'::jsonb)) as value;

  v_stage := 'cost_entries_outsourcing';
  delete from cost_entries_outsourcing where user_id = p_user_id;
  insert into cost_entries_outsourcing (id, user_id, product_id, cost_per_unit, currency, note)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         nullif(value->>'product_id','')::uuid,
         coalesce(nullif(value->>'cost_per_unit','')::numeric, 0),
         value->>'currency',
         nullif(value->>'note','')
  from jsonb_array_elements(coalesce(p_payload->'cost_entries_outsourcing', '[]'::jsonb)) as value;

  v_stage := 'cost_entries_development';
  delete from cost_entries_development where user_id = p_user_id;
  insert into cost_entries_development (id, user_id, product_id, title, prototype_labor_cost, prototype_material_cost, tooling_cost, amortization_years)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         nullif(value->>'product_id','')::uuid,
         nullif(value->>'title',''),
         coalesce(nullif(value->>'prototype_labor_cost','')::numeric, 0),
         coalesce(nullif(value->>'prototype_material_cost','')::numeric, 0),
         coalesce(nullif(value->>'tooling_cost','')::numeric, 0),
         coalesce(nullif(value->>'amortization_years','')::int, 1)
  from jsonb_array_elements(coalesce(p_payload->'cost_entries_development', '[]'::jsonb)) as value;

  v_stage := 'cost_entries_equipment';
  delete from cost_entries_equipment where user_id = p_user_id;
  insert into cost_entries_equipment (id, user_id, product_id, equipment_id, allocation_ratio, annual_quantity, usage_hours)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         nullif(value->>'product_id','')::uuid,
         nullif(value->>'equipment_id','')::uuid,
         coalesce(nullif(value->>'allocation_ratio','')::numeric, 0),
         coalesce(nullif(value->>'annual_quantity','')::numeric, 0),
         nullif(value->>'usage_hours','')::numeric
  from jsonb_array_elements(coalesce(p_payload->'cost_entries_equipment', '[]'::jsonb)) as value;

  v_stage := 'cost_entries_logistics';
  delete from cost_entries_logistics where user_id = p_user_id;
  insert into cost_entries_logistics (id, user_id, product_id, shipping_method_id, cost_per_unit, currency)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         p_user_id,
         nullif(value->>'product_id','')::uuid,
         nullif(value->>'shipping_method_id','')::uuid,
         coalesce(nullif(value->>'cost_per_unit','')::numeric, 0),
         value->>'currency'
  from jsonb_array_elements(coalesce(p_payload->'cost_entries_logistics', '[]'::jsonb)) as value;

    v_stage := 'cost_entries_electricity';
    delete from cost_entries_electricity where user_id = p_user_id;
    insert into cost_entries_electricity (id, user_id, product_id, cost_per_unit, currency)
    select coalesce((value->>'id')::uuid, gen_random_uuid()),
           p_user_id,
           nullif(value->>'product_id','')::uuid,
           coalesce(nullif(value->>'cost_per_unit','')::numeric, 0),
           value->>'currency'
    from jsonb_array_elements(coalesce(p_payload->'cost_entries_electricity', '[]'::jsonb)) as value;
  exception
    when others then
      get stacked diagnostics
        v_state = returned_sqlstate,
        v_message = message_text,
        v_detail = pg_exception_detail,
        v_hint = pg_exception_hint;
      raise exception using
        message = format('sync_app_data failed at %s (%s): %s', v_stage, v_state, v_message),
        detail = v_detail,
        hint = v_hint;
  end;
end;
$$;

grant execute on function sync_app_data(uuid, jsonb) to anon;
grant execute on function sync_app_data(uuid, jsonb) to authenticated;
grant execute on function sync_app_data(uuid, jsonb) to service_role;
