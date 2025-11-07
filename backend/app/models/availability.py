from sqlalchemy import Column, String, Integer, Time, Date, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class BusySchedule(Base):
    __tablename__ = "busy_schedule"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Busy time slots (when user is NOT available)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    # Description of what makes them busy
    activity_type = Column(String(50), nullable=True)  # e.g., "School", "Sports", "Work", "Extracurricular"
    description = Column(String(255), nullable=True)  # e.g., "Math Class", "Soccer Practice"

    recurring = Column(Boolean, default=True)  # True for weekly recurring, False for one-time
    specific_date = Column(Date, nullable=True)  # If not recurring, apply to this specific date only

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="busy_schedule")
