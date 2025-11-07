from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, UserProfile, Subject, BusySchedule
from app.schemas import (
    OnboardingComplete,
    ProfileResponse,
    SubjectResponse,
    SubjectInput,
    UpdateProfile,
    UpdateSubject,
)
from app.utils.priority_calculator import calculate_priority_coefficient
from datetime import time

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post("/complete", response_model=ProfileResponse)
async def complete_onboarding(
    onboarding_data: OnboardingComplete,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Complete the entire onboarding process"""

    # Get current user
    user = current_user

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

        # Add new subjects with priority coefficients
        for subject_data in onboarding_data.subjects:
            # Calculate priority coefficient based on grade gap
            priority_coef = calculate_priority_coefficient(
                current_grade=subject_data.current_grade,
                target_grade=subject_data.target_grade,
                education_system=onboarding_data.education_system,
                education_program=onboarding_data.education_program,
                level=subject_data.level
            )

            subject = Subject(
                user_id=user.id,
                name=subject_data.name,
                level=subject_data.level,
                category=subject_data.category,
                current_grade=subject_data.current_grade,
                target_grade=subject_data.target_grade,
                color=subject_data.color,
                priority_coefficient=priority_coef
            )
            db.add(subject)

    # Delete existing busy schedule and add new ones
    db.query(BusySchedule).filter(BusySchedule.user_id == user.id).delete()

    # Add new busy schedule slots
    for day_avail in onboarding_data.availability:
        for slot in day_avail.slots:
            # Convert time strings to time objects
            start_time_obj = time.fromisoformat(slot.start)
            end_time_obj = time.fromisoformat(slot.end)

            busy_slot = BusySchedule(
                user_id=user.id,
                day_of_week=day_avail.day,
                start_time=start_time_obj,
                end_time=end_time_obj,
                recurring=True
            )
            db.add(busy_slot)

    # Mark profile as completed
    user.profile_completed = True

    db.commit()
    db.refresh(profile)

    return profile


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user profile"""

    user = current_user

    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    return profile


@router.put("/profile", response_model=ProfileResponse)
async def update_profile(
    profile_data: UpdateProfile,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile"""

    user = current_user

    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    # Update only provided fields
    if profile_data.timezone is not None:
        profile.timezone = profile_data.timezone
    if profile_data.education_system is not None:
        profile.education_system = profile_data.education_system
    if profile_data.education_program is not None:
        profile.education_program = profile_data.education_program
    if profile_data.study_goal is not None:
        profile.study_goal = profile_data.study_goal

    db.commit()
    db.refresh(profile)

    return profile


@router.get("/subjects", response_model=List[SubjectResponse])
async def get_subjects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's subjects"""

    user = current_user

    subjects = db.query(Subject).filter(Subject.user_id == user.id, Subject.archived == False).all()

    return subjects


@router.post("/subjects", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
async def add_subject(
    subject_data: SubjectInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new subject"""

    user = current_user

    # Get user's education system for priority calculation
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    education_system = profile.education_system if profile else "IB"
    education_program = profile.education_program if profile else None

    # Calculate priority coefficient
    priority_coef = calculate_priority_coefficient(
        current_grade=subject_data.current_grade,
        target_grade=subject_data.target_grade,
        education_system=education_system,
        education_program=education_program,
        level=subject_data.level
    )

    subject = Subject(
        user_id=user.id,
        name=subject_data.name,
        level=subject_data.level,
        category=subject_data.category,
        current_grade=subject_data.current_grade,
        target_grade=subject_data.target_grade,
        color=subject_data.color,
        priority_coefficient=priority_coef
    )

    db.add(subject)
    db.commit()
    db.refresh(subject)

    return subject


@router.put("/subjects/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: str,
    subject_data: UpdateSubject,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a subject and recalculate priority coefficient"""

    user = current_user

    subject = db.query(Subject).filter(
        Subject.id == subject_id,
        Subject.user_id == user.id
    ).first()

    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    # Get user's education system
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    education_system = profile.education_system if profile else "IB"
    education_program = profile.education_program if profile else None

    # Update fields
    if subject_data.name is not None:
        subject.name = subject_data.name
    if subject_data.level is not None:
        subject.level = subject_data.level
    if subject_data.category is not None:
        subject.category = subject_data.category
    if subject_data.color is not None:
        subject.color = subject_data.color

    # Track if grades changed to recalculate priority
    grades_changed = False
    if subject_data.current_grade is not None:
        subject.current_grade = subject_data.current_grade
        grades_changed = True
    if subject_data.target_grade is not None:
        subject.target_grade = subject_data.target_grade
        grades_changed = True

    # Handle priority coefficient update
    if subject_data.priority_coefficient is not None:
        # Manual priority update (e.g., from drag-and-drop)
        subject.priority_coefficient = subject_data.priority_coefficient
    elif grades_changed or subject_data.level is not None:
        # Recalculate priority coefficient if grades or level changed
        priority_coef = calculate_priority_coefficient(
            current_grade=subject.current_grade,
            target_grade=subject.target_grade,
            education_system=education_system,
            education_program=education_program,
            level=subject.level
        )
        subject.priority_coefficient = priority_coef

    db.commit()
    db.refresh(subject)

    return subject


@router.delete("/subjects/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a subject"""

    user = current_user

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
