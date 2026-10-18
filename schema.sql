CREATE TABLE IF NOT EXISTS courses (
 id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT NOT NULL DEFAULT '',
 active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS lessons (
 id TEXT PRIMARY KEY, course_id TEXT NOT NULL REFERENCES courses(id),
 year INTEGER NOT NULL CHECK(year BETWEEN 1 AND 5),
 lesson_number INTEGER NOT NULL CHECK(lesson_number BETWEEN 1 AND 52),
 credits INTEGER NOT NULL DEFAULT 0, memory_verse_reference TEXT NOT NULL DEFAULT '',
 memory_verse_text TEXT NOT NULL DEFAULT '', bible_instruction TEXT NOT NULL DEFAULT '',
 assignment_instructions TEXT NOT NULL DEFAULT '', submission_notes TEXT NOT NULL DEFAULT '',
 materials_list TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(course_id, year, lesson_number)
);
CREATE TABLE IF NOT EXISTS students (
 id TEXT PRIMARY KEY, full_name TEXT NOT NULL, email TEXT NOT NULL DEFAULT '',
 phone TEXT NOT NULL DEFAULT '', course_id TEXT REFERENCES courses(id),
 current_year INTEGER NOT NULL DEFAULT 1,
 current_lesson INTEGER NOT NULL DEFAULT 1,
 status TEXT NOT NULL DEFAULT 'active', notes TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS assignments (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id),
 lesson_id TEXT REFERENCES lessons(id), title TEXT NOT NULL,
 due_date TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'assigned',
 submitted_at TEXT, grade_points INTEGER, bonus_points INTEGER,
 grading_json TEXT NOT NULL DEFAULT '{}', feedback TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS audit_log (
 id TEXT PRIMARY KEY, action TEXT NOT NULL, target_type TEXT NOT NULL,
 target_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS login_attempts (
 ip_key TEXT PRIMARY KEY, failures INTEGER NOT NULL DEFAULT 0,
 window_started INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_students_course ON students(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_student ON assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_lessons_course_year ON lessons(course_id, year);
