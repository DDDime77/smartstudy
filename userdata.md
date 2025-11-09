# User Data Documentation - StudySmart AI

## Overview
This document describes all user data stored in the StudySmart AI database and identifies which data points are crucial for AI-powered task time estimation.

## Data Categories

### 1. User Authentication Data
**Table: `users`**
- `id`: Unique user identifier (UUID)
- `email`: User's email address
- `password_hash`: Encrypted password
- `full_name`: User's full name (optional)
- `created_at`: Account creation timestamp
- `updated_at`: Last account update timestamp
- `last_login`: Last login timestamp
- `email_verified`: Email verification status
- `profile_completed`: Onboarding completion status
- `oauth_provider`: OAuth provider (Google, GitHub, etc.)
- `oauth_id`: OAuth unique identifier

**Time Estimation Relevance**: ⭐ (Low)
- Only `created_at` and `last_login` provide indirect signals about user experience with the platform

---

### 2. User Profile Data
**Table: `user_profiles`**
- `education_system`: IB, A-Level, or American system
- `education_program`: Specific program (IBDP, AP, etc.)
- `grade_level`: Current grade/year level
- `timezone`: User's timezone
- `study_goal`: Weekly study hours target
- `target_study_hours_per_day`: Daily study target
- `preferred_study_times`: JSON array of preferred time slots

**Time Estimation Relevance**: ⭐⭐⭐⭐⭐ (Critical)
- `education_system` & `education_program`: Different systems have different workload expectations
- `grade_level`: Higher grades typically require more study time
- `study_goal` & `target_study_hours_per_day`: User's available study capacity
- `preferred_study_times`: Productivity varies by time of day

---

### 3. Subject Data
**Table: `subjects`**
- `name`: Subject name (e.g., Mathematics, Physics)
- `level`: Subject level (HL, SL, AP, etc.)
- `category`: Subject group/category
- `color`: UI color (hex)
- `difficulty_level`: 1-5 difficulty rating
- `current_grade`: User's current grade in subject
- `target_grade`: User's target grade
- `priority_coefficient`: Calculated based on grade gap

**Time Estimation Relevance**: ⭐⭐⭐⭐⭐ (Critical)
- `difficulty_level`: Harder subjects require more time
- `level` (HL vs SL): Higher level subjects need 40-60% more study time
- `current_grade` vs `target_grade`: Larger gaps require more effort
- `priority_coefficient`: Subjects needing improvement get more time allocation

---

### 4. Task Data
**Table: `tasks`**
- `title`: Task title
- `description`: Task details
- `task_type`: ASSIGNMENT, EXAM_PREP, READING, PRACTICE, REVISION, PROJECT
- `difficulty`: 1-5 difficulty scale
- `estimated_duration`: AI-predicted time (minutes)
- `actual_duration`: Actual completion time (minutes)
- `deadline`: Due date/time
- `priority_score`: ML-calculated priority
- `status`: PENDING, IN_PROGRESS, COMPLETED, OVERDUE
- `tags`: JSON array of task tags
- `completed_at`: Completion timestamp

**Time Estimation Relevance**: ⭐⭐⭐⭐⭐ (Critical)
- `task_type`: Base estimation varies significantly by type:
  - READING: 2-3 pages/10 min
  - ASSIGNMENT: 30-120 min typical
  - EXAM_PREP: 60-180 min sessions
  - PROJECT: 120-480 min total
- `difficulty`: Multiplier effect (1.0x to 2.5x)
- `actual_duration` history: Most important for personalization
- `deadline`: Affects urgency and study intensity

---

### 5. Study Session Data
**Table: `study_sessions`**
- `task_id`: Associated task
- `subject_id`: Associated subject
- `start_time`: Session start timestamp
- `end_time`: Session end timestamp
- `duration_minutes`: Total session duration
- `focus_rating`: 1-5 self-assessed focus level
- `break_time_minutes`: Break time taken
- `interruptions_count`: Number of interruptions
- `productivity_score`: Calculated productivity metric
- `time_of_day`: EARLY_MORNING, MORNING, AFTERNOON, EVENING, NIGHT

**Time Estimation Relevance**: ⭐⭐⭐⭐⭐ (Critical)
This is the MOST important data for personalization:
- Actual vs estimated time comparison
- Focus rating patterns by time of day
- Productivity variations by subject
- Break patterns and optimal session lengths
- Personal speed relative to baseline

---

### 6. Schedule/Availability Data
**Table: `busy_schedule`**
- `day_of_week`: 0-6 (Monday-Sunday)
- `start_time`: Busy period start
- `end_time`: Busy period end
- `activity_type`: School, Sports, Work, etc.
- `description`: Activity description
- `recurring`: Weekly recurring or one-time
- `specific_date`: For non-recurring events

**Time Estimation Relevance**: ⭐⭐⭐⭐ (High)
- Available study windows affect task scheduling
- Limited availability may require more efficient time estimates
- Activity types indicate energy levels (post-sports = lower focus)

---

### 7. Exam Data
**Table: `exams`**
- `exam_date`: Date of exam
- `exam_type`: Paper 1, Paper 2, IA, etc.
- `title`: Custom exam title
- `description`: Additional notes
- `start_time` & `end_time`: Exam timing
- `duration_minutes`: Exam duration
- `location`: Exam location

**Time Estimation Relevance**: ⭐⭐⭐ (Medium)
- Exam dates create preparation deadlines
- Exam types indicate preparation requirements:
  - Paper 1: Theory review (shorter sessions)
  - Paper 2: Problem practice (longer sessions)
  - IA: Project work (extended sessions)

---

## Key Data Points for Time Estimation Algorithm

### Primary Factors (Direct Impact)
1. **Historical Performance** (`study_sessions`)
   - User's actual vs estimated time ratio
   - Average completion speed per task type
   - Subject-specific speed modifiers

2. **Task Characteristics** (`tasks`)
   - Task type (assignment, reading, project, etc.)
   - Difficulty level (1-5)
   - Subject association

3. **Subject Complexity** (`subjects`)
   - Subject difficulty level
   - Level (HL/SL/AP)
   - User's proficiency (current grade)

### Secondary Factors (Modifiers)
1. **Time of Day** (`study_sessions.time_of_day`)
   - Morning productivity vs evening fatigue
   - Personal peak performance times

2. **Education Context** (`user_profiles`)
   - System-specific expectations (IB vs A-Level)
   - Grade level workload norms

3. **Workload Context** (`tasks` + `busy_schedule`)
   - Concurrent task count
   - Available time windows
   - Deadline pressure

### Personalization Data
1. **Learning Velocity**
   - Average actual/estimated ratio over last 10 tasks
   - Subject-specific velocity adjustments

2. **Focus Patterns**
   - Average focus rating by time of day
   - Optimal session duration before breaks

3. **Improvement Trajectory**
   - Speed improvements over time
   - Difficulty handling improvements

## Time Estimation Formula Framework

```
Base_Time = f(task_type, task_description_length)
Subject_Modifier = f(subject_difficulty, subject_level, current_grade)
User_Modifier = f(historical_speed_ratio, focus_patterns)
Context_Modifier = f(deadline_pressure, concurrent_tasks, time_of_day)

Estimated_Time = Base_Time × Subject_Modifier × User_Modifier × Context_Modifier
```

### Initial Estimates (No History)
- **Reading**: 10 pages/hour (adjust for subject)
- **Assignment**: 45 min (short), 90 min (medium), 180 min (long)
- **Practice Problems**: 5-10 min per problem
- **Essay Writing**: 30 min/page
- **Project Work**: 120-480 min total
- **Exam Preparation**: 60-120 min sessions
- **Revision**: 30-60 min per topic

### Confidence Intervals
- 0-5 completed tasks: ±50% confidence
- 6-10 completed tasks: ±30% confidence
- 11-20 completed tasks: ±20% confidence
- 20+ completed tasks: ±15% confidence

## Privacy Considerations
All time estimation and learning happens locally. User patterns are never shared with third parties. Aggregated, anonymized data may be used to improve base estimates for new users.