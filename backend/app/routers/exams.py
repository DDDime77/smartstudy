from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Exam, Subject
from app.schemas.exam import ExamInput, ExamResponse, UpdateExam

router = APIRouter(prefix="/exams", tags=["exams"])


@router.get("", response_model=List[ExamResponse])
async def get_exams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all user's exams"""
    exams = db.query(Exam).filter(
        Exam.user_id == current_user.id
    ).order_by(Exam.exam_date.asc()).all()

    return exams


@router.get("/by-date", response_model=List[ExamResponse])
async def get_exams_by_date_range(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get exams filtered by date range"""
    query = db.query(Exam).filter(Exam.user_id == current_user.id)

    if start_date:
        query = query.filter(Exam.exam_date >= start_date)
    if end_date:
        query = query.filter(Exam.exam_date <= end_date)

    exams = query.order_by(Exam.exam_date.asc()).all()
    return exams


@router.get("/{exam_id}", response_model=ExamResponse)
async def get_exam(
    exam_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific exam"""
    exam = db.query(Exam).filter(
        Exam.id == exam_id,
        Exam.user_id == current_user.id
    ).first()

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )

    return exam


@router.post("", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
async def create_exam(
    exam_data: ExamInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new exam"""
    # Verify subject exists and belongs to user
    subject = db.query(Subject).filter(
        Subject.id == exam_data.subject_id,
        Subject.user_id == current_user.id
    ).first()

    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    # Create exam
    exam = Exam(
        user_id=current_user.id,
        subject_id=exam_data.subject_id,
        exam_date=exam_data.exam_date,
        start_time=exam_data.start_time,
        finish_time=exam_data.finish_time,
        exam_type=exam_data.exam_type,
        units=exam_data.units
    )

    db.add(exam)
    db.commit()
    db.refresh(exam)

    return exam


@router.put("/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: str,
    exam_data: UpdateExam,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an exam"""
    exam = db.query(Exam).filter(
        Exam.id == exam_id,
        Exam.user_id == current_user.id
    ).first()

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )

    # If subject_id is being updated, verify it exists and belongs to user
    if exam_data.subject_id is not None:
        subject = db.query(Subject).filter(
            Subject.id == exam_data.subject_id,
            Subject.user_id == current_user.id
        ).first()

        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subject not found"
            )
        exam.subject_id = exam_data.subject_id

    # Update fields
    if exam_data.exam_date is not None:
        exam.exam_date = exam_data.exam_date
    if exam_data.start_time is not None:
        exam.start_time = exam_data.start_time
    if exam_data.finish_time is not None:
        exam.finish_time = exam_data.finish_time
    if exam_data.exam_type is not None:
        exam.exam_type = exam_data.exam_type
    if exam_data.units is not None:
        exam.units = exam_data.units

    db.commit()
    db.refresh(exam)

    return exam


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(
    exam_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an exam"""
    exam = db.query(Exam).filter(
        Exam.id == exam_id,
        Exam.user_id == current_user.id
    ).first()

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )

    db.delete(exam)
    db.commit()

    return None
