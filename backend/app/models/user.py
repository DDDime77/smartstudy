from sqlalchemy import Boolean, Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=True)  # Nullable for OAuth users
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    email_verified = Column(Boolean, default=False)
    profile_completed = Column(Boolean, default=False)

    # OAuth fields
    oauth_provider = Column(String, nullable=True)  # 'google', 'github', etc.
    oauth_id = Column(String, nullable=True)

    # Google Classroom API key
    google_classroom_api_key = Column(String, nullable=True)

    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    subjects = relationship("Subject", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    study_sessions = relationship("StudySession", back_populates="user", cascade="all, delete-orphan")
    busy_schedule = relationship("BusySchedule", back_populates="user", cascade="all, delete-orphan")
    exams = relationship("Exam", back_populates="user", cascade="all, delete-orphan")
    task_stages = relationship("TaskStage", back_populates="user", cascade="all, delete-orphan")
    user_answers = relationship("UserAnswer", back_populates="user", cascade="all, delete-orphan")
