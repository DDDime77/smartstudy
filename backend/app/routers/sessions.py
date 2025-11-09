from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List
from datetime import datetime, timedelta
from pydantic import BaseModel
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, StudySession, Subject
from app.models.study_session import TimeOfDay

router = APIRouter(prefix="/sessions", tags=["study-sessions"])


# Pydantic schemas
class StudySessionCreate(BaseModel):
    subject_id: UUID | None = None
    task_id: UUID | None = None
    start_time: datetime
    focus_rating: int | None = None
    notes: str | None = None


class StudySessionUpdate(BaseModel):
    end_time: datetime | None = None
    duration_minutes: int | None = None
    focus_rating: int | None = None
    break_time_minutes: int | None = None
    interruptions_count: int | None = None
    notes: str | None = None


class StudySessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    subject_id: UUID | None
    task_id: UUID | None
    start_time: datetime
    end_time: datetime | None
    duration_minutes: int | None
    focus_rating: int | None
    break_time_minutes: int
    interruptions_count: int
    productivity_score: float | None
    notes: str | None
    time_of_day: TimeOfDay | None
    created_at: datetime
    subject_name: str | None = None
    subject_color: str | None = None

    class Config:
        from_attributes = True


class WeeklyStats(BaseModel):
    day: str
    hours: float
    date: str


@router.post("", response_model=StudySessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_data: StudySessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a new study session"""
    # Determine time of day
    hour = session_data.start_time.hour
    if 5 <= hour < 8:
        time_of_day = TimeOfDay.EARLY_MORNING
    elif 8 <= hour < 12:
        time_of_day = TimeOfDay.MORNING
    elif 12 <= hour < 17:
        time_of_day = TimeOfDay.AFTERNOON
    elif 17 <= hour < 21:
        time_of_day = TimeOfDay.EVENING
    else:
        time_of_day = TimeOfDay.NIGHT

    new_session = StudySession(
        user_id=current_user.id,
        subject_id=session_data.subject_id,
        task_id=session_data.task_id,
        start_time=session_data.start_time,
        focus_rating=session_data.focus_rating,
        notes=session_data.notes,
        time_of_day=time_of_day
    )

    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    # Get subject info if available
    subject_name = None
    subject_color = None
    if new_session.subject_id:
        subject = db.query(Subject).filter(Subject.id == new_session.subject_id).first()
        if subject:
            subject_name = subject.name
            subject_color = subject.color

    response = StudySessionResponse.from_orm(new_session)
    response.subject_name = subject_name
    response.subject_color = subject_color

    return response


@router.put("/{session_id}", response_model=StudySessionResponse)
async def update_session(
    session_id: UUID,
    session_data: StudySessionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update/end a study session"""
    session = db.query(StudySession).filter(
        StudySession.id == session_id,
        StudySession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study session not found"
        )

    # Update fields
    if session_data.end_time is not None:
        session.end_time = session_data.end_time
        # Calculate duration if both start and end times exist
        if session.start_time:
            duration = (session.end_time - session.start_time).total_seconds() / 60
            session.duration_minutes = int(duration)

    if session_data.duration_minutes is not None:
        session.duration_minutes = session_data.duration_minutes

    if session_data.focus_rating is not None:
        session.focus_rating = session_data.focus_rating

    if session_data.break_time_minutes is not None:
        session.break_time_minutes = session_data.break_time_minutes

    if session_data.interruptions_count is not None:
        session.interruptions_count = session_data.interruptions_count

    if session_data.notes is not None:
        session.notes = session_data.notes

    # Calculate productivity score if we have enough data
    if session.duration_minutes and session.focus_rating:
        # Simple productivity score: (focus_rating / 5) * 100
        session.productivity_score = (session.focus_rating / 5.0) * 100

    db.commit()
    db.refresh(session)

    # Get subject info if available
    subject_name = None
    subject_color = None
    if session.subject_id:
        subject = db.query(Subject).filter(Subject.id == session.subject_id).first()
        if subject:
            subject_name = subject.name
            subject_color = subject.color

    response = StudySessionResponse.from_orm(session)
    response.subject_name = subject_name
    response.subject_color = subject_color

    return response


@router.get("", response_model=List[StudySessionResponse])
async def get_sessions(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent study sessions"""
    sessions = db.query(StudySession).filter(
        StudySession.user_id == current_user.id
    ).order_by(StudySession.start_time.desc()).limit(limit).all()

    # Add subject info to each session
    result = []
    for session in sessions:
        subject_name = None
        subject_color = None
        if session.subject_id:
            subject = db.query(Subject).filter(Subject.id == session.subject_id).first()
            if subject:
                subject_name = subject.name
                subject_color = subject.color

        response = StudySessionResponse.from_orm(session)
        response.subject_name = subject_name
        response.subject_color = subject_color
        result.append(response)

    return result


@router.get("/weekly-stats", response_model=List[WeeklyStats])
async def get_weekly_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get study hours for the past 7 days"""
    today = datetime.utcnow().date()
    week_ago = today - timedelta(days=6)  # Include today, so 7 days total

    # Get all sessions from the past 7 days
    sessions = db.query(StudySession).filter(
        and_(
            StudySession.user_id == current_user.id,
            func.date(StudySession.start_time) >= week_ago,
            func.date(StudySession.start_time) <= today,
            StudySession.duration_minutes.isnot(None)
        )
    ).all()

    # Group by day
    daily_stats = {}
    for i in range(7):
        day_date = week_ago + timedelta(days=i)
        daily_stats[day_date] = 0

    # Sum up minutes for each day
    for session in sessions:
        session_date = session.start_time.date()
        if session_date in daily_stats:
            daily_stats[session_date] += session.duration_minutes or 0

    # Format response
    result = []
    day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    for i in range(7):
        day_date = week_ago + timedelta(days=i)
        day_name = day_names[day_date.weekday()]
        hours = daily_stats[day_date] / 60.0
        result.append(WeeklyStats(
            day=day_name,
            hours=round(hours, 1),
            date=day_date.isoformat()
        ))

    return result


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a study session"""
    session = db.query(StudySession).filter(
        StudySession.id == session_id,
        StudySession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study session not found"
        )

    db.delete(session)
    db.commit()

    return None
