-- 既存テーブルにteam_idカラムを追加
-- NULLの場合は個人データとして扱う

-- categories_large
ALTER TABLE categories_large ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_categories_large_team_id ON categories_large(team_id);

-- categories_medium
ALTER TABLE categories_medium ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_categories_medium_team_id ON categories_medium(team_id);

-- categories_small
ALTER TABLE categories_small ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_categories_small_team_id ON categories_small(team_id);

-- materials
ALTER TABLE materials ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_materials_team_id ON materials(team_id);

-- packaging_items
ALTER TABLE packaging_items ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_packaging_items_team_id ON packaging_items(team_id);

-- shipping_methods
ALTER TABLE shipping_methods ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_shipping_methods_team_id ON shipping_methods(team_id);

-- labor_roles
ALTER TABLE labor_roles ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_labor_roles_team_id ON labor_roles(team_id);

-- equipments
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_equipments_team_id ON equipments(team_id);

-- fees
ALTER TABLE fees ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_fees_team_id ON fees(team_id);

-- option_presets
ALTER TABLE option_presets ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_option_presets_team_id ON option_presets(team_id);

-- products
ALTER TABLE products ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_products_team_id ON products(team_id);

-- cost_entries_materials
ALTER TABLE cost_entries_materials ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cost_entries_materials_team_id ON cost_entries_materials(team_id);

-- cost_entries_packaging
ALTER TABLE cost_entries_packaging ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cost_entries_packaging_team_id ON cost_entries_packaging(team_id);

-- cost_entries_labor
ALTER TABLE cost_entries_labor ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cost_entries_labor_team_id ON cost_entries_labor(team_id);

-- cost_entries_outsourcing
ALTER TABLE cost_entries_outsourcing ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cost_entries_outsourcing_team_id ON cost_entries_outsourcing(team_id);

-- cost_entries_development
ALTER TABLE cost_entries_development ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cost_entries_development_team_id ON cost_entries_development(team_id);

-- cost_entries_equipment
ALTER TABLE cost_entries_equipment ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cost_entries_equipment_team_id ON cost_entries_equipment(team_id);

-- cost_entries_logistics
ALTER TABLE cost_entries_logistics ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cost_entries_logistics_team_id ON cost_entries_logistics(team_id);

-- cost_entries_electricity
ALTER TABLE cost_entries_electricity ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cost_entries_electricity_team_id ON cost_entries_electricity(team_id);

-- cost_entries_fees
ALTER TABLE cost_entries_fees ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cost_entries_fees_team_id ON cost_entries_fees(team_id);

-- exchange_rates
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_exchange_rates_team_id ON exchange_rates(team_id);
