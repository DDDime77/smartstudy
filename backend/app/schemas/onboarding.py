from pydantic import BaseModel, field_serializer
from typing import List, Optional
from uuid import UUID


class SubjectInput(BaseModel):
    name: str
    level: Optional[str] = None  # 'HL', 'SL', 'AP', etc.
    category: Optional[str] = None
    current_grade: Optional[str] = None
    target_grade: Optional[str] = None
    color: Optional[str] = None


class TimeSlot(BaseModel):
    start: str  # "14:00"
    end: str    # "16:00"


class DayAvailability(BaseModel):
    day: int  # 0-6 (Monday=0, Sunday=6)
    slots: List[TimeSlot]


class OnboardingStep1(BaseModel):
    """User timezone selection"""
    timezone: str


class OnboardingStep2(BaseModel):
    """Education system selection"""
    education_system: str  # 'IB', 'A-Level', 'American'
    education_program: str  # 'IBDP', 'IBCP', 'IB Courses', 'A-Level', 'Standard', 'AP'


class OnboardingStep3(BaseModel):
    """Import method selection"""
    import_method: str  # 'google_classroom' or 'manual'
    google_classroom_api_key: Optional[str] = None  # For future implementation


class OnboardingStep4(BaseModel):
    """Subject selection (manual entry)"""
    subjects: List[SubjectInput]


class OnboardingStep5(BaseModel):
    """User availability selection"""
    availability: List[DayAvailability]


class OnboardingComplete(BaseModel):
    """Complete onboarding data"""
    timezone: str
    education_system: str
    education_program: str
    import_method: str
    subjects: List[SubjectInput]
    availability: List[DayAvailability]
    study_goal: Optional[int] = None  # Study goal in hours per week


class UpdateProfile(BaseModel):
    """Update user profile"""
    timezone: Optional[str] = None
    education_system: Optional[str] = None
    education_program: Optional[str] = None
    study_goal: Optional[int] = None  # Study goal in hours per week


class ProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    education_system: str
    education_program: Optional[str]
    timezone: str
    study_goal: Optional[int]  # Study goal in hours per week

    @field_serializer('id', 'user_id')
    def serialize_uuid(self, value: UUID) -> str:
        return str(value)

    class Config:
        from_attributes = True


class SubjectResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    level: Optional[str]
    category: Optional[str]
    current_grade: Optional[str]
    target_grade: Optional[str]
    color: Optional[str]

    @field_serializer('id', 'user_id')
    def serialize_uuid(self, value: UUID) -> str:
        return str(value)

    class Config:
        from_attributes = True
