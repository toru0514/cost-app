-- team_invitations のRLSポリシーを修正
-- auth.users への直接アクセスを回避し、SECURITY DEFINER関数を使用

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Team admins can view invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team admins can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team admins can delete invitations" ON team_invitations;

-- 新しいポリシーを作成（check_team_admin SECURITY DEFINER関数を使用）
-- check_team_admin関数は20260324_fix_team_members_rls.sqlで作成済み

CREATE POLICY "Team admins can view invitations"
  ON team_invitations FOR SELECT
  USING (check_team_admin(team_id, auth.uid()));

CREATE POLICY "Team admins can create invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (check_team_admin(team_id, auth.uid()));

CREATE POLICY "Team admins can delete invitations"
  ON team_invitations FOR DELETE
  USING (check_team_admin(team_id, auth.uid()));
