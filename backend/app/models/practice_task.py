from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class PracticeTask(Base):
    __tablename__ = "practice_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Task metadata
    subject = Column(String, nullable=False)
    topic = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)  # easy, medium, hard, expert
    difficulty_numeric = Column(Integer, nullable=True)  # 1-4 for analysis

    # Task content
    task_content = Column(Text, nullable=False)
    solution_content = Column(Text, nullable=False)
    answer_content = Column(Text, nullable=False)

    # Time tracking
    estimated_time_minutes = Column(Integer, nullable=True)  # AI estimation in minutes
    actual_time_seconds = Column(Integer, nullable=True)  # User's actual time in seconds

    # Completion status
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    is_correct = Column(Boolean, nullable=True)  # True if marked correct, False if incorrect, None if not marked

    # Session tracking
    study_session_id = Column(UUID(as_uuid=True), ForeignKey("study_sessions.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="practice_tasks")
    study_session = relationship("StudySession", back_populates="practice_tasks")
