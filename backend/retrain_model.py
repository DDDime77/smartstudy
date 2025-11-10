#!/usr/bin/env python3
"""
Retrain ML Model

Retrains the embedding model with all current user data
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).parent))
load_dotenv()

from app.core.database import SessionLocal
from app.ml.embedding_service import EmbeddingModelService

def main():
    print("="*80)
    print("RETRAINING ML MODEL")
    print("="*80)
    print()

    # Create database session
    db = SessionLocal()

    try:
        # Initialize service
        print("Initializing embedding service...")
        service = EmbeddingModelService(db)

        # Retrain model
        print("\nRetraining model with all user data...")
        print("This may take a few minutes...\n")

        result = service.force_train(verbose=True)

        print(f"\n{'='*80}")
        print(f"✅ MODEL RETRAINED SUCCESSFULLY")
        print(f"{'='*80}")
        print(f"Samples: {result['n_samples']}")
        print(f"Message: {result['message']}")
        print(f"{'='*80}\n")

    except Exception as e:
        print(f"\n❌ Error retraining model: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == '__main__':
    main()
