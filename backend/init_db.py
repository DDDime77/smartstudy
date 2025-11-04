#!/usr/bin/env python3
"""
Database initialization script.
Run this to create all tables in the database.
"""

from app.core.database import engine, Base
from app.models import User, UserProfile, Subject, Task, StudySession

def init_database():
    """Initialize database tables"""
    print("Creating database tables...")

    # Create all tables
    Base.metadata.create_all(bind=engine)

    print("✅ Database tables created successfully!")
    print("\nTables created:")
    print("  - users")
    print("  - user_profiles")
    print("  - subjects")
    print("  - tasks")
    print("  - study_sessions")


if __name__ == "__main__":
    init_database()
