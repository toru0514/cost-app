-- チーム作成時のオーナー自動追加トリガーを修正
-- SECURITY DEFINER を追加して RLS をバイパス
--
-- 問題: チーム作成時にトリガーが team_members への INSERT を行うが、
-- トリガー内で auth.uid() が正しく評価されず RLS でブロックされていた
--
-- 解決: トリガー関数を SECURITY DEFINER で実行し、RLS をバイパスする

DROP TRIGGER IF EXISTS trigger_add_owner_as_member ON teams;
DROP FUNCTION IF EXISTS add_owner_as_member();

CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_add_owner_as_member
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_as_member();
