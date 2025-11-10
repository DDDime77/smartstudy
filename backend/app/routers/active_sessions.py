from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import text
from app.core.security import get_current_user
from app.core.database import get_db
import json

router = APIRouter(prefix="/active-session", tags=["active-session"])


class CreateSessionRequest(BaseModel):
    session_type: str  # 'assignment', 'practice', 'free_study'
    assignment_id: Optional[str] = None
    subject_id: Optional[str] = None
    subject_name: Optional[str] = None
    topic: Optional[str] = None
    difficulty: str = 'medium'
    initial_duration_seconds: int = 1500
    study_technique: str = 'pomodoro'
    required_tasks: Optional[int] = None
    estimated_minutes: Optional[int] = None
    tasks_completed: int = 0
    time_spent_minutes: int = 0
    grade_level: Optional[str] = None
    study_system: str = 'IB'


class UpdateSessionRequest(BaseModel):
    elapsed_seconds: Optional[int] = None
    is_running: Optional[bool] = None
    tasks_completed: Optional[int] = None
    time_spent_minutes: Optional[int] = None
    current_task: Optional[dict] = None
    pending_task_params: Optional[dict] = None


@router.get("")
async def get_active_session(
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Get the current user's active study session"""
    try:
        result = db.execute(
            text("SELECT * FROM active_study_sessions WHERE user_id = :user_id"),
            {"user_id": str(current_user.id)}
        )
        row = result.fetchone()

        if not row:
            return None

        columns = result.keys()
        session = dict(zip(columns, row))

        # Convert timestamps to ISO format
        if session.get('created_at'):
            session['created_at'] = session['created_at'].isoformat()
        if session.get('updated_at'):
            session['updated_at'] = session['updated_at'].isoformat()
        if session.get('last_activity_at'):
            session['last_activity_at'] = session['last_activity_at'].isoformat()

        # Convert UUIDs to strings
        for key in ['id', 'user_id', 'assignment_id', 'subject_id']:
            if session.get(key):
                session[key] = str(session[key])

        return session
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_or_update_session(
    data: CreateSessionRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Create or replace the current user's active study session"""
    try:
        # Delete existing session first (UNIQUE constraint on user_id)
        db.execute(
            text("DELETE FROM active_study_sessions WHERE user_id = :user_id"),
            {"user_id": str(current_user.id)}
        )

        # Insert new session
        result = db.execute(
            text("""
                INSERT INTO active_study_sessions (
                    user_id, session_type, assignment_id, subject_id, subject_name,
                    topic, difficulty, initial_duration_seconds, study_technique,
                    required_tasks, estimated_minutes, tasks_completed, time_spent_minutes,
                    grade_level, study_system
                ) VALUES (
                    :user_id, :session_type, :assignment_id, :subject_id, :subject_name,
                    :topic, :difficulty, :initial_duration_seconds, :study_technique,
                    :required_tasks, :estimated_minutes, :tasks_completed, :time_spent_minutes,
                    :grade_level, :study_system
                )
                RETURNING *
            """),
            {
                "user_id": str(current_user.id),
                "session_type": data.session_type,
                "assignment_id": data.assignment_id,
                "subject_id": data.subject_id,
                "subject_name": data.subject_name,
                "topic": data.topic,
                "difficulty": data.difficulty,
                "initial_duration_seconds": data.initial_duration_seconds,
                "study_technique": data.study_technique,
                "required_tasks": data.required_tasks,
                "estimated_minutes": data.estimated_minutes,
                "tasks_completed": data.tasks_completed,
                "time_spent_minutes": data.time_spent_minutes,
                "grade_level": data.grade_level,
                "study_system": data.study_system
            }
        )

        db.commit()

        row = result.fetchone()
        columns = result.keys()
        session = dict(zip(columns, row))

        # Convert timestamps and UUIDs
        if session.get('created_at'):
            session['created_at'] = session['created_at'].isoformat()
        if session.get('updated_at'):
            session['updated_at'] = session['updated_at'].isoformat()
        if session.get('last_activity_at'):
            session['last_activity_at'] = session['last_activity_at'].isoformat()

        for key in ['id', 'user_id', 'assignment_id', 'subject_id']:
            if session.get(key):
                session[key] = str(session[key])

        return session
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("")
async def update_active_session(
    data: UpdateSessionRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Update the current user's active study session"""
    try:
        # Build dynamic update query
        update_fields = []
        params = {"user_id": str(current_user.id)}

        if data.elapsed_seconds is not None:
            update_fields.append("elapsed_seconds = :elapsed_seconds")
            params["elapsed_seconds"] = data.elapsed_seconds

        if data.is_running is not None:
            update_fields.append("is_running = :is_running")
            params["is_running"] = data.is_running

        if data.tasks_completed is not None:
            update_fields.append("tasks_completed = :tasks_completed")
            params["tasks_completed"] = data.tasks_completed

        if data.time_spent_minutes is not None:
            update_fields.append("time_spent_minutes = :time_spent_minutes")
            params["time_spent_minutes"] = data.time_spent_minutes

        if data.current_task is not None:
            update_fields.append("current_task = :current_task")
            params["current_task"] = json.dumps(data.current_task)

        if data.pending_task_params is not None:
            update_fields.append("pending_task_params = :pending_task_params")
            params["pending_task_params"] = json.dumps(data.pending_task_params)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        query = f"""
            UPDATE active_study_sessions
            SET {', '.join(update_fields)}
            WHERE user_id = :user_id
            RETURNING *
        """

        result = db.execute(text(query), params)
        db.commit()

        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Active session not found")

        columns = result.keys()
        session = dict(zip(columns, row))

        # Convert timestamps and UUIDs
        if session.get('created_at'):
            session['created_at'] = session['created_at'].isoformat()
        if session.get('updated_at'):
            session['updated_at'] = session['updated_at'].isoformat()
        if session.get('last_activity_at'):
            session['last_activity_at'] = session['last_activity_at'].isoformat()

        for key in ['id', 'user_id', 'assignment_id', 'subject_id']:
            if session.get(key):
                session[key] = str(session[key])

        return session
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("")
async def delete_active_session(
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Delete the current user's active study session"""
    try:
        result = db.execute(
            text("DELETE FROM active_study_sessions WHERE user_id = :user_id RETURNING id"),
            {"user_id": str(current_user.id)}
        )
        db.commit()

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="No active session found")

        return {"message": "Session deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
