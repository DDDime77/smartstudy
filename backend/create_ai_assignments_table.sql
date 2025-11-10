-- Create AI-generated study assignments table
CREATE TABLE IF NOT EXISTS ai_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    subject_name VARCHAR(255),
    topic VARCHAR(255) NOT NULL,
    difficulty VARCHAR(50) NOT NULL, -- 'easy', 'medium', 'hard'
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    estimated_minutes INTEGER NOT NULL,
    required_tasks_count INTEGER DEFAULT 5,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    tasks_completed INTEGER DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    progress_percentage INTEGER DEFAULT 0,
    created_by_ai BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    notes TEXT
);

-- Create index for faster queries
CREATE INDEX idx_ai_assignments_user_id ON ai_assignments(user_id);
CREATE INDEX idx_ai_assignments_scheduled_date ON ai_assignments(scheduled_date);
CREATE INDEX idx_ai_assignments_status ON ai_assignments(status);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_ai_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_assignments_updated_at
    BEFORE UPDATE ON ai_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_assignments_updated_at();
