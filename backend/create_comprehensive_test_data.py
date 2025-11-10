"""
Create comprehensive test dataset with multiple users

This script creates test data to demonstrate:
1. Multiple users contributing to general training (shared difficulty parameters)
2. Each user getting personalized predictions (individual θ and τ)
3. Predictions improving as more data is collected
4. New users starting with population average

Test users created:
- test_user_1: High ability, fast speed (expert)
- test_user_2: Medium ability, average speed (intermediate)
- test_user_3: Low ability, slow speed (beginner)

All test data will be marked for cleanup at the end.
"""

import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
import psycopg2
from uuid import uuid4
from datetime import datetime, timedelta
import json

load_dotenv()

# Test user profiles
TEST_USERS = [
    {
        'email': 'test_expert@test.com',
        'profile': 'expert',
        'tasks': [
            # Expert: High success rate, fast times
            ('easy', True, 15), ('easy', True, 18), ('easy', True, 16),
            ('medium', True, 35), ('medium', True, 40), ('medium', True, 38), ('medium', True, 42), ('medium', False, 45),
            ('hard', True, 75), ('hard', False, 80), ('hard', True, 78),
        ]
    },
    {
        'email': 'test_intermediate@test.com',
        'profile': 'intermediate',
        'tasks': [
            # Intermediate: Medium success, average times
            ('easy', True, 25), ('easy', True, 28), ('easy', False, 30),
            ('medium', True, 60), ('medium', False, 65), ('medium', True, 62), ('medium', False, 68), ('medium', True, 64),
            ('hard', False, 120), ('hard', False, 115), ('hard', True, 125),
        ]
    },
    {
        'email': 'test_beginner@test.com',
        'profile': 'beginner',
        'tasks': [
            # Beginner: Low success, slow times
            ('easy', True, 45), ('easy', False, 50), ('easy', True, 48),
            ('medium', False, 100), ('medium', False, 110), ('medium', True, 105), ('medium', False, 115), ('medium', False, 108),
            ('hard', False, 180), ('hard', False, 175), ('hard', False, 185),
        ]
    }
]

DIFFICULTY_MAP = {'easy': 1, 'medium': 2, 'hard': 3}


def create_test_users(cursor, conn):
    """Create test user accounts"""
    test_user_ids = []

    print('Creating test users...')
    for user_config in TEST_USERS:
        email = user_config['email']

        # Check if user already exists
        cursor.execute('SELECT id FROM users WHERE email = %s', (email,))
        existing = cursor.fetchone()

        if existing:
            user_id = existing[0]
            print(f'  User already exists: {email} ({user_id})')
        else:
            user_id = uuid4()
            # Create user (minimal fields, password hash is dummy)
            cursor.execute("""
                INSERT INTO users (id, email, password_hash, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                str(user_id),
                email,
                '$2b$12$dummyhash',  # Dummy password hash
                datetime.utcnow(),
                datetime.utcnow()
            ))
            print(f'  Created user: {email} ({user_id})')

        test_user_ids.append((user_id, user_config))

    conn.commit()
    return test_user_ids


def create_tasks_with_predictions(cursor, conn, user_ids):
    """Create tasks with predictions and actual results"""

    print('\nCreating tasks with predictions and training data...')

    # Import LNIRT service
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.ml import LNIRTService

    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()
    lnirt = LNIRTService(db)

    all_task_ids = []
    base_time = datetime.utcnow() - timedelta(days=7)

    for user_id, user_config in user_ids:
        email = user_config['email']
        profile = user_config['profile']
        tasks = user_config['tasks']

        print(f'\n  {profile.upper()} ({email}):')

        for idx, (difficulty, is_correct, actual_time) in enumerate(tasks, 1):
            # Get prediction
            try:
                # Convert string UUID to UUID object for LNIRT service
                from uuid import UUID as UUIDType
                user_uuid = UUIDType(str(user_id)) if isinstance(user_id, str) else user_id
                p_correct, pred_time = lnirt.predict(user_uuid, 'Calculus', difficulty)
                correct_symbol = '✓' if is_correct else '✗'
                print(f'    Task {idx}: {difficulty:6} - Pred: {p_correct:.1%}/{pred_time:.0f}s | Actual: {correct_symbol}/{actual_time}s', end='')
            except Exception as e:
                print(f'    Task {idx}: ERROR getting prediction: {e}')
                continue

            # Create task
            task_id = uuid4()
            created_at = base_time + timedelta(hours=idx)
            completed_at = created_at + timedelta(seconds=actual_time)

            diff_numeric = DIFFICULTY_MAP[difficulty]

            cursor.execute("""
                INSERT INTO practice_tasks (
                    id, user_id, subject, topic, difficulty, difficulty_numeric,
                    task_content, solution_content, answer_content,
                    predicted_correct, predicted_time_seconds, lnirt_model_version,
                    completed, is_correct, actual_time_seconds, completed_at,
                    created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """, (
                str(task_id), str(user_id), 'Mathematics', 'Calculus', difficulty, diff_numeric,
                f'{difficulty.capitalize()} calculus task', 'Solution', 'Answer',
                p_correct, int(pred_time), 'v1.0',
                True, is_correct, actual_time, completed_at,
                created_at, completed_at
            ))

            conn.commit()

            # Training data will be auto-synced by trigger
            # Now train the model
            try:
                from uuid import UUID as UUIDType
                user_uuid = UUIDType(str(user_id)) if isinstance(user_id, str) else user_id
                training_result = lnirt.auto_train_on_completion(user_uuid, 'Calculus')

                # Get updated prediction for next task
                p_correct_new, pred_time_new = lnirt.predict(user_uuid, 'Calculus', difficulty)
                improvement = (p_correct_new - p_correct) * 100
                print(f' → Next: {p_correct_new:.1%}/{pred_time_new:.0f}s ({improvement:+.1f}pp)')

            except Exception as e:
                print(f' → Training failed: {e}')

            all_task_ids.append(task_id)

    db.close()

    return all_task_ids


def print_statistics(cursor):
    """Print statistics about the test data"""

    print('\n' + '='*90)
    print('TEST DATA STATISTICS')
    print('='*90)

    # Overall stats
    cursor.execute("""
        SELECT
            COUNT(DISTINCT user_id) as users,
            COUNT(*) as tasks,
            SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct,
            AVG(actual_time_seconds) as avg_time
        FROM practice_tasks
        WHERE subject = 'Mathematics' AND topic = 'Calculus'
    """)

    users, tasks, correct, avg_time = cursor.fetchone()
    accuracy = (correct / tasks * 100) if tasks > 0 else 0

    print(f'\nOverall:')
    print(f'  Users: {users}')
    print(f'  Tasks: {tasks}')
    print(f'  Accuracy: {accuracy:.1f}% ({correct}/{tasks})')
    print(f'  Avg time: {avg_time:.1f}s')

    # Per user stats
    print(f'\nBy User:')
    cursor.execute("""
        SELECT
            u.email,
            COUNT(*) as tasks,
            SUM(CASE WHEN pt.is_correct THEN 1 ELSE 0 END) as correct,
            AVG(pt.actual_time_seconds) as avg_time
        FROM practice_tasks pt
        JOIN users u ON pt.user_id = u.id
        WHERE pt.subject = 'Mathematics' AND pt.topic = 'Calculus'
        GROUP BY u.email
        ORDER BY avg_time
    """)

    for email, tasks, correct, avg_time in cursor.fetchall():
        accuracy = (correct / tasks * 100) if tasks > 0 else 0
        print(f'  {email:30} - {tasks:2} tasks, {accuracy:5.1f}% correct, {avg_time:5.1f}s avg')

    # Model parameters
    print(f'\nModel Parameters:')
    cursor.execute("""
        SELECT user_params, difficulty_params, n_training_samples
        FROM lnirt_models
        WHERE topic = 'Calculus'
    """)

    result = cursor.fetchone()
    if result:
        user_params, diff_params, n_samples = result
        print(f'  Training samples: {n_samples}')
        print(f'  Users with personalization: {len(user_params)}')

        print(f'\n  User Parameters:')
        for uid, params in user_params.items():
            cursor.execute('SELECT email FROM users WHERE id::text = %s', (uid,))
            email = cursor.fetchone()
            email_str = email[0] if email else 'Unknown'
            theta = params["theta"]
            tau = params["tau"]
            print(f'    {email_str:30} θ={theta:6.3f}, τ={tau:6.3f}')

        print(f'\n  Difficulty Parameters (shared):')
        for diff, params in sorted(diff_params.items(), key=lambda x: int(x[0])):
            diff_name = {"1": "Easy", "2": "Medium", "3": "Hard"}.get(diff, f"Diff {diff}")
            a_val = params["a"]
            b_val = params["b"]
            beta_val = params["beta"]
            print(f'    {diff_name:6} - a={a_val:.3f}, b={b_val:.3f}, β={beta_val:.3f}')


def cleanup_test_data(cursor, conn, test_user_ids):
    """Clean up test data"""

    print('\n' + '='*90)
    print('CLEANUP')
    print('='*90)

    for user_id, user_config in test_user_ids:
        email = user_config['email']

        # Delete tasks
        cursor.execute('DELETE FROM practice_tasks WHERE user_id = %s', (str(user_id),))
        tasks_deleted = cursor.rowcount

        # Delete training data
        cursor.execute('DELETE FROM lnirt_training_data WHERE user_id = %s', (str(user_id),))
        training_deleted = cursor.rowcount

        # Delete user
        cursor.execute('DELETE FROM users WHERE id = %s', (str(user_id),))

        print(f'  Deleted user {email}:')
        print(f'    - {tasks_deleted} tasks')
        print(f'    - {training_deleted} training records')

    # Remove test users from model
    cursor.execute('SELECT user_params FROM lnirt_models WHERE topic = %s', ('Calculus',))
    result = cursor.fetchone()

    if result:
        user_params = result[0]
        original_count = len(user_params)

        for user_id, _ in test_user_ids:
            user_id_str = str(user_id)
            if user_id_str in user_params:
                del user_params[user_id_str]

        cursor.execute("""
            UPDATE lnirt_models
            SET user_params = %s,
                n_users = %s
            WHERE topic = %s
        """, (json.dumps(user_params), len(user_params), 'Calculus'))

        print(f'\n  Updated model:')
        print(f'    - Removed {original_count - len(user_params)} users from personalization')
        print(f'    - Remaining users: {len(user_params)}')

    conn.commit()
    print('\n✓ Cleanup complete')


def main():
    """Main execution"""

    print('='*90)
    print('COMPREHENSIVE TEST DATA CREATION')
    print('='*90)
    print()
    print('This script will:')
    print('  1. Create 3 test users with different ability levels')
    print('  2. Generate tasks with predictions for each user')
    print('  3. Train general model (difficulty parameters) on all users')
    print('  4. Train personalized parameters for each user')
    print('  5. Show how predictions adapt to each user')
    print('  6. Clean up all test data')
    print()

    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()

    try:
        # Step 1: Create test users
        test_user_ids = create_test_users(cursor, conn)

        # Step 2: Create tasks and train
        task_ids = create_tasks_with_predictions(cursor, conn, test_user_ids)

        # Step 3: Show statistics
        print_statistics(cursor)

        # Step 4: Cleanup
        cleanup_test_data(cursor, conn, test_user_ids)

        print('\n' + '='*90)
        print('✓ TEST COMPLETE - All test data created, used, and cleaned up')
        print('='*90)

    except Exception as e:
        print(f'\n✗ ERROR: {e}')
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
