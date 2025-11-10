"""
Create Comprehensive Dataset for bulk@example.com

This script creates 600 completed tasks:
- 300 Calculus tasks (good performance, fast times)
- 300 Microeconomics tasks (realistic IB DP performance)

The data will be used to train dedicated models for this user.
"""

import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
import psycopg2
from uuid import uuid4, UUID
from datetime import datetime, timedelta
import random
import numpy as np

load_dotenv()

# User configuration
BULK_USER_EMAIL = 'bulk@example.com'
BULK_USER_ID = '537b7b10-dd68-4e27-844f-20882922538a'

# Task configurations
CALCULUS_CONFIG = {
    'easy': {
        'count': 100,
        'success_rate': 0.85,  # 85% average
        'avg_time': 60,
        'time_std': 10,
        'min_time': 40,
        'max_time': 80
    },
    'medium': {
        'count': 100,
        'success_rate': 0.65,  # 65% average
        'avg_time': 220,
        'time_std': 20,
        'min_time': 180,
        'max_time': 260
    },
    'hard': {
        'count': 100,
        'success_rate': 0.35,  # 35% average
        'avg_time': 450,
        'time_std': 50,
        'min_time': 350,
        'max_time': 550
    }
}

MICROECONOMICS_CONFIG = {
    'easy': {
        'count': 100,
        'success_rate': 0.75,  # 75% average - realistic for IB DP
        'avg_time': 80,
        'time_std': 15,
        'min_time': 50,
        'max_time': 110
    },
    'medium': {
        'count': 100,
        'success_rate': 0.55,  # 55% average - realistic for IB DP medium questions
        'avg_time': 250,
        'time_std': 40,
        'min_time': 170,
        'max_time': 330
    },
    'hard': {
        'count': 100,
        'success_rate': 0.30,  # 30% average - realistic for IB DP hard questions
        'avg_time': 550,
        'time_std': 80,
        'min_time': 400,
        'max_time': 700
    }
}

DIFFICULTY_MAP = {'easy': 1, 'medium': 2, 'hard': 3}


def generate_performance_data(config):
    """
    Generate realistic performance data based on configuration

    Returns: (is_correct, time_seconds)
    """
    # Determine if correct based on success rate
    is_correct = random.random() < config['success_rate']

    # Generate time with normal distribution, clipped to min/max
    time_seconds = np.random.normal(config['avg_time'], config['time_std'])
    time_seconds = max(config['min_time'], min(config['max_time'], time_seconds))
    time_seconds = int(round(time_seconds))

    # Incorrect answers might take slightly longer on average
    if not is_correct:
        time_seconds = int(time_seconds * random.uniform(1.0, 1.2))

    return is_correct, time_seconds


def create_tasks_for_topic(cursor, conn, topic, subject, config, start_date):
    """
    Create tasks for a specific topic with given configuration
    """
    print(f'\n{"="*90}')
    print(f'Creating {sum(c["count"] for c in config.values())} tasks for {topic}')
    print(f'{"="*90}\n')

    task_ids = []
    current_date = start_date

    for difficulty, diff_config in config.items():
        print(f'  {difficulty.upper()} difficulty ({diff_config["count"]} tasks):')
        print(f'    Target success rate: {diff_config["success_rate"]:.0%}')
        print(f'    Target avg time: {diff_config["avg_time"]}s')

        correct_count = 0
        total_time = 0

        for i in range(diff_config['count']):
            # Generate performance data
            is_correct, actual_time = generate_performance_data(diff_config)

            if is_correct:
                correct_count += 1
            total_time += actual_time

            # Create task
            task_id = uuid4()

            # Timestamps: spread over past 30 days
            created_at = current_date
            completed_at = created_at + timedelta(seconds=actual_time)
            current_date += timedelta(minutes=random.randint(5, 60))  # Variable gaps between tasks

            # For this bulk dataset, we'll set predictions to None initially
            # They will be generated after training
            cursor.execute("""
                INSERT INTO practice_tasks (
                    id, user_id, subject, topic, difficulty, difficulty_numeric,
                    task_content, solution_content, answer_content,
                    predicted_correct, predicted_time_seconds, lnirt_model_version,
                    completed, is_correct, actual_time_seconds,
                    created_at, completed_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """, (
                str(task_id), BULK_USER_ID, subject, topic, difficulty, DIFFICULTY_MAP[difficulty],
                f'{difficulty.capitalize()} {topic} task #{i+1}',
                f'Solution for {topic} task #{i+1}',
                f'Answer for {topic} task #{i+1}',
                None, None, 'v1.0',
                True, is_correct, actual_time,
                created_at, completed_at, completed_at
            ))

            task_ids.append(task_id)

        actual_success_rate = correct_count / diff_config['count']
        actual_avg_time = total_time / diff_config['count']

        print(f'    ✓ Created {diff_config["count"]} tasks')
        print(f'    Actual success rate: {actual_success_rate:.0%}')
        print(f'    Actual avg time: {actual_avg_time:.0f}s')

    conn.commit()
    return task_ids


def train_models(cursor, conn):
    """
    Train LNIRT models for both topics with the generated data
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.ml import LNIRTService

    print(f'\n{"="*90}')
    print('TRAINING LNIRT MODELS')
    print(f'{"="*90}\n')

    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()
    lnirt = LNIRTService(db)

    user_uuid = UUID(BULK_USER_ID)

    # Train Calculus model
    print('Training Calculus model...')
    try:
        # General training (all users including bulk user)
        general_result = lnirt.train_general('Calculus', verbose=True)
        print(f'  General training: {general_result.get("status")}')

        # User-specific training
        user_result = lnirt.train_user_specific(user_uuid, 'Calculus', verbose=True)
        print(f'  Personalized training: {user_result.get("status")}')

        # Get user parameters
        params = lnirt.get_user_parameters(user_uuid, 'Calculus')
        print(f'  User parameters: θ={params["theta"]:.3f}, τ={params["tau"]:.3f}')
        print(f'  ✓ Calculus model trained successfully\n')
    except Exception as e:
        print(f'  ✗ Calculus training failed: {e}\n')

    # Train Microeconomics model
    print('Training Microeconomics model...')
    try:
        # General training
        general_result = lnirt.train_general('Microeconomics', verbose=True)
        print(f'  General training: {general_result.get("status")}')

        # User-specific training
        user_result = lnirt.train_user_specific(user_uuid, 'Microeconomics', verbose=True)
        print(f'  Personalized training: {user_result.get("status")}')

        # Get user parameters
        params = lnirt.get_user_parameters(user_uuid, 'Microeconomics')
        print(f'  User parameters: θ={params["theta"]:.3f}, τ={params["tau"]:.3f}')
        print(f'  ✓ Microeconomics model trained successfully\n')
    except Exception as e:
        print(f'  ✗ Microeconomics training failed: {e}\n')

    db.close()


def test_predictions(cursor, conn):
    """
    Test predictions for the bulk user on both topics
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.ml import LNIRTService

    print(f'\n{"="*90}')
    print('TESTING PREDICTIONS')
    print(f'{"="*90}\n')

    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()
    lnirt = LNIRTService(db)

    user_uuid = UUID(BULK_USER_ID)

    for topic in ['Calculus', 'Microeconomics']:
        print(f'{topic} predictions:')
        try:
            for difficulty in ['easy', 'medium', 'hard']:
                p_correct, pred_time = lnirt.predict(user_uuid, topic, difficulty)
                print(f'  {difficulty:6}: {p_correct:5.1%} success probability, {pred_time:4.0f}s expected time')

            # Check if personalized
            params = lnirt.get_user_parameters(user_uuid, topic)
            print(f'  Personalized: {params["is_personalized"]}')
            print(f'  θ={params["theta"]:.3f}, τ={params["tau"]:.3f}\n')
        except Exception as e:
            print(f'  ✗ Prediction failed: {e}\n')

    db.close()


def verify_isolation(cursor, conn):
    """
    Verify that the bulk user's data doesn't affect other users' models
    """
    print(f'\n{"="*90}')
    print('VERIFYING MODEL ISOLATION')
    print(f'{"="*90}\n')

    # Check how many users have data for each topic
    for topic in ['Calculus', 'Microeconomics']:
        cursor.execute("""
            SELECT COUNT(DISTINCT user_id) as n_users,
                   COUNT(*) as n_tasks
            FROM practice_tasks
            WHERE topic = %s AND completed = TRUE
        """, (topic,))
        n_users, n_tasks = cursor.fetchone()

        print(f'{topic}:')
        print(f'  Total users with completed tasks: {n_users}')
        print(f'  Total completed tasks: {n_tasks}')

        # Check bulk user's contribution
        cursor.execute("""
            SELECT COUNT(*) as n_tasks
            FROM practice_tasks
            WHERE topic = %s AND user_id = %s AND completed = TRUE
        """, (topic, BULK_USER_ID))
        bulk_tasks = cursor.fetchone()[0]

        print(f'  Bulk user tasks: {bulk_tasks} ({bulk_tasks/n_tasks*100:.1f}% of total)')

        # Check model
        cursor.execute("""
            SELECT n_users, n_training_samples
            FROM lnirt_models
            WHERE topic = %s
        """, (topic,))
        result = cursor.fetchone()
        if result:
            model_users, model_samples = result
            print(f'  Model has {model_users} users, {model_samples} training samples')
        else:
            print(f'  No model found for {topic}')
        print()


def print_statistics(cursor):
    """
    Print comprehensive statistics about the created data
    """
    print(f'\n{"="*90}')
    print('DATASET STATISTICS')
    print(f'{"="*90}\n')

    # Overall stats
    cursor.execute("""
        SELECT
            topic,
            COUNT(*) as total_tasks,
            SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct,
            AVG(actual_time_seconds) as avg_time
        FROM practice_tasks
        WHERE user_id = %s AND completed = TRUE
        GROUP BY topic
        ORDER BY topic
    """, (BULK_USER_ID,))

    print('Per topic:')
    for topic, total, correct, avg_time in cursor.fetchall():
        accuracy = (correct / total * 100) if total > 0 else 0
        print(f'  {topic:20} - {total:3} tasks, {accuracy:5.1f}% accuracy, {avg_time:5.1f}s avg time')

    # Per difficulty
    print('\nPer difficulty:')
    cursor.execute("""
        SELECT
            topic,
            difficulty,
            COUNT(*) as total_tasks,
            SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct,
            AVG(actual_time_seconds) as avg_time
        FROM practice_tasks
        WHERE user_id = %s AND completed = TRUE
        GROUP BY topic, difficulty
        ORDER BY topic, difficulty
    """, (BULK_USER_ID,))

    current_topic = None
    for topic, difficulty, total, correct, avg_time in cursor.fetchall():
        if topic != current_topic:
            print(f'\n  {topic}:')
            current_topic = topic

        accuracy = (correct / total * 100) if total > 0 else 0
        print(f'    {difficulty:6} - {total:3} tasks, {accuracy:5.1f}% accuracy, {avg_time:5.1f}s avg')


def main():
    """
    Main execution
    """
    print('='*90)
    print('CREATE COMPREHENSIVE DATASET FOR bulk@example.com')
    print('='*90)
    print()
    print(f'User ID: {BULK_USER_ID}')
    print(f'Email: {BULK_USER_EMAIL}')
    print()
    print('This script will create:')
    print('  • 300 Calculus tasks (expert-level performance)')
    print('  • 300 Microeconomics tasks (realistic IB DP performance)')
    print('  • Train dedicated LNIRT models')
    print('  • Test predictions')
    print('  • Verify model isolation')
    print()

    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()

    try:
        # Start date: 30 days ago
        start_date = datetime.utcnow() - timedelta(days=30)

        # Create Calculus tasks
        calculus_tasks = create_tasks_for_topic(
            cursor, conn,
            topic='Calculus',
            subject='Mathematics',
            config=CALCULUS_CONFIG,
            start_date=start_date
        )

        # Create Microeconomics tasks
        micro_tasks = create_tasks_for_topic(
            cursor, conn,
            topic='Microeconomics',
            subject='Economics',
            config=MICROECONOMICS_CONFIG,
            start_date=start_date
        )

        # Print statistics
        print_statistics(cursor)

        # Train models
        train_models(cursor, conn)

        # Test predictions
        test_predictions(cursor, conn)

        # Verify isolation
        verify_isolation(cursor, conn)

        print('='*90)
        print('✅ DATASET CREATION COMPLETE')
        print('='*90)
        print()
        print(f'Created {len(calculus_tasks) + len(micro_tasks)} tasks total')
        print('  • 300 Calculus tasks')
        print('  • 300 Microeconomics tasks')
        print('  • Both models trained')
        print('  • Predictions verified')
        print()

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
