-- 通知設定テーブル
CREATE TABLE notification_settings (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'slack', 'in_app')),
  enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, notification_type)
);

-- アプリ内通知テーブル
CREATE TABLE in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_category TEXT DEFAULT 'general',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_in_app_notifications_user_id ON in_app_notifications(user_id);
CREATE INDEX idx_in_app_notifications_read ON in_app_notifications(user_id, read);
CREATE INDEX idx_in_app_notifications_created_at ON in_app_notifications(created_at DESC);

-- RLSポリシー
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

-- notification_settings RLS
CREATE POLICY "Users can view own notification settings"
  ON notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
  ON notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification settings"
  ON notification_settings FOR DELETE
  USING (auth.uid() = user_id);

-- in_app_notifications RLS
CREATE POLICY "Users can view own notifications"
  ON in_app_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON in_app_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON in_app_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON in_app_notifications FOR DELETE
  USING (auth.uid() = user_id);

-- 更新時のタイムスタンプ自動更新
CREATE OR REPLACE FUNCTION update_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_settings_updated_at();
