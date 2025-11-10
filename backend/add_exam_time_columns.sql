-- Migration: Add start_time and finish_time columns to exams table
-- Date: 2025-11-10

ALTER TABLE exams
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS finish_time TIME;

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'exams'
AND column_name IN ('start_time', 'finish_time');
