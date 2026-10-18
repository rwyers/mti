CREATE TABLE IF NOT EXISTS user_accounts (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 role TEXT NOT NULL CHECK (role IN ('owner','admin','teacher','student')),
 student_id TEXT UNIQUE REFERENCES students(id),
 password_hash TEXT,
 password_salt TEXT,
 password_iter INTEGER NOT NULL DEFAULT 120000,
 active INTEGER NOT NULL DEFAULT 1,
 must_change_password INTEGER NOT NULL DEFAULT 0,
 session_version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 last_login_at TEXT
);
CREATE TABLE IF NOT EXISTS account_invitations (
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES user_accounts(id),
 token_hash TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL,
 redeemed_at TEXT, created_by TEXT REFERENCES user_accounts(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS assignment_submissions (
 id TEXT PRIMARY KEY, assignment_id TEXT NOT NULL UNIQUE REFERENCES assignments(id),
 student_id TEXT NOT NULL REFERENCES students(id), response_text TEXT NOT NULL,
 submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS audit_events (
 id TEXT PRIMARY KEY,
 actor_id TEXT REFERENCES user_accounts(id),
 actor_name TEXT NOT NULL, actor_email TEXT NOT NULL, actor_role TEXT NOT NULL,
 action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL,
 before_json TEXT, after_json TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invites_account ON account_invitations(account_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON assignment_submissions(student_id);
