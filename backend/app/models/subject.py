from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    name = Column(String, nullable=False)
    level = Column(String, nullable=True)  # 'HL', 'SL', 'AP', etc.
    category = Column(String, nullable=True)  # Subject group/category
    color = Column(String, nullable=True)  # Hex color for UI
    difficulty_level = Column(Integer, nullable=True)  # 1-5
    current_grade = Column(String, nullable=True)  # User's current grade in this subject
    target_grade = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    archived = Column(Boolean, default=False)

    # Relationships
    user = relationship("User", back_populates="subjects")
    tasks = relationship("Task", back_populates="subject", cascade="all, delete-orphan")
