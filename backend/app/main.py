from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import engine, Base
from app.routers import auth, onboarding, subjects, schedule, exams, tasks, sessions, google_classroom, practice_tasks, assignments, lnirt, active_sessions, admin

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered study planner backend API"
)

# Add global validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    body = await request.body()
    print(f"🔴 [FastAPI] ====== Validation Error ======")
    print(f"🔴 [FastAPI] Request URL: {request.url}")
    print(f"🔴 [FastAPI] Request method: {request.method}")
    print(f"🔴 [FastAPI] Validation errors: {exc.errors()}")
    print(f"🔴 [FastAPI] Request body: {body.decode() if isinstance(body, bytes) else body}")

    # Convert body to string for JSON serialization
    body_str = body.decode('utf-8') if isinstance(body, bytes) else str(body)

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": body_str},
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
app.include_router(active_sessions.router)
app.include_router(admin.router)


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
