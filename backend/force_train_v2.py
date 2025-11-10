"""
Force train V2 model and test predictions
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

load_dotenv()

from app.ml.embedding_service import EmbeddingModelService


def main():
    print('='*90)
    print('FORCE TRAINING V2 MODEL')
    print('='*90)
    print()

    # Create database connection
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Initialize service (loads V2 model)
        print('[1/3] Initializing EmbeddingModelService with V2 model...')
        service = EmbeddingModelService(db)
        print('  ✓ Service initialized')

        # Force train
        print('\n[2/3] Force training V2 model...')
        print('  This will take 2-3 minutes with 50 epochs...')
        print()

        result = service.force_train(verbose=True)

        print(f'\n  ✓ Training complete')
        print(f'  Status: {result.get("status")}')
        print(f'  Samples: {result.get("n_samples")}')
        print(f'  Message: {result.get("message")}')

        # Test prediction
        print('\n[3/3] Testing V2 model prediction...')

        # Get a real user ID from database
        from sqlalchemy import text
        result_query = db.execute(text('''
            SELECT user_id, topic, difficulty
            FROM practice_tasks
            WHERE completed = TRUE
            ORDER BY created_at DESC
            LIMIT 1
        '''))
        row = result_query.fetchone()

        if row:
            user_id = row[0]
            topic = row[1]
            difficulty = row[2]

            print(f'  Testing prediction for:')
            print(f'    User: {str(user_id)[:8]}...')
            print(f'    Topic: {topic}')
            print(f'    Difficulty: {difficulty}')

            prob, time_est = service.predict(user_id, topic, difficulty)

            print(f'\n  Prediction:')
            print(f'    Correctness: {prob:.4f} ({prob:.2%})')
            print(f'    Time: {time_est:.1f}s')

        print('\n' + '='*90)
        print('✅ V2 MODEL TRAINED AND READY')
        print('='*90)
        print()
        print('Next step: Restart backend to ensure V2 model is loaded')
        print('  pkill -f "uvicorn app.main:app"')
        print('  cd /home/claudeuser/smartstudy/backend')
        print('  nohup ./venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 4008 > /tmp/backend.log 2>&1 &')
        print()

    except Exception as e:
        print(f'\n❌ Error: {e}')
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == '__main__':
    main()
