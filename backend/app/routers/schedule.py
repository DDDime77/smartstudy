from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import time, date
from pydantic import BaseModel
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.availability import BusySchedule

router = APIRouter(prefix="/schedule", tags=["schedule"])


# Pydantic schemas
class BusySlotInput(BaseModel):
    day_of_week: int  # 0=Monday, 6=Sunday
    start_time: time
    end_time: time
    activity_type: str | None = None
    description: str | None = None
    recurring: bool = True
    specific_date: date | None = None


class BusySlotResponse(BaseModel):
    id: UUID
    day_of_week: int
    start_time: time
    end_time: time
    activity_type: str | None
    description: str | None
    recurring: bool
    specific_date: date | None

    class Config:
        from_attributes = True


@router.get("/busy-slots", response_model=List[BusySlotResponse])
def get_busy_slots(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all busy time slots for the current user."""
    busy_slots = db.query(BusySchedule).filter(
        BusySchedule.user_id == current_user.id
    ).all()
    return busy_slots


@router.post("/busy-slots", response_model=BusySlotResponse, status_code=status.HTTP_201_CREATED)
def create_busy_slot(
    slot: BusySlotInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new busy time slot."""
    # Validate day_of_week
    if not 0 <= slot.day_of_week <= 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="day_of_week must be between 0 (Monday) and 6 (Sunday)"
        )

    # Validate time range
    if slot.start_time >= slot.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_time must be before end_time"
        )

    # Create busy slot
    busy_slot = BusySchedule(
        user_id=current_user.id,
        day_of_week=slot.day_of_week,
        start_time=slot.start_time,
        end_time=slot.end_time,
        activity_type=slot.activity_type,
        description=slot.description,
        recurring=slot.recurring,
        specific_date=slot.specific_date
    )

    db.add(busy_slot)
    db.commit()
    db.refresh(busy_slot)

    return busy_slot


@router.put("/busy-slots/{slot_id}", response_model=BusySlotResponse)
def update_busy_slot(
    slot_id: UUID,
    slot_update: BusySlotInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a busy time slot."""
    busy_slot = db.query(BusySchedule).filter(
        BusySchedule.id == slot_id,
        BusySchedule.user_id == current_user.id
    ).first()

    if not busy_slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Busy slot not found"
        )

    # Validate day_of_week
    if not 0 <= slot_update.day_of_week <= 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="day_of_week must be between 0 (Monday) and 6 (Sunday)"
        )

    # Validate time range
    if slot_update.start_time >= slot_update.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_time must be before end_time"
        )

    # Update fields
    busy_slot.day_of_week = slot_update.day_of_week
    busy_slot.start_time = slot_update.start_time
    busy_slot.end_time = slot_update.end_time
    busy_slot.activity_type = slot_update.activity_type
    busy_slot.description = slot_update.description
    busy_slot.recurring = slot_update.recurring
    busy_slot.specific_date = slot_update.specific_date

    db.commit()
    db.refresh(busy_slot)

    return busy_slot


@router.delete("/busy-slots/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_busy_slot(
    slot_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a busy time slot."""
    busy_slot = db.query(BusySchedule).filter(
        BusySchedule.id == slot_id,
        BusySchedule.user_id == current_user.id
    ).first()

    if not busy_slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Busy slot not found"
        )

    db.delete(busy_slot)
    db.commit()

    return None
