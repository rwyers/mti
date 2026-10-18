-- Track academic progress separately from the student's current curriculum.
-- Completing a lesson in another curriculum still counts toward the same year's
-- nine-session requirement. Only an administrator may approve a new paid year.
CREATE TABLE IF NOT EXISTS student_year_enrollments (
  student_id TEXT NOT NULL REFERENCES students(id),
  year INTEGER NOT NULL CHECK (year BETWEEN 1 AND 5),
  course_id TEXT NOT NULL REFERENCES courses(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed')),
  payment_confirmed INTEGER NOT NULL DEFAULT 0,
  payment_confirmed_by TEXT REFERENCES user_accounts(id),
  approved_by TEXT REFERENCES user_accounts(id),
  enrolled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  PRIMARY KEY(student_id,year)
);
CREATE TABLE IF NOT EXISTS student_session_completions (
  student_id TEXT NOT NULL REFERENCES students(id),
  year INTEGER NOT NULL CHECK(year BETWEEN 1 AND 5),
  session_number INTEGER NOT NULL CHECK(session_number BETWEEN 1 AND 9),
  assignment_id TEXT NOT NULL UNIQUE REFERENCES assignments(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  grade_points INTEGER,
  bonus_points INTEGER,
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(student_id,year,session_number)
);
CREATE TABLE IF NOT EXISTS student_curriculum_transfers (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  year INTEGER NOT NULL,
  from_course_id TEXT REFERENCES courses(id),
  to_course_id TEXT NOT NULL REFERENCES courses(id),
  changed_by TEXT REFERENCES user_accounts(id),
  changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_session_completions_student_year ON student_session_completions(student_id,year);
CREATE INDEX IF NOT EXISTS idx_curriculum_transfers_student_year ON student_curriculum_transfers(student_id,year);
-- All current learning-path enrollments are retained if any existed.
INSERT OR IGNORE INTO student_year_enrollments(student_id,year,course_id,approved_by,enrolled_at)
SELECT student_id,year,course_id,enrolled_by,enrolled_at FROM student_learning_paths;
