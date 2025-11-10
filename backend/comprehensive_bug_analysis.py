"""
Comprehensive Bug Analysis Script

This script performs a thorough analysis of the entire system to identify:
1. Database integrity issues
2. LNIRT model consistency
3. Data synchronization issues
4. API functionality issues
5. Prediction accuracy issues
6. Training functionality issues
"""

import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
import psycopg2
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.ml import LNIRTService
from uuid import UUID
import json

load_dotenv()

def print_section(title):
    """Print a section header"""
    print('\n' + '='*90)
    print(title)
    print('='*90)

def check_database_integrity(cursor):
    """Check database integrity"""
    print_section('DATABASE INTEGRITY CHECK')

    issues = []

    # Check 1: Users without email
    cursor.execute("SELECT COUNT(*) FROM users WHERE email IS NULL OR email = ''")
    invalid_users = cursor.fetchone()[0]
    if invalid_users > 0:
        issues.append(f"Found {invalid_users} users without email")
        print(f"  ✗ Found {invalid_users} users without email")
    else:
        print(f"  ✓ All users have valid emails")

    # Check 2: Practice tasks without predictions
    cursor.execute("""
        SELECT COUNT(*) FROM practice_tasks
        WHERE predicted_correct IS NULL OR predicted_time_seconds IS NULL
    """)
    tasks_no_pred = cursor.fetchone()[0]
    if tasks_no_pred > 0:
        issues.append(f"Found {tasks_no_pred} practice tasks without predictions")
        print(f"  ⚠ Found {tasks_no_pred} practice tasks without predictions (may be old data)")
    else:
        print(f"  ✓ All practice tasks have predictions")

    # Check 3: Completed tasks without actual data
    cursor.execute("""
        SELECT COUNT(*) FROM practice_tasks
        WHERE completed = TRUE
        AND (is_correct IS NULL OR actual_time_seconds IS NULL)
    """)
    completed_no_actual = cursor.fetchone()[0]
    if completed_no_actual > 0:
        issues.append(f"Found {completed_no_actual} completed tasks without actual data")
        print(f"  ✗ Found {completed_no_actual} completed tasks without actual data")
    else:
        print(f"  ✓ All completed tasks have actual data")

    # Check 4: Practice tasks with invalid difficulty
    cursor.execute("""
        SELECT COUNT(*) FROM practice_tasks
        WHERE difficulty NOT IN ('easy', 'medium', 'hard')
    """)
    invalid_difficulty = cursor.fetchone()[0]
    if invalid_difficulty > 0:
        issues.append(f"Found {invalid_difficulty} tasks with invalid difficulty")
        print(f"  ✗ Found {invalid_difficulty} tasks with invalid difficulty")
    else:
        print(f"  ✓ All tasks have valid difficulty")

    # Check 5: Practice tasks with time <= 0
    cursor.execute("""
        SELECT COUNT(*) FROM practice_tasks
        WHERE completed = TRUE AND actual_time_seconds <= 0
    """)
    invalid_time = cursor.fetchone()[0]
    if invalid_time > 0:
        issues.append(f"Found {invalid_time} completed tasks with invalid time (<=0)")
        print(f"  ✗ Found {invalid_time} completed tasks with invalid time (<=0)")
    else:
        print(f"  ✓ All completed tasks have valid time")

    return issues

def check_data_synchronization(cursor):
    """Check data synchronization between practice_tasks and lnirt_training_data"""
    print_section('DATA SYNCHRONIZATION CHECK')

    issues = []

    # Check 1: Completed tasks not in training data
    cursor.execute("""
        SELECT COUNT(*) FROM practice_tasks pt
        WHERE pt.completed = TRUE
        AND pt.is_correct IS NOT NULL
        AND pt.actual_time_seconds IS NOT NULL
        AND pt.completed_at IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM lnirt_training_data ltd
            WHERE ltd.practice_task_id = pt.id
        )
    """)
    missing_training = cursor.fetchone()[0]
    if missing_training > 0:
        issues.append(f"Found {missing_training} completed tasks not synced to training data")
        print(f"  ✗ Found {missing_training} completed tasks not synced to training data")

        # Show sample
        cursor.execute("""
            SELECT pt.id, pt.user_id, pt.topic, pt.completed_at
            FROM practice_tasks pt
            WHERE pt.completed = TRUE
            AND pt.is_correct IS NOT NULL
            AND pt.actual_time_seconds IS NOT NULL
            AND pt.completed_at IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 FROM lnirt_training_data ltd
                WHERE ltd.practice_task_id = pt.id
            )
            LIMIT 5
        """)
        print(f"    Sample missing tasks:")
        for row in cursor.fetchall():
            print(f"      - Task {row[0]} (user: {row[1]}, topic: {row[2]}, completed: {row[3]})")
    else:
        print(f"  ✓ All completed tasks synced to training data")

    # Check 2: Training data without corresponding practice task
    cursor.execute("""
        SELECT COUNT(*) FROM lnirt_training_data ltd
        WHERE NOT EXISTS (
            SELECT 1 FROM practice_tasks pt
            WHERE pt.id = ltd.practice_task_id
        )
    """)
    orphan_training = cursor.fetchone()[0]
    if orphan_training > 0:
        issues.append(f"Found {orphan_training} training records without practice task")
        print(f"  ⚠ Found {orphan_training} training records without practice task (may be cleaned up)")
    else:
        print(f"  ✓ All training records have corresponding practice tasks")

    # Check 3: Training data vs practice task data mismatch
    cursor.execute("""
        SELECT COUNT(*) FROM lnirt_training_data ltd
        JOIN practice_tasks pt ON pt.id = ltd.practice_task_id
        WHERE (ltd.correct = 1 AND pt.is_correct = FALSE)
        OR (ltd.correct = 0 AND pt.is_correct = TRUE)
        OR ltd.response_time_seconds != pt.actual_time_seconds
    """)
    data_mismatch = cursor.fetchone()[0]
    if data_mismatch > 0:
        issues.append(f"Found {data_mismatch} training records with data mismatch")
        print(f"  ✗ Found {data_mismatch} training records with data mismatch")
    else:
        print(f"  ✓ All training records match practice task data")

    return issues

def check_lnirt_model(cursor, db):
    """Check LNIRT model consistency"""
    print_section('LNIRT MODEL CONSISTENCY CHECK')

    issues = []
    lnirt = LNIRTService(db)

    # Check 1: Model exists for topics with training data
    cursor.execute("""
        SELECT DISTINCT topic FROM lnirt_training_data
    """)
    topics_with_data = [row[0] for row in cursor.fetchall()]

    cursor.execute("""
        SELECT topic FROM lnirt_models
    """)
    topics_with_model = [row[0] for row in cursor.fetchall()]

    missing_models = set(topics_with_data) - set(topics_with_model)
    if missing_models:
        issues.append(f"Topics with training data but no model: {missing_models}")
        print(f"  ✗ Topics with training data but no model: {missing_models}")
    else:
        print(f"  ✓ All topics with training data have models")

    # Check 2: Model parameters validity
    for topic in topics_with_model:
        cursor.execute("""
            SELECT user_params, difficulty_params, n_training_samples, n_users
            FROM lnirt_models WHERE topic = %s
        """, (topic,))
        result = cursor.fetchone()

        if not result:
            continue

        user_params, diff_params, n_samples, n_users = result

        # Check user parameters
        if n_users != len(user_params):
            issues.append(f"Topic {topic}: n_users={n_users} but user_params has {len(user_params)} entries")
            print(f"  ✗ Topic {topic}: n_users mismatch")

        # Check difficulty parameters (should have 3 difficulties: 1, 2, 3)
        expected_diffs = {"1", "2", "3"}
        actual_diffs = set(diff_params.keys())
        if actual_diffs != expected_diffs:
            issues.append(f"Topic {topic}: Expected difficulties {expected_diffs}, got {actual_diffs}")
            print(f"  ✗ Topic {topic}: Difficulty parameters incomplete")

        # Validate parameter ranges
        for user_id, params in user_params.items():
            theta = params.get("theta", 0)
            tau = params.get("tau", 0)

            # Theta should be reasonable (typically -3 to 3)
            if abs(theta) > 10:
                issues.append(f"Topic {topic}, user {user_id}: theta={theta} seems unreasonable")
                print(f"  ⚠ Topic {topic}, user {user_id}: theta={theta} seems unreasonable")

            # Tau should be positive
            if tau < 0:
                issues.append(f"Topic {topic}, user {user_id}: tau={tau} should be positive")
                print(f"  ✗ Topic {topic}, user {user_id}: tau={tau} should be positive")

        for diff, params in diff_params.items():
            a = params.get("a", 0)
            b = params.get("b", 0)
            beta = params.get("beta", 0)

            # a should be positive (discrimination parameter)
            if a <= 0:
                issues.append(f"Topic {topic}, difficulty {diff}: a={a} should be positive")
                print(f"  ✗ Topic {topic}, difficulty {diff}: a={a} should be positive")

            # beta should be positive (log-time intercept)
            if beta <= 0:
                issues.append(f"Topic {topic}, difficulty {diff}: beta={beta} should be positive")
                print(f"  ✗ Topic {topic}, difficulty {diff}: beta={beta} should be positive")

        if not issues:
            print(f"  ✓ Topic {topic}: Model parameters are valid")

    return issues

def check_predictions(cursor, db):
    """Check prediction functionality"""
    print_section('PREDICTION FUNCTIONALITY CHECK')

    issues = []
    lnirt = LNIRTService(db)

    # Get a sample user and topic
    cursor.execute("""
        SELECT DISTINCT user_id, topic FROM practice_tasks
        WHERE completed = TRUE
        LIMIT 5
    """)
    user_topics = cursor.fetchall()

    if not user_topics:
        print("  ⚠ No completed tasks found to test predictions")
        return issues

    for user_id, topic in user_topics:
        try:
            user_uuid = UUID(str(user_id))

            # Test predictions for all difficulties
            for difficulty in ['easy', 'medium', 'hard']:
                p_correct, pred_time = lnirt.predict(user_uuid, topic, difficulty)

                # Validate prediction ranges
                if not (0 <= p_correct <= 1):
                    issues.append(f"User {user_id}, {topic}, {difficulty}: p_correct={p_correct} out of range [0,1]")
                    print(f"  ✗ User {user_id}, {topic}, {difficulty}: p_correct out of range")

                if pred_time <= 0:
                    issues.append(f"User {user_id}, {topic}, {difficulty}: pred_time={pred_time} should be positive")
                    print(f"  ✗ User {user_id}, {topic}, {difficulty}: pred_time should be positive")

            if not any(f"User {user_id}" in issue for issue in issues):
                print(f"  ✓ User {user_id}, {topic}: All predictions valid")

        except Exception as e:
            issues.append(f"User {user_id}, {topic}: Prediction failed with {e}")
            print(f"  ✗ User {user_id}, {topic}: Prediction failed - {e}")

    return issues

def check_training(cursor, db):
    """Check training functionality"""
    print_section('TRAINING FUNCTIONALITY CHECK')

    issues = []
    lnirt = LNIRTService(db)

    # Get topics with training data
    cursor.execute("""
        SELECT topic, COUNT(*) as n_samples
        FROM lnirt_training_data
        GROUP BY topic
        HAVING COUNT(*) >= 5
        LIMIT 3
    """)
    topics = cursor.fetchall()

    if not topics:
        print("  ⚠ No topics with sufficient training data to test")
        return issues

    for topic, n_samples in topics:
        try:
            # Test general training
            result = lnirt.train_general(topic, verbose=False)

            if result.get('status') not in ['success', 'no_new_data']:
                issues.append(f"Topic {topic}: General training returned status {result.get('status')}")
                print(f"  ✗ Topic {topic}: General training failed")
            else:
                print(f"  ✓ Topic {topic}: General training working")

        except Exception as e:
            issues.append(f"Topic {topic}: General training failed with {e}")
            print(f"  ✗ Topic {topic}: General training exception - {e}")

    # Test user-specific training
    cursor.execute("""
        SELECT DISTINCT user_id, topic
        FROM lnirt_training_data
        GROUP BY user_id, topic
        HAVING COUNT(*) >= 3
        LIMIT 3
    """)
    user_topics = cursor.fetchall()

    for user_id, topic in user_topics:
        try:
            user_uuid = UUID(str(user_id))
            result = lnirt.train_user_specific(user_uuid, topic, verbose=False)

            if result.get('status') not in ['success', 'no_new_data']:
                issues.append(f"User {user_id}, {topic}: Personalized training returned status {result.get('status')}")
                print(f"  ✗ User {user_id}, {topic}: Personalized training failed")
            else:
                print(f"  ✓ User {user_id}, {topic}: Personalized training working")

        except Exception as e:
            issues.append(f"User {user_id}, {topic}: Personalized training failed with {e}")
            print(f"  ✗ User {user_id}, {topic}: Personalized training exception - {e}")

    return issues

def main():
    """Main execution"""
    print('='*90)
    print('COMPREHENSIVE BUG ANALYSIS')
    print('='*90)
    print()
    print('Checking all system components for issues...')

    # Connect to database
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()

    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()

    all_issues = []

    try:
        # Run all checks
        all_issues.extend(check_database_integrity(cursor))
        all_issues.extend(check_data_synchronization(cursor))
        all_issues.extend(check_lnirt_model(cursor, db))
        all_issues.extend(check_predictions(cursor, db))
        all_issues.extend(check_training(cursor, db))

        # Summary
        print_section('ANALYSIS SUMMARY')

        if all_issues:
            print(f'\n⚠ Found {len(all_issues)} issues:\n')
            for i, issue in enumerate(all_issues, 1):
                print(f'  {i}. {issue}')
        else:
            print('\n✅ No issues found! System is working correctly.')

        print('\n' + '='*90)
        print('ANALYSIS COMPLETE')
        print('='*90)

    except Exception as e:
        print(f'\n✗ ERROR during analysis: {e}')
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()
        db.close()

if __name__ == "__main__":
    main()
