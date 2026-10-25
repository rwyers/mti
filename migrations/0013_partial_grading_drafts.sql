-- Instructor-only partial grading, never published to the student until finalized.
-- Preserve official grades (including scores recorded under the historical rubric).
ALTER TABLE assignments ADD COLUMN grading_draft_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE assignments ADD COLUMN grading_draft_feedback TEXT NOT NULL DEFAULT '';
