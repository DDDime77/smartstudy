from pydantic import BaseModel, field_serializer
from typing import Optional
from datetime import date
from uuid import UUID


class ExamInput(BaseModel):
    """Input schema for creating/updating an exam"""
    subject_id: str
    exam_date: date
    exam_type: str  # Paper 1, Paper 2, Paper 3, IA, etc.
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[str] = None  # HH:MM format
    end_time: Optional[str] = None  # HH:MM format
    duration_minutes: Optional[str] = None
    location: Optional[str] = None


class UpdateExam(BaseModel):
    """Schema for updating an exam"""
    subject_id: Optional[str] = None
    exam_date: Optional[date] = None
    exam_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration_minutes: Optional[str] = None
    location: Optional[str] = None


class ExamResponse(BaseModel):
    """Response schema for exam"""
    id: UUID
    user_id: UUID
    subject_id: UUID
    exam_date: date
    exam_type: str
    title: Optional[str]
    description: Optional[str]
    start_time: Optional[str]
    end_time: Optional[str]
    duration_minutes: Optional[str]
    location: Optional[str]

    @field_serializer('id', 'user_id', 'subject_id')
    def serialize_uuid(self, value: UUID) -> str:
        return str(value)

    class Config:
        from_attributes = True
