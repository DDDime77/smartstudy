-- Fix grade_level column length to support longer grade names
-- Issue: "Year 2 (Grade 12)" is 18 characters, but column was VARCHAR(10)

ALTER TABLE active_study_sessions
ALTER COLUMN grade_level TYPE VARCHAR(50);
