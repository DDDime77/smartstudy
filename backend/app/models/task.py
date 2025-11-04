from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from app.core.database import Base


class TaskType(str, enum.Enum):
    ASSIGNMENT = "assignment"
    EXAM_PREP = "exam_prep"
    READING = "reading"
    PRACTICE = "practice"
    REVISION = "revision"
    PROJECT = "project"


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)

    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    task_type = Column(Enum(TaskType), nullable=False, default=TaskType.ASSIGNMENT)
    difficulty = Column(Integer, nullable=True)  # 1-5
    estimated_duration = Column(Integer, nullable=True)  # minutes, AI-predicted
    actual_duration = Column(Integer, nullable=True)  # minutes, filled after completion
    deadline = Column(DateTime, nullable=True)
    priority_score = Column(Float, nullable=True)  # calculated by ML heuristic
    status = Column(Enum(TaskStatus), nullable=False, default=TaskStatus.PENDING)
    tags = Column(JSON, nullable=True)  # Array of tags

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="tasks")
    subject = relationship("Subject", back_populates="tasks")
    study_sessions = relationship("StudySession", back_populates="task", cascade="all, delete-orphan")
