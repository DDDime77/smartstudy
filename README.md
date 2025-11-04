# StudySmart AI - Intelligent Study Planner

An AI-powered study planning application that adapts to student behavior, optimizes study schedules, and personalizes learning experiences. Built for the RIT Dubai Engineering Competition.

## 🏆 Project Overview

StudySmart AI helps students maximize their learning efficiency through:
- **Adaptive Learning**: ML algorithms that learn study patterns and predict task durations
- **Smart Prioritization**: Deadline-aware task scheduling with difficulty and grade weighting
- **Personalized Scheduling**: Learns optimal study times from session performance
- **Spaced Repetition**: Evidence-based exam preparation scheduling
- **Progress Tracking**: Real-time analytics showing AI improvement over time

**Competition Deadline**: November 10, 2025 (6 days remaining)

## 🎨 Design Philosophy

- **Minimalistic**: Clean black and white color scheme with subtle gradients
- **Modern**: Glassmorphism effects, smooth animations, micro-interactions
- **Responsive**: Mobile-first design using react-bits/MCP patterns
- **User-Focused**: 5-step onboarding that captures essential data upfront

## 🚀 Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: Custom react-bits inspired design system
- **State**: React hooks with controlled components
- **HTTP Client**: Axios

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **ORM**: SQLAlchemy
- **Database**: PostgreSQL 14+
- **Authentication**: JWT tokens (HS256)
- **Validation**: Pydantic schemas
- **Server**: Uvicorn

### Database
- **PostgreSQL** with 6 tables (UUID primary keys)
- Tables: users, user_profiles, subjects, tasks, study_sessions, availability

## ✅ Implemented Features

### 1. Authentication System
- Email/password registration and login
- JWT token-based sessions (30-minute expiry)
- Secure password hashing
- Token validation on protected routes

### 2. Five-Step Onboarding
**Step 1: Timezone Selection**
- 400+ timezones with smart search/filtering
- Grouped by region (Americas, Europe, Asia, etc.)

**Step 2: Education System**
- IB Diploma Programme
- A-Level (British)
- American High School
- Program variants (IB: Standard/Career-related, A-Level: AS/Full A-Level)

**Step 3: Import Method**
- Manual entry (implemented)
- Google Classroom import (placeholder)
- CSV upload (placeholder)

**Step 4: Subjects & Grades**
- Subject selection from education-specific catalogs
- Current grade and target grade input
- Subject level selection (Standard/Higher for IB, AS/A2 for A-Level)
- Visual color coding with glass-morphism cards
- Add/remove subjects dynamically

**Step 5: Weekly Availability**
- Visual 7-day calendar (Monday-Sunday)
- 8 time slots per day (6am-10pm in 2-hour blocks)
- Click-to-toggle selection
- Quick presets: Weekday Afternoons, Evenings, Weekends, Clear All
- Real-time total hours calculation

### 3. Database Persistence
- User profiles saved to PostgreSQL
- Subjects linked to users with grades and targets
- Availability stored as time slots (recurring weekly schedule)
- Complete onboarding data persisted on submission

### 4. UI Components
- LoginModal: Registration and login with validation
- OnboardingModal: Multi-step wizard with progress indicator
- GlassCard: Glassmorphism effect cards
- Button: Primary/secondary/ghost variants
- AnimatedText: Fade, slide, typewriter animations
- GridBackground: Animated gradient orbs

## 📁 Project Structure

```
ai-study-planner/
├── app/                           # Next.js app directory
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
│
├── components/                    # React components
│   ├── LoginModal.tsx            # Authentication UI
│   ├── OnboardingModal.tsx       # 5-step wizard
│   └── onboarding/               # Onboarding steps
│       ├── TimezoneStep.tsx
│       ├── EducationSystemStep.tsx
│       ├── ImportMethodStep.tsx
│       ├── SubjectsStep.tsx
│       └── AvailabilityStep.tsx
│
├── lib/                          # Frontend utilities
│   ├── api/
│   │   ├── client.ts            # Axios wrapper
│   │   ├── auth.ts              # Auth API calls
│   │   └── onboarding.ts        # Onboarding API calls
│   └── education-config.ts       # Subject catalogs
│
├── backend/                      # Python/FastAPI backend
│   ├── app/
│   │   ├── models/              # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── profile.py
│   │   │   ├── subject.py
│   │   │   ├── task.py
│   │   │   ├── study_session.py
│   │   │   └── availability.py
│   │   ├── routers/             # API endpoints
│   │   │   ├── auth.py          # /auth/register, /auth/login
│   │   │   └── onboarding.py    # /onboarding/complete, /onboarding/subjects
│   │   ├── schemas/             # Pydantic validation
│   │   ├── core/                # Config, database, security
│   │   └── main.py              # FastAPI app
│   ├── .env                     # Environment variables
│   ├── requirements.txt         # Python dependencies
│   ├── run.py                   # Dev server entry point
│   └── init_db.py              # Database initialization
│
├── .env.local                    # Frontend environment variables
├── package.json                  # Node.js dependencies
├── SETUP_FOR_TEAM.md            # Comprehensive setup guide
├── ONBOARDING_AND_DATABASE_STATUS.md  # Project status & roadmap
└── AI_STUDY_PLANNER_PROJECT_PLAN.md   # Original competition plan
```

## 🛠️ Setup Instructions

### Prerequisites
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Python** 3.11+ ([Download](https://www.python.org/downloads/))
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/download/))

### Quick Setup (5 minutes)

#### 1. Clone Repository
```bash
git clone https://github.com/DDDime77/smartstudy.git
cd smartstudy
```

#### 2. Setup PostgreSQL Database
```bash
# Create database
psql -U postgres
CREATE DATABASE studysmart_db;
\q
```

#### 3. Setup Backend
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Initialize database tables
python3 init_db.py

# Start backend server (runs on http://localhost:4008)
python3 run.py
```

#### 4. Setup Frontend (new terminal)
```bash
cd ai-study-planner

# Install dependencies
npm install

# Start frontend (runs on http://localhost:4000)
npm run dev
```

#### 5. Test the Application
- Open browser: **http://localhost:4000**
- Click **"Get Started"**
- Register a new account
- Complete 5-step onboarding
- Verify data saved in PostgreSQL

### Environment Configuration

**Backend** (`backend/.env`):
```bash
DATABASE_URL=postgresql://YOUR_USERNAME@localhost:5432/studysmart_db
SECRET_KEY=pQ3OgxGAH1X5YJ8cJWlR1lCI2pMJbHl72wRFwh5HxCU
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
FRONTEND_URL=http://localhost:4000
```

**Frontend** (`.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:4008
```

## 📊 Database Schema

### Current Tables (6)

**users**
- id (UUID, PK), email, hashed_password, profile_completed, created_at

**user_profiles**
- id (UUID, PK), user_id (FK), timezone, education_system, education_program, study_goal

**subjects**
- id (UUID, PK), user_id (FK), name, level, category, current_grade, target_grade, color, archived

**tasks**
- id (UUID, PK), user_id (FK), subject_id (FK), title, description, due_date, priority, status

**study_sessions**
- id (UUID, PK), user_id (FK), subject_id (FK), task_id (FK), start_time, end_time, actual_minutes

**availability**
- id (UUID, PK), user_id (FK), day_of_week (0-6), start_time, end_time, recurring, specific_date

## 🔌 API Endpoints

### Authentication
- `POST /auth/register` - Create new account
- `POST /auth/login` - Login and receive JWT token

### Onboarding
- `POST /onboarding/complete` - Submit all onboarding data
- `GET /onboarding/profile` - Get user profile
- `GET /onboarding/subjects` - Get user's subjects
- `POST /onboarding/subjects` - Add new subject
- `DELETE /onboarding/subjects/{id}` - Remove subject

## 📚 Documentation

See comprehensive documentation files:

1. **SETUP_FOR_TEAM.md** - Full setup guide with troubleshooting
2. **ONBOARDING_AND_DATABASE_STATUS.md** - Project status, database schema, implementation options
3. **AI_STUDY_PLANNER_PROJECT_PLAN.md** - Original competition plan and AI algorithms

## 🎯 Project Status

### Completed (80%)
- ✅ Authentication system (JWT-based)
- ✅ 5-step onboarding flow
- ✅ 6 database tables with relationships
- ✅ Subject management (add/edit/delete)
- ✅ Weekly availability scheduling
- ✅ Education system support (IB, A-Level, American)
- ✅ Frontend UI with react-bits design
- ✅ Backend API with validation

### TODO for Competition (20%)
- 🔴 **Step 6: Exam Dates** (3-4 hours)
- 🔴 ML predictions table & logging (2 hours)
- 🔴 Duration prediction algorithm (4-6 hours)
- 🔴 Priority scoring algorithm (3-4 hours)
- 🔴 Demo dashboard with learning graphs (4-5 hours)
- 🔴 Demo data generation (1-2 hours)

**Estimated remaining work**: 17-23 hours (split across team = 6-8 hours each)

## 🏆 Competition Focus

### What Judges Care About
1. ✅ AI learns over time (show MAE decreasing)
2. ✅ Smart prioritization (deadline + difficulty + grades)
3. ✅ Personalized scheduling (learns best study times)
4. ✅ Spaced repetition for exams
5. ✅ Clean, professional UI

### What's Deprioritized
- OAuth integration (email/password works fine)
- Google Classroom import (manual entry sufficient)
- Advanced features beyond core AI

**Strategy**: Focus remaining 6 days on AI algorithms and demo preparation!

## 🔧 Common Issues

### "Database connection failed"
```bash
# Check PostgreSQL is running
brew services list  # Mac
# or
sudo systemctl status postgresql  # Linux

# Verify database exists
psql -U postgres -l
```

### "Port already in use"
```bash
# Kill process on port 4000
lsof -ti:4000 | xargs kill -9

# Or use different port
npm run dev -- -p 3000
```

### "Module not found"
```bash
rm -rf node_modules
npm install
```

## 📞 Team Collaboration

### Git Workflow
```bash
# Pull latest changes
git pull origin main

# Create feature branch
git checkout -b feature/exam-dates

# Commit changes
git add .
git commit -m "Add exam dates onboarding step"

# Push to GitHub
git push origin feature/exam-dates
```

### Task Division (Recommended)
- **Person A**: Backend (exam dates table, ML predictions)
- **Person B**: Frontend (exam dates UI step)
- **Person C**: ML algorithms (duration prediction, priority scoring)

## 🧪 Development Commands

```bash
# Frontend
npm run dev          # Development server (localhost:4000)
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint

# Backend
python3 run.py       # Development server (localhost:4008)
python3 init_db.py   # Initialize database
pip install -r requirements.txt  # Install dependencies

# Database
psql -U postgres -d studysmart_db  # Connect to database
```

## ⏱️ Time Estimates

- **Initial setup**: 15-20 minutes
- **Reading documentation**: 20-30 minutes
- **Team planning**: 30-60 minutes
- **Implementing next priority**: 3-4 hours
- **ML algorithms**: 10-15 hours
- **Demo preparation**: 2-3 hours

## ✅ Verification Checklist

After setup:
- [ ] Backend running on http://localhost:4008
- [ ] Frontend running on http://localhost:4000
- [ ] Can register new account
- [ ] Can log in
- [ ] Onboarding modal shows 5 steps
- [ ] Can complete all onboarding steps
- [ ] Data saves to PostgreSQL
- [ ] No console errors

## 📄 License

This project is built for the RIT Dubai Engineering Competition 2025.

---

**Competition Deadline**: November 10, 2025
**Current Status**: 80% Complete
**Team**: RIT Dubai Engineering Team
**Repository**: https://github.com/DDDime77/smartstudy.git

Built with ❤️ for intelligent, personalized learning.
