from pydantic import BaseModel, EmailStr, field_serializer
from typing import Optional
from uuid import UUID


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: Optional[str] = None


class GoogleAuthRequest(BaseModel):
    token: str  # Google ID token


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str]
    email_verified: bool
    profile_completed: bool

    @field_serializer('id')
    def serialize_id(self, value: UUID) -> str:
        return str(value)

    class Config:
        from_attributes = True
