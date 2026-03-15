-- team_members のRLSポリシーを修正
-- 自己参照による無限再帰を回避するため、SECURITY DEFINER 関数を使用

-- 新しいヘルパー関数: team_members テーブル専用（RLSをバイパス）
CREATE OR REPLACE FUNCTION check_team_membership(check_team_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = check_team_id
    AND user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_team_admin(check_team_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = check_team_id
    AND user_id = check_user_id
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Team members can view members" ON team_members;
DROP POLICY IF EXISTS "Owner and admin can add members" ON team_members;
DROP POLICY IF EXISTS "Owner and admin can update member roles" ON team_members;
DROP POLICY IF EXISTS "Owner and admin can remove members" ON team_members;

-- 新しいポリシーを作成（SECURITY DEFINER 関数を使用）
CREATE POLICY "Team members can view members"
  ON team_members FOR SELECT
  USING (check_team_membership(team_id, auth.uid()));

CREATE POLICY "Owner and admin can add members"
  ON team_members FOR INSERT
  WITH CHECK (
    check_team_admin(team_id, auth.uid()) OR
    user_id = auth.uid()  -- 自分自身を追加する場合（招待受諾時）
  );

CREATE POLICY "Owner and admin can update member roles"
  ON team_members FOR UPDATE
  USING (check_team_admin(team_id, auth.uid()));

CREATE POLICY "Owner and admin can remove members"
  ON team_members FOR DELETE
  USING (
    check_team_admin(team_id, auth.uid()) OR
    user_id = auth.uid()  -- 自分自身を削除する場合（チーム脱退）
  );

-- トリガー関数を SECURITY DEFINER で再作成（RLSをバイパス）
CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
