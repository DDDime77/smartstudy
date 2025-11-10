# Smart Study Hours - Product Documentation

## Executive Summary

Smart Study Hours is an intelligent study planning and time management platform that leverages artificial intelligence to create personalized learning experiences. The system combines adaptive task generation, automated scheduling, and progress analytics to optimize student study efficiency across multiple education systems (IB, A-Level, and American curricula).

---

## Design Philosophy

### Visual Design Approach

The system implements a **minimalistic dark-themed interface** with the following design principles:

- **Eye Comfort**: Dark color palette (#0f172a base with gradient accents) reduces eye strain during extended study sessions
- **Interactive Elements**: All UI components are built with React 19, featuring smooth animations and responsive feedback
- **Glass Morphism**: Utilizes frosted glass card components with backdrop blur effects for modern visual hierarchy
- **Gradient Accents**: Purple-to-pink gradients (#a855f7 to #ec4899) highlight primary actions and important metrics
- **Accessibility**: High-contrast text (white/90% opacity on dark backgrounds) ensures readability

### Component Architecture

The frontend employs a **custom component library** including:
- `GlassCard` - Translucent containers with blur effects
- `AnimatedText` - Text with typing/fade animations
- `GradientText` - Multi-color gradient text displays
- `Button` - Variants: primary, secondary, ghost, danger
- `Badge` - Status indicators with glow effects
- `GridBackground` - Animated background grid patterns

---

## User Journey & Features

### 1. Landing Page (Home Screen)

The landing page presents three core sections:

#### Features Section
Showcases the platform's main capabilities:
- **AI-Powered Task Generation**: Context-aware problem creation based on syllabus, grade level, and difficulty
- **Smart Scheduling**: Automated timetable optimization using priority coefficients
- **Progress Analytics**: Real-time tracking of study hours, completion rates, and achievement badges
- **Google Classroom Integration**: Automatic subject import and assignment synchronization
- **Multi-Curriculum Support**: IB (IBDP/IBCP), A-Level, and American (Standard/AP/Honors) systems

#### How It Works Section
Outlines the three-step user workflow:
1. **Onboarding**: Configure educational profile and preferences
2. **Plan**: Add exams or start study sessions with AI-generated tasks
3. **Track**: Monitor progress through analytics dashboard

#### About Section
Details the technical advantages:
- **Adaptive Learning**: Machine learning models learn from user performance patterns
- **Context-Aware AI**: GPT-4 integration with curriculum-specific knowledge
- **Local Time Estimation**: LNRIT model for personalized task duration prediction

---

### 2. Authentication Flow

**New User Registration:**
```
Sign Up → Email Verification → User Agreement Consent → Onboarding Flow
```

**User Agreement Highlights:**
- Data processing consent for personalization
- Anonymous analytics for AI model improvement
- GDPR-compliant data handling

**Existing User Login:**
- Email/password authentication
- JWT token-based session management (httpOnly cookies)
- Automatic session refresh

---

### 3. Onboarding Process

#### Step 1: Timezone Configuration
- Auto-detection via browser API with manual override
- Used for: notification scheduling, calendar displays, exam timing

#### Step 2: Education System Selection

**Supported Systems:**

| System | Programs | Grade Levels | Grading Scale |
|--------|----------|--------------|---------------|
| **IB** | IBDP, IBCP | Year 11-12 (Pre-IB), Year 12-13 (IB1-IB2) | 1-7 (7 highest) |
| **A-Level** | A-Level | Year 12-13 (Lower/Upper Sixth) | A* to U |
| **American** | Standard, AP, Honors | Grades 9-12 | A+ to F |

#### Step 3: Subject Configuration

**Option A: Manual Entry**
- Curated subject lists per education system (65 A-Level subjects, 50+ IB subjects)
- Subject customization: name, level (HL/SL), current grade, target grade, color
- Category assignment (Sciences, Mathematics, Languages, Humanities, Arts)

**Option B: Google Classroom Integration** (Recommended)
- **API-based import** (API key authentication)
- Automatically imports:
  - Course names and sections
  - Enrolled teachers
  - Posted assignments with due dates
  - Exam announcements
- **Enhanced AI Context**: Access to classroom presentations, teacher notes, and course materials for more relevant task generation

#### Step 4: Priority Coefficient Calculation

**Formula:**
```
Priority Coefficient = Base Value + (Normalized Grade Gap × Scaling Factor)

Where:
- Base Value = 1.0
- Normalized Grade Gap = (Target Grade - Current Grade) / Max Grade
- Scaling Factor = 2.0
- Range: 0.5× to 3.0×
```

**Example:**
```
IB HL Mathematics
Current Grade: 5/7
Target Grade: 7/7
Grade Gap: (7-5)/7 = 0.286
Coefficient: 1.0 + (0.286 × 2.0) = 1.57×
```

The coefficient is **auto-calculated** but **manually adjustable** via the Subjects page.

#### Step 5: Busy Hours Configuration

**Table-based input** (7 days × 24 hours):
- Visual time grid with click-to-toggle selection
- Recurring patterns (e.g., "Weekday mornings 9-12")
- One-time blocks (e.g., "Tuesday 14:00-16:00 doctor appointment")
- **Purpose**: Prevents study session scheduling conflicts

---

### 4. Dashboard (Main Hub)

**Key Metrics Display:**

| Metric | Description | Visualization |
|--------|-------------|---------------|
| **Total Hours This Week** | Sum of completed study session durations | Large number with week-over-week comparison |
| **Study Goal Progress** | Percentage toward weekly hour target | Circular progress indicator |
| **Total Sessions** | Count of completed study sessions | Badge with trend arrow |
| **Avg Session Duration** | Mean session length in minutes | Formatted time display |
| **Current Streak** | Consecutive days studied | Flame icon with count |

**Today's Schedule Widget:**
- Displays: upcoming study sessions, exams, assignment deadlines
- Color-coded by subject
- One-click "Start Session" buttons

**Subject Priority List:**
- Ranked by priority coefficient (highest first)
- Shows: subject name, level, current vs. target grade, coefficient value
- Inline editing for coefficient adjustment

**Weekly Progress Chart:**
- Bar graph: study hours per day (Mon-Sun)
- Overlay: goal line and completion percentage
- Interactive tooltips with session breakdowns

**Quick Actions:**
- Add Exam button (opens calendar modal)
- Start Study Session (opens technique selector)
- Generate Task (quick AI task creation)

---

### 5. Subjects Management

**Subject Card Grid Display:**

Each subject card shows:
- **Color-coded border** (user-customizable)
- **Subject name** and level badge (HL/SL/AP/Standard)
- **Current grade** with subject color background
- **Target grade** with green background
- **Priority coefficient** (inline editable number input with ±0.1 step)
- **Category icon** (Science, Math, Language, etc.)

**Actions:**
- **View Details Modal**: Full subject statistics, study time distribution, recent tasks
- **Edit**: Update name, level, grades, color, category
- **Delete**: Remove subject (with cascade delete of associated exams/sessions)
- **Add Subject**: Multi-step modal with validation

**Subject Statistics (in View Details):**
- Total study time for subject
- Task completion rate (% of tasks solved correctly)
- Average task difficulty attempted
- Last studied timestamp
- Upcoming exams count

---

### 6. Study Timer Section

**Study Technique Selection:**

| Technique | Focus Time | Break Time | Description |
|-----------|-----------|------------|-------------|
| **Pomodoro** | 25 min | 5 min | Classic productivity technique; long break (15 min) every 4 cycles |
| **Deep Work** | 90 min | 20 min | Extended focus for complex topics |
| **Timeboxing** | Custom | Custom | User-defined intervals |
| **Custom** | User-set | User-set | Fully customizable parameters |

**Timer Interface:**
- **Large circular timer** with animated progress ring
- **Session controls**: Start, Pause, Stop, Reset
- **Session info**: Current technique, focus/break mode indicator
- **Distraction-free mode**: Hides navigation (toggle)

**AI Task Generation Modal:**

**Input Parameters:**
1. **Subject**: Dropdown of user's subjects
2. **Topic**: Free-text or suggestions from syllabus
3. **Difficulty**: Easy, Medium, Hard (affects task complexity and marking criteria)
4. **Task Type**: Multiple choice, short answer, essay, calculation problem

**Task Display:**
- Markdown-rendered problem statement with LaTeX math support
- Syntax-highlighted code blocks (for CS/programming subjects)
- Image support for diagrams/graphs
- Input area for user's solution attempt

**Solution Features:**
- **Show Answer**: Reveals correct answer with one click
- **Show Solution**: Displays step-by-step solution with reasoning chain (powered by GPT-o1-mini)
- **Solution quality**: Educational explanations, not just final answers
- **Self-grading**: User marks their own attempt, system records result

**Session Analytics Tracking:**
For each completed task, the system records:
- Subject and topic
- Difficulty level
- Time to complete (for LNRIT model training)
- Correctness (correct/incorrect/partial)
- Solution requested (Y/N)
- User's self-reported confidence level

**LNRIT Time Estimation Model:**
- Runs **locally on the backend** (privacy-preserving)
- Inputs: User ID, subject ID, topic, difficulty, historical completion times
- Output: Estimated minutes to complete similar tasks
- Updates: Continuously learns from new session data
- **Use case**: Optimizes task quantity in exam preparation schedules

---

### 7. Preparation & Exam Calendar

**Calendar View:**
- **Monthly grid** with navigation (prev/next month, jump to today)
- **Date cells** show:
  - Exam badges (red with exam type: Paper 1, Paper 2, IA, etc.)
  - Assignment deadlines (orange)
  - Scheduled study sessions (blue)
- **Click date** to view day details or add exam

**Add Exam Modal:**

**Required Fields:**
1. **Subject**: Dropdown selection
2. **Exam Date**: Date picker (dd/mm/yyyy format with auto-formatting)
3. **Start Time**: HTML5 time input (HH:MM)
4. **Finish Time**: HTML5 time input (HH:MM)
5. **Exam Type**: Dropdown
   - Paper 1, Paper 2, Paper 3, Paper 4
   - Sections (I, II for American exams)
   - Internal Assessment (IA)
   - Extended Essay
   - Coursework, NEA (Non-Exam Assessment)
   - Practical/Performance Assessment
   - TOK Essay/Presentation
   - Mock Exam, Final Exam

**Optional Fields:**
6. **Units Covered**: Up to 5 text inputs (e.g., "Calculus", "Organic Chemistry", "WWI 1914-1918")

**Exam Study Plan Generation:**

Upon exam creation, the system:

1. **Analyzes exam scope**:
   - Parses units covered
   - Identifies syllabus topics (from education system database)
   - Considers user's grade level

2. **Calculates available study time**:
   - Days until exam × available hours per day (from busy hours)
   - Subtracts existing commitments (other exams, assignments)

3. **Generates task distribution plan**:
   - Total estimated tasks = (Available hours ÷ Avg task completion time)
   - Task allocation per topic = (Topic weight × Total tasks)
   - Difficulty progression: 40% easy, 40% medium, 20% hard (early days skew easier)

4. **Schedules study sessions**:
   - Creates calendar entries for each study block
   - Distributes across days (evenly or with user preference curve)
   - Ensures sessions don't conflict with busy hours
   - Reserves last 2 days for review tasks

**Day View (Click on Calendar Date):**

Shows chronological timetable with:
- **Busy hours** (gray, read-only)
- **Scheduled study sessions** (blue, shows subject, topic, estimated tasks)
  - Click to view session details
  - "Start Session" button (opens Study Timer with pre-loaded tasks)
- **Exams** (red, shows exam type, time, countdown)
- **Assignments** (orange, shows subject, deadline)

**Exam Statistics Card:**
- **Total Exams**: Count of all scheduled exams
- **Upcoming Exams**: Exams in next 30 days
- **Subjects with Exams**: Unique subject count with pending exams
- **Next Exam Countdown**: Days/hours until nearest exam

---

### 8. AI Assistant

**Integration Points:**
- **Persistent chat widget** (bottom-right corner, all pages)
- **Contextual help bubbles** (question mark icons near complex features)
- **Onboarding guidance** (step-by-step tutorial mode)

**Capabilities:**

**1. Natural Language Interface Control:**
```
User: "Add an exam for HL Mathematics on December 15th at 9:00 AM for Paper 2"
Assistant: [Executes ExamsService.create(...)]
          "I've scheduled your HL Mathematics Paper 2 exam for December 15th at 9:00 AM.
          Would you like me to create a study plan for this exam?"
```

**2. Conversational Task Generation:**
```
User: "Give me a hard calculus problem on integration by parts"
Assistant: [Generates task via GPT-4]
          [Displays problem in embedded card with "Show Solution" button]
```

**3. Progress Insights:**
```
User: "How am I doing in Chemistry this week?"
Assistant: "This week you've studied Chemistry for 4.5 hours across 3 sessions.
          You've completed 12 tasks with an 83% success rate.
          Your most challenging topic is Organic Mechanisms (60% success).
          Shall I generate some practice problems for this topic?"
```

**4. Navigation & Feature Discovery:**
```
User: "How do I change my study goal?"
Assistant: "You can update your weekly study hour goal in Settings > Preferences.
          [Click here to go there]. You can also adjust it by clicking the goal
          widget on the Dashboard."
```

**Technical Implementation:**
- **Model**: GPT-4 Turbo with function calling
- **Context Window**: Last 10 messages + user profile summary + recent session data
- **Functions Available**:
  - `create_exam()`, `create_study_session()`, `generate_task()`
  - `get_subject_stats()`, `get_weekly_progress()`, `get_next_exam()`
  - `navigate_to(page)`
- **Streaming Responses**: Real-time token-by-token display

---

### 9. Analytics Dashboard

**Overview Metrics (Top Cards):**

1. **Total Study Time**
   - All-time cumulative hours
   - Growth percentage vs. previous period

2. **Current Streak**
   - Consecutive days with ≥1 completed session
   - Longest streak record
   - Flame icon visual

3. **This Week's Hours**
   - 7-day rolling total
   - Progress bar toward weekly goal
   - Percentage complete

4. **Average Session**
   - Mean duration of completed sessions
   - Trend arrow (increasing/decreasing)

**Weekly Activity Chart:**
- **Bar graph**: Hours per day (Mon-Sun)
- **Hover tooltips**: Session count, subjects studied
- **Goal line overlay**: Visual target indicator

**Subject Time Distribution:**
- **Donut chart**: Hours per subject
- **Color-coded** by subject custom color
- **Percentage labels**: Relative time allocation
- **Interactive legend**: Click to filter view

**Task Performance Analysis:**
- **Success rate line graph**: % correct over time (last 30 days)
- **Difficulty breakdown**: Tasks attempted by difficulty level
- **Subject comparison**: Success rates across subjects (bar chart)

**Recent Achievements:**

**Badge System:**

| Badge | Criteria | Icon |
|-------|----------|------|
| **First Steps** | Complete first study session | 🎯 |
| **Dedicated Learner** | 7-day streak | 🔥 |
| **Marathon Runner** | 10 hours in one week | 🏃 |
| **Night Owl** | Study session after 10 PM | 🦉 |
| **Early Bird** | Study session before 7 AM | 🐦 |
| **Century Club** | 100 total tasks completed | 💯 |
| **Perfect Week** | Meet goal 7 days straight | ⭐ |
| **Focused Mind** | Complete 90-min deep work session | 🧠 |

**Achievement Display:**
- **Grid of unlocked badges** with date earned
- **Progress toward locked badges** (e.g., "6/7 days toward Dedicated Learner")
- **Celebratory animation** on unlock (confetti effect)

**Export Features:**
- **CSV Download**: Raw session data for external analysis
- **PDF Report**: Weekly/monthly summary with charts
- **Share Progress**: Generate shareable image (privacy-safe, no PII)

---

### 10. Notifications Center

**Notification Types:**

**1. Exam Study Reminders:**
- **Trigger**: 7 days, 3 days, 1 day before exam
- **Content**: "Your [Subject] [Exam Type] is in [X] days. You have [Y] study sessions scheduled."
- **Action**: Link to exam in calendar

**2. Task Deadlines (Google Classroom Sync):**
- **Trigger**: Assignment due in 24 hours with no completion record
- **Content**: "Assignment '[Name]' for [Subject] is due tomorrow at [Time]"
- **Action**: Link to assignment details

**3. Study Session Reminders:**
- **Trigger**: 15 minutes before scheduled session
- **Content**: "Your [Subject] study session starts in 15 minutes. Topic: [Topic]"
- **Action**: "Start Now" button

**4. Achievement Unlocks:**
- **Trigger**: Badge criteria met
- **Content**: "🎉 You've unlocked '[Badge Name]'! [Description]"
- **Action**: Link to Analytics page

**5. Streak Alerts:**
- **Trigger**: End of day with no study activity (if streak ≥3 days)
- **Content**: "⚠️ Don't break your [X]-day streak! Start a quick session now."
- **Action**: Quick session start button

**Notification Settings:**
- **Per-type toggles**: Enable/disable each notification category
- **Quiet hours**: No notifications during specified hours
- **Delivery method**: In-app, email, browser push (if supported)

**Notification UI:**
- **Badge count** on bell icon in header
- **Dropdown panel** with last 10 notifications
- **Mark as read** (individual or bulk)
- **Notification history** (last 30 days, paginated)

---

## Technical Architecture

### Frontend Stack

**Framework & Core Libraries:**
```json
{
  "next": "16.0.1",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "typescript": "^5.3.3"
}
```

**Key Technologies:**
- **Next.js 16** with Turbopack (Rust-based bundler for faster builds)
- **React 19** with Server Components and Streaming SSR
- **TypeScript 5.3** for type safety across entire codebase

**Styling & UI:**
- **Tailwind CSS 3.4** for utility-first styling
- **PostCSS** for CSS processing
- **Custom CSS modules** for complex animations
- **Lucide React** for icon library (tree-shakeable)

**State Management & Data Fetching:**
- **React Hooks** (useState, useEffect, useCallback, useMemo)
- **Fetch API** with custom `ApiClient` wrapper
- **JWT token management** via httpOnly cookies
- **Client-side caching** with React Query patterns

**Form Handling & Validation:**
- **Controlled components** with real-time validation
- **Custom date formatting** (dd/mm/yyyy with auto-slash insertion)
- **HTML5 input types** (time, date, email) for native validation

**Routing:**
- **Next.js App Router** (React Server Components)
- **Dynamic routes**: `/dashboard/[page]`
- **Middleware** for auth route protection

**Build & Development:**
- **Turbopack dev server** (port 4000)
- **Hot Module Replacement** (HMR) for instant updates
- **Production build**: Static optimization + SSR

---

### Backend Stack

**Framework:**
```python
fastapi = "^0.104.1"
uvicorn[standard] = "^0.24.0"
```

**Core Components:**
- **FastAPI** - High-performance async API framework
- **Uvicorn** - ASGI server with auto-reload
- **Pydantic V2** - Data validation and serialization
- **SQLAlchemy 2.0** - ORM with async support

**Database:**
- **PostgreSQL 15+** - Primary data store
- **psycopg2-binary** - PostgreSQL adapter
- **Connection pooling** (max 20 connections, 30s idle timeout)

**Database Schema (Key Tables):**

**users**
```sql
id UUID PRIMARY KEY
email VARCHAR(255) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL
timezone VARCHAR(50)
education_system VARCHAR(50)
grade_level VARCHAR(50)
created_at TIMESTAMP
```

**subjects**
```sql
id UUID PRIMARY KEY
user_id UUID FOREIGN KEY → users(id) ON DELETE CASCADE
name VARCHAR(255) NOT NULL
level VARCHAR(50) (HL/SL/AP/Standard)
category VARCHAR(100)
current_grade VARCHAR(10)
target_grade VARCHAR(10)
color VARCHAR(7) (hex color code)
priority_coefficient DECIMAL(3,2) DEFAULT 1.00
```

**exams**
```sql
id UUID PRIMARY KEY
user_id UUID FOREIGN KEY → users(id) ON DELETE CASCADE
subject_id UUID FOREIGN KEY → subjects(id) ON DELETE CASCADE
exam_date DATE NOT NULL
start_time TIME NULL
finish_time TIME NULL
exam_type VARCHAR(100) NOT NULL
units JSON (array of strings, max 5)
created_at TIMESTAMP
```

**study_sessions**
```sql
id UUID PRIMARY KEY
user_id UUID FOREIGN KEY → users(id) ON DELETE CASCADE
subject_id UUID FOREIGN KEY → subjects(id)
start_time TIMESTAMP NOT NULL
end_time TIMESTAMP
duration_minutes INTEGER
technique VARCHAR(50) (pomodoro/deep_work/etc)
tasks_completed INTEGER DEFAULT 0
tasks_correct INTEGER DEFAULT 0
```

**tasks**
```sql
id UUID PRIMARY KEY
session_id UUID FOREIGN KEY → study_sessions(id) ON DELETE CASCADE
subject_id UUID FOREIGN KEY → subjects(id)
topic VARCHAR(255)
difficulty VARCHAR(20) (easy/medium/hard)
problem_text TEXT
solution_text TEXT
user_answer TEXT
is_correct BOOLEAN
time_to_complete INTEGER (seconds)
created_at TIMESTAMP
```

**Authentication & Security:**
- **JWT tokens** (HS256 algorithm)
- **bcrypt** for password hashing (12 rounds)
- **CORS middleware** with origin whitelisting
- **Rate limiting** (100 req/min per IP)
- **SQL injection protection** via parameterized queries

**File Structure:**
```
backend/
├── app/
│   ├── main.py                 # FastAPI app initialization
│   ├── core/
│   │   ├── database.py         # DB connection & session management
│   │   ├── security.py         # JWT, password hashing
│   │   └── config.py           # Environment variables
│   ├── models/                 # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── subject.py
│   │   ├── exam.py
│   │   └── session.py
│   ├── schemas/                # Pydantic validation schemas
│   │   ├── user.py
│   │   ├── exam.py
│   │   └── session.py
│   ├── routers/                # API endpoint handlers
│   │   ├── auth.py             # /auth/login, /auth/register
│   │   ├── users.py            # /users/*
│   │   ├── subjects.py         # /subjects/*
│   │   ├── exams.py            # /exams/*
│   │   └── sessions.py         # /sessions/*
│   └── services/               # Business logic layer
│       ├── ai_service.py       # OpenAI API integration
│       ├── lnrit_service.py    # Local time estimation model
│       └── classroom_service.py # Google Classroom API
└── requirements.txt
```

---

### AI Integration

**Task Generation Pipeline:**

**1. GPT-4 Turbo (Task Creation):**
```python
# Endpoint: /api/generate-tasks
model = "gpt-4-turbo-preview"
max_tokens = 2000
temperature = 0.7

system_prompt = f"""
You are an expert {education_system} {subject} tutor for {grade_level} students.
Generate a {difficulty} level practice problem on the topic: {topic}.

Requirements:
- Align with {education_system} syllabus
- Use appropriate notation and terminology for {grade_level}
- Include clear problem statement
- For calculations: show units and required precision
- For essays: provide rubric criteria
"""

response = openai.chat.completions.create(
    model="gpt-4-turbo-preview",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Generate a {difficulty} {task_type} task."}
    ],
    temperature=0.7
)
```

**2. GPT-o1-mini (Solution Generation):**
```python
# Endpoint: /api/generate-solution
model = "o1-mini"
max_completion_tokens = 10000

solution_prompt = f"""
Provide a detailed, step-by-step solution to this problem:

{problem_text}

Requirements:
- Show all working and reasoning
- Explain each step clearly
- Highlight key concepts used
- Include final answer with units
- Educational tone appropriate for {grade_level}
"""

solution_stream = openai.chat.completions.create(
    model="o1-mini",
    messages=[{"role": "user", "content": solution_prompt}],
    stream=True,  # Real-time streaming to frontend
    max_completion_tokens=10000
)
```

**3. LNRIT Time Estimation Model:**

**Architecture:**
- **Type**: LSTM-based regression model
- **Framework**: PyTorch 2.0
- **Deployment**: Local inference (CPU)
- **Input features** (vector dimension = 128):
  - User ID (embedded)
  - Subject ID (embedded)
  - Topic (text embedding via DistilBERT)
  - Difficulty (one-hot encoded)
  - User's historical avg time for subject
  - User's historical avg time for difficulty level
  - Time of day (cyclical encoding)
  - Day of week (one-hot)

**Training:**
- **Dataset**: User session task completion records (updated nightly)
- **Loss function**: Mean Squared Error (MSE)
- **Optimizer**: Adam (lr=0.001)
- **Batch size**: 32
- **Training frequency**: Weekly retraining with new data
- **Validation split**: 80/20 train/validation

**Inference:**
```python
# Endpoint: /api/estimate-time
def estimate_task_time(user_id, subject_id, topic, difficulty):
    input_tensor = prepare_features(user_id, subject_id, topic, difficulty)
    with torch.no_grad():
        prediction = lnrit_model(input_tensor)
    return prediction.item()  # Returns estimated minutes
```

**Model Performance:**
- **Mean Absolute Error**: ±3.2 minutes
- **R² Score**: 0.78 (good predictive power)
- **Cold start**: Falls back to subject averages for new users

---

### API Architecture

**Base URL:**
- Development: `http://localhost:8000`
- Production: `https://api.sshours.cfd`

**Authentication Header:**
```
Authorization: Bearer {jwt_token}
```

**Key Endpoints:**

**Auth:**
- `POST /auth/register` - Create user account
- `POST /auth/login` - Get JWT token
- `GET /auth/me` - Get current user info
- `POST /auth/logout` - Invalidate token

**Subjects:**
- `GET /subjects` - List user's subjects
- `POST /subjects` - Create subject
- `PUT /subjects/{id}` - Update subject (including priority coefficient)
- `DELETE /subjects/{id}` - Remove subject

**Exams:**
- `GET /exams` - List all exams
- `GET /exams/by-date?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` - Date range filter
- `POST /exams` - Create exam (with start_time, finish_time, units)
- `PUT /exams/{id}` - Update exam
- `DELETE /exams/{id}` - Remove exam

**Study Sessions:**
- `POST /sessions` - Start session
- `PUT /sessions/{id}` - End session (updates duration, tasks_completed)
- `GET /sessions/weekly-stats` - Current week aggregated stats
- `GET /sessions?limit=20` - Recent sessions list

**AI:**
- `POST /ai/generate-task` - Stream task generation
- `POST /ai/generate-solution` - Stream solution with reasoning
- `POST /ai/estimate-time` - LNRIT time prediction

**Analytics:**
- `GET /analytics/overview` - All-time totals
- `GET /analytics/weekly` - Last 7 days breakdown
- `GET /analytics/achievements` - Unlocked badges

**Error Handling:**
```json
{
  "detail": "User not authenticated",
  "status": 401
}
```

**Rate Limiting:**
```
HTTP 429 Too Many Requests
Retry-After: 60
```

---

### Google Classroom Integration

**Authentication Flow:**
1. User provides Google Classroom API key in Settings
2. Backend validates API key via test request
3. API key stored encrypted in database (AES-256)

**Sync Process:**
```python
# Endpoint: POST /integrations/google-classroom/sync

# Step 1: Fetch courses
courses = classroom_service.courses().list(
    pageSize=100
).execute()

# Step 2: For each course, create subject if not exists
for course in courses['courses']:
    subject = Subject(
        user_id=user.id,
        name=course['name'],
        # Auto-detect level from course name patterns
        level=detect_level(course['name']),
        color=generate_color_from_hash(course['id'])
    )
    db.add(subject)

# Step 3: Fetch course assignments
for subject in subjects:
    assignments = classroom_service.courses().courseWork().list(
        courseId=subject.classroom_id
    ).execute()

    for assignment in assignments['courseWork']:
        if assignment['workType'] == 'ASSIGNMENT':
            # Create AIAssignment record
            db_assignment = AIAssignment(
                subject_id=subject.id,
                title=assignment['title'],
                description=assignment['description'],
                due_date=parse_due_date(assignment['dueDate']),
                created_at=assignment['creationTime']
            )
            db.add(db_assignment)

# Step 4: Auto-create exams from "Exam" tagged assignments
# (looks for keywords: exam, test, quiz, assessment in title)
```

**Sync Frequency:**
- **Manual**: User clicks "Sync Now" button
- **Automatic**: Daily at 6 AM user's local time
- **Incremental**: Only fetches updates since last sync (timestamp stored)

---

### Performance Optimizations

**Frontend:**
- **Code splitting**: Dynamic imports for heavy components
- **Image optimization**: Next.js Image component with lazy loading
- **Memoization**: React.memo for expensive renders
- **Debouncing**: Search inputs, inline edits (300ms delay)
- **Virtual scrolling**: Subject lists, calendar events (react-window)

**Backend:**
- **Database indexing**:
  - `CREATE INDEX idx_exams_user_date ON exams(user_id, exam_date);`
  - `CREATE INDEX idx_sessions_user_start ON study_sessions(user_id, start_time);`
- **Query optimization**:
  - Eager loading with `joinedload()` to prevent N+1 queries
  - Pagination (limit 50 items per page)
- **Caching**:
  - Redis for frequently accessed data (user profiles, subject lists)
  - TTL: 5 minutes for mutable data, 1 hour for static curriculum data
- **Async I/O**:
  - All database queries use `asyncio`
  - OpenAI API calls non-blocking

**API Response Times:**
- **GET /subjects**: ~50ms
- **POST /exams**: ~120ms
- **AI task generation (streaming)**: First token in ~800ms, full task in ~4s
- **LNRIT prediction**: ~15ms

---

### Deployment & Infrastructure

**Frontend Hosting:**
- **Platform**: Vercel / Netlify (Serverless Next.js)
- **CDN**: Cloudflare (global edge caching)
- **SSL**: Auto-provisioned Let's Encrypt certificates
- **Domain**: `sshours.cfd`

**Backend Hosting:**
- **Platform**: DigitalOcean App Platform / AWS EC2
- **Container**: Docker (uvicorn workers = CPU cores)
- **Reverse Proxy**: Nginx (HTTPS termination, load balancing)
- **Domain**: `api.sshours.cfd`

**Database:**
- **Provider**: DigitalOcean Managed PostgreSQL
- **Instance**: 2 vCPUs, 4GB RAM, 50GB SSD
- **Backups**: Daily automated snapshots (7-day retention)
- **High Availability**: Standby replica for failover

**CI/CD Pipeline:**
```yaml
# GitHub Actions workflow
name: Deploy
on:
  push:
    branches: [main]

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}

  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: docker build -t sshours-api ./backend
      - run: docker push registry.digitalocean.com/sshours/api:latest
      - run: doctl apps update $APP_ID --image registry.digitalocean.com/sshours/api:latest
```

**Monitoring:**
- **Error tracking**: Sentry (frontend + backend)
- **Performance monitoring**: Vercel Analytics, Datadog
- **Uptime monitoring**: UptimeRobot (5-minute checks)
- **Logging**: Structured JSON logs to CloudWatch/Papertrail

---

### Security & Privacy

**Data Protection:**
- **Passwords**: bcrypt hashing (cost factor 12)
- **API keys**: AES-256 encryption at rest
- **Database**: Encrypted storage volumes
- **Backups**: AES-256 encrypted archives

**GDPR Compliance:**
- **Data minimization**: Only collect necessary fields
- **Right to erasure**: User account deletion cascade deletes all data
- **Data portability**: Export all user data as JSON
- **Consent**: Explicit opt-in for analytics, AI training data usage

**API Security:**
- **HTTPS only**: HTTP requests redirected
- **CORS**: Whitelist frontend origin
- **Rate limiting**: 100 requests/minute per IP
- **SQL injection**: Parameterized queries via SQLAlchemy
- **XSS protection**: React auto-escaping, CSP headers

---

## Future Enhancements

**Planned Features (Roadmap):**

**Q1 2025:**
- Mobile apps (React Native - iOS & Android)
- Spaced repetition algorithm (Anki-style flashcards from completed tasks)
- Peer study rooms (real-time collaborative sessions with video chat)

**Q2 2025:**
- Teacher portal (invite students, assign tasks, view class analytics)
- Gamification expansion (leaderboards, team challenges, XP system)
- Voice input for AI assistant (speech-to-text task creation)

**Q3 2025:**
- Offline mode (PWA with service workers, local-first sync)
- Browser extension (quick task capture from any webpage)
- Integration with Notion, Trello, Google Calendar (bidirectional sync)

**Q4 2025:**
- Advanced AI tutor (multi-turn dialogue, Socratic method questioning)
- Predictive grade forecasting (ML model predicts final grade from current performance)
- Virtual study groups matching (AI-powered study partner recommendations)

---

## Conclusion

Smart Study Hours represents a comprehensive, AI-powered solution to the challenges of modern academic study. By combining intelligent automation, personalized learning paths, and data-driven insights, the platform empowers students to study more efficiently and effectively.

The system's technical architecture ensures scalability, performance, and reliability while maintaining a focus on user experience through thoughtful design and seamless integrations. With continuous improvements driven by user feedback and advancing AI capabilities, Smart Study Hours is positioned to become an essential tool for students across multiple educational systems worldwide.

---

**Document Version:** 1.0
**Last Updated:** November 10, 2025
**Authors:** Smart Study Hours Development Team
**Contact:** support@sshours.cfd
