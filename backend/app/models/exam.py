from sqlalchemy import Column, String, DateTime, Date, Time, ForeignKey, JSON
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
    start_time = Column(Time, nullable=True)  # Exam start time
    finish_time = Column(Time, nullable=True)  # Exam finish time
    exam_type = Column(String, nullable=False)  # Paper type (Paper 1, Paper 2, IA, etc.)
    units = Column(JSON, nullable=True)  # Array of units covered in exam (max 5)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="exams")
    subject = relationship("Subject", back_populates="exams")
