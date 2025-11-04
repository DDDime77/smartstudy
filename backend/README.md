# StudySmart AI - Backend API

Python FastAPI backend for the AI Study Planner application.

## Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT + Google OAuth
- **ML Libraries**: scikit-learn, pandas, numpy (for future ML features)

## Features

- ✅ User authentication (email/password + Google OAuth)
- ✅ Multi-step onboarding flow
- ✅ Education system support (IB, A-Level, American)
- ✅ Subject management with HL/SL levels
- ✅ RESTful API with auto-generated docs
- 🔄 Task management (coming soon)
- 🔄 Study session tracking (coming soon)
- 🔄 ML-powered predictions (coming soon)

## Setup Instructions

### 1. Prerequisites

- Python 3.10 or higher
- PostgreSQL 14 or higher
- pip or virtualenv

### 2. Install PostgreSQL

**macOS (with Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Create database:**
```bash
createdb studysmart_db
```

### 3. Create Virtual Environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Configure Environment

Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
DATABASE_URL=postgresql://yourusername:yourpassword@localhost:5432/studysmart_db
SECRET_KEY=your-super-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FRONTEND_URL=http://localhost:4000
```

**Generate a secret key:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 6. Initialize Database

```bash
python3 init_db.py
```

### 7. Run Development Server

```bash
python3 run.py
```

The API will be available at:
- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

## API Endpoints

### Authentication

- `POST /auth/register` - Register with email/password
- `POST /auth/login` - Login with email/password
- `POST /auth/google` - Login with Google OAuth
- `GET /auth/me` - Get current user

### Onboarding

- `POST /onboarding/complete` - Complete onboarding process
- `GET /onboarding/profile` - Get user profile
- `GET /onboarding/subjects` - Get user subjects
- `POST /onboarding/subjects` - Add a subject
- `DELETE /onboarding/subjects/{id}` - Delete a subject

## Database Schema

### Users Table
- id, email, password_hash, full_name
- oauth_provider, oauth_id
- created_at, updated_at, last_login
- email_verified, profile_completed

### User Profiles Table
- id, user_id
- education_system, education_program
- timezone, study_goal
- target_study_hours_per_day

### Subjects Table
- id, user_id
- name, level, category
- current_grade, target_grade
- color, difficulty_level

### Tasks Table (implemented, ready for use)
- id, user_id, subject_id
- title, description, task_type
- difficulty, estimated_duration
- deadline, priority_score, status

### Study Sessions Table (implemented, ready for use)
- id, user_id, task_id, subject_id
- start_time, end_time, duration
- focus_rating, productivity_score

## Development

### Running Tests
```bash
pytest
```

### Database Migrations
```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migration
alembic upgrade head
```

### Code Formatting
```bash
black .
```

### Type Checking
```bash
mypy .
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - http://localhost:8000/auth/google/callback
   - http://localhost:4000 (frontend)
6. Copy Client ID and Client Secret to `.env`

## Project Structure

```
backend/
├── app/
│   ├── core/           # Core configurations
│   │   ├── config.py   # Settings
│   │   ├── database.py # DB connection
│   │   └── security.py # Auth utilities
│   ├── models/         # SQLAlchemy models
│   │   ├── user.py
│   │   ├── profile.py
│   │   ├── subject.py
│   │   ├── task.py
│   │   └── study_session.py
│   ├── schemas/        # Pydantic schemas
│   │   ├── auth.py
│   │   └── onboarding.py
│   ├── routers/        # API routes
│   │   ├── auth.py
│   │   └── onboarding.py
│   ├── services/       # Business logic
│   └── ml/             # ML models (future)
├── init_db.py          # Database initialization
├── run.py              # Development server
├── requirements.txt    # Python dependencies
└── .env                # Environment variables
```

## Troubleshooting

### Database Connection Error
```bash
# Check if PostgreSQL is running
brew services list

# Restart PostgreSQL
brew services restart postgresql@14
```

### Port Already in Use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

### Import Errors
```bash
# Reinstall dependencies
pip install -r requirements.txt --upgrade
```

## Next Steps

- [ ] Implement task CRUD endpoints
- [ ] Implement study session tracking
- [ ] Add ML prediction endpoints
- [ ] Implement spaced repetition algorithm
- [ ] Add analytics endpoints
- [ ] Google Classroom API integration

## License

Built for RIT Dubai Engineering Competition
