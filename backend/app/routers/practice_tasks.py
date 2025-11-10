from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, PracticeTask
from app.schemas import PracticeTaskCreate, PracticeTaskUpdate, PracticeTaskResponse
from app.ml import LNIRTService, EmbeddingModelService

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
    """Create a new practice task with LNIRT predictions"""

    # Map difficulty string to numeric value
    difficulty_numeric = DIFFICULTY_MAP.get(task_data.difficulty.lower())

    # Get LNIRT predictions if not provided
    predicted_correct = task_data.predicted_correct
    predicted_time_seconds = task_data.predicted_time_seconds
    lnirt_model_version = task_data.lnirt_model_version

    if predicted_correct is None or predicted_time_seconds is None:
        try:
            # Use Embedding Model by default (NEW - LSTM with embeddings)
            embedding_service = EmbeddingModelService(db)
            prediction = embedding_service.predict_and_save(
                user_id=current_user.id,
                topic=task_data.topic,
                difficulty=task_data.difficulty
            )
            predicted_correct = prediction['predicted_correct']
            predicted_time_seconds = prediction['predicted_time_seconds']
            lnirt_model_version = prediction.get('model_type', 'embedding_lstm')
        except Exception as e:
            # Fallback to LNIRT if embedding model fails
            print(f"Embedding model prediction failed, falling back to LNIRT: {e}")
            try:
                lnirt_service = LNIRTService(db)
                prediction = lnirt_service.predict_and_save(
                    user_id=current_user.id,
                    topic=task_data.topic,
                    difficulty=task_data.difficulty
                )
                predicted_correct = prediction['predicted_correct']
                predicted_time_seconds = prediction['predicted_time_seconds']
                lnirt_model_version = prediction['lnirt_model_version']
            except Exception as e2:
                print(f"LNIRT prediction also failed: {e2}")
                pass

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
        study_session_id=task_data.study_session_id,
        # LNIRT predictions
        predicted_correct=predicted_correct,
        predicted_time_seconds=predicted_time_seconds,
        lnirt_model_version=lnirt_model_version
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
    """Update a practice task (mark correct/incorrect, add completion time, etc.)

    Automatically triggers user-specific LNIRT training when task is completed with actual results.
    """

    task = db.query(PracticeTask).filter(
        PracticeTask.id == task_id,
        PracticeTask.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice task not found"
        )

    # Track if this is a completion event
    was_not_completed = not task.completed
    is_now_completed = task_update.completed or (task_update.is_correct is not None and task_update.actual_time_seconds is not None)

    # Update fields
    update_data = task_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    # If marking as completed, set completed_at timestamp
    if is_now_completed and was_not_completed:
        from datetime import datetime
        task.completed_at = datetime.utcnow()
        task.completed = True

    db.commit()
    db.refresh(task)

    # AUTOMATIC TRAINING
    # Trigger training when task is completed with actual results
    # Uses Embedding Model (trains every 5 new tasks globally)
    if is_now_completed and was_not_completed and task.is_correct is not None and task.actual_time_seconds is not None:
        try:
            # Use Embedding Model service (trains every 5 tasks)
            embedding_service = EmbeddingModelService(db)
            training_result = embedding_service.on_task_completed(
                user_id=current_user.id,
                topic=task.topic,
                verbose=True
            )
            if training_result['training_triggered']:
                print(f"Embedding model auto-training triggered: {training_result['training_result']}")
            else:
                tracker = training_result['training_result']
                print(f"Embedding model: {tracker['message']}")
        except Exception as e:
            # Log error but don't fail the request
            print(f"Auto-training failed: {e}")
            pass

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
