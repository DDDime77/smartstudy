from sqlalchemy import Column, String, DateTime, Date, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class Exam(Base):
    __tablename__ = "exams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)

    # Exam details
    exam_date = Column(Date, nullable=False)
    exam_type = Column(String, nullable=False)  # Paper 1, Paper 2, Paper 3, IA, etc.
    title = Column(String, nullable=True)  # Optional custom title
    description = Column(Text, nullable=True)  # Additional notes

    # Time (optional)
    start_time = Column(String, nullable=True)  # HH:MM format
    end_time = Column(String, nullable=True)  # HH:MM format
    duration_minutes = Column(String, nullable=True)  # e.g., "90", "120"

    # Location (optional)
    location = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="exams")
    subject = relationship("Subject", back_populates="exams")
