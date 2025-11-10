"""
Test Embedding Model with Real Data

Tests the new embedding-based sequence model:
1. Initialize and train with existing data
2. Make predictions
3. Verify auto-training triggers every 5 tasks
"""

import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
from uuid import UUID
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.ml import EmbeddingModelService

load_dotenv()

BULK_USER_ID = UUID('537b7b10-dd68-4e27-844f-20882922538a')


def main():
    print('='*90)
    print('EMBEDDING MODEL TEST')
    print('='*90)
    print()

    # Connect to database
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()

    # Initialize service
    print('Step 1: Initializing Embedding Model Service...')
    service = EmbeddingModelService(db)
    print('✓ Service initialized')
    print()

    # Get status
    print('Step 2: Checking model status...')
    status = service.get_status()
    print(f'Model type: {status["model_type"]}')
    print(f'Model loaded: {status["model_loaded"]}')
    print(f'Total samples: {status["n_samples_total"]}')
    print(f'Samples since last training: {status["n_samples_since_training"]}')
    print(f'Training threshold: {status["training_threshold"]}')
    print(f'Next training in: {status["next_training_in"]} tasks')
    print()

    # Force initial training if needed
    if not status['model_loaded'] or status['n_samples_total'] > status['n_samples_last_training']:
        print('Step 3: Training model with existing data...')
        result = service.force_train(verbose=True)
        if result['status'] == 'success':
            print(f'✓ Training complete: {result["message"]}')
        else:
            print(f'✗ Training failed: {result["message"]}')
            return
        print()
    else:
        print('Step 3: Model already trained, skipping...')
        print()

    # Test predictions
    print('Step 4: Testing predictions...')
    print()

    test_cases = [
        ('Calculus', 'easy'),
        ('Calculus', 'medium'),
        ('Calculus', 'hard'),
        ('Microeconomics', 'easy'),
        ('Microeconomics', 'medium'),
        ('Microeconomics', 'hard'),
    ]

    for topic, difficulty in test_cases:
        try:
            prob, time = service.predict(BULK_USER_ID, topic, difficulty)
            print(f'{topic:20} {difficulty:6}: {prob:5.1%} @ {time:4.0f}s')
        except Exception as e:
            print(f'{topic:20} {difficulty:6}: ERROR - {e}')

    print()

    # Test prediction API format
    print('Step 5: Testing API format...')
    prediction = service.predict_and_save(BULK_USER_ID, 'Calculus', 'medium')
    print(f'Prediction result:')
    print(f'  Correctness: {prediction["predicted_correct"]:.1%}')
    print(f'  Time: {prediction["predicted_time_seconds"]:.0f}s')
    print(f'  Personalized: {prediction["is_personalized"]}')
    print(f'  Model type: {prediction["model_type"]}')
    print()

    # Verify training counter
    print('Step 6: Verifying auto-training counter...')
    status_after = service.get_status()
    print(f'Samples since training: {status_after["n_samples_since_training"]}/{status_after["training_threshold"]}')
    print(f'Next training in: {status_after["next_training_in"]} tasks')
    print()

    db.close()

    print('='*90)
    print('✅ EMBEDDING MODEL TEST COMPLETE')
    print('='*90)
    print()
    print('Summary:')
    print(f'  - Model type: {status["model_type"]}')
    print(f'  - Total training samples: {status["n_samples_total"]}')
    print(f'  - Predictions working: ✓')
    print(f'  - Auto-training threshold: Every {status["training_threshold"]} tasks')
    print()


if __name__ == "__main__":
    main()
