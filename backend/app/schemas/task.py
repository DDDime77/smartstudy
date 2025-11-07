from pydantic import BaseModel, field_serializer
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models.task import TaskType, TaskStatus
from app.models.task_stage import StageType, QuestionType


# ===== Task Schemas =====

class TaskInput(BaseModel):
    """Schema for creating a new task"""
    subject_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    task_type: TaskType = TaskType.ASSIGNMENT
    difficulty: Optional[int] = None  # 1-5
    deadline: Optional[datetime] = None
    tags: Optional[List[str]] = None


class UpdateTask(BaseModel):
    """Schema for updating a task"""
    subject_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    task_type: Optional[TaskType] = None
    difficulty: Optional[int] = None
    estimated_duration: Optional[int] = None
    actual_duration: Optional[int] = None
    deadline: Optional[datetime] = None
    priority_score: Optional[float] = None
    status: Optional[TaskStatus] = None
    tags: Optional[List[str]] = None


class TaskResponse(BaseModel):
    """Response schema for a task"""
    id: UUID
    user_id: UUID
    subject_id: Optional[UUID]
    title: str
    description: Optional[str]
    task_type: TaskType
    difficulty: Optional[int]
    estimated_duration: Optional[int]
    actual_duration: Optional[int]
    deadline: Optional[datetime]
    priority_score: Optional[float]
    status: TaskStatus
    tags: Optional[List[str]]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]

    @field_serializer('id', 'user_id', 'subject_id')
    def serialize_uuid(self, value: Optional[UUID]) -> Optional[str]:
        return str(value) if value else None

    class Config:
        from_attributes = True


# ===== Task Stage Schemas =====

class ResourceInput(BaseModel):
    """Schema for a learning resource (video, article, etc.)"""
    type: str  # "video", "article", "pdf", etc.
    url: str
    title: str
    duration_minutes: Optional[int] = None


class TaskStageInput(BaseModel):
    """Schema for creating a new task stage"""
    task_id: str
    stage_type: StageType
    difficulty: Optional[int] = None
    topic: Optional[str] = None
    resources: Optional[List[ResourceInput]] = None


class StartStageInput(BaseModel):
    """Schema for starting a task stage"""
    time_of_day: Optional[str] = None  # morning, afternoon, evening, night
    energy_level: Optional[int] = None  # 1-5


class CompleteStageInput(BaseModel):
    """Schema for completing a task stage"""
    focus_rating: Optional[int] = None  # 1-5
    energy_level: Optional[int] = None  # 1-5


class TaskStageResponse(BaseModel):
    """Response schema for a task stage"""
    id: UUID
    task_id: UUID
    user_id: UUID
    stage_type: StageType
    difficulty: Optional[int]
    topic: Optional[str]
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    duration_seconds: Optional[int]
    time_of_day: Optional[str]
    total_questions: int
    correct_answers: int
    success_rate: Optional[float]
    focus_rating: Optional[int]
    energy_level: Optional[int]
    completed: bool
    completed_at: Optional[datetime]
    resources: Optional[List[dict]]
    created_at: datetime
    updated_at: datetime

    @field_serializer('id', 'task_id', 'user_id')
    def serialize_uuid(self, value: UUID) -> str:
        return str(value)

    class Config:
        from_attributes = True


# ===== Question Schemas =====

class QuestionInput(BaseModel):
    """Schema for creating a question"""
    stage_id: str
    question_text: str
    question_type: QuestionType
    difficulty: Optional[int] = None
    options: Optional[List[str]] = None  # For multiple choice
    correct_answer: Optional[str] = None  # For multiple choice
    sample_solution: Optional[str] = None  # For written/calculation
    marking_criteria: Optional[List[str]] = None


class QuestionResponse(BaseModel):
    """Response schema for a question"""
    id: UUID
    stage_id: UUID
    question_text: str
    question_type: QuestionType
    difficulty: Optional[int]
    options: Optional[List[str]]
    correct_answer: Optional[str]
    sample_solution: Optional[str]
    marking_criteria: Optional[List[str]]
    created_at: datetime

    @field_serializer('id', 'stage_id')
    def serialize_uuid(self, value: UUID) -> str:
        return str(value)

    class Config:
        from_attributes = True


# ===== User Answer Schemas =====

class AnswerInput(BaseModel):
    """Schema for submitting an answer"""
    question_id: str
    user_answer: str
    time_spent_seconds: Optional[int] = None


class GradeAnswerInput(BaseModel):
    """Schema for grading a written answer"""
    is_correct: Optional[bool] = None
    points_earned: Optional[float] = None
    max_points: Optional[float] = None
    feedback: Optional[str] = None


class UserAnswerResponse(BaseModel):
    """Response schema for a user answer"""
    id: UUID
    question_id: UUID
    user_id: UUID
    user_answer: str
    is_correct: Optional[bool]
    time_spent_seconds: Optional[int]
    points_earned: Optional[float]
    max_points: Optional[float]
    feedback: Optional[str]
    submitted_at: datetime

    @field_serializer('id', 'question_id', 'user_id')
    def serialize_uuid(self, value: UUID) -> str:
        return str(value)

    class Config:
        from_attributes = True


# ===== Combined Schemas =====

class TaskWithStagesResponse(BaseModel):
    """Response schema for a task with its stages"""
    task: TaskResponse
    stages: List[TaskStageResponse]


class StageWithQuestionsResponse(BaseModel):
    """Response schema for a stage with its questions"""
    stage: TaskStageResponse
    questions: List[QuestionResponse]
    user_answers: List[UserAnswerResponse]
