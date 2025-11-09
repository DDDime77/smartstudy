from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from app.core.database import Base


class TimeOfDay(str, enum.Enum):
    EARLY_MORNING = "early_morning"  # 5-8am
    MORNING = "morning"  # 8am-12pm
    AFTERNOON = "afternoon"  # 12pm-5pm
    EVENING = "evening"  # 5pm-9pm
    NIGHT = "night"  # 9pm-12am


class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)

    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    focus_rating = Column(Integer, nullable=True)  # 1-5, user self-assessment
    break_time_minutes = Column(Integer, default=0)
    interruptions_count = Column(Integer, default=0)
    productivity_score = Column(Float, nullable=True)  # calculated metric
    notes = Column(String, nullable=True)
    time_of_day = Column(Enum(TimeOfDay), nullable=True)

    # Topic tracking (one session = one topic)
    topic = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="study_sessions")
    task = relationship("Task", back_populates="study_sessions")
    practice_tasks = relationship("PracticeTask", back_populates="study_session")
