CREATE TABLE IF NOT EXISTS student_import_staging (
 id TEXT PRIMARY KEY,
 source_file TEXT NOT NULL,
 source_row INTEGER NOT NULL,
 legacy_student_id TEXT,
 full_name TEXT NOT NULL,
 email TEXT NOT NULL DEFAULT '',
 phone TEXT NOT NULL DEFAULT '',
 course_name TEXT NOT NULL DEFAULT '',
 current_year INTEGER,
 current_lesson INTEGER,
 original_status TEXT NOT NULL DEFAULT '',
 notes TEXT NOT NULL DEFAULT '',
 date_started TEXT NOT NULL DEFAULT '',
 date_due TEXT NOT NULL DEFAULT '',
 review_notes TEXT NOT NULL DEFAULT '',
 review_status TEXT NOT NULL DEFAULT 'pending' CHECK(review_status IN('pending','approved','skipped')),
 imported_student_id TEXT REFERENCES students(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 reviewed_at TEXT,
 UNIQUE(source_file,source_row)
);
CREATE INDEX IF NOT EXISTS idx_student_import_staging_status ON student_import_staging(review_status);
