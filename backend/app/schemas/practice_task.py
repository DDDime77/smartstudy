from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class PracticeTaskCreate(BaseModel):
    subject: str
    topic: str
    difficulty: str  # easy, medium, hard, expert
    task_content: str
    solution_content: str
    answer_content: str
    estimated_time_minutes: Optional[int] = None
    study_session_id: Optional[UUID] = None
    # LNIRT predictions
    predicted_correct: Optional[float] = None
    predicted_time_seconds: Optional[int] = None
    lnirt_model_version: Optional[str] = None


class PracticeTaskUpdate(BaseModel):
    actual_time_seconds: Optional[int] = None
    completed: Optional[bool] = None
    is_correct: Optional[bool] = None
    study_session_id: Optional[UUID] = None


class PracticeTaskResponse(BaseModel):
    id: UUID
    user_id: UUID
    subject: str
    topic: str
    difficulty: str
    difficulty_numeric: Optional[int]
    task_content: str
    solution_content: str
    answer_content: str
    estimated_time_minutes: Optional[int]
    actual_time_seconds: Optional[int]
    completed: bool
    completed_at: Optional[datetime]
    is_correct: Optional[bool]
    study_session_id: Optional[UUID]
    # LNIRT predictions
    predicted_correct: Optional[float]
    predicted_time_seconds: Optional[int]
    lnirt_model_version: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
