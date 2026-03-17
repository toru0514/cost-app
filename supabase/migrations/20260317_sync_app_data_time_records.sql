-- sync_app_data 関数に time_records の upsert/delete 処理を追加
-- 20260317_time_records.sql でテーブル作成済みの前提

CREATE OR REPLACE FUNCTION sync_app_data(p_user_id uuid, p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state text;
  v_message text;
  v_detail text;
  v_hint text;
  v_stage text := 'init';
BEGIN
  BEGIN
    PERFORM pg_advisory_xact_lock(
      hashtext('sync_app_data'),
      hashtext(p_user_id::text)
    );

  v_stage := 'categories_large';
  CREATE TEMPORARY TABLE tmp_categories_large (id uuid, name text, description text) ON COMMIT DROP;
  INSERT INTO tmp_categories_large (id, name, description)
  SELECT COALESCE((value->>'id')::uuid, gen_random_uuid()), value->>'name', nullif(value->>'description','')
  FROM jsonb_array_elements(COALESCE(p_payload->'categories_large', '[]'::jsonb)) AS value;
  INSERT INTO categories_large (id, user_id, name, description)
  SELECT tmp.id, p_user_id, tmp.name, tmp.description FROM tmp_categories_large tmp
  ON CONFLICT (user_id, id) DO UPDATE SET name = excluded.name, description = excluded.description;

  CREATE TEMPORARY TABLE tmp_deleted_categories_large (id uuid) ON COMMIT DROP;
  INSERT INTO tmp_deleted_categories_large (id)
  SELECT (value->>'id')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'categories_large_deleted', '[]'::jsonb)) AS value
  WHERE value ? 'id';
  DELETE FROM categories_large WHERE user_id::text = p_user_id::text AND id::text IN (SELECT id::text FROM tmp_deleted_categories_large);

  v_stage := 'categories_medium';
  CREATE TEMPORARY TABLE tmp_categories_medium (id uuid, name text, description text, large_id uuid) ON COMMIT DROP;
  INSERT INTO tmp_categories_medium (id, name, description, large_id)
  SELECT COALESCE((value->>'id')::uuid, gen_random_uuid()),
         value->>'name',
         nullif(value->>'description',''),
         nullif(value->>'large_id','')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'categories_medium', '[]'::jsonb)) AS value;
  INSERT INTO categories_medium (id, user_id, name, description, large_id)
  SELECT tmp.id, p_user_id, tmp.name, tmp.description, tmp.large_id FROM tmp_categories_medium tmp
  ON CONFLICT (user_id, id) DO UPDATE SET name = excluded.name, description = excluded.description, large_id = excluded.large_id;

  CREATE TEMPORARY TABLE tmp_deleted_categories_medium (id uuid) ON COMMIT DROP;
  INSERT INTO tmp_deleted_categories_medium (id)
  SELECT (value->>'id')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'categories_medium_deleted', '[]'::jsonb)) AS value
  WHERE value ? 'id';
  DELETE FROM categories_medium WHERE user_id::text = p_user_id::text AND id::text IN (SELECT id::text FROM tmp_deleted_categories_medium);

  v_stage := 'categories_small';
  CREATE TEMPORARY TABLE tmp_categories_small (id uuid, name text, description text, medium_id uuid) ON COMMIT DROP;
  INSERT INTO tmp_categories_small (id, name, description, medium_id)
  SELECT COALESCE((value->>'id')::uuid, gen_random_uuid()),
         value->>'name',
         nullif(value->>'description',''),
         nullif(value->>'medium_id','')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'categories_small', '[]'::jsonb)) AS value;
  INSERT INTO categories_small (id, user_id, name, description, medium_id)
  SELECT tmp.id, p_user_id, tmp.name, tmp.description, tmp.medium_id FROM tmp_categories_small tmp
  ON CONFLICT (user_id, id) DO UPDATE SET name = excluded.name, description = excluded.description, medium_id = excluded.medium_id;

  CREATE TEMPORARY TABLE tmp_deleted_categories_small (id uuid) ON COMMIT DROP;
  INSERT INTO tmp_deleted_categories_small (id)
  SELECT (value->>'id')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'categories_small_deleted', '[]'::jsonb)) AS value
  WHERE value ? 'id';
  DELETE FROM categories_small WHERE user_id::text = p_user_id::text AND id::text IN (SELECT id::text FROM tmp_deleted_categories_small);

  v_stage := 'materials';
  CREATE TEMPORARY TABLE tmp_materials (
    id uuid,
    name text,
    unit text,
    size_description text,
    currency text,
    unit_cost numeric,
    supplier text,
    note text,
    units_per_batch numeric,
    use_percentage_mode boolean,
    image_url text
  ) ON COMMIT DROP;
  INSERT INTO tmp_materials (id, name, unit, size_description, currency, unit_cost, supplier, note, units_per_batch, use_percentage_mode, image_url)
  SELECT COALESCE((value->>'id')::uuid, gen_random_uuid()),
         value->>'name',
         value->>'unit',
         value->>'size_description',
         value->>'currency',
         COALESCE(nullif(value->>'unit_cost','')::numeric, 0),
         nullif(value->>'supplier',''),
         nullif(value->>'note',''),
         nullif(value->>'units_per_batch','')::numeric,
         COALESCE((value->>'use_percentage_mode')::boolean, false),
         nullif(value->>'image_url','')
  FROM jsonb_array_elements(COALESCE(p_payload->'materials', '[]'::jsonb)) AS value;
  INSERT INTO materials (id, user_id, name, unit, size_description, currency, unit_cost, supplier, note, units_per_batch, use_percentage_mode, image_url)
  SELECT tmp.id, p_user_id, tmp.name, tmp.unit, tmp.size_description, tmp.currency, tmp.unit_cost, tmp.supplier, tmp.note, tmp.units_per_batch, tmp.use_percentage_mode, tmp.image_url
  FROM tmp_materials tmp
  ON CONFLICT (user_id, id) DO UPDATE SET
    name = excluded.name,
    unit = excluded.unit,
    size_description = excluded.size_description,
    currency = excluded.currency,
    unit_cost = excluded.unit_cost,
    supplier = excluded.supplier,
    note = excluded.note,
    units_per_batch = excluded.units_per_batch,
    use_percentage_mode = excluded.use_percentage_mode,
    image_url = excluded.image_url;

  CREATE TEMPORARY TABLE tmp_deleted_materials (id uuid) ON COMMIT DROP;
  INSERT INTO tmp_deleted_materials (id)
  SELECT (value->>'id')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'materials_deleted', '[]'::jsonb)) AS value
  WHERE value ? 'id';
  DELETE FROM materials WHERE user_id::text = p_user_id::text AND id::text IN (SELECT id::text FROM tmp_deleted_materials);

  v_stage := 'packaging_items';
  CREATE TEMPORARY TABLE tmp_packaging_items (
    id uuid,
    name text,
    unit text,
    size_description text,
    currency text,
    unit_cost numeric,
    note text,
    units_per_batch numeric
  ) ON COMMIT DROP;
  INSERT INTO tmp_packaging_items (id, name, unit, size_description, currency, unit_cost, note, units_per_batch)
  SELECT COALESCE((value->>'id')::uuid, gen_random_uuid()),
         value->>'name',
         value->>'unit',
         value->>'size_description',
         value->>'currency',
         COALESCE(nullif(value->>'unit_cost','')::numeric, 0),
         nullif(value->>'note',''),
         nullif(value->>'units_per_batch','')::numeric
  FROM jsonb_array_elements(COALESCE(p_payload->'packaging_items', '[]'::jsonb)) AS value;
  INSERT INTO packaging_items (id, user_id, name, unit, size_description, currency, unit_cost, note, units_per_batch)
  SELECT tmp.id, p_user_id, tmp.name, tmp.unit, tmp.size_description, tmp.currency, tmp.unit_cost, tmp.note, tmp.units_per_batch
  FROM tmp_packaging_items tmp
  ON CONFLICT (user_id, id) DO UPDATE SET
    name = excluded.name,
    unit = excluded.unit,
    size_description = excluded.size_description,
    currency = excluded.currency,
    unit_cost = excluded.unit_cost,
    note = excluded.note,
    units_per_batch = excluded.units_per_batch;

  CREATE TEMPORARY TABLE tmp_deleted_packaging_items (id uuid) ON COMMIT DROP;
  INSERT INTO tmp_deleted_packaging_items (id)
  SELECT (value->>'id')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'packaging_items_deleted', '[]'::jsonb)) AS value
  WHERE value ? 'id';
  DELETE FROM packaging_items WHERE user_id::text = p_user_id::text AND id::text IN (SELECT id::text FROM tmp_deleted_packaging_items);

  v_stage := 'shipping_methods';
  CREATE TEMPORARY TABLE tmp_shipping_methods (
    id uuid,
    name text,
    unit_cost numeric,
    currency text,
    note text,
    description text
  ) ON COMMIT DROP;
  INSERT INTO tmp_shipping_methods (id, name, unit_cost, currency, note, description)
  SELECT COALESCE((value->>'id')::uuid, gen_random_uuid()),
         value->>'name',
         COALESCE(nullif(value->>'unit_cost','')::numeric, 0),
         value->>'currency',
         nullif(value->>'note',''),
         nullif(value->>'description','')
  FROM jsonb_array_elements(COALESCE(p_payload->'shipping_methods', '[]'::jsonb)) AS value;
  INSERT INTO shipping_methods (id, user_id, name, unit_cost, currency, note, description)
  SELECT tmp.id, p_user_id, tmp.name, tmp.unit_cost, tmp.currency, tmp.note, tmp.description
  FROM tmp_shipping_methods tmp
  ON CONFLICT (user_id, id) DO UPDATE SET
    name = excluded.name,
    unit_cost = excluded.unit_cost,
    currency = excluded.currency,
    note = excluded.note,
    description = excluded.description;

  CREATE TEMPORARY TABLE tmp_deleted_shipping_methods (id uuid) ON COMMIT DROP;
  INSERT INTO tmp_deleted_shipping_methods (id)
  SELECT (value->>'id')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'shipping_methods_deleted', '[]'::jsonb)) AS value
  WHERE value ? 'id';
  DELETE FROM shipping_methods WHERE user_id::text = p_user_id::text AND id::text IN (SELECT id::text FROM tmp_deleted_shipping_methods);

  v_stage := 'labor_roles';
  CREATE TEMPORARY TABLE tmp_labor_roles (
    id uuid,
    name text,
    hourly_rate numeric,
    currency text,
    note text
  ) ON COMMIT DROP;
  INSERT INTO tmp_labor_roles (id, name, hourly_rate, currency, note)
  SELECT COALESCE((value->>'id')::uuid, gen_random_uuid()),
         value->>'name',
         COALESCE(nullif(value->>'hourly_rate','')::numeric, 0),
         value->>'currency',
         nullif(value->>'note','')
  FROM jsonb_array_elements(COALESCE(p_payload->'labor_roles', '[]'::jsonb)) AS value;
  INSERT INTO labor_roles (id, user_id, name, hourly_rate, currency, note)
  SELECT tmp.id, p_user_id, tmp.name, tmp.hourly_rate, tmp.currency, tmp.note
  FROM tmp_labor_roles tmp
  ON CONFLICT (user_id, id) DO UPDATE SET
    name = excluded.name,
    hourly_rate = excluded.hourly_rate,
    currency = excluded.currency,
    note = excluded.note;

  CREATE TEMPORARY TABLE tmp_deleted_labor_roles (id uuid) ON COMMIT DROP;
  INSERT INTO tmp_deleted_labor_roles (id)
  SELECT (value->>'id')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'labor_roles_deleted', '[]'::jsonb)) AS value
  WHERE value ? 'id';
  DELETE FROM labor_roles WHERE user_id::text = p_user_id::text AND id::text IN (SELECT id::text FROM tmp_deleted_labor_roles);

  v_stage := 'equipments';
  CREATE TEMPORARY TABLE tmp_equipments (
    id uuid,
    name text,
    acquisition_cost numeric,
    currency text,
    amortization_years int,
    utilization_rate numeric,
    note text,
    image_url text
  ) ON COMMIT DROP;
  INSERT INTO tmp_equipments (id, name, acquisition_cost, currency, amortization_years, utilization_rate, note, image_url)
  SELECT COALESCE((value->>'id')::uuid, gen_random_uuid()),
         value->>'name',
         COALESCE(nullif(value->>'acquisition_cost','')::numeric, 0),
         value->>'currency',
         COALESCE(nullif(value->>'amortization_years','')::int, 1),
         COALESCE(nullif(value->>'utilization_rate','')::numeric, 100),
         nullif(value->>'note',''),
         nullif(value->>'image_url','')
  FROM jsonb_array_elements(COALESCE(p_payload->'equipments', '[]'::jsonb)) AS value;
  INSERT INTO equipments (id, user_id, name, acquisition_cost, currency, amortization_years, utilization_rate, note, image_url)
  SELECT tmp.id, p_user_id, tmp.name, tmp.acquisition_cost, tmp.currency, tmp.amortization_years, tmp.utilization_rate, tmp.note, tmp.image_url
  FROM tmp_equipments tmp
  ON CONFLICT (user_id, id) DO UPDATE SET
    name = excluded.name,
    acquisition_cost = excluded.acquisition_cost,
    currency = excluded.currency,
    amortization_years = excluded.amortization_years,
    utilization_rate = excluded.utilization_rate,
    note = excluded.note,
    image_url = excluded.image_url;

  CREATE TEMPORARY TABLE tmp_deleted_equipments (id uuid) ON COMMIT DROP;
  INSERT INTO tmp_deleted_equipments (id)
  SELECT (value->>'id')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'equipments_deleted', '[]'::jsonb)) AS value
  WHERE value ? 'id';
  DELETE FROM equipments WHERE user_id::text = p_user_id::text AND id::text IN (SELECT id::text FROM tmp_deleted_equipments);

  v_stage := 'fees';
  CREATE TEMPORARY TABLE tmp_fees (
    id uuid,
    name text,
    rate_percent numeric,
    fixed_amount numeric,
    currency text,
    note text
  ) ON COMMIT DROP;
  INSERT INTO tmp_fees (id, name, rate_percent, fixed_amount, currency, note)
  SELECT COALESCE((value->>'id')::uuid, gen_random_uuid()),
         value->>'name',
         COALESCE(nullif(value->>'rate_percent','')::numeric, 0),
         COALESCE(nullif(value->>'fixed_amount','')::numeric, 0),
         value->>'currency',
         nullif(value->>'note','')
  FROM jsonb_array_elements(COALESCE(p_payload->'fees', '[]'::jsonb)) AS value;
  INSERT INTO fees (id, user_id, name, rate_percent, fixed_amount, currency, note)
  SELECT tmp.id, p_user_id, tmp.name, tmp.rate_percent, tmp.fixed_amount, tmp.currency, tmp.note FROM tmp_fees tmp
  ON CONFLICT (user_id, id) DO UPDATE SET
    name = excluded.name,
    rate_percent = excluded.rate_percent,
    fixed_amount = excluded.fixed_amount,
    currency = excluded.currency,
    note = excluded.note;

  CREATE TEMPORARY TABLE tmp_deleted_fees (id uuid) ON COMMIT DROP;
  INSERT INTO tmp_deleted_fees (id)
  SELECT (value->>'id')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'fees_deleted', '[]'::jsonb)) AS value
  WHERE value ? 'id';
  DELETE FROM fees WHERE user_id::text = p_user_id::text AND id::text IN (SELECT id::text FROM tmp_deleted_fees);

  v_stage := 'option_presets';
  CREATE TEMPORARY TABLE tmp_option_presets (
    id uuid,
    name text,
    variants jsonb
  ) ON COMMIT DROP;
  INSERT INTO tmp_option_presets (id, name, variants)
  SELECT COALESCE((value->>'id')::uuid, gen_random_uuid()),
         value->>'name',
         COALESCE(value->'variants', '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(p_payload->'option_presets', '[]'::jsonb)) AS value;
  INSERT INTO option_presets (id, user_id, name, variants)
  SELECT tmp.id, p_user_id, tmp.name, tmp.variants FROM tmp_option_presets tmp
  ON CONFLICT (user_id, id) DO UPDATE SET name = excluded.name, variants = excluded.variants;

  CREATE TEMPORARY TABLE tmp_deleted_option_presets (id uuid) ON COMMIT DROP;
  INSERT INTO tmp_deleted_option_presets (id)
  SELECT (value->>'id')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'option_presets_deleted', '[]'::jsonb)) AS value
  WHERE value ? 'id';
  DELETE FROM option_presets WHERE user_id::text = p_user_id::text AND id::text IN (SELECT id::text FROM tmp_deleted_option_presets);

  v_stage := 'products';
  CREATE TEMPORARY TABLE tmp_products (
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
    equipment_ids text[],
    image_url text,
    status text
  ) ON COMMIT DROP;
  INSERT INTO tmp_products (
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
    equipment_ids,
    image_url,
    status
  )
  SELECT COALESCE((value->>'id')::uuid, gen_random_uuid()),
         value->>'name',
         nullif(value->>'category_large_id','')::uuid,
         nullif(value->>'category_medium_id','')::uuid,
         nullif(value->>'category_small_id','')::uuid,
         COALESCE(value->'size_variants', '[]'::jsonb),
         COALESCE(nullif(value->>'base_man_hours','')::numeric, 0),
         COALESCE(nullif(value->>'default_electricity_cost','')::numeric, 0),
         COALESCE(nullif(value->>'sale_price','')::numeric, 0),
         nullif(value->>'registered_at','')::timestamptz,
         nullif(value->>'notes',''),
         COALESCE(nullif(value->>'production_lot_size','')::numeric, 0),
         COALESCE(nullif(value->>'expected_production_period_years','')::numeric, 1),
         COALESCE(nullif(value->>'expected_production_quantity','')::numeric, 1),
         COALESCE((SELECT array_agg(elem)
             FROM jsonb_array_elements_text(COALESCE(value->'equipment_ids', '[]'::jsonb)) AS elem),
           array[]::text[]),
         nullif(value->>'image_url',''),
         COALESCE(nullif(value->>'status',''), 'active')
  FROM jsonb_array_elements(COALESCE(p_payload->'products', '[]'::jsonb)) AS value;
  INSERT INTO products (
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
    equipment_ids,
    image_url,
    status
  )
  SELECT tmp.id,
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
         tmp.equipment_ids,
         tmp.image_url,
         tmp.status
  FROM tmp_products tmp
  ON CONFLICT (user_id, id) DO UPDATE SET
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
    equipment_ids = excluded.equipment_ids,
    image_url = excluded.image_url,
    status = excluded.status;

  CREATE TEMPORARY TABLE tmp_deleted_products (id uuid) ON COMMIT DROP;
  INSERT INTO tmp_deleted_products (id)
  SELECT (value->>'id')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'products_deleted', '[]'::jsonb)) AS value
  WHERE value ? 'id';
  DELETE FROM products WHERE user_id::text = p_user_id::text AND id::text IN (SELECT id::text FROM tmp_deleted_products);

  v_stage := 'cost_entries_materials';
  CREATE TEMPORARY TABLE tmp_cost_entries_materials (
    id uuid,
    product_id uuid,
    material_id uuid,
    description text,
    usage_ratio numeric,
    cost_per_unit numeric,
    currency text
  ) ON COMMIT DROP;
  INSERT INTO tmp_cost_entries_materials (id, product_id, material_id, description, usage_ratio, cost_per_unit, currency)
  SELECT COALESCE((value->>'id')::uuid, gen_random_uuid()),
         nullif(value->>'product_id','')::uuid,
         nullif(value->>'material_id','')::uuid,
         nullif(value->>'description',''),
         nullif(value->>'usage_ratio','')::numeric,
         COALESCE(nullif(value->>'cost_per_unit','')::numeric, 0),
         value->>'currency'
  FROM jsonb_array_elements(COALESCE(p_payload->'cost_entries_materials', '[]'::jsonb)) AS value;
  INSERT INTO cost_entries_materials (id, user_id, product_id, material_id, description, usage_ratio, cost_per_unit, currency)
  SELECT tmp.id, p_user_id, tmp.product_id, tmp.material_id, tmp.description, tmp.usage_ratio, tmp.cost_per_unit, tmp.currency
  FROM tmp_cost_entries_materials tmp
  ON CONFLICT (user_id, id) DO UPDATE SET
    product_id = excluded.product_id,
    material_id = excluded.material_id,
    description = excluded.description,
    usage_ratio = excluded.usage_ratio,
    cost_per_unit = excluded.cost_per_unit,
    currency = excluded.currency;

  CREATE TEMPORARY TABLE tmp_deleted_cost_entries_materials (id uuid) ON COMMIT DROP;
  INSERT INTO tmp_deleted_cost_entries_materials (id)
  SELECT (value->>'id')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'cost_entries_materials_deleted', '[]'::jsonb)) AS value
  WHERE value ? 'id';
  DELETE FROM cost_entries_materials WHERE user_id::text = p_user_id::text AND id::text IN (SELECT id::text FROM tmp_deleted_cost_entries_materials);

  v_stage := 'cost_entries_packaging';
  CREATE TEMPORARY TABLE tmp_cost_entries_packaging (
    id uuid,
    product_id uuid,
    packaging_item_id uuid,
    quantity numeric,
    cost_per_unit numeric,
    currency text
  ) ON COMMIT DROP;
  INSERT INTO tmp_cost_entries_packaging (id, product_id, packaging_item_id, quantity, cost_per_unit, currency)
  SELECT COALESCE((value->>'id')::uuid, gen_random_uuid()),
         nullif(value->>'product_id','')::uuid,
         nullif(value->>'packaging_item_id','')::uuid,
         COALESCE(nullif(value->>'quantity','')::numeric, 0),
         COALESCE(nullif(value->>'cost_per_unit','')::numeric, 0),
         value->>'currency'
  FROM jsonb_array_elements(COALESCE(p_payload->'cost_entries_packaging', '[]'::jsonb)) AS value;
  INSERT INTO cost_entries_packaging (id, user_id, product_id, packaging_item_id, quantity, cost_per_unit, currency)
  SELECT tmp.id, p_user_id, tmp.product_id, tmp.packaging_item_id, tmp.quantity, tmp.cost_per_unit, tmp.currency
  FROM tmp_cost_entries_packaging tmp
  ON CONFLICT (user_id, id) DO UPDATE SET
    product_id = excluded.product_id,
    packaging_item_id = excluded.packaging_item_id,
    quantity = excluded.quantity,
    cost_per_unit = excluded.cost_per_unit,
    currency = excluded.currency;

  CREATE TEMPORARY TABLE tmp_deleted_cost_entries_packaging (id uuid) ON COMMIT DROP;
  INSERT INTO tmp_deleted_cost_entries_packaging (id)
  SELECT (value->>'id')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'cost_entries_packaging_deleted', '[]'::jsonb)) AS value
  WHERE value ? 'id';
  DELETE FROM cost_entries_packaging WHERE user_id::text = p_user_id::text AND id::text IN (SELECT id::text FROM tmp_deleted_cost_entries_packaging);

  v_stage := 'cost_entries_labor';
  CREATE TEMPORARY TABLE tmp_cost_entries_labor (
    id uuid,
    product_id uuid,
    labor_role_id uuid,
    hours numeric,
    people_count numeric,
    hourly_rate_override numeric
  ) ON COMMIT DROP;
  INSERT INTO tmp_cost_entries_labor (id, product_id, labor_role_id, hours, people_count, hourly_rate_override)
  SELECT COALESCE((value->>'id')::uuid, gen_random_uuid()),
         nullif(value->>'product_id','')::uuid,
         nullif(value->>'labor_role_id','')::uuid,
         COALESCE(nullif(value->>'hours','')::numeric, 0),
         COALESCE(nullif(value->>'people_count','')::numeric, 0),
         nullif(value->>'hourly_rate_override','')::numeric
  FROM jsonb_array_elements(COALESCE(p_payload->'cost_entries_labor', '[]'::jsonb)) AS value;
  INSERT INTO cost_entries_labor (id, user_id, product_id, labor_role_id, hours, people_count, hourly_rate_override)
  SELECT tmp.id, p_user_id, tmp.product_id, tmp.labor_role_id, tmp.hours, tmp.people_count, tmp.hourly_rate_override
  FROM tmp_cost_entries_labor tmp
  ON CONFLICT (user_id, id) DO UPDATE SET
    product_id = excluded.product_id,
    labor_role_id = excluded.labor_role_id,
    hours = excluded.hours,
    people_count = excluded.people_count,
    hourly_rate_override = excluded.hourly_rate_override;

  CREATE TEMPORARY TABLE tmp_deleted_cost_entries_labor (id uuid) ON COMMIT DROP;
  INSERT INTO tmp_deleted_cost_entries_labor (id)
  SELECT (value->>'id')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'cost_entries_labor_deleted', '[]'::jsonb)) AS value
  WHERE value ? 'id';
  DELETE FROM cost_entries_labor WHERE user_id::text = p_user_id::text AND id::text IN (SELECT id::text FROM tmp_deleted_cost_entries_labor);

  v_stage := 'cost_entries_outsourcing';
  CREATE TEMPORARY TABLE tmp_cost_entries_outsourcing (
    id uuid,
    product_id uuid,
    cost_per_unit numeric,
    currency text,
    note text
  ) ON COMMIT DROP;
  INSERT INTO tmp_cost_entries_outsourcing (id, product_id, cost_per_unit, currency, note)
  SELECT COALESCE((value->>'id')::uuid, gen_random_uuid()),
         nullif(value->>'product_id','')::uuid,
         COALESCE(nullif(value->>'cost_per_unit','')::numeric, 0),
         value->>'currency',
         nullif(value->>'note','')
  FROM jsonb_array_elements(COALESCE(p_payload->'cost_entries_outsourcing', '[]'::jsonb)) AS value;
  INSERT INTO cost_entries_outsourcing (id, user_id, product_id, cost_per_unit, currency, note)
  SELECT tmp.id, p_user_id, tmp.product_id, tmp.cost_per_unit, tmp.currency, tmp.note
  FROM tmp_cost_entries_outsourcing tmp
  ON CONFLICT (user_id, id) DO UPDATE SET
    product_id = excluded.product_id,
    cost_per_unit = excluded.cost_per_unit,
    currency = excluded.currency,
    note = excluded.note;

  CREATE TEMPORARY TABLE tmp_deleted_cost_entries_outsourcing (id uuid) ON COMMIT DROP;
  INSERT INTO tmp_deleted_cost_entries_outsourcing (id)
  SELECT (value->>'id')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'cost_entries_outsourcing_deleted', '[]'::jsonb)) AS value
  WHERE value ? 'id';
  DELETE FROM cost_entries_outsourcing WHERE user_id::text = p_user_id::text AND id::text IN (SELECT id::text FROM tmp_deleted_cost_entries_outsourcing);

  v_stage := 'cost_entries_development';
  CREATE TEMPORARY TABLE tmp_cost_entries_development (
    id uuid,
    product_id uuid,
    title text,
    prototype_labor_cost numeric,
    prototype_material_cost numeric,
    tooling_cost numeric,
    amortization_years int
  ) ON COMMIT DROP;
  INSERT INTO tmp_cost_entries_development (id, product_id, title, prototype_labor_cost, prototype_material_cost, tooling_cost, amortization_years)
  SELECT COALESCE((value->>'id')::uuid, gen_random_uuid()),
         nullif(value->>'product_id','')::uuid,
         nullif(value->>'title',''),
         COALESCE(nullif(value->>'prototype_labor_cost','')::numeric, 0),
         COALESCE(nullif(value->>'prototype_material_cost','')::numeric, 0),
         COALESCE(nullif(value->>'tooling_cost','')::numeric, 0),
         COALESCE(nullif(value->>'amortization_years','')::int, 1)
  FROM jsonb_array_elements(COALESCE(p_payload->'cost_entries_development', '[]'::jsonb)) AS value;
  INSERT INTO cost_entries_development (id, user_id, product_id, title, prototype_labor_cost, prototype_material_cost, tooling_cost, amortization_years)
  SELECT tmp.id, p_user_id, tmp.product_id, tmp.title, tmp.prototype_labor_cost, tmp.prototype_material_cost, tmp.tooling_cost, tmp.amortization_years
  FROM tmp_cost_entries_development tmp
  ON CONFLICT (user_id, id) DO UPDATE SET
    product_id = excluded.product_id,
    title = excluded.title,
    prototype_labor_cost = excluded.prototype_labor_cost,
    prototype_material_cost = excluded.prototype_material_cost,
    tooling_cost = excluded.tooling_cost,
    amortization_years = excluded.amortization_years;

  CREATE TEMPORARY TABLE tmp_deleted_cost_entries_development (id uuid) ON COMMIT DROP;
  INSERT INTO tmp_deleted_cost_entries_development (id)
  SELECT (value->>'id')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'cost_entries_development_deleted', '[]'::jsonb)) AS value
  WHERE value ? 'id';
  DELETE FROM cost_entries_development WHERE user_id::text = p_user_id::text AND id::text IN (SELECT id::text FROM tmp_deleted_cost_entries_development);

  v_stage := 'cost_entries_equipment';
  CREATE TEMPORARY TABLE tmp_cost_entries_equipment (
    id uuid,
    product_id uuid,
    equipment_id uuid,
    allocation_ratio numeric,
    annual_quantity numeric,
    usage_hours numeric
  ) ON COMMIT DROP;
  INSERT INTO tmp_cost_entries_equipment (id, product_id, equipment_id, allocation_ratio, annual_quantity, usage_hours)
  SELECT COALESCE((value->>'id')::uuid, gen_random_uuid()),
         nullif(value->>'product_id','')::uuid,
         nullif(value->>'equipment_id','')::uuid,
         COALESCE(nullif(value->>'allocation_ratio','')::numeric, 0),
         COALESCE(nullif(value->>'annual_quantity','')::numeric, 0),
         nullif(value->>'usage_hours','')::numeric
  FROM jsonb_array_elements(COALESCE(p_payload->'cost_entries_equipment', '[]'::jsonb)) AS value;
  INSERT INTO cost_entries_equipment (id, user_id, product_id, equipment_id, allocation_ratio, annual_quantity, usage_hours)
  SELECT tmp.id, p_user_id, tmp.product_id, tmp.equipment_id, tmp.allocation_ratio, tmp.annual_quantity, tmp.usage_hours
  FROM tmp_cost_entries_equipment tmp
  ON CONFLICT (user_id, id) DO UPDATE SET
    product_id = excluded.product_id,
    equipment_id = excluded.equipment_id,
    allocation_ratio = excluded.allocation_ratio,
    annual_quantity = excluded.annual_quantity,
    usage_hours = excluded.usage_hours;

  CREATE TEMPORARY TABLE tmp_deleted_cost_entries_equipment (id uuid) ON COMMIT DROP;
  INSERT INTO tmp_deleted_cost_entries_equipment (id)
  SELECT (value->>'id')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'cost_entries_equipment_deleted', '[]'::jsonb)) AS value
  WHERE value ? 'id';
  DELETE FROM cost_entries_equipment WHERE user_id::text = p_user_id::text AND id::text IN (SELECT id::text FROM tmp_deleted_cost_entries_equipment);

  v_stage := 'cost_entries_logistics';
  CREATE TEMPORARY TABLE tmp_cost_entries_logistics (
    id uuid,
    product_id uuid,
    shipping_method_id uuid,
    cost_per_unit numeric,
    currency text
  ) ON COMMIT DROP;
  INSERT INTO tmp_cost_entries_logistics (id, product_id, shipping_method_id, cost_per_unit, currency)
  SELECT COALESCE((value->>'id')::uuid, gen_random_uuid()),
         nullif(value->>'product_id','')::uuid,
         nullif(value->>'shipping_method_id','')::uuid,
         COALESCE(nullif(value->>'cost_per_unit','')::numeric, 0),
         value->>'currency'
  FROM jsonb_array_elements(COALESCE(p_payload->'cost_entries_logistics', '[]'::jsonb)) AS value;
  INSERT INTO cost_entries_logistics (id, user_id, product_id, shipping_method_id, cost_per_unit, currency)
  SELECT tmp.id, p_user_id, tmp.product_id, tmp.shipping_method_id, tmp.cost_per_unit, tmp.currency
  FROM tmp_cost_entries_logistics tmp
  ON CONFLICT (user_id, id) DO UPDATE SET
    product_id = excluded.product_id,
    shipping_method_id = excluded.shipping_method_id,
    cost_per_unit = excluded.cost_per_unit,
    currency = excluded.currency;

  CREATE TEMPORARY TABLE tmp_deleted_cost_entries_logistics (id uuid) ON COMMIT DROP;
  INSERT INTO tmp_deleted_cost_entries_logistics (id)
  SELECT (value->>'id')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'cost_entries_logistics_deleted', '[]'::jsonb)) AS value
  WHERE value ? 'id';
  DELETE FROM cost_entries_logistics WHERE user_id::text = p_user_id::text AND id::text IN (SELECT id::text FROM tmp_deleted_cost_entries_logistics);

  v_stage := 'cost_entries_electricity';
  CREATE TEMPORARY TABLE tmp_cost_entries_electricity (
    id uuid,
    product_id uuid,
    cost_per_unit numeric,
    currency text
  ) ON COMMIT DROP;
  INSERT INTO tmp_cost_entries_electricity (id, product_id, cost_per_unit, currency)
  SELECT COALESCE((value->>'id')::uuid, gen_random_uuid()),
         nullif(value->>'product_id','')::uuid,
         COALESCE(nullif(value->>'cost_per_unit','')::numeric, 0),
         value->>'currency'
  FROM jsonb_array_elements(COALESCE(p_payload->'cost_entries_electricity', '[]'::jsonb)) AS value;
  INSERT INTO cost_entries_electricity (id, user_id, product_id, cost_per_unit, currency)
  SELECT tmp.id, p_user_id, tmp.product_id, tmp.cost_per_unit, tmp.currency
  FROM tmp_cost_entries_electricity tmp
  ON CONFLICT (user_id, id) DO UPDATE SET
    product_id = excluded.product_id,
    cost_per_unit = excluded.cost_per_unit,
    currency = excluded.currency;

  CREATE TEMPORARY TABLE tmp_deleted_cost_entries_electricity (id uuid) ON COMMIT DROP;
  INSERT INTO tmp_deleted_cost_entries_electricity (id)
  SELECT (value->>'id')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'cost_entries_electricity_deleted', '[]'::jsonb)) AS value
  WHERE value ? 'id';
  DELETE FROM cost_entries_electricity WHERE user_id::text = p_user_id::text AND id::text IN (SELECT id::text FROM tmp_deleted_cost_entries_electricity);

  v_stage := 'cost_entries_fees';
  CREATE TEMPORARY TABLE tmp_cost_entries_fees (
    id uuid,
    product_id uuid,
    fee_id uuid,
    rate_percent numeric,
    fixed_amount numeric,
    currency text
  ) ON COMMIT DROP;
  INSERT INTO tmp_cost_entries_fees (id, product_id, fee_id, rate_percent, fixed_amount, currency)
  SELECT COALESCE((value->>'id')::uuid, gen_random_uuid()),
         nullif(value->>'product_id','')::uuid,
         nullif(value->>'fee_id','')::uuid,
         COALESCE(nullif(value->>'rate_percent','')::numeric, 0),
         COALESCE(nullif(value->>'fixed_amount','')::numeric, 0),
         value->>'currency'
  FROM jsonb_array_elements(COALESCE(p_payload->'cost_entries_fees', '[]'::jsonb)) AS value;
  INSERT INTO cost_entries_fees (id, user_id, product_id, fee_id, rate_percent, fixed_amount, currency)
  SELECT tmp.id, p_user_id, tmp.product_id, tmp.fee_id, tmp.rate_percent, tmp.fixed_amount, tmp.currency
  FROM tmp_cost_entries_fees tmp
  ON CONFLICT (user_id, id) DO UPDATE SET
    product_id = excluded.product_id,
    fee_id = excluded.fee_id,
    rate_percent = excluded.rate_percent,
    fixed_amount = excluded.fixed_amount,
    currency = excluded.currency;

  CREATE TEMPORARY TABLE tmp_deleted_cost_entries_fees (id uuid) ON COMMIT DROP;
  INSERT INTO tmp_deleted_cost_entries_fees (id)
  SELECT (value->>'id')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'cost_entries_fees_deleted', '[]'::jsonb)) AS value
  WHERE value ? 'id';
  DELETE FROM cost_entries_fees WHERE user_id::text = p_user_id::text AND id::text IN (SELECT id::text FROM tmp_deleted_cost_entries_fees);

  -- time_records の upsert/delete 処理
  v_stage := 'time_records';
  CREATE TEMPORARY TABLE tmp_time_records (
    id uuid,
    task_name text,
    total_duration numeric,
    laps jsonb,
    note text,
    created_at timestamptz,
    updated_at timestamptz
  ) ON COMMIT DROP;
  INSERT INTO tmp_time_records (id, task_name, total_duration, laps, note, created_at, updated_at)
  SELECT COALESCE((value->>'id')::uuid, gen_random_uuid()),
         COALESCE(value->>'task_name', ''),
         COALESCE(nullif(value->>'total_duration','')::numeric, 0),
         COALESCE(value->'laps', '[]'::jsonb),
         nullif(value->>'note',''),
         COALESCE(nullif(value->>'created_at','')::timestamptz, now()),
         COALESCE(nullif(value->>'updated_at','')::timestamptz, now())
  FROM jsonb_array_elements(COALESCE(p_payload->'time_records', '[]'::jsonb)) AS value;
  INSERT INTO time_records (id, user_id, task_name, total_duration, laps, note, created_at, updated_at)
  SELECT tmp.id, p_user_id, tmp.task_name, tmp.total_duration, tmp.laps, tmp.note, tmp.created_at, tmp.updated_at
  FROM tmp_time_records tmp
  ON CONFLICT (user_id, id) DO UPDATE SET
    task_name = excluded.task_name,
    total_duration = excluded.total_duration,
    laps = excluded.laps,
    note = excluded.note,
    updated_at = excluded.updated_at;

  CREATE TEMPORARY TABLE tmp_deleted_time_records (id uuid) ON COMMIT DROP;
  INSERT INTO tmp_deleted_time_records (id)
  SELECT (value->>'id')::uuid
  FROM jsonb_array_elements(COALESCE(p_payload->'time_records_deleted', '[]'::jsonb)) AS value
  WHERE value ? 'id';
  DELETE FROM time_records WHERE user_id::text = p_user_id::text AND id::text IN (SELECT id::text FROM tmp_deleted_time_records);

  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS
        v_state = returned_sqlstate,
        v_message = message_text,
        v_detail = pg_exception_detail,
        v_hint = pg_exception_hint;
      RAISE EXCEPTION USING
        message = format('sync_app_data failed at %s (%s): %s', v_stage, v_state, v_message),
        detail = v_detail,
        hint = v_hint;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION sync_app_data(uuid, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION sync_app_data(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_app_data(uuid, jsonb) TO service_role;
