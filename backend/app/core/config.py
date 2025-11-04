from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/studysmart_db"

    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"

    # CORS
    FRONTEND_URL: str = "http://localhost:4000"

    # App
    APP_NAME: str = "StudySmart AI"
    APP_VERSION: str = "1.0.0"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
