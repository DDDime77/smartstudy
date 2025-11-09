-- Migration script to update exams table structure
-- This script:
-- 1. Deletes all existing exam records
-- 2. Removes old unused columns
-- 3. Adds new units column

-- Delete all existing exam data
DELETE FROM exams;

-- Drop old columns that are no longer needed
ALTER TABLE exams DROP COLUMN IF EXISTS title;
ALTER TABLE exams DROP COLUMN IF EXISTS description;
ALTER TABLE exams DROP COLUMN IF EXISTS start_time;
ALTER TABLE exams DROP COLUMN IF EXISTS end_time;
ALTER TABLE exams DROP COLUMN IF EXISTS duration_minutes;
ALTER TABLE exams DROP COLUMN IF EXISTS location;

-- Add new units column (JSON array)
ALTER TABLE exams ADD COLUMN IF NOT EXISTS units JSON;

-- Verify the changes
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'exams'
ORDER BY ordinal_position;
