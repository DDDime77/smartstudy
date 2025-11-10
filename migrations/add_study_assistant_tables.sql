-- Exams and Assignments
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  exam_date TIMESTAMP NOT NULL,
  weight DECIMAL(5,2), -- Percentage of final grade (0-100)
  status VARCHAR(50) DEFAULT 'upcoming', -- upcoming, in_progress, completed
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMP NOT NULL,
  estimated_hours DECIMAL(4,2),
  priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, urgent
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, overdue
  completion_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Student Goals
CREATE TABLE student_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  goal_type VARCHAR(100) NOT NULL, -- grade, mastery, completion_rate
  target_value VARCHAR(100) NOT NULL, -- "A", "90%", "15 hours/week"
  current_value VARCHAR(100),
  deadline TIMESTAMP,
  progress_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Assistant Recommendations
CREATE TABLE assistant_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  recommendation_type VARCHAR(100) NOT NULL, -- task, study_session, review, break
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority_score DECIMAL(5,2), -- ML-generated priority (0-100)
  reasoning TEXT, -- Why this recommendation was made
  suggested_date TIMESTAMP,
  duration_minutes INTEGER,
  related_subject VARCHAR(255),
  related_topic VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, dismissed, completed
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP -- Recommendations expire after some time
);

-- ML Predictions Cache
CREATE TABLE ml_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  prediction_type VARCHAR(100) NOT NULL, -- time_estimate, performance_trend, priority
  subject VARCHAR(255),
  topic VARCHAR(255),
  prediction_value JSONB NOT NULL, -- Flexible storage for different prediction types
  confidence DECIMAL(5,4), -- 0-1
  model_version VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 hour' -- Cache for 1 hour
);

-- Indexes for performance
CREATE INDEX idx_exams_student_date ON exams(student_id, exam_date);
CREATE INDEX idx_assignments_student_due ON assignments(student_id, due_date);
CREATE INDEX idx_goals_student ON student_goals(student_id);
CREATE INDEX idx_recommendations_student_status ON assistant_recommendations(student_id, status);
CREATE INDEX idx_predictions_student_type ON ml_predictions(student_id, prediction_type, expires_at);
