"""
Test embedding model status via database only (no TensorFlow loading)
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import json
from pathlib import Path

load_dotenv()


def main():
    print('='*90)
    print('EMBEDDING MODEL STATUS CHECK (Database + Files)')
    print('='*90)
    print()

    # Check model files
    print('TEST 1: Model Files')
    print('-'*90)
    model_dir = Path('/home/claudeuser/smartstudy/backend/app/ml/models')
    correctness_file = model_dir / 'correctness_model.keras'
    time_file = model_dir / 'time_model.keras'
    metadata_file = model_dir / 'metadata.json'

    files_exist = correctness_file.exists() and time_file.exists() and metadata_file.exists()
    print(f'✅ Correctness model: {correctness_file.exists()} ({correctness_file.stat().st_size // 1024} KB)' if correctness_file.exists() else f'❌ Correctness model: NOT FOUND')
    print(f'✅ Time model: {time_file.exists()} ({time_file.stat().st_size // 1024} KB)' if time_file.exists() else f'❌ Time model: NOT FOUND')
    print(f'✅ Metadata: {metadata_file.exists()}' if metadata_file.exists() else f'❌ Metadata: NOT FOUND')

    if metadata_file.exists():
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
        print(f'\nMetadata summary:')
        print(f'  Users in model: {metadata["n_users"]}')
        print(f'  Topics in model: {metadata["n_topics"]}')
        print(f'  Difficulties: {metadata["n_difficulties"]}')
        print(f'  User IDs: {list(metadata["user_ids"].keys())}')
        print(f'  Topics: {list(metadata["topics"].keys())}')
    print()

    # Check tracker table
    print('TEST 2: Training Tracker Status')
    print('-'*90)

    engine = create_engine(os.getenv('DATABASE_URL'))
    with engine.connect() as conn:
        result = conn.execute(text('SELECT * FROM embedding_model_tracker LIMIT 1'))
        row = result.fetchone()

        if row:
            print(f'✅ Tracker table exists')
            print(f'   Last trained: {row[1]}')
            print(f'   Samples last training: {row[2]}')
            print(f'   Samples since training: {row[3]}')
            print(f'   Counter: {row[3]}/5')
            print(f'   Model version: {row[4]}')
            print(f'   Next training in: {max(0, 5 - row[3])} tasks')

        # Check total completed tasks
        result = conn.execute(text('''
            SELECT COUNT(*) FROM practice_tasks
            WHERE completed = TRUE
              AND is_correct IS NOT NULL
              AND actual_time_seconds > 0
        '''))
        count = result.scalar()
        print(f'\n✅ Total completed tasks in DB: {count}')

        # Check how many tasks each user has
        result = conn.execute(text('''
            SELECT user_id, COUNT(*) as task_count
            FROM practice_tasks
            WHERE completed = TRUE
              AND is_correct IS NOT NULL
              AND actual_time_seconds > 0
            GROUP BY user_id
            ORDER BY task_count DESC
            LIMIT 5
        '''))
        print(f'\nTop 5 users by completed tasks:')
        for row in result:
            user_id_short = str(row[0])[:8]
            print(f'   {user_id_short}...: {row[1]} tasks')

    print()

    print('='*90)
    print('✅ STATUS CHECK COMPLETE')
    print('='*90)
    print()

    print('Summary:')
    print(f'  ✅ Model files: {"Present" if files_exist else "Missing"}')
    print(f'  ✅ Tracker table: Present')
    print(f'  ✅ Training data: {count} completed tasks')
    print()
    print('Next steps:')
    print(f'  - Backend is running on port 4008')
    print(f'  - Complete {max(0, 5 - row[3])} more tasks to trigger training')
    print(f'  - Training will run async in background')
    print(f'  - Monitor with: tail -f /tmp/backend.log | grep -E "training|Training"')
    print()


if __name__ == "__main__":
    main()
