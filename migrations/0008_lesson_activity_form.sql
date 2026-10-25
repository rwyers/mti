-- Store the activity record from the reverse side of the MTI assignment sheet.
-- One answer set per assignment submission; historic graded work is retained.
ALTER TABLE assignment_submissions ADD COLUMN activity_form_json TEXT NOT NULL DEFAULT '{}';
