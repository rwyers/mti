-- Every existing and future lesson begins as needing content review.
-- Staff explicitly mark a reviewed lesson as current in Edit lesson.
ALTER TABLE lessons ADD COLUMN is_current INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0,1));
