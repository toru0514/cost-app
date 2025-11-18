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
  create temporary table tmp_categories_large (id uuid, name text, description text) on commit drop;
  insert into tmp_categories_large (id, name, description)
  select coalesce((value->>'id')::uuid, gen_random_uuid()), value->>'name', nullif(value->>'description','')
  from jsonb_array_elements(coalesce(p_payload->'categories_large', '[]'::jsonb)) as value;
  delete from categories_large where user_id = p_user_id and id not in (select id from tmp_categories_large);
  insert into categories_large (id, user_id, name, description)
  select tmp.id, p_user_id, tmp.name, tmp.description from tmp_categories_large tmp
  on conflict (user_id, id) do update set name = excluded.name, description = excluded.description;

  v_stage := 'categories_medium';
  create temporary table tmp_categories_medium (id uuid, name text, description text, large_id uuid) on commit drop;
  insert into tmp_categories_medium (id, name, description, large_id)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         value->>'name',
         nullif(value->>'description',''),
         nullif(value->>'large_id','')::uuid
  from jsonb_array_elements(coalesce(p_payload->'categories_medium', '[]'::jsonb)) as value;
  delete from categories_medium where user_id = p_user_id and id not in (select id from tmp_categories_medium);
  insert into categories_medium (id, user_id, name, description, large_id)
  select tmp.id, p_user_id, tmp.name, tmp.description, tmp.large_id from tmp_categories_medium tmp
  on conflict (user_id, id) do update set name = excluded.name, description = excluded.description, large_id = excluded.large_id;

  v_stage := 'categories_small';
  create temporary table tmp_categories_small (id uuid, name text, description text, medium_id uuid) on commit drop;
  insert into tmp_categories_small (id, name, description, medium_id)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         value->>'name',
         nullif(value->>'description',''),
         nullif(value->>'medium_id','')::uuid
  from jsonb_array_elements(coalesce(p_payload->'categories_small', '[]'::jsonb)) as value;
  delete from categories_small where user_id = p_user_id and id not in (select id from tmp_categories_small);
  insert into categories_small (id, user_id, name, description, medium_id)
  select tmp.id, p_user_id, tmp.name, tmp.description, tmp.medium_id from tmp_categories_small tmp
  on conflict (user_id, id) do update set name = excluded.name, description = excluded.description, medium_id = excluded.medium_id;

  v_stage := 'materials';
  create temporary table tmp_materials (
    id uuid,
    name text,
    unit text,
    size_description text,
    currency text,
    unit_cost numeric,
    supplier text,
    note text,
    units_per_batch numeric
  ) on commit drop;
  insert into tmp_materials (id, name, unit, size_description, currency, unit_cost, supplier, note, units_per_batch)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         value->>'name',
         value->>'unit',
         value->>'size_description',
         value->>'currency',
         coalesce(nullif(value->>'unit_cost','')::numeric, 0),
         nullif(value->>'supplier',''),
         nullif(value->>'note',''),
         nullif(value->>'units_per_batch','')::numeric
  from jsonb_array_elements(coalesce(p_payload->'materials', '[]'::jsonb)) as value;
  delete from materials where user_id = p_user_id and id not in (select id from tmp_materials);
  insert into materials (id, user_id, name, unit, size_description, currency, unit_cost, supplier, note, units_per_batch)
  select tmp.id, p_user_id, tmp.name, tmp.unit, tmp.size_description, tmp.currency, tmp.unit_cost, tmp.supplier, tmp.note, tmp.units_per_batch
  from tmp_materials tmp
  on conflict (user_id, id) do update set
    name = excluded.name,
    unit = excluded.unit,
    size_description = excluded.size_description,
    currency = excluded.currency,
    unit_cost = excluded.unit_cost,
    supplier = excluded.supplier,
    note = excluded.note,
    units_per_batch = excluded.units_per_batch;

  v_stage := 'packaging_items';
  create temporary table tmp_packaging_items (
    id uuid,
    name text,
    unit text,
    size_description text,
    currency text,
    unit_cost numeric,
    note text,
    units_per_batch numeric
  ) on commit drop;
  insert into tmp_packaging_items (id, name, unit, size_description, currency, unit_cost, note, units_per_batch)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         value->>'name',
         value->>'unit',
         value->>'size_description',
         value->>'currency',
         coalesce(nullif(value->>'unit_cost','')::numeric, 0),
         nullif(value->>'note',''),
         nullif(value->>'units_per_batch','')::numeric
  from jsonb_array_elements(coalesce(p_payload->'packaging_items', '[]'::jsonb)) as value;
  delete from packaging_items where user_id = p_user_id and id not in (select id from tmp_packaging_items);
  insert into packaging_items (id, user_id, name, unit, size_description, currency, unit_cost, note, units_per_batch)
  select tmp.id, p_user_id, tmp.name, tmp.unit, tmp.size_description, tmp.currency, tmp.unit_cost, tmp.note, tmp.units_per_batch
  from tmp_packaging_items tmp
  on conflict (user_id, id) do update set
    name = excluded.name,
    unit = excluded.unit,
    size_description = excluded.size_description,
    currency = excluded.currency,
    unit_cost = excluded.unit_cost,
    note = excluded.note,
    units_per_batch = excluded.units_per_batch;

  v_stage := 'shipping_methods';
  create temporary table tmp_shipping_methods (
    id uuid,
    name text,
    unit_cost numeric,
    currency text,
    note text,
    description text
  ) on commit drop;
  insert into tmp_shipping_methods (id, name, unit_cost, currency, note, description)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         value->>'name',
         coalesce(nullif(value->>'unit_cost','')::numeric, 0),
         value->>'currency',
         nullif(value->>'note',''),
         nullif(value->>'description','')
  from jsonb_array_elements(coalesce(p_payload->'shipping_methods', '[]'::jsonb)) as value;
  delete from shipping_methods where user_id = p_user_id and id not in (select id from tmp_shipping_methods);
  insert into shipping_methods (id, user_id, name, unit_cost, currency, note, description)
  select tmp.id, p_user_id, tmp.name, tmp.unit_cost, tmp.currency, tmp.note, tmp.description
  from tmp_shipping_methods tmp
  on conflict (user_id, id) do update set
    name = excluded.name,
    unit_cost = excluded.unit_cost,
    currency = excluded.currency,
    note = excluded.note,
    description = excluded.description;

  v_stage := 'labor_roles';
  create temporary table tmp_labor_roles (
    id uuid,
    name text,
    hourly_rate numeric,
    currency text,
    note text
  ) on commit drop;
  insert into tmp_labor_roles (id, name, hourly_rate, currency, note)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         value->>'name',
         coalesce(nullif(value->>'hourly_rate','')::numeric, 0),
         value->>'currency',
         nullif(value->>'note','')
  from jsonb_array_elements(coalesce(p_payload->'labor_roles', '[]'::jsonb)) as value;
  delete from labor_roles where user_id = p_user_id and id not in (select id from tmp_labor_roles);
  insert into labor_roles (id, user_id, name, hourly_rate, currency, note)
  select tmp.id, p_user_id, tmp.name, tmp.hourly_rate, tmp.currency, tmp.note
  from tmp_labor_roles tmp
  on conflict (user_id, id) do update set
    name = excluded.name,
    hourly_rate = excluded.hourly_rate,
    currency = excluded.currency,
    note = excluded.note;

  v_stage := 'equipments';
  create temporary table tmp_equipments (
    id uuid,
    name text,
    acquisition_cost numeric,
    currency text,
    amortization_years int,
    note text
  ) on commit drop;
  insert into tmp_equipments (id, name, acquisition_cost, currency, amortization_years, note)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         value->>'name',
         coalesce(nullif(value->>'acquisition_cost','')::numeric, 0),
         value->>'currency',
         coalesce(nullif(value->>'amortization_years','')::int, 1),
         nullif(value->>'note','')
  from jsonb_array_elements(coalesce(p_payload->'equipments', '[]'::jsonb)) as value;
  delete from equipments where user_id = p_user_id and id not in (select id from tmp_equipments);
  insert into equipments (id, user_id, name, acquisition_cost, currency, amortization_years, note)
  select tmp.id, p_user_id, tmp.name, tmp.acquisition_cost, tmp.currency, tmp.amortization_years, tmp.note
  from tmp_equipments tmp
  on conflict (user_id, id) do update set
    name = excluded.name,
    acquisition_cost = excluded.acquisition_cost,
    currency = excluded.currency,
    amortization_years = excluded.amortization_years,
    note = excluded.note;

  v_stage := 'option_presets';
  create temporary table tmp_option_presets (
    id uuid,
    name text,
    variants jsonb
  ) on commit drop;
  insert into tmp_option_presets (id, name, variants)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         value->>'name',
         coalesce(value->'variants', '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_payload->'option_presets', '[]'::jsonb)) as value;
  delete from option_presets where user_id = p_user_id and id not in (select id from tmp_option_presets);
  insert into option_presets (id, user_id, name, variants)
  select tmp.id, p_user_id, tmp.name, tmp.variants from tmp_option_presets tmp
  on conflict (user_id, id) do update set name = excluded.name, variants = excluded.variants;

  v_stage := 'products';
  create temporary table tmp_products (
    id uuid,
    name text,
    category_large_id uuid,
    category_medium_id uuid,
    category_small_id uuid,
    size_variants jsonb,
    base_man_hours numeric,
    default_electricity_cost numeric,
    sale_price numeric,
    registered_at timestamptz,
    notes text,
    production_lot_size numeric,
    expected_production_period_years numeric,
    expected_production_quantity numeric,
    equipment_ids text[]
  ) on commit drop;
  insert into tmp_products (
    id,
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
         coalesce((select array_agg(elem)
             from jsonb_array_elements_text(coalesce(value->'equipment_ids', '[]'::jsonb)) as elem),
           array[]::text[])
  from jsonb_array_elements(coalesce(p_payload->'products', '[]'::jsonb)) as value;
  delete from products where user_id = p_user_id and id not in (select id from tmp_products);
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
  select tmp.id,
         p_user_id,
         tmp.name,
         tmp.category_large_id,
         tmp.category_medium_id,
         tmp.category_small_id,
         tmp.size_variants,
         tmp.base_man_hours,
         tmp.default_electricity_cost,
         tmp.sale_price,
         tmp.registered_at,
         tmp.notes,
         tmp.production_lot_size,
         tmp.expected_production_period_years,
         tmp.expected_production_quantity,
         tmp.equipment_ids
  from tmp_products tmp
  on conflict (user_id, id) do update set
    name = excluded.name,
    category_large_id = excluded.category_large_id,
    category_medium_id = excluded.category_medium_id,
    category_small_id = excluded.category_small_id,
    size_variants = excluded.size_variants,
    base_man_hours = excluded.base_man_hours,
    default_electricity_cost = excluded.default_electricity_cost,
    sale_price = excluded.sale_price,
    registered_at = excluded.registered_at,
    notes = excluded.notes,
    production_lot_size = excluded.production_lot_size,
    expected_production_period_years = excluded.expected_production_period_years,
    expected_production_quantity = excluded.expected_production_quantity,
    equipment_ids = excluded.equipment_ids;

  v_stage := 'cost_entries_materials';
  create temporary table tmp_cost_entries_materials (
    id uuid,
    product_id uuid,
    material_id uuid,
    description text,
    usage_ratio numeric,
    cost_per_unit numeric,
    currency text
  ) on commit drop;
  insert into tmp_cost_entries_materials (id, product_id, material_id, description, usage_ratio, cost_per_unit, currency)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         nullif(value->>'product_id','')::uuid,
         nullif(value->>'material_id','')::uuid,
         nullif(value->>'description',''),
         nullif(value->>'usage_ratio','')::numeric,
         coalesce(nullif(value->>'cost_per_unit','')::numeric, 0),
         value->>'currency'
  from jsonb_array_elements(coalesce(p_payload->'cost_entries_materials', '[]'::jsonb)) as value;
  delete from cost_entries_materials where user_id = p_user_id and id not in (select id from tmp_cost_entries_materials);
  insert into cost_entries_materials (id, user_id, product_id, material_id, description, usage_ratio, cost_per_unit, currency)
  select tmp.id, p_user_id, tmp.product_id, tmp.material_id, tmp.description, tmp.usage_ratio, tmp.cost_per_unit, tmp.currency
  from tmp_cost_entries_materials tmp
  on conflict (user_id, id) do update set
    product_id = excluded.product_id,
    material_id = excluded.material_id,
    description = excluded.description,
    usage_ratio = excluded.usage_ratio,
    cost_per_unit = excluded.cost_per_unit,
    currency = excluded.currency;

  v_stage := 'cost_entries_packaging';
  create temporary table tmp_cost_entries_packaging (
    id uuid,
    product_id uuid,
    packaging_item_id uuid,
    quantity numeric,
    cost_per_unit numeric,
    currency text
  ) on commit drop;
  insert into tmp_cost_entries_packaging (id, product_id, packaging_item_id, quantity, cost_per_unit, currency)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         nullif(value->>'product_id','')::uuid,
         nullif(value->>'packaging_item_id','')::uuid,
         coalesce(nullif(value->>'quantity','')::numeric, 0),
         coalesce(nullif(value->>'cost_per_unit','')::numeric, 0),
         value->>'currency'
  from jsonb_array_elements(coalesce(p_payload->'cost_entries_packaging', '[]'::jsonb)) as value;
  delete from cost_entries_packaging where user_id = p_user_id and id not in (select id from tmp_cost_entries_packaging);
  insert into cost_entries_packaging (id, user_id, product_id, packaging_item_id, quantity, cost_per_unit, currency)
  select tmp.id, p_user_id, tmp.product_id, tmp.packaging_item_id, tmp.quantity, tmp.cost_per_unit, tmp.currency
  from tmp_cost_entries_packaging tmp
  on conflict (user_id, id) do update set
    product_id = excluded.product_id,
    packaging_item_id = excluded.packaging_item_id,
    quantity = excluded.quantity,
    cost_per_unit = excluded.cost_per_unit,
    currency = excluded.currency;

  v_stage := 'cost_entries_labor';
  create temporary table tmp_cost_entries_labor (
    id uuid,
    product_id uuid,
    labor_role_id uuid,
    hours numeric,
    people_count numeric,
    hourly_rate_override numeric
  ) on commit drop;
  insert into tmp_cost_entries_labor (id, product_id, labor_role_id, hours, people_count, hourly_rate_override)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         nullif(value->>'product_id','')::uuid,
         nullif(value->>'labor_role_id','')::uuid,
         coalesce(nullif(value->>'hours','')::numeric, 0),
         coalesce(nullif(value->>'people_count','')::numeric, 0),
         nullif(value->>'hourly_rate_override','')::numeric
  from jsonb_array_elements(coalesce(p_payload->'cost_entries_labor', '[]'::jsonb)) as value;
  delete from cost_entries_labor where user_id = p_user_id and id not in (select id from tmp_cost_entries_labor);
  insert into cost_entries_labor (id, user_id, product_id, labor_role_id, hours, people_count, hourly_rate_override)
  select tmp.id, p_user_id, tmp.product_id, tmp.labor_role_id, tmp.hours, tmp.people_count, tmp.hourly_rate_override
  from tmp_cost_entries_labor tmp
  on conflict (user_id, id) do update set
    product_id = excluded.product_id,
    labor_role_id = excluded.labor_role_id,
    hours = excluded.hours,
    people_count = excluded.people_count,
    hourly_rate_override = excluded.hourly_rate_override;

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
  create temporary table tmp_cost_entries_equipment (
    id uuid,
    product_id uuid,
    equipment_id uuid,
    allocation_ratio numeric,
    annual_quantity numeric,
    usage_hours numeric
  ) on commit drop;
  insert into tmp_cost_entries_equipment (id, product_id, equipment_id, allocation_ratio, annual_quantity, usage_hours)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         nullif(value->>'product_id','')::uuid,
         nullif(value->>'equipment_id','')::uuid,
         coalesce(nullif(value->>'allocation_ratio','')::numeric, 0),
         coalesce(nullif(value->>'annual_quantity','')::numeric, 0),
         nullif(value->>'usage_hours','')::numeric
  from jsonb_array_elements(coalesce(p_payload->'cost_entries_equipment', '[]'::jsonb)) as value;
  delete from cost_entries_equipment where user_id = p_user_id and id not in (select id from tmp_cost_entries_equipment);
  insert into cost_entries_equipment (id, user_id, product_id, equipment_id, allocation_ratio, annual_quantity, usage_hours)
  select tmp.id, p_user_id, tmp.product_id, tmp.equipment_id, tmp.allocation_ratio, tmp.annual_quantity, tmp.usage_hours
  from tmp_cost_entries_equipment tmp
  on conflict (user_id, id) do update set
    product_id = excluded.product_id,
    equipment_id = excluded.equipment_id,
    allocation_ratio = excluded.allocation_ratio,
    annual_quantity = excluded.annual_quantity,
    usage_hours = excluded.usage_hours;

  v_stage := 'cost_entries_logistics';
  create temporary table tmp_cost_entries_logistics (
    id uuid,
    product_id uuid,
    shipping_method_id uuid,
    cost_per_unit numeric,
    currency text
  ) on commit drop;
  insert into tmp_cost_entries_logistics (id, product_id, shipping_method_id, cost_per_unit, currency)
  select coalesce((value->>'id')::uuid, gen_random_uuid()),
         nullif(value->>'product_id','')::uuid,
         nullif(value->>'shipping_method_id','')::uuid,
         coalesce(nullif(value->>'cost_per_unit','')::numeric, 0),
         value->>'currency'
  from jsonb_array_elements(coalesce(p_payload->'cost_entries_logistics', '[]'::jsonb)) as value;
  delete from cost_entries_logistics where user_id = p_user_id and id not in (select id from tmp_cost_entries_logistics);
  insert into cost_entries_logistics (id, user_id, product_id, shipping_method_id, cost_per_unit, currency)
  select tmp.id, p_user_id, tmp.product_id, tmp.shipping_method_id, tmp.cost_per_unit, tmp.currency
  from tmp_cost_entries_logistics tmp
  on conflict (user_id, id) do update set
    product_id = excluded.product_id,
    shipping_method_id = excluded.shipping_method_id,
    cost_per_unit = excluded.cost_per_unit,
    currency = excluded.currency;

    v_stage := 'cost_entries_electricity';
    create temporary table tmp_cost_entries_electricity (
      id uuid,
      product_id uuid,
      cost_per_unit numeric,
      currency text
    ) on commit drop;
    insert into tmp_cost_entries_electricity (id, product_id, cost_per_unit, currency)
    select coalesce((value->>'id')::uuid, gen_random_uuid()),
           nullif(value->>'product_id','')::uuid,
           coalesce(nullif(value->>'cost_per_unit','')::numeric, 0),
           value->>'currency'
    from jsonb_array_elements(coalesce(p_payload->'cost_entries_electricity', '[]'::jsonb)) as value;
    delete from cost_entries_electricity where user_id = p_user_id and id not in (select id from tmp_cost_entries_electricity);
    insert into cost_entries_electricity (id, user_id, product_id, cost_per_unit, currency)
    select tmp.id, p_user_id, tmp.product_id, tmp.cost_per_unit, tmp.currency
    from tmp_cost_entries_electricity tmp
    on conflict (user_id, id) do update set
      product_id = excluded.product_id,
      cost_per_unit = excluded.cost_per_unit,
      currency = excluded.currency;
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
