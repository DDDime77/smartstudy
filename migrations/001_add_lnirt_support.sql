-- Migration: Add LNIRT (Lognormal Item Response Theory) support
-- Date: 2024-11-10
-- Description: Adds predicted time/correctness fields and LNIRT training data tables

-- Step 1: Add LNIRT prediction fields to practice_tasks table
ALTER TABLE practice_tasks
ADD COLUMN IF NOT EXISTS predicted_correct REAL;

ALTER TABLE practice_tasks
ADD COLUMN IF NOT EXISTS predicted_time_seconds INTEGER;

ALTER TABLE practice_tasks
ADD COLUMN IF NOT EXISTS lnirt_model_version VARCHAR(50);

COMMENT ON COLUMN practice_tasks.predicted_correct IS 'LNIRT predicted probability of correctness (0.0 to 1.0)';
COMMENT ON COLUMN practice_tasks.predicted_time_seconds IS 'LNIRT predicted time to complete in seconds';
COMMENT ON COLUMN practice_tasks.lnirt_model_version IS 'Version identifier of LNIRT model used for prediction';

-- Step 2: Create LNIRT models table
CREATE TABLE IF NOT EXISTS lnirt_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic VARCHAR(255) NOT NULL,
    model_version VARCHAR(50) NOT NULL,

    -- Model metadata
    n_users INTEGER NOT NULL DEFAULT 0,
    n_training_samples INTEGER NOT NULL DEFAULT 0,
    last_trained_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Serialized model data (JSON)
    difficulty_params JSONB NOT NULL,  -- {1: {a, b, beta}, 2: {a, b, beta}, 3: {a, b, beta}}
    user_params JSONB NOT NULL DEFAULT '{}',  -- {user_id: {theta, tau}}
    sigma REAL NOT NULL DEFAULT 1.0,

    -- Tracking
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(topic, model_version)
);

CREATE INDEX IF NOT EXISTS idx_lnirt_models_topic ON lnirt_models(topic);
CREATE INDEX IF NOT EXISTS idx_lnirt_models_version ON lnirt_models(model_version);

COMMENT ON TABLE lnirt_models IS 'Stores trained LNIRT models for different topics';

-- Step 3: Create LNIRT training data table
CREATE TABLE IF NOT EXISTS lnirt_training_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Task metadata
    topic VARCHAR(255) NOT NULL,
    difficulty INTEGER NOT NULL CHECK (difficulty IN (1, 2, 3)),

    -- Actual performance data
    correct INTEGER NOT NULL CHECK (correct IN (0, 1)),
    response_time_seconds INTEGER NOT NULL CHECK (response_time_seconds > 0),

    -- Tracking
    used_for_general_training BOOLEAN NOT NULL DEFAULT FALSE,
    practice_task_id UUID REFERENCES practice_tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_difficulty CHECK (difficulty >= 1 AND difficulty <= 3),
    CONSTRAINT valid_correct CHECK (correct IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_lnirt_training_user ON lnirt_training_data(user_id);
CREATE INDEX IF NOT EXISTS idx_lnirt_training_topic ON lnirt_training_data(topic);
CREATE INDEX IF NOT EXISTS idx_lnirt_training_difficulty ON lnirt_training_data(difficulty);
CREATE INDEX IF NOT EXISTS idx_lnirt_training_general ON lnirt_training_data(used_for_general_training);
CREATE INDEX IF NOT EXISTS idx_lnirt_training_created ON lnirt_training_data(created_at);

COMMENT ON TABLE lnirt_training_data IS 'Stores actual task performance data for LNIRT model training';

-- Step 4: Create view for user-specific training data retrieval
CREATE OR REPLACE VIEW lnirt_user_training_data AS
SELECT
    ltd.id,
    ltd.user_id,
    ltd.topic,
    ltd.difficulty,
    ltd.correct as actual_correct,
    ltd.response_time_seconds as actual_time,
    pt.predicted_correct,
    pt.predicted_time_seconds as predicted_time,
    ltd.created_at
FROM lnirt_training_data ltd
LEFT JOIN practice_tasks pt ON ltd.practice_task_id = pt.id
ORDER BY ltd.created_at DESC;

COMMENT ON VIEW lnirt_user_training_data IS 'Combines training data with predictions for error-aware training';

-- Step 5: Create function to auto-populate training data from completed tasks
CREATE OR REPLACE FUNCTION sync_practice_task_to_training_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync if task is marked as completed with correctness value
    IF NEW.completed = TRUE AND NEW.is_correct IS NOT NULL AND NEW.actual_time_seconds IS NOT NULL THEN
        -- Map difficulty string to numeric (1-3)
        INSERT INTO lnirt_training_data (
            user_id,
            topic,
            difficulty,
            correct,
            response_time_seconds,
            practice_task_id,
            created_at
        )
        VALUES (
            NEW.user_id,
            NEW.topic,
            CASE
                WHEN NEW.difficulty = 'easy' THEN 1
                WHEN NEW.difficulty = 'medium' THEN 2
                WHEN NEW.difficulty = 'hard' THEN 3
                ELSE 2  -- Default to medium
            END,
            CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
            NEW.actual_time_seconds,
            NEW.id,
            NEW.completed_at
        )
        ON CONFLICT DO NOTHING;  -- Avoid duplicates
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_sync_to_training_data ON practice_tasks;
CREATE TRIGGER trigger_sync_to_training_data
    AFTER UPDATE ON practice_tasks
    FOR EACH ROW
    WHEN (NEW.completed = TRUE AND NEW.is_correct IS NOT NULL)
    EXECUTE FUNCTION sync_practice_task_to_training_data();

COMMENT ON FUNCTION sync_practice_task_to_training_data IS 'Auto-sync completed tasks to LNIRT training data';

-- Step 6: Create helper function to get user training data
CREATE OR REPLACE FUNCTION get_user_training_data(
    p_user_id UUID,
    p_topic VARCHAR,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    difficulty INTEGER,
    correct INTEGER,
    response_time_seconds INTEGER,
    predicted_correct REAL,
    predicted_time_seconds INTEGER,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ut.difficulty,
        ut.actual_correct,
        ut.actual_time,
        ut.predicted_correct,
        ut.predicted_time,
        ut.created_at
    FROM lnirt_user_training_data ut
    WHERE ut.user_id = p_user_id
      AND ut.topic = p_topic
      AND ut.predicted_correct IS NOT NULL  -- Only include data with predictions
    ORDER BY ut.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_training_data IS 'Retrieves user-specific training data with predictions for personalized model training';

-- Step 7: Update difficulty_numeric field for existing records
UPDATE practice_tasks
SET difficulty_numeric = CASE
    WHEN difficulty = 'easy' THEN 1
    WHEN difficulty = 'medium' THEN 2
    WHEN difficulty = 'hard' THEN 3
    ELSE NULL
END
WHERE difficulty_numeric IS NULL;

-- Verification queries (commented out, run manually if needed)
/*
-- Verify new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'practice_tasks'
  AND column_name IN ('predicted_correct', 'predicted_time_seconds', 'lnirt_model_version');

-- Verify new tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('lnirt_models', 'lnirt_training_data');

-- Check trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_sync_to_training_data';
*/
