CREATE TABLE IF NOT EXISTS submission_files (
 id TEXT PRIMARY KEY,
 assignment_id TEXT NOT NULL REFERENCES assignments(id),
 student_id TEXT NOT NULL REFERENCES students(id),
 object_key TEXT NOT NULL UNIQUE,
 filename TEXT NOT NULL,
 content_type TEXT NOT NULL,
 size_bytes INTEGER NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_submission_files_assignment ON submission_files(assignment_id);
