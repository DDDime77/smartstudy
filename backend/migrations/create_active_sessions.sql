-- Create active_study_sessions table to replace sessionStorage
-- This stores the current study session state server-side

CREATE TABLE IF NOT EXISTS active_study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Session type: 'assignment', 'practice', 'free_study'
    session_type VARCHAR(50) NOT NULL DEFAULT 'practice',

    -- Assignment session data (if session_type = 'assignment')
    assignment_id UUID REFERENCES ai_assignments(id) ON DELETE SET NULL,

    -- Subject and topic info
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    subject_name VARCHAR(255),
    topic VARCHAR(500),
    difficulty VARCHAR(20) DEFAULT 'medium',

    -- Timer state
    initial_duration_seconds INT NOT NULL DEFAULT 1500, -- 25 minutes default
    elapsed_seconds INT DEFAULT 0,
    is_running BOOLEAN DEFAULT FALSE,
    study_technique VARCHAR(50) DEFAULT 'pomodoro',

    -- Assignment progress (only used if session_type = 'assignment')
    required_tasks INT,
    tasks_completed INT DEFAULT 0,
    estimated_minutes INT,
    time_spent_minutes INT DEFAULT 0,

    -- Current task data (stored as JSON for flexibility)
    current_task JSONB,

    -- Task generation parameters (for next task)
    pending_task_params JSONB,

    -- Grade level for task generation
    grade_level VARCHAR(10),
    study_system VARCHAR(50) DEFAULT 'IB',

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_activity_at TIMESTAMP DEFAULT NOW(),

    -- Only one active session per user
    CONSTRAINT unique_user_session UNIQUE(user_id)
);

-- Index for quick lookups
CREATE INDEX idx_active_sessions_user_id ON active_study_sessions(user_id);
CREATE INDEX idx_active_sessions_assignment_id ON active_study_sessions(assignment_id);
CREATE INDEX idx_active_sessions_last_activity ON active_study_sessions(last_activity_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_active_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_activity_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_active_session_timestamp
    BEFORE UPDATE ON active_study_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_active_session_timestamp();

-- Function to clean up old abandoned sessions (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM active_study_sessions
    WHERE last_activity_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;
