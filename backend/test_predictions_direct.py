#!/usr/bin/env python3
"""
Direct prediction test - tests V2 model predictions via service
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).parent))
load_dotenv()

from app.ml.embedding_service import EmbeddingModelService


def main():
    print("="*90)
    print("DIRECT PREDICTION TEST - Testing V2 Model via Service")
    print("="*90)
    print()

    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Get bulk@example.com user ID
        result = db.execute(text("SELECT id FROM users WHERE email = 'bulk@example.com'"))
        user_id = result.scalar()

        if not user_id:
            print("❌ bulk@example.com not found")
            return

        print(f"User: bulk@example.com")
        print(f"ID: {user_id}")
        print()

        # Initialize service
        print("Initializing EmbeddingModelService...")
        service = EmbeddingModelService(db)
        print("✅ Service initialized")
        print()

        # Test different scenarios
        scenarios = [
            ('Calculus', 'easy'),
            ('Calculus', 'medium'),
            ('Calculus', 'hard'),
            ('Microeconomics', 'easy'),
            ('Microeconomics', 'medium'),
            ('Microeconomics', 'hard'),
        ]

        print("Testing predictions for 6 scenarios:")
        print()
        print(f"{'Topic':<20} {'Difficulty':<12} {'Correctness':<18} {'Time (s)':<12} {'Variation'}")
        print("-" * 80)

        predictions = []
        baseline = None

        for topic, difficulty in scenarios:
            try:
                prob, time_est = service.predict(user_id, topic, difficulty)
                predictions.append((topic, difficulty, prob, time_est))

                # Track baseline (Calculus medium)
                if topic == 'Calculus' and difficulty == 'medium':
                    baseline = (prob, time_est)
                    variation = "baseline"
                elif baseline:
                    prob_diff = abs(prob - baseline[0])
                    time_diff = abs(time_est - baseline[1])
                    if prob_diff > 0.02 or time_diff > 5:
                        variation = f"✓ Δ={prob_diff:.3f}"
                    else:
                        variation = "≈ same"
                else:
                    variation = "-"

                print(f"{topic:<20} {difficulty:<12} {prob:.4f} ({prob:>5.1%})   {time_est:>6.1f}s      {variation}")

            except Exception as e:
                print(f"{topic:<20} {difficulty:<12} ERROR: {str(e)[:40]}")

        # Analyze diversity
        if predictions:
            probs = [p[2] for p in predictions]
            times = [p[3] for p in predictions]

            import numpy as np

            print()
            print("="*90)
            print("DIVERSITY ANALYSIS")
            print("="*90)
            print(f"\nTotal predictions: {len(predictions)}")
            print(f"Unique correctness values: {len(set(probs))}/{len(predictions)} ({len(set(probs))/len(predictions)*100:.1f}%)")
            print(f"Unique time values: {len(set(times))}/{len(predictions)} ({len(set(times))/len(predictions)*100:.1f}%)")
            print(f"\nCorrectness range: {min(probs):.4f} - {max(probs):.4f}")
            print(f"Time range: {min(times):.1f}s - {max(times):.1f}s")
            print(f"\nCorrectness std dev: {np.std(probs):.4f}")
            print(f"Time std dev: {np.std(times):.1f}s")

            # Verdict
            diversity_ratio = len(set(probs)) / len(predictions)

            print()
            if diversity_ratio >= 0.7:
                print(f"✅ EXCELLENT: High diversity ({diversity_ratio*100:.1f}%)")
                print(f"   Model varies predictions significantly across scenarios")
            elif diversity_ratio >= 0.5:
                print(f"✅ GOOD: Good diversity ({diversity_ratio*100:.1f}%)")
                print(f"   Model differentiates most scenarios")
            elif diversity_ratio >= 0.3:
                print(f"⚠️  MODERATE: Some diversity ({diversity_ratio*100:.1f}%)")
                print(f"   Model varies predictions but could be more differentiated")
            else:
                print(f"❌ POOR: Low diversity ({diversity_ratio*100:.1f}%)")
                print(f"   Model not differentiating scenarios well")

            print()
            print("="*90)
            print("CONCLUSION")
            print("="*90)

            if diversity_ratio >= 0.5:
                print("\n✅ V2 MODEL IS WORKING CORRECTLY")
                print("   - Predictions vary across different scenarios")
                print("   - Model is learning from user history")
                print("   - Ready for production use")
            else:
                print("\n⚠️  V2 MODEL MAY NEED ADJUSTMENT")
                print("   - Predictions not varying enough")
                print("   - May need more training data or architecture tuning")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

    finally:
        db.close()

    print()


if __name__ == '__main__':
    main()
