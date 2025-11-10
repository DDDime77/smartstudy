"""
Manually sync bulk user's completed tasks to lnirt_training_data

The database trigger only fires on UPDATE, not INSERT with completed=TRUE.
This script manually syncs all completed tasks to the training data table.
"""

import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
import psycopg2
from uuid import uuid4

load_dotenv()

BULK_USER_ID = '537b7b10-dd68-4e27-844f-20882922538a'


def sync_training_data(cursor, conn):
    """
    Sync completed tasks to lnirt_training_data
    """
    print('='*90)
    print('SYNCING TRAINING DATA')
    print('='*90)
    print()

    # Get all completed tasks without training data
    cursor.execute("""
        SELECT pt.id, pt.user_id, pt.topic, pt.difficulty_numeric,
               pt.is_correct, pt.actual_time_seconds
        FROM practice_tasks pt
        WHERE pt.user_id = %s
        AND pt.completed = TRUE
        AND pt.is_correct IS NOT NULL
        AND pt.actual_time_seconds IS NOT NULL
        AND pt.completed_at IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM lnirt_training_data ltd
            WHERE ltd.practice_task_id = pt.id
        )
    """, (BULK_USER_ID,))

    tasks = cursor.fetchall()
    print(f'Found {len(tasks)} completed tasks to sync')

    synced = 0
    for task_id, user_id, topic, difficulty, is_correct, time_seconds in tasks:
        try:
            training_id = uuid4()
            cursor.execute("""
                INSERT INTO lnirt_training_data (
                    id, user_id, topic, difficulty,
                    correct, response_time_seconds,
                    used_for_general_training, practice_task_id,
                    created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, NOW()
                )
            """, (
                str(training_id), str(user_id), topic, difficulty,
                1 if is_correct else 0, time_seconds,
                False, str(task_id)
            ))
            synced += 1
        except Exception as e:
            print(f'  ✗ Failed to sync task {task_id}: {e}')

    conn.commit()
    print(f'✓ Synced {synced} training records\n')

    # Verify sync
    print('Verification:')
    for topic in ['Calculus', 'Microeconomics']:
        cursor.execute("""
            SELECT COUNT(*) FROM lnirt_training_data
            WHERE user_id = %s AND topic = %s
        """, (BULK_USER_ID, topic))
        count = cursor.fetchone()[0]
        print(f'  {topic}: {count} training records')


def main():
    """
    Main execution
    """
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()

    try:
        sync_training_data(cursor, conn)
        print('\n' + '='*90)
        print('✅ SYNC COMPLETE')
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
