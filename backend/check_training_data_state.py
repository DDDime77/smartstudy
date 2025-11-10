"""
Check Training Data State - Diagnose why training returns no_new_data
"""

import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
from uuid import UUID
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

load_dotenv()

BULK_USER_ID = UUID('537b7b10-dd68-4e27-844f-20882922538a')


def main():
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()

    print('='*90)
    print('TRAINING DATA STATE DIAGNOSIS')
    print('='*90)
    print()

    # Check practice tasks
    print('1. PRACTICE TASKS')
    print('-'*90)
    tasks_query = text("""
        SELECT topic, difficulty, COUNT(*) as count
        FROM practice_tasks
        WHERE user_id = :user_id AND completed = TRUE
        GROUP BY topic, difficulty
        ORDER BY topic, difficulty
    """)
    result = db.execute(tasks_query, {'user_id': BULK_USER_ID})
    rows = result.fetchall()

    print(f'Completed practice tasks for bulk user:')
    for row in rows:
        print(f'  {row[0]:20} {row[1]:10} {row[2]:5} tasks')
    print()

    # Check training data
    print('2. LNIRT TRAINING DATA')
    print('-'*90)
    training_query = text("""
        SELECT topic, difficulty, COUNT(*) as count,
               SUM(CASE WHEN used_for_general_training THEN 1 ELSE 0 END) as used_general,
               SUM(CASE WHEN NOT used_for_general_training THEN 1 ELSE 0 END) as unused_general
        FROM lnirt_training_data
        WHERE user_id = :user_id
        GROUP BY topic, difficulty
        ORDER BY topic, difficulty
    """)
    result = db.execute(training_query, {'user_id': BULK_USER_ID})
    rows = result.fetchall()

    print(f'Training data for bulk user:')
    for row in rows:
        print(f'  {row[0]:20} {row[1]:10} Total: {row[2]:5}, Used: {row[3]:5}, Unused: {row[4]:5}')
    print()

    # Check if data is synced properly
    print('3. SYNC STATUS')
    print('-'*90)
    sync_query = text("""
        SELECT
            pt.topic,
            COUNT(DISTINCT pt.id) as completed_tasks,
            COUNT(DISTINCT ltd.practice_task_id) as synced_to_training
        FROM practice_tasks pt
        LEFT JOIN lnirt_training_data ltd ON pt.id = ltd.practice_task_id
        WHERE pt.user_id = :user_id AND pt.completed = TRUE
        GROUP BY pt.topic
        ORDER BY pt.topic
    """)
    result = db.execute(sync_query, {'user_id': BULK_USER_ID})
    rows = result.fetchall()

    print(f'Sync status:')
    for row in rows:
        print(f'  {row[0]:20} Completed: {row[1]:5}, Synced: {row[2]:5}')
    print()

    # Check models
    print('4. CURRENT MODELS')
    print('-'*90)
    models_query = text("""
        SELECT topic, model_version, n_training_samples, last_trained_at
        FROM lnirt_models
        WHERE model_version = 'v1.0'
        ORDER BY topic
    """)
    result = db.execute(models_query)
    rows = result.fetchall()

    if rows:
        print(f'Current models:')
        for row in rows:
            print(f'  {row[0]:20} Version: {row[1]:6} Samples: {row[2]:5} Last trained: {row[3]}')
    else:
        print('  No models found')
    print()

    # Check unused training data count
    print('5. UNUSED TRAINING DATA (Should trigger retraining)')
    print('-'*90)
    unused_query = text("""
        SELECT topic, COUNT(*) as unused_count
        FROM lnirt_training_data
        WHERE used_for_general_training = FALSE
        GROUP BY topic
        ORDER BY topic
    """)
    result = db.execute(unused_query)
    rows = result.fetchall()

    if rows:
        print(f'Unused training data per topic:')
        for row in rows:
            print(f'  {row[0]:20} Unused: {row[1]:5} samples')
    else:
        print('  All training data has been used')
    print()

    # Diagnosis
    print('='*90)
    print('DIAGNOSIS')
    print('='*90)
    print()

    # Check if we need to sync tasks to training data
    sync_result = db.execute(sync_query, {'user_id': BULK_USER_ID})
    sync_rows = sync_result.fetchall()

    needs_sync = False
    for row in sync_rows:
        if row[1] > row[2]:  # completed > synced
            needs_sync = True
            print(f'⚠ {row[0]}: {row[1] - row[2]} tasks not synced to training data')

    if needs_sync:
        print('\nACTION REQUIRED: Sync practice tasks to training data')

    # Check if we have unused data
    unused_result = db.execute(unused_query)
    unused_rows = unused_result.fetchall()

    if not unused_rows:
        print('⚠ All training data marked as used - need to reset flags')
        print('\nACTION REQUIRED: Reset used_for_general_training flags')
    else:
        print('✅ Unused training data available for retraining')

    print()

    db.close()


if __name__ == "__main__":
    main()
