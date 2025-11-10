from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.routers import auth, onboarding, subjects, schedule, exams, tasks, sessions, google_classroom, practice_tasks, assignments, lnirt

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered study planner backend API"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(subjects.router)
app.include_router(schedule.router)
app.include_router(exams.router)
app.include_router(tasks.router)
app.include_router(sessions.router)
app.include_router(google_classroom.router)
app.include_router(practice_tasks.router)
app.include_router(assignments.router)
app.include_router(lnirt.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to StudySmart AI API",
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
