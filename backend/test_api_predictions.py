#!/usr/bin/env python3
"""
Test V2 model predictions via direct database simulation
This avoids segfaults by not loading TensorFlow directly
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import uuid
from datetime import datetime

load_dotenv()

def main():
    print("="*90)
    print("API PREDICTION TEST - Creating test tasks to trigger predictions")
    print("="*90)
    print()

    engine = create_engine(os.getenv('DATABASE_URL'))

    with engine.connect() as conn:
        # Get bulk@example.com user ID
        result = conn.execute(text("SELECT id FROM users WHERE email = 'bulk@example.com'"))
        user_id = result.scalar()

        if not user_id:
            print("❌ bulk@example.com not found")
            return

        print(f"User: bulk@example.com")
        print(f"ID: {user_id}")
        print()

        # Create test tasks for different scenarios
        scenarios = [
            ('Calculus', 'easy'),
            ('Calculus', 'medium'),
            ('Calculus', 'hard'),
            ('Microeconomics', 'easy'),
            ('Microeconomics', 'medium'),
            ('Microeconomics', 'hard'),
        ]

        print("Creating test tasks (these will trigger predictions)...")
        print()

        task_ids = []

        for topic, difficulty in scenarios:
            task_id = str(uuid.uuid4())
            task_ids.append(task_id)

            conn.execute(text('''
                INSERT INTO practice_tasks (
                    id, user_id, subject, topic, difficulty,
                    task_content, completed, created_at, updated_at
                )
                VALUES (
                    :id, :user_id, 'Test', :topic, :difficulty,
                    'Test task for prediction testing', FALSE,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
            '''), {
                'id': task_id,
                'user_id': user_id,
                'topic': topic,
                'difficulty': difficulty
            })

        conn.commit()

        print(f"✅ Created {len(scenarios)} test tasks")
        print()

        # Now trigger predictions by simulating the API flow
        # The API will call embedding_service.predict_and_save()
        # But we can't call that directly, so let's just check what the model would predict
        # by looking at what predictions get generated

        print("Waiting for predictions to be generated...")
        print("(In real app, this happens when task is created via API)")
        print()

        # Actually, let's manually trigger predictions using SQL + Python
        from sqlalchemy.orm import sessionmaker
        Session = sessionmaker(bind=engine)
        db = Session()

        try:
            # Import service
            import sys
            from pathlib import Path
            sys.path.insert(0, str(Path(__file__).parent))

            from app.ml.embedding_service import EmbeddingModelService

            service = EmbeddingModelService(db)

            print(f"{'Topic':<20} {'Difficulty':<12} {'Correctness':<18} {'Time (s)':<12} {'Status'}")
            print("-" * 80)

            predictions = []
            for topic, difficulty in scenarios:
                try:
                    prob, time_est = service.predict(user_id, topic, difficulty)
                    predictions.append((topic, difficulty, prob, time_est))

                    # Determine if different from baseline (Calculus medium)
                    is_different = (topic != 'Calculus' or difficulty != 'medium')
                    status = "✓" if is_different and (abs(prob - 0.47) > 0.02 or abs(time_est - 39) > 5) else "="

                    print(f"{topic:<20} {difficulty:<12} {prob:.4f} ({prob:>5.1%})   {time_est:>6.1f}s      {status}")

                except Exception as e:
                    print(f"{topic:<20} {difficulty:<12} ERROR: {e}")

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
                    print(f"✅ EXCELLENT: Model shows high diversity ({diversity_ratio*100:.1f}%)")
                    print(f"   Predictions vary significantly across scenarios")
                elif diversity_ratio >= 0.5:
                    print(f"✅ GOOD: Model shows good diversity ({diversity_ratio*100:.1f}%)")
                    print(f"   Predictions differ across most scenarios")
                elif diversity_ratio >= 0.3:
                    print(f"⚠️  MODERATE: Model shows some diversity ({diversity_ratio*100:.1f}%)")
                    print(f"   Predictions vary but could be more differentiated")
                else:
                    print(f"❌ POOR: Model shows low diversity ({diversity_ratio*100:.1f}%)")
                    print(f"   Predictions too similar across scenarios")
                    print(f"\n   This suggests the model is not learning from user data properly")

        except ImportError as e:
            print(f"❌ Could not import embedding service: {e}")
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            db.close()

        # Cleanup test tasks
        print()
        print("Cleaning up test tasks...")
        for task_id in task_ids:
            conn.execute(text('DELETE FROM practice_tasks WHERE id = :id'), {'id': task_id})
        conn.commit()
        print("✅ Test tasks removed")

    print()
    print("="*90)


if __name__ == '__main__':
    main()
