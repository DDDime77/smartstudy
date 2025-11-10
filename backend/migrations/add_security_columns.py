"""
Migration: Add security columns to users table
Run this script to add password_updated_at and deleted_at columns
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    """Add security columns to users table"""

    migrations = [
        # Add password tracking column
        """
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMP;
        """,
        # Add soft delete column
        """
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
        """,
    ]

    print("🔧 Starting migration: Add security columns to users table")

    with engine.connect() as conn:
        for i, migration in enumerate(migrations, 1):
            try:
                conn.execute(text(migration))
                conn.commit()
                print(f"✅ Migration {i}/{len(migrations)} completed successfully")
            except Exception as e:
                print(f"❌ Migration {i}/{len(migrations)} failed: {str(e)}")
                conn.rollback()
                raise

    print("🎉 All migrations completed successfully!")

if __name__ == "__main__":
    run_migration()
