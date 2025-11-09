from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, PracticeTask
from app.schemas import PracticeTaskCreate, PracticeTaskUpdate, PracticeTaskResponse

router = APIRouter(prefix="/practice-tasks", tags=["practice-tasks"])


# Difficulty mapping
DIFFICULTY_MAP = {
    "easy": 1,
    "medium": 2,
    "hard": 3,
    "expert": 4
}


@router.post("", response_model=PracticeTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_practice_task(
    task_data: PracticeTaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new practice task"""

    # Map difficulty string to numeric value
    difficulty_numeric = DIFFICULTY_MAP.get(task_data.difficulty.lower())

    new_task = PracticeTask(
        user_id=current_user.id,
        subject=task_data.subject,
        topic=task_data.topic,
        difficulty=task_data.difficulty,
        difficulty_numeric=difficulty_numeric,
        task_content=task_data.task_content,
        solution_content=task_data.solution_content,
        answer_content=task_data.answer_content,
        estimated_time_minutes=task_data.estimated_time_minutes,
        study_session_id=task_data.study_session_id
    )

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    return new_task


@router.get("", response_model=List[PracticeTaskResponse])
async def get_practice_tasks(
    subject: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all practice tasks for the current user with optional filtering"""

    query = db.query(PracticeTask).filter(PracticeTask.user_id == current_user.id)

    if subject:
        query = query.filter(PracticeTask.subject == subject)

    if topic:
        query = query.filter(PracticeTask.topic == topic)

    tasks = query.order_by(PracticeTask.created_at.desc()).limit(limit).all()

    return tasks


@router.get("/subject/{subject}/latest", response_model=PracticeTaskResponse)
async def get_latest_task_for_subject(
    subject: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the most recent practice task for a specific subject"""

    task = db.query(PracticeTask).filter(
        PracticeTask.user_id == current_user.id,
        PracticeTask.subject == subject
    ).order_by(PracticeTask.created_at.desc()).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No practice tasks found for subject: {subject}"
        )

    return task


@router.get("/{task_id}", response_model=PracticeTaskResponse)
async def get_practice_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific practice task by ID"""

    task = db.query(PracticeTask).filter(
        PracticeTask.id == task_id,
        PracticeTask.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice task not found"
        )

    return task


@router.patch("/{task_id}", response_model=PracticeTaskResponse)
async def update_practice_task(
    task_id: UUID,
    task_update: PracticeTaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a practice task (mark correct/incorrect, add completion time, etc.)"""

    task = db.query(PracticeTask).filter(
        PracticeTask.id == task_id,
        PracticeTask.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice task not found"
        )

    # Update fields
    update_data = task_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    # If marking as completed, set completed_at timestamp
    if task_update.completed and not task.completed:
        from datetime import datetime
        task.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(task)

    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_practice_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a practice task"""

    task = db.query(PracticeTask).filter(
        PracticeTask.id == task_id,
        PracticeTask.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice task not found"
        )

    db.delete(task)
    db.commit()

    return None
