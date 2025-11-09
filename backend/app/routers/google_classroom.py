from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Subject
from app.utils.priority_calculator import calculate_priority_coefficient

# Google API imports
try:
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    GOOGLE_API_AVAILABLE = True
except ImportError:
    GOOGLE_API_AVAILABLE = False

router = APIRouter(prefix="/google-classroom", tags=["google-classroom"])


class SaveAPIKeyRequest(BaseModel):
    api_key: str


class CourseResponse(BaseModel):
    id: str
    name: str
    section: str | None
    description: str | None
    suggested_level: str | None
    suggested_category: str | None


class ImportSubjectRequest(BaseModel):
    course_id: str
    course_name: str
    current_grade: str
    target_grade: str
    level: str | None = None
    category: str | None = None


@router.post("/save-key")
async def save_api_key(
    request: SaveAPIKeyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save Google Classroom API key for the user"""

    user = current_user
    user.google_classroom_api_key = request.api_key
    user.updated_at = db.func.now()

    db.commit()
    db.refresh(user)

    return {"success": True, "message": "API key saved successfully"}


@router.get("/courses", response_model=List[CourseResponse])
async def get_courses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch courses from Google Classroom using stored API key"""

    if not GOOGLE_API_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google Classroom API is not available. Please install required packages."
        )

    user = current_user

    if not user.google_classroom_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No API key found. Please save your API key first."
        )

    try:
        # Build the service using API key
        service = build('classroom', 'v1', developerKey=user.google_classroom_api_key)

        # Fetch courses
        results = service.courses().list(pageSize=100).execute()
        courses = results.get('courses', [])

        # Transform courses to response format
        course_responses = []
        for course in courses:
            # Parse suggested level and category from course name
            name = course.get('name', '')
            level = parse_level_from_name(name)
            category = parse_category_from_name(name)

            course_responses.append(CourseResponse(
                id=course['id'],
                name=course.get('name', ''),
                section=course.get('section'),
                description=course.get('descriptionHeading'),
                suggested_level=level,
                suggested_category=category
            ))

        return course_responses

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch courses: {str(e)}"
        )


@router.post("/import")
async def import_subjects(
    subjects_to_import: List[ImportSubjectRequest],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Import selected courses as subjects"""

    user = current_user

    # Get user's education system for priority calculation
    from app.models import UserProfile
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    education_system = profile.education_system if profile else "IB"
    education_program = profile.education_program if profile else None

    imported_subjects = []
    colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9']

    for idx, subject_data in enumerate(subjects_to_import):
        # Calculate priority coefficient
        priority_coef = calculate_priority_coefficient(
            current_grade=subject_data.current_grade,
            target_grade=subject_data.target_grade,
            education_system=education_system,
            education_program=education_program,
            level=subject_data.level
        )

        # Assign color (cycle through colors)
        color = colors[idx % len(colors)]

        # Create subject
        subject = Subject(
            user_id=user.id,
            name=subject_data.course_name,
            level=subject_data.level,
            category=subject_data.category,
            current_grade=subject_data.current_grade,
            target_grade=subject_data.target_grade,
            color=color,
            priority_coefficient=priority_coef,
            imported_from='google_classroom',
            google_classroom_id=subject_data.course_id
        )

        db.add(subject)
        imported_subjects.append(subject)

    db.commit()

    # Refresh all subjects
    for subject in imported_subjects:
        db.refresh(subject)

    return {
        "success": True,
        "message": f"Successfully imported {len(imported_subjects)} subjects",
        "subjects": [{
            "id": str(s.id),
            "name": s.name,
            "level": s.level,
            "category": s.category,
            "current_grade": s.current_grade,
            "target_grade": s.target_grade,
            "priority_coefficient": s.priority_coefficient,
            "color": s.color
        } for s in imported_subjects]
    }


@router.delete("/disconnect")
async def disconnect_classroom(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove Google Classroom API key"""

    user = current_user
    user.google_classroom_api_key = None
    user.updated_at = db.func.now()

    db.commit()

    return {"success": True, "message": "Google Classroom disconnected successfully"}


# Helper functions
def parse_level_from_name(name: str) -> str | None:
    """Parse course level from course name"""
    name_upper = name.upper()

    if 'AP' in name_upper:
        return 'AP'
    elif 'IB' in name_upper and 'HL' in name_upper:
        return 'HL'
    elif 'IB' in name_upper and 'SL' in name_upper:
        return 'SL'
    elif 'HONORS' in name_upper or 'HONOURS' in name_upper:
        return 'Honors'

    return None


def parse_category_from_name(name: str) -> str | None:
    """Infer subject category from course name"""
    name_lower = name.lower()

    # Mathematics
    if any(keyword in name_lower for keyword in ['math', 'calculus', 'algebra', 'geometry', 'statistics']):
        return 'Mathematics'

    # Science
    if any(keyword in name_lower for keyword in ['biology', 'chemistry', 'physics', 'science']):
        return 'Science'

    # Language
    if any(keyword in name_lower for keyword in ['english', 'spanish', 'french', 'german', 'language', 'literature']):
        return 'Language'

    # Social Studies
    if any(keyword in name_lower for keyword in ['history', 'geography', 'economics', 'government', 'social']):
        return 'Social Studies'

    # Arts
    if any(keyword in name_lower for keyword in ['art', 'music', 'drama', 'theater', 'theatre']):
        return 'Arts'

    # Technology
    if any(keyword in name_lower for keyword in ['computer', 'programming', 'coding', 'technology', 'it']):
        return 'Technology'

    return None
