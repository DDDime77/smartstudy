from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import date, time
from pydantic import BaseModel
from sqlalchemy import text
from app.core.security import get_current_user
from app.core.database import get_db

router = APIRouter(prefix="/assignments", tags=["assignments"])


class AssignmentCreate(BaseModel):
    subject_id: Optional[str] = None
    title: str
    subject_name: Optional[str] = None
    topic: str
    difficulty: str
    scheduled_date: date
    scheduled_time: Optional[time] = None
    estimated_minutes: int
    required_tasks_count: int = 5


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    topic: Optional[str] = None
    difficulty: Optional[str] = None
    scheduled_date: Optional[date] = None
    scheduled_time: Optional[time] = None
    estimated_minutes: Optional[int] = None
    required_tasks_count: Optional[int] = None
    status: Optional[str] = None
    tasks_completed: Optional[int] = None
    time_spent_minutes: Optional[int] = None
    progress_percentage: Optional[int] = None
    notes: Optional[str] = None


class ProgressUpdate(BaseModel):
    tasks_completed: int
    time_spent_minutes: int


@router.get("")
async def get_assignments(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Get all assignments for the current user"""
    try:
        query = """
            SELECT * FROM ai_assignments
            WHERE user_id = :user_id
        """
        params = {"user_id": str(current_user.id)}

        if start_date and end_date:
            query += " AND scheduled_date BETWEEN :start_date AND :end_date"
            params["start_date"] = start_date
            params["end_date"] = end_date

        query += " ORDER BY scheduled_date ASC, scheduled_time ASC"

        result = db.execute(text(query), params)
        columns = result.keys()
        rows = result.fetchall()

        assignments = []
        for row in rows:
            assignment = dict(zip(columns, row))
            # Convert date/time to ISO format strings
            if assignment.get('scheduled_date'):
                assignment['scheduled_date'] = str(assignment['scheduled_date'])
            if assignment.get('scheduled_time'):
                assignment['scheduled_time'] = str(assignment['scheduled_time'])
            if assignment.get('created_at'):
                assignment['created_at'] = assignment['created_at'].isoformat()
            if assignment.get('updated_at'):
                assignment['updated_at'] = assignment['updated_at'].isoformat()
            if assignment.get('completed_at') and assignment['completed_at']:
                assignment['completed_at'] = assignment['completed_at'].isoformat()
            assignments.append(assignment)

        return assignments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{assignment_id}")
async def get_assignment(
    assignment_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Get a specific assignment"""
    try:
        result = db.execute(
            text("SELECT * FROM ai_assignments WHERE id = :id AND user_id = :user_id"),
            {"id": assignment_id, "user_id": str(current_user.id)}
        )
        row = result.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Assignment not found")

        columns = result.keys()
        assignment = dict(zip(columns, row))

        # Convert date/time to ISO format strings
        if assignment.get('scheduled_date'):
            assignment['scheduled_date'] = str(assignment['scheduled_date'])
        if assignment.get('scheduled_time'):
            assignment['scheduled_time'] = str(assignment['scheduled_time'])
        if assignment.get('created_at'):
            assignment['created_at'] = assignment['created_at'].isoformat()
        if assignment.get('updated_at'):
            assignment['updated_at'] = assignment['updated_at'].isoformat()
        if assignment.get('completed_at') and assignment['completed_at']:
            assignment['completed_at'] = assignment['completed_at'].isoformat()

        return assignment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_assignment(
    assignment: AssignmentCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Create a new assignment"""
    try:
        result = db.execute(
            text("""
            INSERT INTO ai_assignments (
                user_id, subject_id, title, subject_name, topic, difficulty,
                scheduled_date, scheduled_time, estimated_minutes, required_tasks_count
            ) VALUES (:user_id, :subject_id, :title, :subject_name, :topic, :difficulty,
                      :scheduled_date, :scheduled_time, :estimated_minutes, :required_tasks_count)
            RETURNING *
            """),
            {
                "user_id": str(current_user.id),
                "subject_id": assignment.subject_id,
                "title": assignment.title,
                "subject_name": assignment.subject_name,
                "topic": assignment.topic,
                "difficulty": assignment.difficulty,
                "scheduled_date": assignment.scheduled_date,
                "scheduled_time": assignment.scheduled_time,
                "estimated_minutes": assignment.estimated_minutes,
                "required_tasks_count": assignment.required_tasks_count
            }
        )
        row = result.fetchone()
        columns = result.keys()
        created = dict(zip(columns, row))

        db.commit()

        # Convert date/time to ISO format strings
        if created.get('scheduled_date'):
            created['scheduled_date'] = str(created['scheduled_date'])
        if created.get('scheduled_time'):
            created['scheduled_time'] = str(created['scheduled_time'])
        if created.get('created_at'):
            created['created_at'] = created['created_at'].isoformat()
        if created.get('updated_at'):
            created['updated_at'] = created['updated_at'].isoformat()

        return created
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{assignment_id}")
async def update_assignment(
    assignment_id: str,
    assignment: AssignmentUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Update an assignment"""
    try:
        # Build dynamic update query
        updates = []
        values = {}

        for field, value in assignment.dict(exclude_unset=True).items():
            if value is not None:
                updates.append(f"{field} = :{field}")
                values[field] = value

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Add completed_at if status is completed
        if assignment.status == 'completed':
            updates.append("completed_at = NOW()")

        values["assignment_id"] = assignment_id
        values["user_id"] = str(current_user.id)

        query = f"""
            UPDATE ai_assignments
            SET {', '.join(updates)}
            WHERE id = :assignment_id AND user_id = :user_id
            RETURNING *
        """

        result = db.execute(text(query), values)
        row = result.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Assignment not found")

        columns = result.keys()
        updated = dict(zip(columns, row))

        db.commit()

        # Convert date/time to ISO format strings
        if updated.get('scheduled_date'):
            updated['scheduled_date'] = str(updated['scheduled_date'])
        if updated.get('scheduled_time'):
            updated['scheduled_time'] = str(updated['scheduled_time'])
        if updated.get('created_at'):
            updated['created_at'] = updated['created_at'].isoformat()
        if updated.get('updated_at'):
            updated['updated_at'] = updated['updated_at'].isoformat()
        if updated.get('completed_at') and updated['completed_at']:
            updated['completed_at'] = updated['completed_at'].isoformat()

        return updated
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{assignment_id}/progress")
async def update_progress(
    assignment_id: str,
    progress: ProgressUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Update assignment progress"""
    try:
        # Get current assignment
        result = db.execute(
            text("SELECT * FROM ai_assignments WHERE id = :id AND user_id = :user_id"),
            {"id": assignment_id, "user_id": str(current_user.id)}
        )
        row = result.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Assignment not found")

        columns = result.keys()
        assignment = dict(zip(columns, row))

        # Calculate progress percentage
        task_progress = (progress.tasks_completed / assignment['required_tasks_count']) * 100
        time_progress = (progress.time_spent_minutes / assignment['estimated_minutes']) * 100
        progress_percentage = min(100, round((task_progress + time_progress) / 2))

        # Determine status
        new_status = assignment['status']
        if new_status == 'pending' and (progress.tasks_completed > 0 or progress.time_spent_minutes > 0):
            new_status = 'in_progress'
        if (progress.tasks_completed >= assignment['required_tasks_count'] and
                progress.time_spent_minutes >= assignment['estimated_minutes']):
            new_status = 'completed'

        # Update
        result = db.execute(
            text("""
            UPDATE ai_assignments
            SET tasks_completed = :tasks_completed,
                time_spent_minutes = :time_spent_minutes,
                progress_percentage = :progress_percentage,
                status = :status,
                completed_at = CASE WHEN :status_check = 'completed' THEN NOW() ELSE completed_at END
            WHERE id = :id AND user_id = :user_id
            RETURNING *
            """),
            {
                "tasks_completed": progress.tasks_completed,
                "time_spent_minutes": progress.time_spent_minutes,
                "progress_percentage": progress_percentage,
                "status": new_status,
                "status_check": new_status,
                "id": assignment_id,
                "user_id": str(current_user.id)
            }
        )
        row = result.fetchone()
        columns = result.keys()
        updated = dict(zip(columns, row))

        db.commit()

        # Convert date/time to ISO format strings
        if updated.get('scheduled_date'):
            updated['scheduled_date'] = str(updated['scheduled_date'])
        if updated.get('scheduled_time'):
            updated['scheduled_time'] = str(updated['scheduled_time'])
        if updated.get('created_at'):
            updated['created_at'] = updated['created_at'].isoformat()
        if updated.get('updated_at'):
            updated['updated_at'] = updated['updated_at'].isoformat()
        if updated.get('completed_at') and updated['completed_at']:
            updated['completed_at'] = updated['completed_at'].isoformat()

        return updated
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{assignment_id}")
async def delete_assignment(
    assignment_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Delete an assignment"""
    try:
        result = db.execute(
            text("DELETE FROM ai_assignments WHERE id = :id AND user_id = :user_id RETURNING id"),
            {"id": assignment_id, "user_id": str(current_user.id)}
        )
        row = result.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Assignment not found")

        db.commit()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
