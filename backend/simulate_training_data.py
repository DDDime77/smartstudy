"""
Simulation script to populate pre-training data for LNIRT testing

This script simulates task completion for a test user with the following data:
- 2 easy calculus tasks (both correct, ~30s each)
- 5 medium calculus tasks (3 correct, ~65s each)
- 3 hard calculus tasks (none correct, ~109s each)

The script:
1. Creates tasks with LNIRT predictions
2. Marks them as completed with actual results
3. Triggers automatic training (general + personalized)
"""

import os
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
import psycopg2
from uuid import UUID
import json
from datetime import datetime, timedelta

# Load environment
load_dotenv()

# Configuration
USER_EMAIL = "you2@example.com"
SUBJECT = "Mathematics"
TOPIC = "Calculus"

# Task configurations
# Format: (difficulty, correct, time_seconds)
TASK_CONFIGS = [
    # 2 easy tasks - both correct, ~30s
    ("easy", True, 28),
    ("easy", True, 32),

    # 5 medium tasks - 3 correct, ~65s
    ("medium", True, 63),
    ("medium", True, 67),
    ("medium", False, 64),
    ("medium", True, 66),
    ("medium", False, 65),

    # 3 hard tasks - none correct, ~109s
    ("hard", False, 107),
    ("hard", False, 111),
    ("hard", False, 109),
]


def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(os.getenv('DATABASE_URL'))


def get_user_id(cursor, email: str) -> str:
    """Get user ID from email"""
    cursor.execute('SELECT id FROM users WHERE email = %s', (email,))
    result = cursor.fetchone()
    if not result:
        raise ValueError(f"User not found: {email}")
    return str(result[0])


def get_lnirt_prediction(cursor, user_id: str, topic: str, difficulty: str):
    """
    Get LNIRT prediction by calling the service through Python

    This simulates what the API does when creating a task
    """
    # Import here to avoid issues
    from app.ml import LNIRTService
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    # Create SQLAlchemy session
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db_session = Session()

    try:
        lnirt_service = LNIRTService(db_session)
        p_correct, expected_time = lnirt_service.predict(
            UUID(user_id), topic, difficulty
        )
        return float(p_correct), int(expected_time)
    finally:
        db_session.close()


def map_difficulty_to_numeric(difficulty: str) -> int:
    """Map difficulty string to numeric value"""
    mapping = {"easy": 1, "medium": 2, "hard": 3}
    return mapping.get(difficulty.lower(), 2)


def create_task_with_prediction(
    cursor,
    user_id: str,
    subject: str,
    topic: str,
    difficulty: str,
    predicted_correct: float,
    predicted_time: int,
    created_at: datetime
):
    """Create a practice task with LNIRT prediction"""

    difficulty_numeric = map_difficulty_to_numeric(difficulty)

    # Generate sample task content based on difficulty
    if difficulty == "easy":
        task_content = "Find the derivative of f(x) = 2x + 3"
        solution_content = "Using the power rule: f'(x) = 2"
        answer_content = "2"
    elif difficulty == "medium":
        task_content = "Find the derivative of f(x) = x² + 3x - 5"
        solution_content = "Using the power rule: f'(x) = 2x + 3"
        answer_content = "2x + 3"
    else:  # hard
        task_content = "Find the derivative of f(x) = sin(x²) · e^x"
        solution_content = "Using product rule and chain rule: f'(x) = 2x·cos(x²)·e^x + sin(x²)·e^x"
        answer_content = "2x·cos(x²)·e^x + sin(x²)·e^x"

    cursor.execute("""
        INSERT INTO practice_tasks (
            id, user_id, subject, topic, difficulty, difficulty_numeric,
            task_content, solution_content, answer_content,
            predicted_correct, predicted_time_seconds, lnirt_model_version,
            completed, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        ) RETURNING id
    """, (
        user_id, subject, topic, difficulty, difficulty_numeric,
        task_content, solution_content, answer_content,
        predicted_correct, predicted_time, 'v1.0',
        False, created_at, created_at
    ))

    task_id = cursor.fetchone()[0]
    return str(task_id)


def complete_task_with_actual(
    cursor,
    task_id: str,
    is_correct: bool,
    actual_time: int,
    completed_at: datetime
):
    """Mark task as completed with actual results"""

    cursor.execute("""
        UPDATE practice_tasks
        SET completed = TRUE,
            is_correct = %s,
            actual_time_seconds = %s,
            completed_at = %s,
            updated_at = %s
        WHERE id = %s
    """, (
        is_correct, actual_time, completed_at, completed_at, task_id
    ))


def trigger_training(user_id: str, topic: str):
    """
    Trigger LNIRT training (general + personalized)

    This simulates what the API does in the update endpoint
    """
    from app.ml import LNIRTService
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    # Create SQLAlchemy session
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db_session = Session()

    try:
        lnirt_service = LNIRTService(db_session)
        result = lnirt_service.auto_train_on_completion(
            UUID(user_id), topic
        )
        return result
    finally:
        db_session.close()


def main():
    """Run simulation"""

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        print("="*70)
        print("LNIRT TRAINING DATA SIMULATION")
        print("="*70)
        print()

        # Get user ID
        user_id = get_user_id(cursor, USER_EMAIL)
        print(f"User: {USER_EMAIL}")
        print(f"User ID: {user_id}")
        print()

        # Base timestamp - start 10 days ago
        base_time = datetime.utcnow() - timedelta(days=10)

        # Process each task
        for idx, (difficulty, is_correct, actual_time) in enumerate(TASK_CONFIGS, 1):
            print(f"Task {idx}/{len(TASK_CONFIGS)}: {difficulty.upper()}")
            print("-" * 50)

            # Timestamp for this task (spread over 10 days)
            created_at = base_time + timedelta(hours=idx * 24 // len(TASK_CONFIGS))
            completed_at = created_at + timedelta(seconds=actual_time)

            # 1. Get LNIRT prediction
            print("  Getting LNIRT prediction...")
            predicted_correct, predicted_time = get_lnirt_prediction(
                cursor, user_id, TOPIC, difficulty
            )
            print(f"    Predicted: {predicted_correct:.1%} correct, {predicted_time}s")

            # 2. Create task with prediction
            print("  Creating task...")
            task_id = create_task_with_prediction(
                cursor, user_id, SUBJECT, TOPIC, difficulty,
                predicted_correct, predicted_time, created_at
            )
            conn.commit()
            print(f"    Task created: {task_id}")

            # 3. Complete task with actual results
            print("  Completing task...")
            complete_task_with_actual(
                cursor, task_id, is_correct, actual_time, completed_at
            )
            conn.commit()
            print(f"    Actual: {'✓ Correct' if is_correct else '✗ Incorrect'}, {actual_time}s")

            # 4. Trigger training
            print("  Triggering LNIRT training...")
            training_result = trigger_training(user_id, TOPIC)

            # Display training results
            if 'general_training' in training_result:
                gen = training_result['general_training']
                if gen.get('status') == 'success':
                    print(f"    ✓ General training: {gen['n_samples']} samples, {gen['n_users']} users")
                elif gen.get('status') == 'no_new_data':
                    print(f"    ○ General training: No new data")
                else:
                    print(f"    ✗ General training: {gen.get('status', 'unknown')}")

            if 'user_training' in training_result:
                user = training_result['user_training']
                if user.get('status') == 'success':
                    print(f"    ✓ User training: θ={user['theta']:.3f}, τ={user['tau']:.3f}")
                else:
                    print(f"    ✗ User training: {user.get('status', 'unknown')}")

            print()

        print("="*70)
        print("SIMULATION COMPLETE!")
        print("="*70)
        print()

        # Summary statistics
        cursor.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct,
                AVG(actual_time_seconds) as avg_time
            FROM practice_tasks
            WHERE user_id = %s
        """, (user_id,))

        total, correct, avg_time = cursor.fetchone()
        print(f"Total tasks: {total}")
        print(f"Correct: {correct}/{total} ({100*correct/total:.1f}%)")
        print(f"Average time: {avg_time:.1f}s")
        print()

        # Check training data
        cursor.execute("""
            SELECT COUNT(*) FROM lnirt_training_data
            WHERE user_id = %s
        """, (user_id,))
        training_count = cursor.fetchone()[0]
        print(f"Training records: {training_count}")

        # Check model
        cursor.execute("""
            SELECT n_users, n_training_samples, last_trained_at
            FROM lnirt_models
            WHERE topic = %s
            ORDER BY last_trained_at DESC
            LIMIT 1
        """, (TOPIC,))

        model = cursor.fetchone()
        if model:
            print(f"Model trained: {model[0]} users, {model[1]} samples")
            print(f"Last trained: {model[2]}")
        else:
            print("No model found (this is unexpected!)")

    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
