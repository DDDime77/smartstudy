#!/usr/bin/env python3
"""
Force retraining of ML models after vocabulary expansion
"""

import sys
sys.path.insert(0, '/home/claudeuser/smartstudy/backend')

from app.core.database import SessionLocal
from app.ml import EmbeddingModelService

def main():
    print("=" * 90)
    print("FORCE RETRAINING ML MODELS")
    print("=" * 90)
    print()

    db = SessionLocal()

    try:
        # Initialize embedding service (this will load/create models)
        service = EmbeddingModelService(db)

        # Force training with all available data
        print("Starting forced training...")
        result = service.force_train(verbose=True)

        print()
        print("=" * 90)
        print("TRAINING RESULT")
        print("=" * 90)
        print(f"Status: {result.get('status', 'success')}")
        print(f"Message: {result.get('message', 'N/A')}")
        print(f"Samples: {result.get('n_samples', 'N/A')}")
        print()

        if result.get('status') == 'success':
            print("✓ Models retrained successfully!")
            return 0
        else:
            print("✗ Training failed")
            return 1

    except Exception as e:
        print(f"✗ Error during training: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        db.close()

if __name__ == "__main__":
    exit(main())
