from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Education system info
    education_system = Column(String, nullable=False)  # 'IB', 'A-Level', 'American'
    education_program = Column(String, nullable=True)  # 'IBDP', 'IBCP', 'IB Courses', 'A-Level', 'Standard', 'AP'
    grade_level = Column(String, nullable=True)

    # Timezone and preferences
    timezone = Column(String, nullable=False)
    study_goal = Column(Integer, nullable=True)  # Study goal in hours per week
    target_study_hours_per_day = Column(Integer, default=3)
    preferred_study_times = Column(JSON, nullable=True)  # Array of time preferences

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="profile")
