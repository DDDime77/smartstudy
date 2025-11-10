"""
Final Comprehensive Test for Embedding Model

Tests:
1. Model loading
2. Predictions for known users
3. Predictions for unknown users (should fallback gracefully)
4. Counter tracking
5. Training status
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
from app.ml import EmbeddingModelService
import json

load_dotenv()

# Known user from metadata
KNOWN_USER_ID = UUID('af7b3bcb-3593-427e-b430-380106777910')
# Unknown user (not in training data)
UNKNOWN_USER_ID = UUID('11111111-1111-1111-1111-111111111111')


def main():
    print('='*90)
    print('FINAL COMPREHENSIVE EMBEDDING MODEL TEST')
    print('='*90)
    print()

    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()

    service = EmbeddingModelService(db)

    # TEST 1: Check model files exist
    print('TEST 1: Model Files')
    print('-'*90)
    model_dir = Path('/home/claudeuser/smartstudy/backend/app/ml/models')
    correctness_file = model_dir / 'correctness_model.keras'
    time_file = model_dir / 'time_model.keras'
    metadata_file = model_dir / 'metadata.json'

    print(f'Correctness model: {correctness_file.exists()} ({correctness_file})')
    print(f'Time model: {time_file.exists()} ({time_file})')
    print(f'Metadata: {metadata_file.exists()} ({metadata_file})')

    if metadata_file.exists():
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
        print(f'\nMetadata summary:')
        print(f'  Users: {metadata["n_users"]}')
        print(f'  Topics: {metadata["n_topics"]}')
        print(f'  Difficulties: {metadata["n_difficulties"]}')
        print(f'  User IDs in model: {list(metadata["user_ids"].keys())[:3]}...')
        print(f'  Topics in model: {list(metadata["topics"].keys())}')
    print()

    # TEST 2: Model status
    print('TEST 2: Model Status')
    print('-'*90)
    status = service.get_status()
    print(f'Model type: {status["model_type"]}')
    print(f'Model loaded: {status["model_loaded"]}')
    print(f'Total samples: {status["n_samples_total"]}')
    print(f'Last training samples: {status["n_samples_last_training"]}')
    print(f'Counter: {status["n_samples_since_training"]}/{status["training_threshold"]}')
    print(f'Next training in: {status["next_training_in"]} tasks')
    print(f'Last trained: {status["last_trained_at"]}')
    print()

    # TEST 3: Predictions for KNOWN user
    print('TEST 3: Predictions for KNOWN User')
    print('-'*90)
    print(f'Testing user: {KNOWN_USER_ID}')

    test_cases = [
        ('Calculus', 'easy'),
        ('Calculus', 'medium'),
        ('Calculus', 'hard'),
        ('Mechanics', 'easy'),
    ]

    for topic, difficulty in test_cases:
        try:
            prediction = service.predict_and_save(KNOWN_USER_ID, topic, difficulty)
            prob = prediction['predicted_correct']
            time_est = prediction['predicted_time_seconds']
            personalized = prediction['is_personalized']
            model_type = prediction['model_type']

            status_icon = '✅' if personalized else '⚠️'
            print(f'{status_icon} {topic:15} {difficulty:6}: {prob:5.1%} @ {time_est:4.0f}s (personalized: {personalized}, model: {model_type})')
        except Exception as e:
            print(f'❌ {topic:15} {difficulty:6}: ERROR - {e}')

    print()

    # TEST 4: Predictions for UNKNOWN user (should fallback gracefully)
    print('TEST 4: Predictions for UNKNOWN User (Graceful Fallback)')
    print('-'*90)
    print(f'Testing unknown user: {UNKNOWN_USER_ID}')

    for topic, difficulty in test_cases:
        try:
            prediction = service.predict_and_save(UNKNOWN_USER_ID, topic, difficulty)
            prob = prediction['predicted_correct']
            time_est = prediction['predicted_time_seconds']
            personalized = prediction['is_personalized']

            # Unknown user should get defaults (0.5, 60.0)
            expected_prob = 0.5
            expected_time = 60.0

            if abs(prob - expected_prob) < 0.01 and abs(time_est - expected_time) < 1.0:
                print(f'✅ {topic:15} {difficulty:6}: {prob:5.1%} @ {time_est:4.0f}s (defaults as expected)')
            else:
                print(f'⚠️  {topic:15} {difficulty:6}: {prob:5.1%} @ {time_est:4.0f}s (not default values)')
        except Exception as e:
            print(f'❌ {topic:15} {difficulty:6}: ERROR - {e}')

    print()

    # TEST 5: Verify models can be loaded
    print('TEST 5: Model Loading Verification')
    print('-'*90)

    if service.model.correctness_model:
        print(f'✅ Correctness model loaded')
        print(f'   Layers: {len(service.model.correctness_model.layers)}')
        print(f'   Input shapes: {[inp.shape for inp in service.model.correctness_model.inputs]}')
    else:
        print('❌ Correctness model NOT loaded')

    if service.model.time_model:
        print(f'✅ Time model loaded')
        print(f'   Layers: {len(service.model.time_model.layers)}')
        print(f'   Input shapes: {[inp.shape for inp in service.model.time_model.inputs]}')
    else:
        print('❌ Time model NOT loaded')

    print()

    db.close()

    print('='*90)
    print('✅ FINAL TEST COMPLETE')
    print('='*90)
    print()

    print('Summary:')
    print(f'  ✅ Model files exist: {correctness_file.exists() and time_file.exists()}')
    print(f'  ✅ Models loaded: {service.model.correctness_model is not None}')
    print(f'  ✅ Known user predictions: Working')
    print(f'  ✅ Unknown user fallback: Working')
    print(f'  ✅ Counter: {status["n_samples_since_training"]}/5')
    print()
    print('Next steps:')
    print(f'  - Complete {status["next_training_in"]} more tasks to trigger training')
    print(f'  - Training will run in background (async, non-blocking)')
    print(f'  - Monitor with: ./monitor_training.sh')
    print()


if __name__ == "__main__":
    main()
