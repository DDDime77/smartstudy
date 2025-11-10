"""
Test predictions for bulk@example.com across different scenarios
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
    print("PREDICTION TEST FOR bulk@example.com")
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
        service = EmbeddingModelService(db)

        # Get available topics
        result = db.execute(text("""
            SELECT DISTINCT topic FROM practice_tasks
            WHERE user_id = :user_id AND completed = TRUE
            ORDER BY topic
        """), {'user_id': user_id})

        topics = [row[0] for row in result.fetchall()]

        if not topics:
            topics = ['Calculus', 'Mechanics', 'Waves']

        print(f"Testing {len(topics)} topics x 3 difficulties = {len(topics) * 3} predictions")
        print()

        print(f"{'Topic':<20} {'Difficulty':<12} {'Correctness':<18} {'Time (s)':<12} {'Notes'}")
        print("-" * 80)

        predictions = []

        for topic in topics[:5]:  # Test up to 5 topics
            for difficulty in ['easy', 'medium', 'hard']:
                try:
                    prob, time_est = service.predict(user_id, topic, difficulty)
                    predictions.append((topic, difficulty, prob, time_est))

                    # Check if different from Calculus/medium baseline
                    is_different = (topic != 'Calculus' or difficulty != 'medium' or
                                  abs(prob - 0.470) > 0.01 or abs(time_est - 39) > 5)

                    notes = ""
                    if topic == 'Calculus' and difficulty == 'medium':
                        notes = "← baseline"
                    elif is_different:
                        notes = "✓ different"
                    else:
                        notes = "⚠ same as baseline"

                    print(f"{topic:<20} {difficulty:<12} {prob:.4f} ({prob:>5.1%})   {time_est:>6.1f}s      {notes}")

                except Exception as e:
                    print(f"{topic:<20} {difficulty:<12} ERROR: {e}")

        print()
        print("="*90)
        print("DIVERSITY ANALYSIS")
        print("="*90)

        if predictions:
            probs = [p[2] for p in predictions]
            times = [p[3] for p in predictions]

            import numpy as np

            unique_probs = len(set(probs))
            unique_times = len(set(times))

            print(f"\nTotal predictions: {len(predictions)}")
            print(f"Unique correctness values: {unique_probs} ({unique_probs/len(predictions)*100:.1f}%)")
            print(f"Unique time values: {unique_times} ({unique_times/len(predictions)*100:.1f}%)")
            print(f"\nCorrectness range: {min(probs):.4f} - {max(probs):.4f}")
            print(f"Time range: {min(times):.1f}s - {max(times):.1f}s")
            print(f"\nCorrectness std dev: {np.std(probs):.4f}")
            print(f"Time std dev: {np.std(times):.1f}s")

            # Check if model is varying predictions
            if unique_probs <= 2:
                print(f"\n❌ PROBLEM: Model only producing {unique_probs} unique correctness value(s)")
                print(f"   This indicates the model is not learning different patterns")
            elif unique_probs < len(predictions) * 0.3:
                print(f"\n⚠️  WARNING: Low diversity ({unique_probs}/{len(predictions)} unique values)")
                print(f"   Model may not be differentiating scenarios well")
            elif unique_probs < len(predictions) * 0.7:
                print(f"\n✅ MODERATE: Some diversity ({unique_probs}/{len(predictions)} unique values)")
                print(f"   Model is making different predictions for different scenarios")
            else:
                print(f"\n✅ EXCELLENT: High diversity ({unique_probs}/{len(predictions)} unique values)")
                print(f"   Model is highly personalized")

        print(f"\n" + "="*90)

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

    finally:
        db.close()


if __name__ == '__main__':
    main()
