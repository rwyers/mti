CREATE TABLE IF NOT EXISTS student_learning_paths (
 student_id TEXT PRIMARY KEY REFERENCES students(id),
 course_id TEXT NOT NULL REFERENCES courses(id),
 year INTEGER NOT NULL CHECK(year BETWEEN 1 AND 5),
 enrolled_by TEXT REFERENCES user_accounts(id),
 enrolled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_learning_paths_course_year ON student_learning_paths(course_id,year);
