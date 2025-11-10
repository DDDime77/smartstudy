#!/usr/bin/env python3
"""
Retrain Embedding Model with New 13-Feature Architecture

Forces retraining of the embedding model after adding improvement features:
- success_improvement: Recent vs previous success rate
- time_improvement: Recent vs previous time
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).parent))
load_dotenv()

from app.ml.embedding_service import EmbeddingModelService


def main():
    print("="*90)
    print("EMBEDDING MODEL RETRAINING - NEW 13-FEATURE ARCHITECTURE")
    print("="*90)
    print()
    print("Changes:")
    print("  ✅ Added 'success_improvement' feature (recent vs previous success)")
    print("  ✅ Added 'time_improvement' feature (recent vs previous time)")
    print("  ✅ Updated model architecture (11 → 13 history features)")
    print("  ✅ Updated training data preparation")
    print("  ✅ Updated prediction input")
    print()
    print("="*90)
    print()

    # Connect to database
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Initialize embedding service
        print("Initializing EmbeddingModelService...")
        service = EmbeddingModelService(db)
        print("  ✅ Service initialized")
        print()

        # Force training with new architecture
        print("Force training model with new 13-feature architecture...")
        print()
        result = service.force_train(verbose=True)
        print()

        # Check result
        if result['status'] == 'success':
            print("="*90)
            print("✅ TRAINING COMPLETE")
            print("="*90)
            print()
            print(f"  Training samples: {result.get('n_samples', 'N/A')}")
            print(f"  Model version: {result.get('model_version', 'N/A')}")
            print()

            # Verify model files exist
            models_dir = Path(__file__).parent / "app" / "ml" / "models"
            if (models_dir / "correctness_model.keras").exists():
                print("  ✅ correctness_model.keras created")
            if (models_dir / "time_model.keras").exists():
                print("  ✅ time_model.keras created")
            if (models_dir / "metadata.json").exists():
                print("  ✅ metadata.json created")
            print()

            print("New features now active:")
            print("  • success_improvement: Tracks if user is improving (recent vs previous)")
            print("  • time_improvement: Tracks if user is getting faster")
            print()
            print("Expected behavior:")
            print("  ✅ Correct tasks → Predictions INCREASE")
            print("  ✅ Incorrect tasks → Predictions DECREASE")
            print("  ✅ No more backwards adaptation!")
            print()
        else:
            print("="*90)
            print("❌ TRAINING FAILED")
            print("="*90)
            print()
            print(f"  Error: {result.get('error', 'Unknown error')}")
            print()

    except Exception as e:
        print("="*90)
        print("❌ ERROR")
        print("="*90)
        print()
        print(f"  {e}")
        import traceback
        traceback.print_exc()
        print()

    finally:
        db.close()


if __name__ == '__main__':
    main()
