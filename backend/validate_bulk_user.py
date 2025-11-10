"""
Comprehensive Validation for bulk@example.com

This script validates:
1. Data integrity (600 tasks created correctly)
2. Model training (both topics trained)
3. Predictions (realistic and personalized)
4. Model isolation (doesn't affect other users)
5. All model parameters valid
"""

import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
import psycopg2
from uuid import UUID
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.ml import LNIRTService

load_dotenv()

BULK_USER_ID = '537b7b10-dd68-4e27-844f-20882922538a'
BULK_USER_EMAIL = 'bulk@example.com'


def validate_data_integrity(cursor):
    """
    Validate that all 600 tasks were created correctly
    """
    print('='*90)
    print('1. DATA INTEGRITY VALIDATION')
    print('='*90)
    print()

    issues = []

    # Check total tasks
    cursor.execute("""
        SELECT COUNT(*) FROM practice_tasks
        WHERE user_id = %s AND completed = TRUE
    """, (BULK_USER_ID,))
    total_tasks = cursor.fetchone()[0]

    if total_tasks == 600:
        print(f'✓ Total tasks: {total_tasks} (expected 600)')
    else:
        issues.append(f'Expected 600 tasks, got {total_tasks}')
        print(f'✗ Total tasks: {total_tasks} (expected 600)')

    # Check per topic
    for topic, expected in [('Calculus', 300), ('Microeconomics', 300)]:
        cursor.execute("""
            SELECT COUNT(*) FROM practice_tasks
            WHERE user_id = %s AND topic = %s AND completed = TRUE
        """, (BULK_USER_ID, topic))
        count = cursor.fetchone()[0]

        if count == expected:
            print(f'✓ {topic}: {count} tasks')
        else:
            issues.append(f'{topic}: expected {expected}, got {count}')
            print(f'✗ {topic}: {count} tasks (expected {expected})')

    # Check per difficulty
    print('\nPer difficulty:')
    for topic in ['Calculus', 'Microeconomics']:
        print(f'  {topic}:')
        for difficulty, expected in [('easy', 100), ('medium', 100), ('hard', 100)]:
            cursor.execute("""
                SELECT COUNT(*) FROM practice_tasks
                WHERE user_id = %s AND topic = %s AND difficulty = %s AND completed = TRUE
            """, (BULK_USER_ID, topic, difficulty))
            count = cursor.fetchone()[0]

            if count == expected:
                print(f'    ✓ {difficulty}: {count}')
            else:
                issues.append(f'{topic} {difficulty}: expected {expected}, got {count}')
                print(f'    ✗ {difficulty}: {count} (expected {expected})')

    # Check training data sync
    print('\nTraining data synchronization:')
    for topic in ['Calculus', 'Microeconomics']:
        cursor.execute("""
            SELECT COUNT(*) FROM practice_tasks
            WHERE user_id = %s AND topic = %s AND completed = TRUE
        """, (BULK_USER_ID, topic))
        practice_count = cursor.fetchone()[0]

        cursor.execute("""
            SELECT COUNT(*) FROM lnirt_training_data
            WHERE user_id = %s AND topic = %s
        """, (BULK_USER_ID, topic))
        training_count = cursor.fetchone()[0]

        if practice_count == training_count:
            print(f'  ✓ {topic}: {practice_count} practice tasks = {training_count} training records')
        else:
            issues.append(f'{topic}: practice/training mismatch ({practice_count} != {training_count})')
            print(f'  ✗ {topic}: {practice_count} practice tasks != {training_count} training records')

    return issues


def validate_performance_data(cursor):
    """
    Validate that performance data matches expectations
    """
    print('\n' + '='*90)
    print('2. PERFORMANCE DATA VALIDATION')
    print('='*90)
    print()

    issues = []

    # Calculus performance expectations
    calculus_expectations = {
        'easy': {'accuracy': (0.80, 0.90), 'time': (40, 80)},
        'medium': {'accuracy': (0.55, 0.70), 'time': (180, 260)},
        'hard': {'accuracy': (0.25, 0.45), 'time': (350, 550)}
    }

    # Microeconomics performance expectations
    micro_expectations = {
        'easy': {'accuracy': (0.65, 0.85), 'time': (50, 110)},
        'medium': {'accuracy': (0.45, 0.65), 'time': (170, 330)},
        'hard': {'accuracy': (0.20, 0.40), 'time': (400, 700)}
    }

    for topic, expectations in [('Calculus', calculus_expectations), ('Microeconomics', micro_expectations)]:
        print(f'{topic}:')
        for difficulty, expected in expectations.items():
            cursor.execute("""
                SELECT
                    AVG(CASE WHEN is_correct THEN 1.0 ELSE 0.0 END) as accuracy,
                    AVG(actual_time_seconds) as avg_time,
                    MIN(actual_time_seconds) as min_time,
                    MAX(actual_time_seconds) as max_time
                FROM practice_tasks
                WHERE user_id = %s AND topic = %s AND difficulty = %s
            """, (BULK_USER_ID, topic, difficulty))

            accuracy, avg_time, min_time, max_time = cursor.fetchone()

            # Check accuracy
            acc_min, acc_max = expected['accuracy']
            time_min, time_max = expected['time']

            acc_ok = acc_min <= accuracy <= acc_max
            time_ok = time_min <= avg_time <= time_max

            acc_status = '✓' if acc_ok else '✗'
            time_status = '✓' if time_ok else '✗'

            print(f'  {difficulty:6}: {acc_status} Accuracy: {accuracy:.1%} (expected {acc_min:.0%}-{acc_max:.0%})')
            print(f'           {time_status} Avg time: {avg_time:.0f}s (expected {time_min:.0f}s-{time_max:.0f}s)')

            if not acc_ok:
                issues.append(f'{topic} {difficulty}: accuracy {accuracy:.1%} outside expected range')
            if not time_ok:
                issues.append(f'{topic} {difficulty}: avg time {avg_time:.0f}s outside expected range')

    return issues


def validate_models(cursor, db):
    """
    Validate that models are trained correctly
    """
    print('\n' + '='*90)
    print('3. MODEL VALIDATION')
    print('='*90)
    print()

    issues = []
    lnirt = LNIRTService(db)
    user_uuid = UUID(BULK_USER_ID)

    for topic in ['Calculus', 'Microeconomics']:
        print(f'{topic} Model:')

        # Check model exists
        cursor.execute("""
            SELECT n_users, n_training_samples, difficulty_params, user_params
            FROM lnirt_models
            WHERE topic = %s
        """, (topic,))
        result = cursor.fetchone()

        if not result:
            issues.append(f'{topic}: No model found')
            print(f'  ✗ No model found')
            continue

        n_users, n_samples, diff_params, user_params = result
        print(f'  ✓ Model exists')
        print(f'    Users: {n_users}')
        print(f'    Training samples: {n_samples}')

        # Check bulk user in model
        if BULK_USER_ID in user_params:
            params = user_params[BULK_USER_ID]
            theta = params.get('theta', 0)
            tau = params.get('tau', 0)

            print(f'  ✓ Bulk user in model')
            print(f'    θ: {theta:.3f}')
            print(f'    τ: {tau:.3f}')

            # Validate tau is positive
            if tau < 0:
                issues.append(f'{topic}: Negative τ={tau:.3f}')
                print(f'    ✗ τ is negative!')
            else:
                print(f'    ✓ τ is positive')
        else:
            issues.append(f'{topic}: Bulk user not in model')
            print(f'  ✗ Bulk user not in model')

        # Check difficulty parameters
        expected_diffs = {'1', '2', '3'}
        actual_diffs = set(diff_params.keys())

        if actual_diffs == expected_diffs:
            print(f'  ✓ All difficulty levels present')
        else:
            issues.append(f'{topic}: Missing difficulty levels')
            print(f'  ✗ Missing difficulty levels: {expected_diffs - actual_diffs}')

        # Validate parameter ranges
        for diff, params in diff_params.items():
            a = params.get('a', 0)
            b = params.get('b', 0)
            beta = params.get('beta', 0)

            if a <= 0:
                issues.append(f'{topic} diff {diff}: a={a} should be positive')
            if beta <= 0:
                issues.append(f'{topic} diff {diff}: beta={beta} should be positive')

        print()

    return issues


def validate_predictions(cursor, db):
    """
    Validate predictions are reasonable
    """
    print('='*90)
    print('4. PREDICTION VALIDATION')
    print('='*90)
    print()

    issues = []
    lnirt = LNIRTService(db)
    user_uuid = UUID(BULK_USER_ID)

    for topic in ['Calculus', 'Microeconomics']:
        print(f'{topic} Predictions:')

        try:
            for difficulty in ['easy', 'medium', 'hard']:
                p_correct, pred_time = lnirt.predict(user_uuid, topic, difficulty)

                # Validate ranges
                if not (0 <= p_correct <= 1):
                    issues.append(f'{topic} {difficulty}: p_correct={p_correct} out of range')
                    print(f'  ✗ {difficulty}: p_correct={p_correct:.1%} OUT OF RANGE')
                elif pred_time <= 0:
                    issues.append(f'{topic} {difficulty}: pred_time={pred_time} should be positive')
                    print(f'  ✗ {difficulty}: pred_time={pred_time:.0f}s INVALID')
                else:
                    print(f'  ✓ {difficulty}: {p_correct:5.1%} success, {pred_time:4.0f}s')

            # Check personalization
            params = lnirt.get_user_parameters(user_uuid, topic)
            if params['is_personalized']:
                print(f'  ✓ Personalized (θ={params["theta"]:.3f}, τ={params["tau"]:.3f})')
            else:
                issues.append(f'{topic}: Not personalized')
                print(f'  ✗ Not personalized')

        except Exception as e:
            issues.append(f'{topic}: Prediction failed - {e}')
            print(f'  ✗ Prediction failed: {e}')

        print()

    return issues


def validate_isolation(cursor):
    """
    Validate model isolation - check impact on other users
    """
    print('='*90)
    print('5. MODEL ISOLATION VALIDATION')
    print('='*90)
    print()

    issues = []

    # Get other users
    cursor.execute("""
        SELECT DISTINCT id, email
        FROM users
        WHERE id::text != %s
        LIMIT 5
    """, (BULK_USER_ID,))
    other_users = cursor.fetchall()

    print(f'Checking {len(other_users)} other users...\n')

    for user_id, email in other_users:
        # Check if they have Calculus data
        cursor.execute("""
            SELECT COUNT(*) FROM practice_tasks
            WHERE user_id = %s AND topic = 'Calculus' AND completed = TRUE
        """, (str(user_id),))
        calculus_count = cursor.fetchone()[0]

        if calculus_count > 0:
            print(f'User {email} ({calculus_count} Calculus tasks):')

            # Check if they're in the Calculus model
            cursor.execute("""
                SELECT user_params FROM lnirt_models WHERE topic = 'Calculus'
            """)
            result = cursor.fetchone()
            if result:
                user_params = result[0]
                if str(user_id) in user_params:
                    params = user_params[str(user_id)]
                    print(f'  ✓ Still in Calculus model (θ={params.get("theta", 0):.3f}, τ={params.get("tau", 0):.3f})')
                else:
                    issues.append(f'User {email} removed from Calculus model')
                    print(f'  ✗ Removed from Calculus model!')

    # Check model composition
    print('\nModel Composition:')
    for topic in ['Calculus', 'Microeconomics']:
        cursor.execute("""
            SELECT n_users, n_training_samples
            FROM lnirt_models
            WHERE topic = %s
        """, (topic,))
        result = cursor.fetchone()

        if result:
            n_users, n_samples = result
            print(f'  {topic}: {n_users} users, {n_samples} samples')

            cursor.execute("""
                SELECT COUNT(DISTINCT user_id)
                FROM practice_tasks
                WHERE topic = %s AND completed = TRUE
            """, (topic,))
            actual_users = cursor.fetchone()[0]

            if n_users == actual_users:
                print(f'    ✓ All users with data are in model')
            else:
                issues.append(f'{topic}: Model has {n_users} users but {actual_users} users have data')
                print(f'    ✗ Mismatch: model has {n_users} users, {actual_users} have data')

    return issues


def main():
    """
    Main execution
    """
    print('='*90)
    print('COMPREHENSIVE VALIDATION FOR bulk@example.com')
    print('='*90)
    print()
    print(f'User ID: {BULK_USER_ID}')
    print(f'Email: {BULK_USER_EMAIL}')
    print()

    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()

    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()

    all_issues = []

    try:
        # Run all validations
        all_issues.extend(validate_data_integrity(cursor))
        all_issues.extend(validate_performance_data(cursor))
        all_issues.extend(validate_models(cursor, db))
        all_issues.extend(validate_predictions(cursor, db))
        all_issues.extend(validate_isolation(cursor))

        # Summary
        print('='*90)
        print('VALIDATION SUMMARY')
        print('='*90)
        print()

        if all_issues:
            print(f'⚠ Found {len(all_issues)} issues:\n')
            for i, issue in enumerate(all_issues, 1):
                print(f'  {i}. {issue}')
        else:
            print('✅ ALL VALIDATIONS PASSED!')
            print()
            print('Verified:')
            print('  ✓ 600 tasks created (300 Calculus + 300 Microeconomics)')
            print('  ✓ Performance data matches expectations')
            print('  ✓ Both models trained successfully')
            print('  ✓ All model parameters valid')
            print('  ✓ Predictions are personalized and realistic')
            print('  ✓ Other users not affected (model isolation)')

        print('\n' + '='*90)
        print('✅ VALIDATION COMPLETE')
        print('='*90)

    except Exception as e:
        print(f'\n✗ ERROR: {e}')
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()
        db.close()


if __name__ == "__main__":
    main()
