# Machine Learning Implementation Plan
## AI Study Planner - Adaptive Learning System

---

## 🎯 Core Workflow: 3-Step Learning Structure

### Stage 1: Acknowledgement
- **Purpose:** Introduction to topic
- **Content:** YouTube videos, classroom materials, readings
- **Data Collected:**
  - Time spent viewing/reading
  - Materials accessed
  - Completion status

### Stage 2: Preparation
- **Purpose:** Basic practice and comprehension check
- **Content:** 5 multiple-choice questions per topic
- **Data Collected:**
  - Time per question
  - Correct/incorrect answers
  - Question difficulty level
  - Total stage completion time

### Stage 3: Practice
- **Purpose:** Deep understanding and application
- **Content:** Complex tasks with written/calculated answers
- **Data Collected:**
  - Time per task
  - Answer correctness (graded)
  - Question difficulty/complexity
  - Number of attempts
  - Total stage completion time

---

## 📊 Data Collection Strategy

### 1. Task/Topic Level Data
```python
{
    "task_id": "uuid",
    "user_id": "uuid",
    "subject_id": "uuid",
    "topic": "Calculus - Derivatives",
    "exam_id": "uuid",  # Link to upcoming exam
    "stage": "acknowledgement|preparation|practice",
    "difficulty_level": 1-5,

    # Timing data
    "start_time": "timestamp",
    "end_time": "timestamp",
    "duration_seconds": 1200,
    "time_of_day": "morning|afternoon|evening|night",

    # Performance data (for preparation/practice stages)
    "questions": [
        {
            "question_id": "uuid",
            "difficulty": 1-5,
            "time_spent_seconds": 180,
            "answer": "user_answer",
            "correct_answer": "correct_answer",
            "is_correct": true/false,
            "question_type": "multiple_choice|written|calculation"
        }
    ],

    # Calculated metrics
    "success_rate": 0.8,  # correct/total
    "average_time_per_question": 240,
    "focus_rating": 4,  # User self-report 1-5
    "completed": true/false
}
```

### 2. Study Session Data
```python
{
    "session_id": "uuid",
    "user_id": "uuid",
    "subject_id": "uuid",
    "start_time": "timestamp",
    "end_time": "timestamp",
    "duration_minutes": 90,

    # Break tracking
    "breaks_taken": [
        {"start": "timestamp", "duration_minutes": 5},
        {"start": "timestamp", "duration_minutes": 15}
    ],

    # Performance
    "tasks_completed": 3,
    "average_focus_rating": 3.5,
    "productivity_score": 0.75,  # tasks_completed / expected_tasks

    # Context
    "time_of_day": "afternoon",
    "day_of_week": "Monday",
    "energy_level": 3  # User self-report 1-5
}
```

### 3. User Performance Metrics
```python
{
    "user_id": "uuid",
    "subject_id": "uuid",

    # Historical averages
    "avg_acknowledgement_time_minutes": 25,
    "avg_preparation_time_minutes": 30,
    "avg_practice_time_minutes": 45,

    # Performance trends
    "preparation_success_rate": 0.82,
    "practice_success_rate": 0.75,
    "improvement_rate": 0.05,  # per week

    # Productivity patterns
    "best_time_of_day": "morning",
    "average_session_duration": 60,
    "optimal_session_duration": 90,
    "break_frequency_per_hour": 1
}
```

---

## 🤖 ML Models & Implementation

### Phase 1: MVP (Rule-Based + Simple Statistics) - Week 1-2

#### 1.1 Time Prediction (Workload Estimation)
**Approach:** Moving Average with Subject/Stage Weighting

```python
class SimpleTimePredictor:
    def predict_task_duration(self, user_id, subject_id, stage, difficulty):
        # Get user's historical average for this subject + stage
        historical_avg = db.get_average_time(user_id, subject_id, stage)

        # Difficulty multiplier
        difficulty_factor = {1: 0.7, 2: 0.85, 3: 1.0, 4: 1.2, 5: 1.5}

        # If no history, use global averages
        if not historical_avg:
            baseline = {
                "acknowledgement": 20,  # minutes
                "preparation": 25,
                "practice": 40
            }
            return baseline[stage] * difficulty_factor[difficulty]

        # Exponential Moving Average (give more weight to recent sessions)
        predicted_time = historical_avg * difficulty_factor[difficulty]
        return predicted_time
```

**Data Required:**
- Past task completion times (grouped by subject, stage)
- Task difficulty ratings
- Minimum 5-10 completed tasks per subject for accuracy

**When to Use:** Immediately, from day 1

---

#### 1.2 Performance Assessment (Success Coefficient)
**Approach:** Rule-Based Thresholds

```python
class PerformanceAssessor:
    # Benchmarks
    EXCELLENT_THRESHOLD = 0.85
    GOOD_THRESHOLD = 0.70
    NEEDS_IMPROVEMENT_THRESHOLD = 0.60

    def assess_performance(self, correct_answers, total_questions, stage):
        success_rate = correct_answers / total_questions

        # Stage-specific adjustments
        stage_weights = {
            "preparation": 1.0,  # Multiple choice, should be easier
            "practice": 1.15     # Written answers, more challenging
        }

        adjusted_rate = success_rate * stage_weights.get(stage, 1.0)

        if adjusted_rate >= self.EXCELLENT_THRESHOLD:
            return {
                "status": "excellent",
                "needs_review": False,
                "additional_practice_hours": 0
            }
        elif adjusted_rate >= self.GOOD_THRESHOLD:
            return {
                "status": "good",
                "needs_review": False,
                "additional_practice_hours": 1
            }
        elif adjusted_rate >= self.NEEDS_IMPROVEMENT_THRESHOLD:
            return {
                "status": "needs_improvement",
                "needs_review": True,
                "additional_practice_hours": 3
            }
        else:
            return {
                "status": "requires_attention",
                "needs_review": True,
                "additional_practice_hours": 5,
                "alert_user": True
            }
```

**Data Required:**
- Per-task question answers
- Correct/incorrect flags
- Stage information

**When to Use:** Immediately, after each task completion

---

#### 1.3 Schedule Optimization (Task Prioritization)
**Approach:** Priority Score Algorithm

```python
class ScheduleOptimizer:
    def calculate_task_priority(self, task, exam_date, user_performance):
        days_until_exam = (exam_date - datetime.now()).days

        # Urgency factor (exponential as exam approaches)
        urgency = 1 / max(days_until_exam, 1)  # Avoid division by zero
        if days_until_exam <= 7:
            urgency *= 2  # Double urgency in final week

        # Subject priority (from grade gap)
        subject_priority = task.subject.priority_coefficient or 1.0

        # Performance gap (how much user struggles with this)
        performance_gap = 1.0 - user_performance.success_rate

        # Task difficulty
        difficulty_weight = task.difficulty / 5.0

        # Combined priority score
        priority_score = (
            urgency * 0.4 +
            subject_priority * 0.3 +
            performance_gap * 0.2 +
            difficulty_weight * 0.1
        )

        return priority_score

    def generate_study_plan(self, user_id, exam_date, available_hours_per_week):
        tasks = db.get_pending_tasks(user_id)
        user_performance = db.get_user_performance(user_id)

        # Calculate priorities
        prioritized_tasks = []
        for task in tasks:
            priority = self.calculate_task_priority(
                task, exam_date, user_performance[task.subject_id]
            )
            estimated_time = self.predict_task_duration(task)
            prioritized_tasks.append({
                "task": task,
                "priority": priority,
                "estimated_hours": estimated_time / 60
            })

        # Sort by priority
        prioritized_tasks.sort(key=lambda x: x["priority"], reverse=True)

        # Allocate to time slots (greedy algorithm)
        study_plan = []
        hours_allocated = 0

        for task_info in prioritized_tasks:
            if hours_allocated + task_info["estimated_hours"] <= available_hours_per_week:
                study_plan.append(task_info)
                hours_allocated += task_info["estimated_hours"]

        return study_plan
```

**Data Required:**
- Exam dates
- User's available time slots (from busy schedule)
- Task list with subjects
- User performance metrics per subject
- Subject priority coefficients

**When to Use:**
- When exam is added
- Weekly plan regeneration
- When user completes/updates tasks

---

#### 1.4 Break Suggestions (Pomodoro + Adaptive)
**Approach:** Time-Based Rules + User Adaptation

```python
class BreakSuggestionSystem:
    # Default break rules (Pomodoro-inspired)
    SHORT_BREAK_INTERVAL = 25  # minutes
    SHORT_BREAK_DURATION = 5
    LONG_BREAK_INTERVAL = 120  # 2 hours
    LONG_BREAK_DURATION = 20

    def __init__(self):
        self.user_preferences = {}  # Store user-specific patterns

    def suggest_break(self, user_id, session_duration_minutes, focus_rating):
        # Get user's optimal pattern (if enough data)
        if user_id in self.user_preferences:
            optimal_interval = self.user_preferences[user_id]["break_interval"]
        else:
            optimal_interval = self.SHORT_BREAK_INTERVAL

        # Adjust based on focus rating
        if focus_rating <= 2:  # Low focus
            # Suggest break sooner
            adjusted_interval = optimal_interval * 0.75
            break_duration = self.SHORT_BREAK_DURATION
            reason = "Low focus detected - time for a break!"
        elif focus_rating >= 4:  # High focus
            # Can go longer
            adjusted_interval = optimal_interval * 1.25
            break_duration = self.SHORT_BREAK_DURATION
            reason = "You're in the zone, but don't forget to rest!"
        else:
            adjusted_interval = optimal_interval
            break_duration = self.SHORT_BREAK_DURATION
            reason = "Time for a quick break!"

        # Check if long break is needed
        if session_duration_minutes >= self.LONG_BREAK_INTERVAL:
            return {
                "suggest_break": True,
                "break_type": "long",
                "duration_minutes": self.LONG_BREAK_DURATION,
                "reason": "You've been studying for 2 hours - take a longer break!"
            }

        # Check if short break is needed
        if session_duration_minutes >= adjusted_interval:
            return {
                "suggest_break": True,
                "break_type": "short",
                "duration_minutes": break_duration,
                "reason": reason
            }

        return {"suggest_break": False}

    def learn_user_pattern(self, user_id, sessions):
        # Analyze when user naturally takes breaks
        # and performs best
        break_intervals = []
        high_focus_sessions = [s for s in sessions if s.focus_rating >= 4]

        for session in high_focus_sessions:
            if session.breaks_taken:
                intervals = [
                    (b["start"] - session.start_time).seconds / 60
                    for b in session.breaks_taken
                ]
                break_intervals.extend(intervals)

        if break_intervals:
            # Find average of successful break patterns
            optimal_interval = sum(break_intervals) / len(break_intervals)
            self.user_preferences[user_id] = {
                "break_interval": optimal_interval,
                "updated_at": datetime.now()
            }
```

**Data Required:**
- Study session durations
- Break times taken by user
- Focus ratings during sessions
- Productivity metrics (tasks completed)

**When to Use:**
- During active study session (real-time)
- After 10+ study sessions (learn user pattern)

---

### Phase 2: Enhanced ML (Month 2-3)

#### 2.1 Advanced Time Prediction with Linear Regression

```python
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import numpy as np

class MLTimePredictor:
    def __init__(self):
        self.models = {}  # Separate model per stage
        self.scaler = StandardScaler()

    def prepare_features(self, task_data):
        features = []
        for task in task_data:
            feature_vector = [
                task.difficulty,
                task.subject.priority_coefficient,
                task.user_performance.success_rate,
                task.time_of_day_numeric,  # 0-23
                task.day_of_week_numeric,  # 0-6
                task.user_avg_focus_rating,
                task.questions_count,
            ]
            features.append(feature_vector)

        return np.array(features)

    def train(self, historical_data, stage):
        X = self.prepare_features(historical_data)
        y = np.array([task.duration_seconds for task in historical_data])

        X_scaled = self.scaler.fit_transform(X)

        model = LinearRegression()
        model.fit(X_scaled, y)

        self.models[stage] = model

        # Calculate model accuracy
        predictions = model.predict(X_scaled)
        mae = np.mean(np.abs(predictions - y))

        return {
            "stage": stage,
            "mean_absolute_error_seconds": mae,
            "trained_on_samples": len(historical_data)
        }

    def predict(self, task, stage):
        if stage not in self.models:
            # Fall back to simple predictor
            return SimpleTimePredictor().predict_task_duration(...)

        X = self.prepare_features([task])
        X_scaled = self.scaler.transform(X)

        predicted_seconds = self.models[stage].predict(X_scaled)[0]
        return predicted_seconds / 60  # Convert to minutes
```

**Training Requirements:**
- Minimum 50-100 completed tasks per stage
- Diverse task difficulties
- Multiple subjects
- Various times of day

**Retraining Schedule:**
- Weekly (or after every 20 new completed tasks)
- Automatically triggered

---

#### 2.2 Adaptive Learning Path (Reinforcement Learning Lite)

```python
class AdaptiveLearningPath:
    def __init__(self):
        self.topic_difficulty_estimates = {}

    def adjust_difficulty(self, user_id, topic_id, performance):
        # Track difficulty perception per user per topic
        key = f"{user_id}_{topic_id}"

        if key not in self.topic_difficulty_estimates:
            self.topic_difficulty_estimates[key] = {
                "perceived_difficulty": 3,  # Start at medium
                "attempts": 0
            }

        estimate = self.topic_difficulty_estimates[key]

        # Update difficulty based on performance
        if performance.success_rate < 0.6:
            estimate["perceived_difficulty"] += 0.5
        elif performance.success_rate > 0.85:
            estimate["perceived_difficulty"] -= 0.3

        # Clamp between 1-5
        estimate["perceived_difficulty"] = max(1, min(5,
            estimate["perceived_difficulty"]))
        estimate["attempts"] += 1

    def generate_review_tasks(self, user_id, weak_topics):
        # For topics where user performed poorly
        review_tasks = []

        for topic in weak_topics:
            key = f"{user_id}_{topic.id}"
            difficulty = self.topic_difficulty_estimates.get(key, {}).get(
                "perceived_difficulty", 3
            )

            # Generate easier questions for review
            review_difficulty = max(1, difficulty - 1)

            review_tasks.append({
                "topic": topic,
                "stage": "preparation",  # Review with multiple choice
                "difficulty": review_difficulty,
                "question_count": 5,
                "priority": "high",
                "reason": f"Review needed - {topic.success_rate*100:.0f}% success rate"
            })

        return review_tasks
```

---

### Phase 3: Advanced ML (Month 4+)

#### 3.1 Neural Network for Complex Patterns
- Use when dataset > 1000 tasks per user
- TensorFlow/PyTorch implementation
- Predict: optimal study times, break patterns, content retention

#### 3.2 Collaborative Filtering
- Learn from similar students
- "Students like you found this topic challenging"
- Recommend study resources

---

## 🗄️ Database Schema Extensions

### New Tables Needed:

```sql
-- Task stages and questions
CREATE TABLE task_stages (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    subject_id UUID REFERENCES subjects(id),
    exam_id UUID REFERENCES exams(id),
    topic VARCHAR(255),
    stage VARCHAR(50),  -- acknowledgement, preparation, practice
    difficulty INTEGER,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration_seconds INTEGER,
    success_rate DECIMAL(3,2),
    focus_rating INTEGER,
    completed BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Questions within stages
CREATE TABLE stage_questions (
    id UUID PRIMARY KEY,
    stage_id UUID REFERENCES task_stages(id),
    question_text TEXT,
    question_type VARCHAR(50),  -- multiple_choice, written, calculation
    difficulty INTEGER,
    user_answer TEXT,
    correct_answer TEXT,
    is_correct BOOLEAN,
    time_spent_seconds INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User performance metrics (aggregated)
CREATE TABLE user_performance_metrics (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    subject_id UUID REFERENCES subjects(id),

    -- Time averages
    avg_acknowledgement_time_minutes DECIMAL(5,2),
    avg_preparation_time_minutes DECIMAL(5,2),
    avg_practice_time_minutes DECIMAL(5,2),

    -- Success rates
    preparation_success_rate DECIMAL(3,2),
    practice_success_rate DECIMAL(3,2),

    -- Productivity patterns
    best_time_of_day VARCHAR(20),
    optimal_session_duration INTEGER,

    -- Last updated
    last_calculated TIMESTAMP,
    sample_size INTEGER,  -- Number of tasks used for calculation

    UNIQUE(user_id, subject_id)
);

-- ML model metadata
CREATE TABLE ml_models (
    id UUID PRIMARY KEY,
    model_type VARCHAR(50),  -- time_predictor, performance_assessor, etc
    stage VARCHAR(50),
    version VARCHAR(20),
    trained_at TIMESTAMP,
    sample_size INTEGER,
    accuracy_metric DECIMAL(5,2),
    model_params JSONB,
    is_active BOOLEAN DEFAULT TRUE
);
```

---

## 📈 Implementation Timeline

### Week 1-2: MVP Phase 1
- [ ] Implement database schema extensions
- [ ] Build SimpleTimePredictor
- [ ] Build PerformanceAssessor
- [ ] Build ScheduleOptimizer
- [ ] Build BreakSuggestionSystem (basic)
- [ ] Create API endpoints for task stages
- [ ] Test with sample data

### Week 3-4: Data Collection & Refinement
- [ ] Implement task stage UI (acknowledgement, preparation, practice)
- [ ] Build question interface (MCQ and written)
- [ ] Track all required metrics
- [ ] Store data in database
- [ ] Generate first study plans
- [ ] Collect minimum 50 tasks per user for ML training

### Month 2: ML Enhancement (Phase 2)
- [ ] Implement MLTimePredictor with Linear Regression
- [ ] Train initial models
- [ ] Build model retraining pipeline
- [ ] Implement AdaptiveLearningPath
- [ ] Add automatic review task generation
- [ ] Enhanced break suggestions with user learning

### Month 3+: Advanced Features (Phase 3)
- [ ] Neural network implementation
- [ ] Collaborative filtering
- [ ] Real-time predictions
- [ ] Advanced analytics dashboard

---

## 🔬 Testing & Validation

### Model Performance Metrics
1. **Time Prediction Accuracy**
   - Mean Absolute Error (MAE): Target < 10 minutes
   - Mean Absolute Percentage Error (MAPE): Target < 20%

2. **Performance Assessment**
   - Precision of "needs review" flag: Target > 80%
   - User satisfaction with review recommendations

3. **Schedule Optimization**
   - Task completion rate: Target > 75%
   - User adherence to suggested schedule: Track %
   - Exam preparedness score: Survey after exams

4. **Break Suggestions**
   - User acceptance rate of break suggestions: Target > 60%
   - Focus rating improvement after breaks: Track trend

### A/B Testing
- Compare ML predictions vs baseline averages
- Measure: task completion rates, exam scores, user satisfaction

---

## 💾 Model Storage & Deployment

```python
# Save trained model
import joblib

def save_model(model, model_type, stage, version):
    filename = f"models/{model_type}_{stage}_v{version}.pkl"
    joblib.dump(model, filename)

    # Save metadata to database
    db.ml_models.insert({
        "model_type": model_type,
        "stage": stage,
        "version": version,
        "trained_at": datetime.now(),
        "sample_size": model.n_samples,
        "accuracy_metric": model.score,
        "is_active": True
    })

def load_active_model(model_type, stage):
    # Get latest active model from database
    model_meta = db.ml_models.find_one({
        "model_type": model_type,
        "stage": stage,
        "is_active": True
    }, sort=[("trained_at", -1)])

    if not model_meta:
        return None

    filename = f"models/{model_type}_{stage}_v{model_meta['version']}.pkl"
    return joblib.load(filename)
```

---

## 🎓 Key Takeaways

1. **Start Simple:** Rule-based systems work well with limited data
2. **Collect Data First:** ML models need 50-100+ samples to be effective
3. **Iterate Gradually:** MVP → Linear Regression → Neural Networks
4. **Validate Constantly:** Track metrics, A/B test, gather user feedback
5. **Automate Retraining:** Weekly model updates as data grows
6. **Fallback Mechanisms:** Always have rule-based backup if ML fails

---

## 📚 Required Libraries

```bash
# Python ML stack
pip install scikit-learn==1.3.0
pip install pandas==2.1.0
pip install numpy==1.24.0
pip install joblib==1.3.0

# For Phase 3 (optional, later)
pip install tensorflow==2.13.0
# OR
pip install torch==2.0.0
```

---

## 🔗 Integration Points

1. **Exam Creation → Task Generation**
   - When exam is created, automatically generate tasks for all relevant topics
   - Use 3-stage structure for each topic

2. **Task Completion → Performance Update**
   - After task completion, update user_performance_metrics
   - Trigger model retraining if threshold reached

3. **Schedule Generation → Dashboard**
   - Weekly automated schedule generation
   - Display in dashboard with time estimates

4. **Study Session → Break Suggestions**
   - Real-time break suggestions during active sessions
   - Track break adherence and effectiveness

5. **Performance Assessment → Review Tasks**
   - Automatically generate review tasks for weak areas
   - Add to user's task queue with high priority

---

**Author:** Claude & Nikita
**Last Updated:** November 7, 2025
**Version:** 1.0
