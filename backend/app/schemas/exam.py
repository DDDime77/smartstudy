from pydantic import BaseModel, field_serializer, field_validator
from typing import Optional, List
from datetime import date, time
from uuid import UUID


class ExamInput(BaseModel):
    """Input schema for creating/updating an exam"""
    subject_id: str
    exam_date: date
    start_time: Optional[time] = None  # Exam start time
    finish_time: Optional[time] = None  # Exam finish time
    exam_type: str  # Paper type (Paper 1, Paper 2, IA, etc.)
    units: Optional[List[str]] = None  # Units covered in exam (max 5)

    @field_validator('units')
    @classmethod
    def validate_units(cls, v):
        if v is not None:
            # Filter out empty strings
            v = [unit.strip() for unit in v if unit.strip()]
            # Ensure max 5 units
            if len(v) > 5:
                raise ValueError('Maximum 5 units allowed')
        return v


class UpdateExam(BaseModel):
    """Schema for updating an exam"""
    subject_id: Optional[str] = None
    exam_date: Optional[date] = None
    start_time: Optional[time] = None  # Exam start time
    finish_time: Optional[time] = None  # Exam finish time
    exam_type: Optional[str] = None
    units: Optional[List[str]] = None

    @field_validator('units')
    @classmethod
    def validate_units(cls, v):
        if v is not None:
            # Filter out empty strings
            v = [unit.strip() for unit in v if unit.strip()]
            # Ensure max 5 units
            if len(v) > 5:
                raise ValueError('Maximum 5 units allowed')
        return v


class ExamResponse(BaseModel):
    """Response schema for exam"""
    id: UUID
    user_id: UUID
    subject_id: UUID
    exam_date: date
    start_time: Optional[time]  # Exam start time
    finish_time: Optional[time]  # Exam finish time
    exam_type: str
    units: Optional[List[str]]

    @field_serializer('id', 'user_id', 'subject_id')
    def serialize_uuid(self, value: UUID) -> str:
        return str(value)

    class Config:
        from_attributes = True
