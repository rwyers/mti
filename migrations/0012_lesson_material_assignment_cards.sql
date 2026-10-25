-- Structured per-material assignment cards; base is preserved separately in this JSON.
-- Lessons continue to store a readable combined assignment_instructions for student and print views.
ALTER TABLE lessons ADD COLUMN material_assignment_cards_json TEXT NOT NULL DEFAULT '{}';
