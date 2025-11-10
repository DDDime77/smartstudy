#!/usr/bin/env python3
"""
Deep Prediction Diagnosis - Find out why backwards adaptation still occurs
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
load_dotenv()

from app.ml.embedding_service import EmbeddingModelService

def main():
    print("="*90)
    print("DEEP PREDICTION DIAGNOSIS - FIND BACKWARDS ADAPTATION ROOT CAUSE")
    print("="*90)
    print()

    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Get bulk user
        result = db.execute(text("SELECT id FROM users WHERE email = 'bulk@example.com'"))
        user_id = result.scalar()

        print(f"Testing user: bulk@example.com")
        print(f"ID: {user_id}")
        print()

        # Initialize service
        service = EmbeddingModelService(db)

        print("="*90)
        print("TEST 1: CHECK CURRENT MODEL STATE")
        print("="*90)
        print()

        # Check model metadata
        metadata = service.model.metadata
        print(f"Model loaded: {service.model.correctness_model is not None}")
        print(f"Number of users in metadata: {len(metadata.get('user_ids', {}))}")
        print(f"Number of topics in metadata: {len(metadata.get('topics', {}))}")
        print()

        # Check training tracker
        tracker = service._get_tracker_state()
        print(f"Last trained: {tracker['last_trained_at']}")
        print(f"Training samples: {tracker['n_samples_last_training']}")
        print(f"Samples since training: {tracker['n_samples_since_training']}")
        print()

        print("="*90)
        print("TEST 2: MAKE PREDICTIONS FOR CALCULUS MEDIUM")
        print("="*90)
        print()

        # Get user history
        history = service._get_user_history(user_id)
        print(f"Total user history: {len(history)} tasks")

        # Get Calculus Medium history
        calc_medium = [t for t in history if t['topic'] == 'Calculus' and t['difficulty'] == 'medium']
        print(f"Calculus Medium history: {len(calc_medium)} tasks")

        if calc_medium:
            recent_5 = calc_medium[-5:]
            recent_correct = [t['correct'] for t in recent_5]
            recent_success = np.mean(recent_correct)
            print(f"Recent 5 tasks success rate: {recent_success:.1%}")
            print(f"Recent 5: {recent_correct}")

        print()

        # Make prediction
        try:
            prob, time_est = service.predict(user_id, 'Calculus', 'medium')
            print(f"Current prediction: {prob:.1%} correct, {time_est:.0f}s")
        except Exception as e:
            print(f"Prediction error: {e}")
            import traceback
            traceback.print_exc()

        print()

        print("="*90)
        print("TEST 3: CHECK IMPROVEMENT FEATURES COMPUTATION")
        print("="*90)
        print()

        # Compute features directly
        if len(calc_medium) >= 10:
            features = service.model._compute_user_history_features(
                calc_medium,
                str(user_id),
                'Calculus',
                'medium'
            )

            print("Computed features:")
            print(f"  overall_success_rate: {features['overall_success_rate']:.3f}")
            print(f"  topic_success_rate: {features['topic_success_rate']:.3f}")
            print(f"  recent_success_rate: {features['recent_success_rate']:.3f}")
            print()
            print(f"  success_improvement: {features.get('success_improvement', 'MISSING')}")
            print(f"  time_improvement: {features.get('time_improvement', 'MISSING')}")
            print()

            if 'success_improvement' not in features:
                print("❌ ERROR: success_improvement feature is MISSING!")
            elif 'time_improvement' not in features:
                print("❌ ERROR: time_improvement feature is MISSING!")
            else:
                print("✅ Improvement features are present")
                print()
                print(f"  Interpretation:")
                if features['success_improvement'] > 0:
                    print(f"    User is IMPROVING (+{features['success_improvement']:.2f})")
                    print(f"    → Model should predict HIGHER success")
                elif features['success_improvement'] < 0:
                    print(f"    User is DECLINING ({features['success_improvement']:.2f})")
                    print(f"    → Model should predict LOWER success")
                else:
                    print(f"    Performance is STABLE")

        print()

        print("="*90)
        print("TEST 4: SIMULATE COMPLETING CORRECT TASK")
        print("="*90)
        print()

        print("Before completing task:")
        prob_before, time_before = service.predict(user_id, 'Calculus', 'medium')
        print(f"  Prediction: {prob_before:.1%} correct, {time_before:.0f}s")
        print()

        # Simulate adding a CORRECT task to history
        simulated_history = calc_medium + [{
            'user_id': str(user_id),
            'topic': 'Calculus',
            'difficulty': 'medium',
            'correct': 1.0,  # CORRECT
            'actual_time': 30.0,  # Fast
            'timestamp': 9999999999.0
        }]

        # Compute features with new task
        if len(simulated_history) >= 10:
            sim_features = service.model._compute_user_history_features(
                simulated_history,
                str(user_id),
                'Calculus',
                'medium'
            )

            print("After completing CORRECT task:")
            print(f"  recent_success_rate: {sim_features['recent_success_rate']:.3f}")
            print(f"  success_improvement: {sim_features.get('success_improvement', 'N/A')}")
            print()

            # Make prediction with simulated history
            # We can't actually use the model here without modifying it, so we'll just show the features
            print(f"  Features show improvement: {sim_features.get('success_improvement', 0) > 0}")

        print()

        print("="*90)
        print("TEST 5: CHECK MODEL INPUT SHAPE")
        print("="*90)
        print()

        # Check if model expects 13 features
        if service.model.correctness_model:
            try:
                history_input_shape = service.model.correctness_model.input['history_features'].shape
                print(f"Model expects history features shape: {history_input_shape}")
                expected_features = history_input_shape[1]
                print(f"Expected number of features: {expected_features}")

                if expected_features == 13:
                    print("✅ Model expects 13 features (correct)")
                elif expected_features == 11:
                    print("❌ Model expects 11 features (OLD MODEL LOADED!)")
                else:
                    print(f"⚠️  Model expects {expected_features} features (unexpected)")
            except Exception as e:
                print(f"Could not check model shape: {e}")

        print()

        print("="*90)
        print("TEST 6: CHECK RECENT PREDICTIONS IN DATABASE")
        print("="*90)
        print()

        result = db.execute(text("""
            SELECT
                created_at,
                topic,
                difficulty,
                is_correct,
                actual_time_seconds,
                predicted_correct,
                lnirt_model_version
            FROM practice_tasks
            WHERE user_id = :user_id
              AND topic = 'Calculus'
              AND difficulty = 'medium'
              AND completed = TRUE
            ORDER BY created_at DESC
            LIMIT 5
        """), {'user_id': str(user_id)})

        recent_tasks = list(result.fetchall())

        print("Last 5 Calculus Medium tasks:")
        print(f"{'Date':<20} {'Result':<10} {'Time':<8} {'Predicted':<12} {'Model'}")
        print("-" * 75)

        for task in recent_tasks:
            date = str(task[0])[:19]
            correct = "✓ Correct" if task[3] else "✗ Wrong"
            time = f"{task[4]}s" if task[4] else "N/A"
            pred = f"{task[5]:.1%}" if task[5] else "N/A"
            model = task[6] if task[6] else "N/A"
            print(f"{date:<20} {correct:<10} {time:<8} {pred:<12} {model}")

        print()

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

    finally:
        db.close()

    print("="*90)
    print("DIAGNOSIS COMPLETE")
    print("="*90)

if __name__ == '__main__':
    main()
