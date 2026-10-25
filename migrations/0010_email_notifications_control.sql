-- Master safety switch for MTI assignment notification emails.
-- OFF by default, including during initial deployment and development.
CREATE TABLE IF NOT EXISTS mti_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO mti_settings(setting_key,setting_value) VALUES('email_notifications_enabled','false');
