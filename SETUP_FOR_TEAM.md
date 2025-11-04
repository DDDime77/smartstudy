# AI Study Planner - Team Setup Guide

**Last Updated:** November 4, 2025
**Project Archive:** `ai-study-planner-20251104.zip`

---

## 📦 WHAT'S IN THIS ZIP

This archive contains the **complete source code** for the AI Study Planner project (excluding dependencies):

✅ Frontend (Next.js 16)
✅ Backend (FastAPI/Python)
✅ Database models (PostgreSQL)
✅ All onboarding components
✅ Configuration files
✅ Documentation (ONBOARDING_AND_DATABASE_STATUS.md)

**NOT included** (will be installed):
- `node_modules/` (npm packages)
- `venv/` (Python packages)
- `.next/` (build cache)

**File Size:** 119 KB (clean source code only)

---

## 🚀 SETUP INSTRUCTIONS

### **Prerequisites**

Ensure you have installed:
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Python** 3.11+ ([Download](https://www.python.org/downloads/))
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/download/))
- **Git** (optional, for version control)

---

### **Step 1: Extract the Archive**

```bash
unzip ai-study-planner-20251104.zip
cd ai-study-planner
```

---

### **Step 2: Setup PostgreSQL Database**

#### **Option A: Using psql Command Line**

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE studysmart_db;

# Exit psql
\q
```

#### **Option B: Using pgAdmin**
1. Open pgAdmin
2. Right-click "Databases" → Create → Database
3. Name: `studysmart_db`
4. Click "Save"

---

### **Step 3: Setup Backend (Python/FastAPI)**

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On Mac/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Initialize database tables
python3 init_db.py

# You should see:
# ✅ Database tables created successfully!
# Tables created:
#   - users
#   - user_profiles
#   - subjects
#   - tasks
#   - study_sessions
#   - availability
```

#### **Configure Backend Environment**

Edit `backend/.env` if needed:

```bash
# Database (update if your PostgreSQL credentials differ)
DATABASE_URL=postgresql://YOUR_USERNAME@localhost:5432/studysmart_db

# JWT Secret (already generated, don't change unless necessary)
SECRET_KEY=pQ3OgxGAH1X5YJ8cJWlR1lCI2pMJbHl72wRFwh5HxCU
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
FRONTEND_URL=http://localhost:4000
```

**Common PostgreSQL usernames:**
- Mac: `your_mac_username` (e.g., `skywalqr`)
- Windows: `postgres`
- Linux: `postgres` or your system username

#### **Start Backend Server**

```bash
# From backend/ directory, with venv activated
python3 run.py

# You should see:
# INFO:     Uvicorn running on http://0.0.0.0:4008 (Press CTRL+C to quit)
```

**Backend will run on:** `http://localhost:4008`

---

### **Step 4: Setup Frontend (Next.js/React)**

Open a **new terminal** (keep backend running):

```bash
# Navigate to project root
cd ai-study-planner

# Install dependencies
npm install

# This will take 2-3 minutes
# Downloads ~300MB of packages into node_modules/
```

#### **Configure Frontend Environment**

The `.env.local` file is already configured:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4008
```

No changes needed unless you changed backend port.

#### **Start Frontend Dev Server**

```bash
# From project root
npm run dev

# You should see:
# ▲ Next.js 16.0.1 (Turbopack)
# - Local:        http://localhost:4000
# ✓ Ready in 281ms
```

**Frontend will run on:** `http://localhost:4000`

---

### **Step 5: Test the Application**

1. Open browser: **http://localhost:4000**
2. Click **"Get Started"** button
3. Try to register a new account
4. Complete the onboarding flow (5 steps)
5. You should reach the "Setup complete!" message

---

## 🗂️ PROJECT STRUCTURE

```
ai-study-planner/
├── backend/                      # Python/FastAPI backend
│   ├── app/
│   │   ├── models/              # Database models (SQLAlchemy)
│   │   │   ├── user.py
│   │   │   ├── profile.py
│   │   │   ├── subject.py
│   │   │   ├── task.py
│   │   │   ├── study_session.py
│   │   │   └── availability.py  # NEW - just added
│   │   ├── routers/             # API endpoints
│   │   │   ├── auth.py          # /auth/register, /auth/login
│   │   │   └── onboarding.py    # /onboarding/complete
│   │   ├── schemas/             # Pydantic validation
│   │   ├── core/                # Config, database, security
│   │   └── main.py              # FastAPI app
│   ├── .env                     # Environment variables (EDIT THIS)
│   ├── requirements.txt         # Python dependencies
│   ├── run.py                   # Dev server entry point
│   └── init_db.py              # Database initialization
│
├── app/                         # Next.js app directory
│   ├── page.tsx                # Landing page
│   ├── layout.tsx              # Root layout
│   └── globals.css             # Global styles
│
├── components/                  # React components
│   ├── LoginModal.tsx          # Login/Register UI
│   ├── OnboardingModal.tsx     # 5-step onboarding
│   └── onboarding/             # Onboarding steps
│       ├── TimezoneStep.tsx
│       ├── EducationSystemStep.tsx
│       ├── ImportMethodStep.tsx
│       ├── SubjectsStep.tsx
│       └── AvailabilityStep.tsx # NEW - just added
│
├── lib/                         # Utilities and config
│   ├── api/                    # API client functions
│   │   ├── client.ts          # Axios wrapper
│   │   ├── auth.ts            # Auth API calls
│   │   └── onboarding.ts      # Onboarding API calls
│   └── education-config.ts     # Subject lists (IB/A-Level/American)
│
├── .env.local                   # Frontend environment variables
├── package.json                 # Node.js dependencies
└── ONBOARDING_AND_DATABASE_STATUS.md  # ⭐ READ THIS FIRST!
```

---

## 📚 IMPORTANT DOCUMENTS TO READ

### **1. ONBOARDING_AND_DATABASE_STATUS.md** ⭐ **START HERE**
- Complete project status
- What's implemented vs what's needed
- Database schema (current + proposed)
- Three implementation options for next steps
- Competition strategy

### **2. AI_STUDY_PLANNER_PROJECT_PLAN.md**
- Original competition plan
- AI algorithms to implement
- Day-by-day implementation schedule
- Demo script
- Success metrics

### **3. QUICK_START.md**
- Brief overview
- Quick commands reference

---

## 🔧 COMMON ISSUES & SOLUTIONS

### **Issue: "Database connection failed"**

**Solution 1:** Check PostgreSQL is running
```bash
# Mac (Homebrew)
brew services list
brew services start postgresql

# Windows
# Open Services → PostgreSQL → Start

# Linux
sudo systemctl status postgresql
sudo systemctl start postgresql
```

**Solution 2:** Verify database exists
```bash
psql -U postgres -l
# Look for "studysmart_db" in the list
```

**Solution 3:** Update DATABASE_URL in `backend/.env`
```bash
# Mac/Linux format:
DATABASE_URL=postgresql://YOUR_USERNAME@localhost:5432/studysmart_db

# Windows format (if using "postgres" user):
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/studysmart_db
```

---

### **Issue: "Port 4000 already in use"**

**Solution:** Kill existing process or use different port
```bash
# Find process using port 4000
lsof -ti:4000

# Kill it
kill -9 $(lsof -ti:4000)

# Or use different port
npm run dev -- -p 3000
# Then update .env.local: NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

### **Issue: "Module not found" errors in frontend**

**Solution:** Reinstall dependencies
```bash
rm -rf node_modules
npm install
```

---

### **Issue: "Command not found: python3"**

**Solution:** Use `python` instead of `python3`
```bash
python --version  # Check if this works
# If yes, use "python" instead of "python3" in all commands
```

---

### **Issue: Backend imports failing**

**Solution:** Ensure virtual environment is activated
```bash
cd backend

# You should see (venv) in your prompt
# If not, activate it:
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate     # Windows
```

---

## 🎯 NEXT STEPS AFTER SETUP

Once everything is running:

### **1. Test the Full Flow**
- Register a new user
- Complete all 5 onboarding steps
- Check database to verify data was saved:
  ```sql
  psql -U YOUR_USERNAME -d studysmart_db
  SELECT * FROM users;
  SELECT * FROM user_profiles;
  SELECT * FROM subjects;
  SELECT * FROM availability;
  ```

### **2. Review Project Status**
- Read `ONBOARDING_AND_DATABASE_STATUS.md`
- Understand what's done vs what needs to be done
- Team should decide: **Option A, B, or C?**

### **3. Divide Work**
Based on the status doc, split tasks:
- **Person A:** Backend (exam dates table, ML predictions)
- **Person B:** Frontend (exam dates UI step)
- **Person C:** ML algorithms (duration prediction, priority scoring)

### **4. Start Implementation**
- **Priority 1:** Add Step 6 (Exam Dates) - see status doc
- **Priority 2:** Implement ML predictions logging
- **Priority 3:** Build AI algorithms for demo

---

## 📞 GETTING HELP

### **If Setup Fails:**
1. Check PostgreSQL is running: `psql -U postgres -l`
2. Check Python version: `python3 --version` (must be 3.11+)
3. Check Node version: `node --version` (must be 18+)
4. Verify ports are free: `lsof -ti:4000` and `lsof -ti:4008`

### **If You Get Stuck:**
- Read the error message carefully
- Check `backend/.env` configuration
- Ensure virtual environment is activated for backend commands
- Try restarting both servers

### **For Team Coordination:**
- Use the status doc (`ONBOARDING_AND_DATABASE_STATUS.md`) as source of truth
- Create GitHub issues for each task
- Update the status doc as you complete tasks

---

## ⏱️ TIME ESTIMATES

- **Setup (Steps 1-5):** 15-20 minutes
- **Reading status docs:** 20-30 minutes
- **Team planning meeting:** 30-60 minutes
- **Implementing Priority 1 (Exam Dates):** 3-4 hours
- **Implementing ML algorithms:** 10-15 hours
- **Demo preparation:** 2-3 hours

**Total before competition:** 20-30 hours of work (split across 3 people = ~7-10 hours each)

---

## 🏆 COMPETITION FOCUS

**What Judges Care About:**
1. ✅ AI learns over time (show MAE decreasing)
2. ✅ Smart prioritization (deadline + difficulty + grades)
3. ✅ Personalized scheduling (learns best study times)
4. ✅ Spaced repetition for exams
5. ✅ Clean, professional UI

**What Judges Don't Care About:**
- OAuth integration (email/password works fine)
- Google Classroom import (manual entry works fine)
- Advanced features beyond core AI

**Stay Focused:** 6 days left. Prioritize AI algorithms over UI polish!

---

## ✅ QUICK VERIFICATION CHECKLIST

After setup, verify:
- [ ] Backend running on http://localhost:4008
- [ ] Frontend running on http://localhost:4000
- [ ] Can register a new account
- [ ] Can log in with that account
- [ ] Onboarding modal appears with 5 steps
- [ ] Can select timezone (Step 1)
- [ ] Can select education system (Step 2)
- [ ] Can select import method (Step 3)
- [ ] Can add subjects (Step 4)
- [ ] Can select availability times (Step 5)
- [ ] Can click "Complete Setup"
- [ ] No errors in browser console or terminal

If all checked ✅, **you're ready to start development!**

---

## 📊 PROJECT COMPLETION STATUS

As of November 4, 2025:

**Completed (80%):**
- ✅ Authentication system
- ✅ 5-step onboarding
- ✅ 6 database tables
- ✅ Frontend UI with react-bits design
- ✅ Subject persistence
- ✅ Education system support (IB, A-Level, American)

**TODO for Competition (20%):**
- 🔴 Add exam dates step
- 🔴 Implement ML predictions logging
- 🔴 Build duration prediction algorithm
- 🔴 Build priority scoring algorithm
- 🔴 Create demo dashboard with graphs
- 🔴 Generate demo data

**Competition Deadline:** November 10, 2025 (6 days)

---

**Good luck team! You've got this! 🚀**

---

**Created:** November 4, 2025
**For:** RIT Dubai Engineering Competition Team
**Contact:** Share this with all team members
