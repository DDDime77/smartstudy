from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import date, time
from pydantic import BaseModel
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
            WHERE user_id = %s
        """
        params = [current_user['id']]

        if start_date and end_date:
            query += " AND scheduled_date BETWEEN %s AND %s"
            params.extend([start_date, end_date])

        query += " ORDER BY scheduled_date ASC, scheduled_time ASC"

        cursor = db.cursor()
        cursor.execute(query, params)
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()

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
            if assignment.get('completed_at'):
                assignment['completed_at'] = assignment['completed_at'].isoformat()
            assignments.append(assignment)

        cursor.close()
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
        cursor = db.cursor()
        cursor.execute(
            "SELECT * FROM ai_assignments WHERE id = %s AND user_id = %s",
            (assignment_id, current_user['id'])
        )
        row = cursor.fetchone()

        if not row:
            cursor.close()
            raise HTTPException(status_code=404, detail="Assignment not found")

        columns = [desc[0] for desc in cursor.description]
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
        if assignment.get('completed_at'):
            assignment['completed_at'] = assignment['completed_at'].isoformat()

        cursor.close()
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
        cursor = db.cursor()
        cursor.execute(
            """
            INSERT INTO ai_assignments (
                user_id, subject_id, title, subject_name, topic, difficulty,
                scheduled_date, scheduled_time, estimated_minutes, required_tasks_count
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                current_user['id'],
                assignment.subject_id,
                assignment.title,
                assignment.subject_name,
                assignment.topic,
                assignment.difficulty,
                assignment.scheduled_date,
                assignment.scheduled_time,
                assignment.estimated_minutes,
                assignment.required_tasks_count
            )
        )
        row = cursor.fetchone()
        columns = [desc[0] for desc in cursor.description]
        result = dict(zip(columns, row))

        db.commit()
        cursor.close()

        # Convert date/time to ISO format strings
        if result.get('scheduled_date'):
            result['scheduled_date'] = str(result['scheduled_date'])
        if result.get('scheduled_time'):
            result['scheduled_time'] = str(result['scheduled_time'])
        if result.get('created_at'):
            result['created_at'] = result['created_at'].isoformat()
        if result.get('updated_at'):
            result['updated_at'] = result['updated_at'].isoformat()

        return result
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
        values = []

        for field, value in assignment.dict(exclude_unset=True).items():
            if value is not None:
                updates.append(f"{field} = %s")
                values.append(value)

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Add completed_at if status is completed
        if assignment.status == 'completed':
            updates.append("completed_at = NOW()")

        values.extend([assignment_id, current_user['id']])

        query = f"""
            UPDATE ai_assignments
            SET {', '.join(updates)}
            WHERE id = %s AND user_id = %s
            RETURNING *
        """

        cursor = db.cursor()
        cursor.execute(query, values)
        row = cursor.fetchone()

        if not row:
            cursor.close()
            raise HTTPException(status_code=404, detail="Assignment not found")

        columns = [desc[0] for desc in cursor.description]
        result = dict(zip(columns, row))

        db.commit()
        cursor.close()

        # Convert date/time to ISO format strings
        if result.get('scheduled_date'):
            result['scheduled_date'] = str(result['scheduled_date'])
        if result.get('scheduled_time'):
            result['scheduled_time'] = str(result['scheduled_time'])
        if result.get('created_at'):
            result['created_at'] = result['created_at'].isoformat()
        if result.get('updated_at'):
            result['updated_at'] = result['updated_at'].isoformat()
        if result.get('completed_at') and result['completed_at']:
            result['completed_at'] = result['completed_at'].isoformat()

        return result
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
        cursor = db.cursor()
        cursor.execute(
            "SELECT * FROM ai_assignments WHERE id = %s AND user_id = %s",
            (assignment_id, current_user['id'])
        )
        row = cursor.fetchone()

        if not row:
            cursor.close()
            raise HTTPException(status_code=404, detail="Assignment not found")

        columns = [desc[0] for desc in cursor.description]
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
        cursor.execute(
            """
            UPDATE ai_assignments
            SET tasks_completed = %s,
                time_spent_minutes = %s,
                progress_percentage = %s,
                status = %s,
                completed_at = CASE WHEN %s = 'completed' THEN NOW() ELSE completed_at END
            WHERE id = %s AND user_id = %s
            RETURNING *
            """,
            (
                progress.tasks_completed,
                progress.time_spent_minutes,
                progress_percentage,
                new_status,
                new_status,
                assignment_id,
                current_user['id']
            )
        )
        row = cursor.fetchone()
        columns = [desc[0] for desc in cursor.description]
        result = dict(zip(columns, row))

        db.commit()
        cursor.close()

        # Convert date/time to ISO format strings
        if result.get('scheduled_date'):
            result['scheduled_date'] = str(result['scheduled_date'])
        if result.get('scheduled_time'):
            result['scheduled_time'] = str(result['scheduled_time'])
        if result.get('created_at'):
            result['created_at'] = result['created_at'].isoformat()
        if result.get('updated_at'):
            result['updated_at'] = result['updated_at'].isoformat()
        if result.get('completed_at') and result['completed_at']:
            result['completed_at'] = result['completed_at'].isoformat()

        return result
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
        cursor = db.cursor()
        cursor.execute(
            "DELETE FROM ai_assignments WHERE id = %s AND user_id = %s RETURNING id",
            (assignment_id, current_user['id'])
        )
        row = cursor.fetchone()

        if not row:
            cursor.close()
            raise HTTPException(status_code=404, detail="Assignment not found")

        db.commit()
        cursor.close()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
