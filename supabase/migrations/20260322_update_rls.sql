-- RLSポリシーを更新：個人データとチームデータの両方をサポート
-- user_id = auth.uid() OR チームメンバーとしてアクセス可能

-- ヘルパー関数：ユーザーがチームメンバーかどうか確認
CREATE OR REPLACE FUNCTION is_team_member(check_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = check_team_id
    AND team_members.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ヘルパー関数：ユーザーがチームで編集権限を持つかどうか確認
CREATE OR REPLACE FUNCTION can_edit_team_data(check_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = check_team_id
    AND team_members.user_id = auth.uid()
    AND team_members.role IN ('owner', 'admin', 'member')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 各テーブルのRLSポリシーを更新するマクロ的なアプローチ
-- categories_large
DROP POLICY IF EXISTS "Users can view own categories_large" ON categories_large;
CREATE POLICY "Users can view own or team categories_large"
  ON categories_large FOR SELECT
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND is_team_member(team_id)));

DROP POLICY IF EXISTS "Users can insert own categories_large" ON categories_large;
CREATE POLICY "Users can insert own or team categories_large"
  ON categories_large FOR INSERT
  WITH CHECK (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can update own categories_large" ON categories_large;
CREATE POLICY "Users can update own or team categories_large"
  ON categories_large FOR UPDATE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can delete own categories_large" ON categories_large;
CREATE POLICY "Users can delete own or team categories_large"
  ON categories_large FOR DELETE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

-- categories_medium
DROP POLICY IF EXISTS "Users can view own categories_medium" ON categories_medium;
CREATE POLICY "Users can view own or team categories_medium"
  ON categories_medium FOR SELECT
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND is_team_member(team_id)));

DROP POLICY IF EXISTS "Users can insert own categories_medium" ON categories_medium;
CREATE POLICY "Users can insert own or team categories_medium"
  ON categories_medium FOR INSERT
  WITH CHECK (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can update own categories_medium" ON categories_medium;
CREATE POLICY "Users can update own or team categories_medium"
  ON categories_medium FOR UPDATE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can delete own categories_medium" ON categories_medium;
CREATE POLICY "Users can delete own or team categories_medium"
  ON categories_medium FOR DELETE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

-- categories_small
DROP POLICY IF EXISTS "Users can view own categories_small" ON categories_small;
CREATE POLICY "Users can view own or team categories_small"
  ON categories_small FOR SELECT
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND is_team_member(team_id)));

DROP POLICY IF EXISTS "Users can insert own categories_small" ON categories_small;
CREATE POLICY "Users can insert own or team categories_small"
  ON categories_small FOR INSERT
  WITH CHECK (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can update own categories_small" ON categories_small;
CREATE POLICY "Users can update own or team categories_small"
  ON categories_small FOR UPDATE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can delete own categories_small" ON categories_small;
CREATE POLICY "Users can delete own or team categories_small"
  ON categories_small FOR DELETE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

-- materials
DROP POLICY IF EXISTS "Users can view own materials" ON materials;
CREATE POLICY "Users can view own or team materials"
  ON materials FOR SELECT
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND is_team_member(team_id)));

DROP POLICY IF EXISTS "Users can insert own materials" ON materials;
CREATE POLICY "Users can insert own or team materials"
  ON materials FOR INSERT
  WITH CHECK (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can update own materials" ON materials;
CREATE POLICY "Users can update own or team materials"
  ON materials FOR UPDATE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can delete own materials" ON materials;
CREATE POLICY "Users can delete own or team materials"
  ON materials FOR DELETE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

-- packaging_items
DROP POLICY IF EXISTS "Users can view own packaging_items" ON packaging_items;
CREATE POLICY "Users can view own or team packaging_items"
  ON packaging_items FOR SELECT
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND is_team_member(team_id)));

DROP POLICY IF EXISTS "Users can insert own packaging_items" ON packaging_items;
CREATE POLICY "Users can insert own or team packaging_items"
  ON packaging_items FOR INSERT
  WITH CHECK (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can update own packaging_items" ON packaging_items;
CREATE POLICY "Users can update own or team packaging_items"
  ON packaging_items FOR UPDATE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can delete own packaging_items" ON packaging_items;
CREATE POLICY "Users can delete own or team packaging_items"
  ON packaging_items FOR DELETE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

-- products
DROP POLICY IF EXISTS "Users can view own products" ON products;
CREATE POLICY "Users can view own or team products"
  ON products FOR SELECT
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND is_team_member(team_id)));

DROP POLICY IF EXISTS "Users can insert own products" ON products;
CREATE POLICY "Users can insert own or team products"
  ON products FOR INSERT
  WITH CHECK (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can update own products" ON products;
CREATE POLICY "Users can update own or team products"
  ON products FOR UPDATE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can delete own products" ON products;
CREATE POLICY "Users can delete own or team products"
  ON products FOR DELETE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

-- 他の主要テーブルも同様にポリシーを更新
-- shipping_methods, labor_roles, equipments, fees, option_presets,
-- cost_entries_*, exchange_rates

-- shipping_methods
DROP POLICY IF EXISTS "Users can view own shipping_methods" ON shipping_methods;
CREATE POLICY "Users can view own or team shipping_methods"
  ON shipping_methods FOR SELECT
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND is_team_member(team_id)));

DROP POLICY IF EXISTS "Users can insert own shipping_methods" ON shipping_methods;
CREATE POLICY "Users can insert own or team shipping_methods"
  ON shipping_methods FOR INSERT
  WITH CHECK (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can update own shipping_methods" ON shipping_methods;
CREATE POLICY "Users can update own or team shipping_methods"
  ON shipping_methods FOR UPDATE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can delete own shipping_methods" ON shipping_methods;
CREATE POLICY "Users can delete own or team shipping_methods"
  ON shipping_methods FOR DELETE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

-- labor_roles
DROP POLICY IF EXISTS "Users can view own labor_roles" ON labor_roles;
CREATE POLICY "Users can view own or team labor_roles"
  ON labor_roles FOR SELECT
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND is_team_member(team_id)));

DROP POLICY IF EXISTS "Users can insert own labor_roles" ON labor_roles;
CREATE POLICY "Users can insert own or team labor_roles"
  ON labor_roles FOR INSERT
  WITH CHECK (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can update own labor_roles" ON labor_roles;
CREATE POLICY "Users can update own or team labor_roles"
  ON labor_roles FOR UPDATE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can delete own labor_roles" ON labor_roles;
CREATE POLICY "Users can delete own or team labor_roles"
  ON labor_roles FOR DELETE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

-- equipments
DROP POLICY IF EXISTS "Users can view own equipments" ON equipments;
CREATE POLICY "Users can view own or team equipments"
  ON equipments FOR SELECT
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND is_team_member(team_id)));

DROP POLICY IF EXISTS "Users can insert own equipments" ON equipments;
CREATE POLICY "Users can insert own or team equipments"
  ON equipments FOR INSERT
  WITH CHECK (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can update own equipments" ON equipments;
CREATE POLICY "Users can update own or team equipments"
  ON equipments FOR UPDATE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can delete own equipments" ON equipments;
CREATE POLICY "Users can delete own or team equipments"
  ON equipments FOR DELETE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

-- fees
DROP POLICY IF EXISTS "Users can view own fees" ON fees;
CREATE POLICY "Users can view own or team fees"
  ON fees FOR SELECT
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND is_team_member(team_id)));

DROP POLICY IF EXISTS "Users can insert own fees" ON fees;
CREATE POLICY "Users can insert own or team fees"
  ON fees FOR INSERT
  WITH CHECK (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can update own fees" ON fees;
CREATE POLICY "Users can update own or team fees"
  ON fees FOR UPDATE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can delete own fees" ON fees;
CREATE POLICY "Users can delete own or team fees"
  ON fees FOR DELETE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

-- option_presets
DROP POLICY IF EXISTS "Users can view own option_presets" ON option_presets;
CREATE POLICY "Users can view own or team option_presets"
  ON option_presets FOR SELECT
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND is_team_member(team_id)));

DROP POLICY IF EXISTS "Users can insert own option_presets" ON option_presets;
CREATE POLICY "Users can insert own or team option_presets"
  ON option_presets FOR INSERT
  WITH CHECK (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can update own option_presets" ON option_presets;
CREATE POLICY "Users can update own or team option_presets"
  ON option_presets FOR UPDATE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can delete own option_presets" ON option_presets;
CREATE POLICY "Users can delete own or team option_presets"
  ON option_presets FOR DELETE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

-- exchange_rates
DROP POLICY IF EXISTS "Users can view own exchange_rates" ON exchange_rates;
CREATE POLICY "Users can view own or team exchange_rates"
  ON exchange_rates FOR SELECT
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND is_team_member(team_id)));

DROP POLICY IF EXISTS "Users can insert own exchange_rates" ON exchange_rates;
CREATE POLICY "Users can insert own or team exchange_rates"
  ON exchange_rates FOR INSERT
  WITH CHECK (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can update own exchange_rates" ON exchange_rates;
CREATE POLICY "Users can update own or team exchange_rates"
  ON exchange_rates FOR UPDATE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));

DROP POLICY IF EXISTS "Users can delete own exchange_rates" ON exchange_rates;
CREATE POLICY "Users can delete own or team exchange_rates"
  ON exchange_rates FOR DELETE
  USING (user_id = auth.uid() OR (team_id IS NOT NULL AND can_edit_team_data(team_id)));
