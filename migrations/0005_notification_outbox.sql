CREATE TABLE IF NOT EXISTS notification_outbox (
  id TEXT PRIMARY KEY,
  event_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL CHECK(event_type IN ('submission_received','assignment_assigned','assignment_graded','grade_corrected')),
  recipient_email TEXT NOT NULL,
  recipient_role TEXT NOT NULL CHECK(recipient_role IN ('admin','student')),
  student_id TEXT REFERENCES students(id),
  assignment_id TEXT NOT NULL REFERENCES assignments(id),
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_status ON notification_outbox(status,created_at);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_assignment ON notification_outbox(assignment_id);
