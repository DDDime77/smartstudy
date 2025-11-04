from sqlalchemy import Column, String, Integer, Time, Date, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class Availability(Base):
    __tablename__ = "availability"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Recurring weekly availability
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    recurring = Column(Boolean, default=True)

    # For one-off availability changes (optional)
    specific_date = Column(Date, nullable=True)  # If not recurring, apply to this date only
    is_blocked = Column(Boolean, default=False)  # True if user is busy (exam, event, etc.)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="availability")
