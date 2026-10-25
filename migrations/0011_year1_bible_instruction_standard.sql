-- Standardize all Year 1 MTI Bible instructions, with a one-time backup of previous values.
-- Does not change lesson review status, assignments, student submissions, or grades.
CREATE TABLE IF NOT EXISTS mti_year1_bible_instruction_backup (
  lesson_id TEXT PRIMARY KEY,
  previous_instruction TEXT NOT NULL,
  backed_up_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO mti_year1_bible_instruction_backup (lesson_id,previous_instruction)
 SELECT id,bible_instruction FROM lessons WHERE year=1;
UPDATE lessons
 SET bible_instruction='Write down one of your favorite verses you read in your devotional times this month and discuss how it spoke to you.'
 WHERE year=1;
