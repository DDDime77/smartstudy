# AI Study Planner - Project Overview
**Smart Study Scheduler with Adaptive Machine Learning**

---

## 📋 Project Summary

An intelligent study planning application that uses machine learning to optimize student schedules, predict task durations, and adapt to individual learning patterns. Built for IB, A-Level, AP, and American education systems.

**Target Users:** High school and university students preparing for exams
**Core Value:** AI learns from student behavior to create personalized, optimized study schedules

---

## 🎯 Project Goals

### Primary Objectives:
1. **Adaptive Learning:** System learns student's pace, productivity patterns, and optimal study times
2. **Smart Scheduling:** Automatically generate study plans based on exam dates, task deadlines, and available time
3. **Workload Prediction:** Forecast task durations based on historical data and difficulty
4. **Performance Tracking:** Monitor student progress and automatically suggest review for weak areas

### Key Differentiators:
- Education system-aware (IB/A-Level/AP/American)
- Grade gap analysis for subject prioritization
- 3-stage learning methodology (acknowledgement → preparation → practice)
- Real-time break suggestions based on productivity patterns
- ML models train on individual student data (privacy-first)

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- Next.js 16.0.1 (React framework)
- TypeScript
- Tailwind CSS + shadcn/ui components
- Deployed on: Vercel (planned)

**Backend:**
- FastAPI (Python)
- SQLAlchemy ORM
- PostgreSQL database
- JWT authentication
- Deployed on: Railway/Heroku (planned)

**Machine Learning:**
- scikit-learn (Phase 1: Linear Regression)
- NumPy, Pandas for data processing
- TensorFlow/PyTorch (Phase 3: Neural networks)
- Model storage: joblib serialization

**Infrastructure:**
- Git/GitHub version control
- Chrome DevTools MCP for testing
- Docker (planned for deployment)

---

## 📁 Project Structure

```
ai-study-planner/
├── app/                          # Next.js frontend
│   ├── dashboard/
│   │   ├── page.tsx             # Main dashboard
│   │   ├── exams/page.tsx       # Exam calendar
│   │   ├── subjects/page.tsx    # Subject management
│   │   └── settings/page.tsx    # User settings
│   ├── layout.tsx
│   └── page.tsx                 # Landing page
│
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py        # Configuration
│   │   │   ├── database.py      # DB connection
│   │   │   └── security.py      # JWT auth
│   │   ├── models/
│   │   │   ├── user.py          # User model
│   │   │   ├── subject.py       # Subject model
│   │   │   ├── exam.py          # Exam model
│   │   │   ├── task.py          # Task model
│   │   │   ├── study_session.py # Study session model
│   │   │   └── availability.py  # User availability
│   │   ├── routers/
│   │   │   ├── auth.py          # Authentication endpoints
│   │   │   ├── onboarding.py    # Onboarding flow
│   │   │   ├── subjects.py      # Subject CRUD
│   │   │   ├── exams.py         # Exam CRUD
│   │   │   └── schedule.py      # Schedule optimization
│   │   ├── schemas/
│   │   │   ├── auth.py          # Pydantic schemas
│   │   │   ├── exam.py
│   │   │   └── onboarding.py
│   │   └── utils/
│   │       ├── priority_calculator.py  # Grade gap algorithm
│   │       └── ml/              # ML models (planned)
│   │           ├── time_predictor.py
│   │           ├── performance_assessor.py
│   │           └── schedule_optimizer.py
│   ├── init_db.py               # Database initialization
│   ├── ml_p.md                  # ML implementation plan
│   └── requirements.txt
│
├── components/                   # React components
│   ├── Sidebar.tsx
│   ├── LoginModal.tsx
│   └── OnboardingModal.tsx
│
├── lib/
│   └── api/                     # API client services
│       ├── client.ts            # HTTP client
│       ├── auth.ts
│       ├── exams.ts
│       └── subjects.ts
│
└── README.md
```

---

## ✅ Currently Implemented Features

### 1. **Authentication & Onboarding** ✓
- Email/password registration and login
- JWT token-based authentication
- OAuth (Google/GitHub) ready (UI implemented, backend pending)
- 5-step onboarding flow:
  1. Timezone selection
  2. Education system (IB/A-Level/American/AP)
  3. Import method (manual entry/Google Classroom)
  4. Subject addition with grades
  5. Weekly availability schedule

### 2. **Subject Management** ✓
- CRUD operations for subjects
- Grade gap tracking (current grade → target grade)
- **Priority coefficient calculation** based on grade gap and level (HL/SL)
- Drag-and-drop priority reordering
- Subject statistics (study hours, tasks, completion rates)
- Color coding for visual organization

**Priority Algorithm:**
```python
priority = base_priority + (grade_gap * 0.3) + (level_multiplier * 0.2)
# IB HL subjects get 1.2x multiplier
# Grade gap: target_grade - current_grade
# Range: 0.5 - 3.0
```

### 3. **Exam Management** ✓
- Interactive monthly calendar view
- Click-to-add exam scheduling
- Education system-specific exam types:
  - **IB:** Paper 1, Paper 2, Paper 3, IA, Extended Essay, TOK
  - **A-Level:** Paper 1, Paper 2, Paper 3, NEA, Practical Endorsement
  - **AP:** Section 1 (MCQ), Section 2 (FRQ)
  - **American:** Midterm, Final, Unit Test, Quiz
- Exam details: date, time, duration, location
- Upcoming exams dashboard with countdown
- Color-coded by subject

### 4. **Dashboard** ✓
- Real-time stats (tasks due, study hours, upcoming exams)
- Subject priority cards (drag-to-reorder)
- Weekly progress tracking
- Study goal monitoring
- Quick action buttons (add task, schedule session, add exam)

### 5. **Database Schema** ✓
```sql
-- Core tables
users (id, email, password_hash, full_name, created_at)
user_profiles (user_id, education_system, timezone, study_goal)
subjects (id, user_id, name, level, current_grade, target_grade, priority_coefficient)
exams (id, user_id, subject_id, exam_date, exam_type, location, duration)
tasks (id, user_id, subject_id, title, due_date, status, difficulty)
study_sessions (id, user_id, subject_id, start_time, duration, focus_rating)
busy_schedule (id, user_id, day_of_week, start_time, end_time, recurring)
```

---

## 🚧 Features In Development (Next Steps)

### 1. **Tasks/Assignments System** (Priority: HIGHEST)
**Status:** Models exist, API endpoints needed

**Requirements:**
- Task CRUD endpoints
- 3-stage task structure:
  1. **Acknowledgement:** YouTube videos, reading materials
  2. **Preparation:** 5 multiple-choice questions
  3. **Practice:** Complex written/calculation tasks
- Task filtering (by subject, status, due date)
- Automatic task generation from exam dates

**Data to Collect:**
```python
{
    "task_id": "uuid",
    "stage": "acknowledgement|preparation|practice",
    "difficulty": 1-5,
    "questions": [
        {
            "question_text": "...",
            "type": "multiple_choice|written",
            "user_answer": "...",
            "correct_answer": "...",
            "is_correct": true/false,
            "time_spent_seconds": 180
        }
    ],
    "start_time": "timestamp",
    "end_time": "timestamp",
    "success_rate": 0.8,
    "focus_rating": 1-5,
    "time_of_day": "morning|afternoon|evening|night"
}
```

### 2. **Study Timer/Session Tracking** (Priority: HIGH)
**Status:** Models exist, UI needed

**Requirements:**
- Pomodoro-style timer with start/stop/pause
- Link session to specific task/subject
- Focus rating input (1-5) after session
- Break tracking (automatic suggestions)
- Session history page

**Data to Collect:**
```python
{
    "session_id": "uuid",
    "task_id": "uuid",
    "subject_id": "uuid",
    "start_time": "timestamp",
    "duration_minutes": 90,
    "breaks_taken": [
        {"start": "timestamp", "duration_minutes": 5}
    ],
    "focus_rating": 4,
    "productivity_score": 0.75,
    "time_of_day": "afternoon",
    "energy_level": 3
}
```

### 3. **Analytics Dashboard** (Priority: MEDIUM-HIGH)
**Status:** Planned

**Requirements:**
- Study time charts (by subject, by day/week)
- Task completion rates
- Exam countdown widgets
- Goal progress bars
- ML prediction accuracy visualization
- Subject performance trends

### 4. **ML-Powered Features** (Priority: MEDIUM)
**Status:** Implementation plan complete (ml_p.md)

---

## 🤖 Machine Learning Requirements

### Core ML Objectives:

#### 1. **Workload Prediction (Time Estimation)**
**Goal:** Predict how long a task will take based on historical data

**Approach:**
- **Phase 1 (MVP):** Moving average of past task times, adjusted for difficulty
- **Phase 2 (ML):** Linear Regression with features:
  - Task difficulty (1-5)
  - Subject priority coefficient
  - User's past success rate in subject
  - Time of day
  - Day of week
  - Average focus rating
  - Question count

**Training Data Required:**
- Minimum 50-100 completed tasks per user
- Each task must have: start_time, end_time, difficulty, subject, stage

**Model Output:**
```python
predicted_duration_minutes = model.predict(task_features)
# Example: "This Calculus practice task will take ~35 minutes"
```

**Accuracy Target:** Mean Absolute Error < 10 minutes

---

#### 2. **Schedule Optimization (Study Plan Generation)**
**Goal:** Create optimal weekly study schedule based on priorities and availability

**Approach:**
- **Phase 1 (MVP):** Priority scoring algorithm:
```python
priority_score = (
    urgency_factor * 0.4 +           # Days until exam (exponential)
    subject_priority_coefficient * 0.3 +  # Grade gap
    performance_gap * 0.2 +          # User struggle level
    difficulty_weight * 0.1          # Task difficulty
)
```

- **Phase 2 (ML):** Optimization algorithm considering:
  - User's productive time slots (learned from session data)
  - Task dependencies
  - Cognitive load balancing (don't schedule all hard subjects in one day)
  - Break intervals

**Training Data Required:**
- User's busy schedule (unavailable time slots)
- Study session history with focus ratings
- Task completion rates by time of day
- Minimum 20-30 study sessions per user

**Model Output:**
```python
weekly_plan = [
    {
        "date": "2025-11-08",
        "time_slot": "09:00-10:30",
        "task": "Calculus - Practice: Derivatives",
        "estimated_duration": 90,
        "priority_score": 0.87,
        "reason": "Exam in 7 days, high priority subject"
    },
    ...
]
```

---

#### 3. **Performance Assessment (Adaptive Learning)**
**Goal:** Identify weak areas and automatically generate review tasks

**Approach:**
- **Phase 1 (MVP):** Rule-based thresholds:
```python
if success_rate >= 0.85: status = "excellent"
elif success_rate >= 0.70: status = "good"
elif success_rate >= 0.60: status = "needs_improvement"
else: status = "requires_attention" + generate_review_tasks()
```

- **Phase 2 (ML):** Adaptive difficulty adjustment:
  - Track perceived difficulty per topic per user
  - Adjust question difficulty based on performance
  - Generate personalized review questions

**Training Data Required:**
- Per-question results (correct/incorrect)
- Time spent per question
- Question difficulty ratings
- User's performance trends over time

**Model Output:**
```python
assessment = {
    "status": "needs_improvement",
    "weak_topics": ["Vectors", "Integration"],
    "review_tasks": [
        {
            "topic": "Vectors",
            "stage": "preparation",
            "difficulty": 2,  # Easier than original
            "question_count": 5,
            "reason": "55% success rate - review needed"
        }
    ],
    "additional_practice_hours": 3
}
```

---

#### 4. **Break Suggestions (Productivity Optimization)**
**Goal:** Suggest optimal break times to maintain focus and prevent burnout

**Approach:**
- **Phase 1 (MVP):** Pomodoro technique (25 min work, 5 min break)
```python
if session_duration >= 25_min:
    suggest_short_break(5_min)
elif session_duration >= 120_min:
    suggest_long_break(20_min)

# Adjust based on focus rating
if focus_rating <= 2:
    suggest_break_sooner()
```

- **Phase 2 (ML):** Learn user's optimal patterns:
  - Analyze when user naturally takes breaks
  - Correlate break patterns with high-focus sessions
  - Personalize break intervals

**Training Data Required:**
- Study session durations
- Break times taken by user
- Focus ratings before/after breaks
- Productivity metrics (tasks completed per session)
- Minimum 10-15 study sessions per user

**Model Output:**
```python
break_suggestion = {
    "suggest_break": True,
    "break_type": "short",
    "duration_minutes": 5,
    "reason": "You've been studying for 28 minutes. Your most productive sessions include a break around now.",
    "optimal_return_time": "14:35"
}
```

---

## 📊 Complete Data Collection Schema

### Required for ML Training:

```python
# 1. Task Stage Data (for all 3 ML objectives)
task_stage_data = {
    "id": "uuid",
    "user_id": "uuid",
    "subject_id": "uuid",
    "exam_id": "uuid",
    "topic": "Calculus - Derivatives",
    "stage": "acknowledgement|preparation|practice",
    "difficulty": 1-5,

    # Timing
    "start_time": "2025-11-07T09:00:00Z",
    "end_time": "2025-11-07T09:30:00Z",
    "duration_seconds": 1800,
    "time_of_day": "morning",  # morning/afternoon/evening/night
    "day_of_week": 4,  # 0=Monday, 6=Sunday

    # Performance
    "questions": [
        {
            "id": "uuid",
            "question_text": "Find the derivative of x^2 + 3x",
            "question_type": "multiple_choice|written|calculation",
            "difficulty": 3,
            "user_answer": "2x + 3",
            "correct_answer": "2x + 3",
            "is_correct": true,
            "time_spent_seconds": 180
        }
    ],
    "total_questions": 5,
    "correct_answers": 4,
    "success_rate": 0.8,

    # Context
    "focus_rating": 4,  # 1-5, user self-report
    "energy_level": 3,  # 1-5, user self-report
    "completed": true
}

# 2. Study Session Data (for break suggestions)
study_session_data = {
    "id": "uuid",
    "user_id": "uuid",
    "subject_id": "uuid",
    "task_id": "uuid",  # Optional link

    # Timing
    "start_time": "2025-11-07T09:00:00Z",
    "end_time": "2025-11-07T10:30:00Z",
    "duration_minutes": 90,
    "time_of_day": "morning",
    "day_of_week": 4,

    # Breaks
    "breaks_taken": [
        {
            "start_time": "2025-11-07T09:25:00Z",
            "duration_minutes": 5,
            "type": "short"
        },
        {
            "start_time": "2025-11-07T10:00:00Z",
            "duration_minutes": 15,
            "type": "long"
        }
    ],
    "total_break_minutes": 20,

    # Performance
    "tasks_completed": 3,
    "expected_tasks": 4,
    "productivity_score": 0.75,  # completed/expected
    "average_focus_rating": 3.5,

    # Context
    "energy_level_start": 4,
    "energy_level_end": 3,
    "notes": "Optional user notes"
}

# 3. User Performance Metrics (aggregated, for quick access)
user_performance_metrics = {
    "user_id": "uuid",
    "subject_id": "uuid",

    # Time averages (in minutes)
    "avg_acknowledgement_time": 25.0,
    "avg_preparation_time": 30.0,
    "avg_practice_time": 45.0,

    # Success rates
    "preparation_success_rate": 0.82,
    "practice_success_rate": 0.75,
    "overall_success_rate": 0.78,
    "improvement_rate_per_week": 0.05,

    # Productivity patterns
    "best_time_of_day": "morning",  # When focus rating is highest
    "worst_time_of_day": "evening",
    "average_session_duration": 60,
    "optimal_session_duration": 90,  # When productivity is highest
    "break_frequency_per_hour": 1.2,

    # Topic-specific
    "weak_topics": ["Vectors", "Integration"],
    "strong_topics": ["Algebra", "Functions"],

    # Metadata
    "last_calculated": "2025-11-07T10:00:00Z",
    "sample_size": 47,  # Number of tasks used
    "data_quality": "good"  # good/fair/insufficient
}
```

---

## 🎓 ML Model Training Pipeline

### Phase 1: Data Collection (Weeks 1-4)
```python
# Minimum data requirements before ML training:
MIN_TASKS_FOR_TRAINING = 50  # Per user
MIN_SESSIONS_FOR_BREAK_LEARNING = 15  # Per user
MIN_SUBJECTS_FOR_COLLABORATIVE = 100  # Across all users

# Data quality checks:
def can_train_model(user_id):
    task_count = db.count_completed_tasks(user_id)
    session_count = db.count_study_sessions(user_id)

    return {
        "time_predictor": task_count >= MIN_TASKS_FOR_TRAINING,
        "performance_assessor": task_count >= 20,  # Lower threshold
        "break_suggester": session_count >= MIN_SESSIONS_FOR_BREAK_LEARNING,
        "schedule_optimizer": task_count >= 30 and session_count >= 10
    }
```

### Phase 2: Model Training (Weekly/On-Demand)
```python
# Triggered automatically:
# - Every week
# - After every 20 new completed tasks
# - Manual trigger via admin dashboard

def train_time_predictor(user_id):
    # 1. Fetch historical task data
    tasks = db.get_completed_tasks(user_id, limit=200)

    # 2. Prepare features
    X = prepare_features(tasks)  # [difficulty, priority, time_of_day, ...]
    y = [task.duration_seconds for task in tasks]

    # 3. Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

    # 4. Train model
    model = LinearRegression()
    model.fit(X_train, y_train)

    # 5. Evaluate
    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)

    # 6. Save if better than previous
    if mae < current_model.mae:
        save_model(model, user_id, "time_predictor", version=get_next_version())

    return {"mae": mae, "samples": len(tasks)}
```

### Phase 3: Model Serving (Real-Time)
```python
# API endpoint for predictions
@router.post("/predict/task-duration")
async def predict_task_duration(
    task: TaskInput,
    current_user: User = Depends(get_current_user)
):
    # Load user's trained model
    model = load_user_model(current_user.id, "time_predictor")

    if not model:
        # Fallback to rule-based predictor
        return SimpleTimePredictor().predict(task)

    # Prepare features
    features = prepare_task_features(task, current_user)

    # Predict
    predicted_seconds = model.predict([features])[0]

    return {
        "predicted_duration_minutes": predicted_seconds / 60,
        "confidence": calculate_confidence(model),
        "based_on_samples": model.sample_size
    }
```

---

## 📈 Success Metrics

### ML Model Performance:
1. **Time Prediction Accuracy:**
   - Mean Absolute Error < 10 minutes
   - Mean Absolute Percentage Error < 20%

2. **Schedule Adherence:**
   - User follows suggested schedule > 70% of time
   - Task completion rate > 75%

3. **Performance Assessment:**
   - "Needs review" precision > 80%
   - Generated review tasks improve scores by > 15%

4. **Break Suggestions:**
   - User accepts break suggestion > 60% of time
   - Focus rating improves after break by average of 1 point

### User Engagement:
- Daily active users
- Tasks completed per week
- Study sessions logged per week
- Exam dates added
- Schedule adherence rate

---

## 🔐 Privacy & Security

### Data Privacy:
- **Local ML Training:** Models train on individual user data only
- **No Data Sharing:** User data never shared with other users or third parties
- **Data Ownership:** Users can export/delete all their data
- **Anonymous Analytics:** Only aggregate, anonymized metrics collected

### Security:
- JWT token authentication
- Password hashing (bcrypt)
- SQL injection prevention (SQLAlchemy ORM)
- CORS configuration
- HTTPS in production (planned)

---

## 🚀 Deployment Plan

### Current Status: Development (localhost)
- Frontend: http://localhost:4000
- Backend: http://localhost:4008
- Database: PostgreSQL (local)

### Production Plan:
- **Frontend:** Vercel (automatic from GitHub)
- **Backend:** Railway/Heroku with Docker
- **Database:** Railway PostgreSQL / Supabase
- **ML Models:** Stored in S3/GCS, loaded on-demand
- **CI/CD:** GitHub Actions

---

## 📚 Key Documentation Files

1. **README.md** - Project setup and getting started
2. **backend/ml_p.md** - Comprehensive ML implementation plan
3. **backend/PRIORITY_SYSTEM_DOCUMENTATION.md** - Subject priority algorithm
4. **IMPLEMENTATION_ROADMAP.md** - Feature roadmap and timeline
5. **PROJECT_OVERVIEW.md** (this file) - Complete project context

---

## 🎯 Immediate Next Steps

### For ML Implementation:
1. **Build Task System** (Week 1-2)
   - 3-stage task CRUD API
   - Question answering interface
   - Data collection pipeline

2. **Implement Study Timer** (Week 2-3)
   - Timer component with start/stop
   - Focus rating input
   - Break tracking

3. **Deploy Rule-Based ML** (Week 3-4)
   - SimpleTimePredictor
   - PerformanceAssessor
   - ScheduleOptimizer
   - BreakSuggestionSystem

4. **Collect Training Data** (Week 4-8)
   - Minimum 50 tasks per user
   - 15+ study sessions per user

5. **Train First ML Models** (Week 8+)
   - Linear Regression for time prediction
   - Model evaluation and deployment

---

## 💡 Context for Another AI

**If you're an AI being given this context:**

This project is an intelligent study planner that helps students optimize their learning. The key innovation is the **3-stage learning structure** (acknowledgement → preparation → practice) combined with **ML-powered predictions**.

**What makes it unique:**
1. **Grade gap-based priority:** Automatically prioritizes subjects where student needs most improvement
2. **Education system aware:** Adapts to IB, A-Level, AP, American systems with proper exam structures
3. **Privacy-first ML:** Models train on individual user data, never shared
4. **Progressive enhancement:** Starts with simple rules, adds ML as data accumulates

**Current state:**
- ✅ Auth, onboarding, subjects, exams implemented
- 🚧 Tasks, study timer, ML features in development
- 📅 Timeline: MVP in 2 weeks, ML in 2 months

**Key challenge:**
Need to balance quick MVP delivery with collecting enough data to train effective ML models. Solution: Phase 1 uses rule-based systems that work immediately while collecting training data.

**Data structure:**
Every task has 3 stages, each generating training data (time, performance, context). This feeds 4 ML models: time predictor, performance assessor, schedule optimizer, break suggester.

**Ask me about:** Specific implementation details, ML algorithms, database schema, API endpoints, or feature requirements.

---

**Last Updated:** November 7, 2025
**Version:** 1.0
**Authors:** Nikita, Lev, Claude
**Repository:** https://github.com/DDDime77/smartstudy
