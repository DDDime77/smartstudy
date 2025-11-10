"""
Simulate task completion to trigger V2 training
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from uuid import UUID

load_dotenv()


def main():
    print('='*90)
    print('SIMULATE TASK COMPLETION TO TRIGGER V2 TRAINING')
    print('='*90)
    print()

    engine = create_engine(os.getenv('DATABASE_URL'))

    with engine.connect() as conn:
        # Get a real user and their incomplete task
        result = conn.execute(text('''
            SELECT id, user_id, topic, difficulty
            FROM practice_tasks
            WHERE completed = FALSE
            ORDER BY created_at DESC
            LIMIT 1
        '''))

        row = result.fetchone()

        if not row:
            print('❌ No incomplete tasks found')
            print('Creating a dummy completed task instead...')

            # Get a real user
            result = conn.execute(text('''
                SELECT user_id FROM practice_tasks
                ORDER BY created_at DESC
                LIMIT 1
            '''))
            user_row = result.fetchone()

            if not user_row:
                print('❌ No users found in database')
                return

            user_id = user_row[0]

            # Insert a completed task
            conn.execute(text('''
                INSERT INTO practice_tasks (
                    user_id, subject, topic, difficulty,
                    task_content, completed, is_correct, actual_time_seconds,
                    created_at, updated_at
                )
                VALUES (
                    :user_id, 'Test', 'Calculus', 'medium',
                    'Test task for training trigger', TRUE, TRUE, 60.0,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
            '''), {'user_id': user_id})
            conn.commit()

            print(f'✓ Created completed task for user {str(user_id)[:8]}...')

        else:
            task_id = row[0]
            user_id = row[1]
            topic = row[2]
            difficulty = row[3]

            print(f'Found incomplete task:')
            print(f'  ID: {task_id}')
            print(f'  User: {str(user_id)[:8]}...')
            print(f'  Topic: {topic}')
            print(f'  Difficulty: {difficulty}')
            print()

            # Mark as completed
            conn.execute(text('''
                UPDATE practice_tasks
                SET completed = TRUE,
                    is_correct = TRUE,
                    actual_time_seconds = 60.0,
                    completed_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :task_id
            '''), {'task_id': task_id})
            conn.commit()

            print(f'✓ Marked task as completed')

        # Now trigger the training by calling the service
        print(f'\n🚀 Triggering training via embedding service...')
        print(f'   This will take 2-3 minutes with 50 epochs...')
        print()

        # Import and call service
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).parent))

        from sqlalchemy.orm import sessionmaker
        from app.ml.embedding_service import EmbeddingModelService

        Session = sessionmaker(bind=engine)
        db = Session()

        try:
            service = EmbeddingModelService(db)

            # Call on_task_completed with async=False to train synchronously
            print('📊 Training V2 model synchronously (you will see progress)...\n')

            result = service.on_task_completed(
                user_id=user_id,
                topic='Calculus',
                verbose=True,
                async_training=False  # Synchronous for monitoring
            )

            print(f'\n✅ Training complete!')
            print(f'   Result: {result}')

        except Exception as e:
            print(f'\n❌ Training failed: {e}')
            import traceback
            traceback.print_exc()
        finally:
            db.close()

    print(f'\n' + '='*90)


if __name__ == '__main__':
    main()
