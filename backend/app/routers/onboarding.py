from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import User, UserProfile, Subject, Availability
from app.schemas import (
    OnboardingComplete,
    ProfileResponse,
    SubjectResponse,
    SubjectInput,
)
from datetime import time

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


def get_current_user_from_token(token: str, db: Session) -> User:
    """Get current user from JWT token"""
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user


@router.post("/complete", response_model=ProfileResponse)
async def complete_onboarding(
    onboarding_data: OnboardingComplete,
    token: str,
    db: Session = Depends(get_db)
):
    """Complete the entire onboarding process"""

    # Get current user
    user = get_current_user_from_token(token, db)

    # Check if profile already exists
    existing_profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if existing_profile:
        # Update existing profile
        existing_profile.timezone = onboarding_data.timezone
        existing_profile.education_system = onboarding_data.education_system
        existing_profile.education_program = onboarding_data.education_program
        existing_profile.study_goal = onboarding_data.study_goal
        profile = existing_profile
    else:
        # Create new profile
        profile = UserProfile(
            user_id=user.id,
            timezone=onboarding_data.timezone,
            education_system=onboarding_data.education_system,
            education_program=onboarding_data.education_program,
            study_goal=onboarding_data.study_goal
        )
        db.add(profile)

    # Delete existing subjects if updating
    if onboarding_data.import_method == "manual":
        db.query(Subject).filter(Subject.user_id == user.id).delete()

        # Add new subjects
        for subject_data in onboarding_data.subjects:
            subject = Subject(
                user_id=user.id,
                name=subject_data.name,
                level=subject_data.level,
                category=subject_data.category,
                current_grade=subject_data.current_grade,
                target_grade=subject_data.target_grade,
                color=subject_data.color
            )
            db.add(subject)

    # Delete existing availability and add new ones
    db.query(Availability).filter(Availability.user_id == user.id).delete()

    # Add new availability slots
    for day_avail in onboarding_data.availability:
        for slot in day_avail.slots:
            # Convert time strings to time objects
            start_time_obj = time.fromisoformat(slot.start)
            end_time_obj = time.fromisoformat(slot.end)

            availability = Availability(
                user_id=user.id,
                day_of_week=day_avail.day,
                start_time=start_time_obj,
                end_time=end_time_obj,
                recurring=True
            )
            db.add(availability)

    # Mark profile as completed
    user.profile_completed = True

    db.commit()
    db.refresh(profile)

    return profile


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(token: str, db: Session = Depends(get_db)):
    """Get user profile"""

    user = get_current_user_from_token(token, db)

    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    return profile


@router.get("/subjects", response_model=List[SubjectResponse])
async def get_subjects(token: str, db: Session = Depends(get_db)):
    """Get user's subjects"""

    user = get_current_user_from_token(token, db)

    subjects = db.query(Subject).filter(Subject.user_id == user.id, Subject.archived == False).all()

    return subjects


@router.post("/subjects", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
async def add_subject(
    subject_data: SubjectInput,
    token: str,
    db: Session = Depends(get_db)
):
    """Add a new subject"""

    user = get_current_user_from_token(token, db)

    subject = Subject(
        user_id=user.id,
        name=subject_data.name,
        level=subject_data.level,
        category=subject_data.category,
        current_grade=subject_data.current_grade,
        target_grade=subject_data.target_grade,
        color=subject_data.color
    )

    db.add(subject)
    db.commit()
    db.refresh(subject)

    return subject


@router.delete("/subjects/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: str,
    token: str,
    db: Session = Depends(get_db)
):
    """Delete a subject"""

    user = get_current_user_from_token(token, db)

    subject = db.query(Subject).filter(
        Subject.id == subject_id,
        Subject.user_id == user.id
    ).first()

    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    db.delete(subject)
    db.commit()

    return None
