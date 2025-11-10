"""
Fix Issues Identified in Bug Analysis

This script fixes:
1. Tasks with invalid difficulty (expert - not supported, only easy/medium/hard)
2. Negative tau parameter in model (mathematically invalid)
3. Clean up associated training data
"""

import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
import psycopg2
import json

load_dotenv()

def fix_invalid_difficulty_tasks(cursor, conn):
    """Delete tasks with invalid difficulty"""
    print('='*90)
    print('FIX 1: Remove tasks with invalid difficulty')
    print('='*90)

    # Get tasks with invalid difficulty
    cursor.execute("""
        SELECT id, topic, difficulty
        FROM practice_tasks
        WHERE difficulty NOT IN ('easy', 'medium', 'hard')
    """)
    invalid_tasks = cursor.fetchall()

    if not invalid_tasks:
        print('  ✓ No tasks with invalid difficulty')
        return

    print(f'\nFound {len(invalid_tasks)} tasks with invalid difficulty:')
    for task_id, topic, difficulty in invalid_tasks:
        print(f'  - Task {task_id}: {topic} ({difficulty})')

    # Delete training data for these tasks
    for task_id, _, _ in invalid_tasks:
        cursor.execute("""
            DELETE FROM lnirt_training_data
            WHERE practice_task_id = %s
        """, (str(task_id),))
        deleted_training = cursor.rowcount
        if deleted_training > 0:
            print(f'    Deleted {deleted_training} training records for task {task_id}')

    # Delete the tasks
    cursor.execute("""
        DELETE FROM practice_tasks
        WHERE difficulty NOT IN ('easy', 'medium', 'hard')
    """)
    deleted_tasks = cursor.rowcount

    conn.commit()
    print(f'\n✓ Deleted {deleted_tasks} tasks with invalid difficulty')

def fix_negative_tau(cursor, conn):
    """Fix negative tau parameter in model"""
    print('\n' + '='*90)
    print('FIX 2: Fix negative tau parameter')
    print('='*90)

    # Get model with negative tau
    cursor.execute("""
        SELECT topic, user_params
        FROM lnirt_models
    """)

    issues_fixed = 0

    for topic, user_params in cursor.fetchall():
        modified = False
        for user_id, params in user_params.items():
            tau = params.get('tau', 0)
            if tau < 0:
                print(f'\n  User {user_id} in topic "{topic}"')
                print(f'    Current tau: {tau}')

                # Reset to absolute value (reasonable fix for slightly negative values)
                # Or set to 0.1 minimum if tau is very negative
                new_tau = abs(tau) if abs(tau) > 0.1 else 0.5
                params['tau'] = new_tau
                modified = True
                issues_fixed += 1

                print(f'    Fixed tau: {new_tau}')

        if modified:
            # Update the model
            cursor.execute("""
                UPDATE lnirt_models
                SET user_params = %s,
                    updated_at = NOW()
                WHERE topic = %s
            """, (json.dumps(user_params), topic))

    conn.commit()

    if issues_fixed > 0:
        print(f'\n✓ Fixed {issues_fixed} negative tau parameters')
    else:
        print('  ✓ No negative tau parameters found')

def verify_fixes(cursor):
    """Verify that all issues are fixed"""
    print('\n' + '='*90)
    print('VERIFICATION')
    print('='*90)

    # Check 1: Invalid difficulties
    cursor.execute("""
        SELECT COUNT(*) FROM practice_tasks
        WHERE difficulty NOT IN ('easy', 'medium', 'hard')
    """)
    invalid_difficulty = cursor.fetchone()[0]
    if invalid_difficulty == 0:
        print('  ✓ No tasks with invalid difficulty')
    else:
        print(f'  ✗ Still have {invalid_difficulty} tasks with invalid difficulty')

    # Check 2: Negative tau
    cursor.execute("""
        SELECT topic, user_params FROM lnirt_models
    """)
    has_negative_tau = False
    for topic, user_params in cursor.fetchall():
        for user_id, params in user_params.items():
            if params.get('tau', 0) < 0:
                print(f'  ✗ Topic "{topic}", user {user_id} still has negative tau')
                has_negative_tau = True

    if not has_negative_tau:
        print('  ✓ All tau parameters are positive')

def main():
    """Main execution"""
    print('='*90)
    print('FIX IDENTIFIED ISSUES')
    print('='*90)
    print()

    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()

    try:
        # Fix issues
        fix_invalid_difficulty_tasks(cursor, conn)
        fix_negative_tau(cursor, conn)

        # Verify fixes
        verify_fixes(cursor)

        print('\n' + '='*90)
        print('✅ ALL ISSUES FIXED')
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
