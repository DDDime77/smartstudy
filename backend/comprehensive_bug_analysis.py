#!/usr/bin/env python3
"""
Comprehensive Bug Analysis - Check all system components for issues
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import requests

sys.path.insert(0, str(Path(__file__).parent))
load_dotenv()

def check_database():
    """Check database connectivity and basic queries"""
    print("\n" + "="*90)
    print("DATABASE CONNECTIVITY CHECK")
    print("="*90)

    try:
        engine = create_engine(os.getenv('DATABASE_URL'))
        Session = sessionmaker(bind=engine)
        db = Session()

        # Test basic query
        result = db.execute(text("SELECT COUNT(*) FROM users"))
        user_count = result.scalar()
        print(f"✅ Database connected")
        print(f"   Users in DB: {user_count}")

        # Test practice_tasks table
        result = db.execute(text("SELECT COUNT(*) FROM practice_tasks"))
        task_count = result.scalar()
        print(f"   Practice tasks: {task_count}")

        # Test embedding_model_tracker table
        result = db.execute(text("SELECT last_trained_at, n_samples_last_training FROM embedding_model_tracker LIMIT 1"))
        row = result.fetchone()
        if row:
            print(f"   Model last trained: {row[0]}")
            print(f"   Training samples: {row[1]}")

        db.close()
        return True

    except Exception as e:
        print(f"❌ Database error: {e}")
        return False

def check_backend_api():
    """Check backend API endpoints"""
    print("\n" + "="*90)
    print("BACKEND API CHECK")
    print("="*90)

    endpoints = [
        ("GET", "http://localhost:4008/"),
        ("GET", "http://localhost:4008/admin/training-status"),
    ]

    all_ok = True
    for method, url in endpoints:
        try:
            if method == "GET":
                response = requests.get(url, timeout=5)
            else:
                response = requests.post(url, timeout=5)

            if response.status_code in [200, 307]:  # 307 is redirect
                print(f"✅ {method} {url}: {response.status_code}")
            else:
                print(f"⚠️  {method} {url}: {response.status_code}")
                all_ok = False

        except Exception as e:
            print(f"❌ {method} {url}: {e}")
            all_ok = False

    return all_ok

def check_model_files():
    """Check ML model files exist and are valid"""
    print("\n" + "="*90)
    print("MODEL FILES CHECK")
    print("="*90)

    models_dir = Path("/home/claudeuser/smartstudy/backend/app/ml/models")
    required_files = [
        "correctness_model.keras",
        "time_model.keras",
        "metadata.json"
    ]

    all_exist = True
    for filename in required_files:
        filepath = models_dir / filename
        if filepath.exists():
            size = filepath.stat().st_size / 1024  # KB
            print(f"✅ {filename}: {size:.1f} KB")
        else:
            print(f"❌ {filename}: MISSING")
            all_exist = False

    return all_exist

def check_backend_logs():
    """Check backend logs for recent errors"""
    print("\n" + "="*90)
    print("BACKEND LOGS CHECK")
    print("="*90)

    log_file = Path("/tmp/backend.log")
    if not log_file.exists():
        print("⚠️  No backend log file found")
        return True

    # Read last 100 lines
    with open(log_file, 'r') as f:
        lines = f.readlines()
        recent_lines = lines[-100:]

    # Check for errors
    errors = []
    warnings = []
    for line in recent_lines:
        line_lower = line.lower()
        if "error" in line_lower and "cuda" not in line_lower:
            errors.append(line.strip())
        elif "warning" in line_lower and "cuda" not in line_lower:
            warnings.append(line.strip())

    if errors:
        print(f"⚠️  Found {len(errors)} errors in recent logs:")
        for i, error in enumerate(errors[:5], 1):  # Show first 5
            print(f"   {i}. {error[:100]}")
    else:
        print("✅ No errors in recent backend logs")

    if warnings:
        print(f"⚠️  Found {len(warnings)} warnings in recent logs")
    else:
        print("✅ No warnings in recent backend logs")

    return len(errors) == 0

def check_python_imports():
    """Check if critical Python modules can be imported"""
    print("\n" + "="*90)
    print("PYTHON IMPORTS CHECK")
    print("="*90)

    modules = [
        "app.ml.embedding_service",
        "app.ml.embedding_model_v2",
        "app.routers.admin",
        "app.routers.practice_tasks",
    ]

    all_ok = True
    for module in modules:
        try:
            __import__(module)
            print(f"✅ {module}")
        except Exception as e:
            print(f"❌ {module}: {e}")
            all_ok = False

    return all_ok

def main():
    print("="*90)
    print("COMPREHENSIVE BUG ANALYSIS")
    print("="*90)
    print()
    print("Checking all system components for issues...")

    results = {
        "Database": check_database(),
        "Backend API": check_backend_api(),
        "Model Files": check_model_files(),
        "Backend Logs": check_backend_logs(),
        "Python Imports": check_python_imports(),
    }

    print("\n" + "="*90)
    print("SUMMARY")
    print("="*90)
    print()

    all_passed = True
    for component, passed in results.items():
        icon = "✅" if passed else "❌"
        print(f"{icon} {component}")
        if not passed:
            all_passed = False

    print()
    print("="*90)

    if all_passed:
        print("✅ ALL CHECKS PASSED - NO CRITICAL BUGS FOUND")
    else:
        print("⚠️  SOME CHECKS FAILED - REVIEW ISSUES ABOVE")

    print("="*90)

    return 0 if all_passed else 1

if __name__ == '__main__':
    exit(main())
