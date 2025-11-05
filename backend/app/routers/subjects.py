from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Subject, Task, StudySession
from app.schemas import SubjectResponse, SubjectInput

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.get("", response_model=List[SubjectResponse])
async def get_subjects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all user's subjects"""
    subjects = db.query(Subject).filter(
        Subject.user_id == current_user.id,
        Subject.archived == False
    ).order_by(Subject.created_at.desc()).all()

    return subjects


@router.get("/{subject_id}", response_model=SubjectResponse)
async def get_subject(
    subject_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific subject"""
    subject = db.query(Subject).filter(
        Subject.id == subject_id,
        Subject.user_id == current_user.id
    ).first()

    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    return subject


@router.get("/{subject_id}/stats")
async def get_subject_stats(
    subject_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed statistics for a specific subject"""
    subject = db.query(Subject).filter(
        Subject.id == subject_id,
        Subject.user_id == current_user.id
    ).first()

    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    # Calculate date ranges
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    # Total study hours
    total_minutes = db.query(func.sum(StudySession.duration_minutes)).filter(
        StudySession.user_id == current_user.id,
        StudySession.subject_id == subject_id
    ).scalar() or 0

    # Study hours this week
    week_minutes = db.query(func.sum(StudySession.duration_minutes)).filter(
        StudySession.user_id == current_user.id,
        StudySession.subject_id == subject_id,
        StudySession.start_time >= week_ago
    ).scalar() or 0

    # Study hours this month
    month_minutes = db.query(func.sum(StudySession.duration_minutes)).filter(
        StudySession.user_id == current_user.id,
        StudySession.subject_id == subject_id,
        StudySession.start_time >= month_ago
    ).scalar() or 0

    # Task statistics
    total_tasks = db.query(func.count(Task.id)).filter(
        Task.user_id == current_user.id,
        Task.subject_id == subject_id
    ).scalar() or 0

    completed_tasks = db.query(func.count(Task.id)).filter(
        Task.user_id == current_user.id,
        Task.subject_id == subject_id,
        Task.status == "completed"
    ).scalar() or 0

    pending_tasks = db.query(func.count(Task.id)).filter(
        Task.user_id == current_user.id,
        Task.subject_id == subject_id,
        Task.status == "pending"
    ).scalar() or 0

    # Average focus rating
    avg_focus = db.query(func.avg(StudySession.focus_rating)).filter(
        StudySession.user_id == current_user.id,
        StudySession.subject_id == subject_id,
        StudySession.focus_rating.isnot(None)
    ).scalar()

    # Number of study sessions
    session_count = db.query(func.count(StudySession.id)).filter(
        StudySession.user_id == current_user.id,
        StudySession.subject_id == subject_id
    ).scalar() or 0

    return {
        "subject_id": str(subject_id),
        "subject_name": subject.name,
        "subject_level": subject.level,
        "subject_color": subject.color,
        "current_grade": subject.current_grade,
        "target_grade": subject.target_grade,
        "total_study_hours": round(total_minutes / 60, 1),
        "study_hours_this_week": round(week_minutes / 60, 1),
        "study_hours_this_month": round(month_minutes / 60, 1),
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "completion_rate": round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1),
        "total_sessions": session_count,
        "average_focus_rating": round(avg_focus, 1) if avg_focus else None,
    }


@router.put("/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: str,
    subject_data: SubjectInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a subject"""
    subject = db.query(Subject).filter(
        Subject.id == subject_id,
        Subject.user_id == current_user.id
    ).first()

    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    # Update fields
    subject.name = subject_data.name
    subject.level = subject_data.level
    subject.category = subject_data.category
    subject.current_grade = subject_data.current_grade
    subject.target_grade = subject_data.target_grade
    subject.color = subject_data.color

    db.commit()
    db.refresh(subject)

    return subject


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_subject(
    subject_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Archive a subject (soft delete)"""
    subject = db.query(Subject).filter(
        Subject.id == subject_id,
        Subject.user_id == current_user.id
    ).first()

    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    # Soft delete by marking as archived
    subject.archived = True
    db.commit()

    return None
