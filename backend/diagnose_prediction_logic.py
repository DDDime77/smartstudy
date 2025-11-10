#!/usr/bin/env python3
"""
Diagnose why predictions are adapting backwards
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
    print("PREDICTION LOGIC DIAGNOSIS")
    print("="*90)
    print()

    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Get bulk user
        result = db.execute(text("SELECT id FROM users WHERE email = 'bulk@example.com'"))
        user_id = result.scalar()

        print(f"User: bulk@example.com")
        print(f"ID: {user_id}")
        print()

        # Initialize service
        service = EmbeddingModelService(db)

        # Get user's history
        history = service._get_user_history(user_id)

        print(f"Total completed tasks: {len(history)}")
        print()

        # Check Calculus medium specifically
        calc_medium = [t for t in history if t['topic'] == 'Calculus' and t['difficulty'] == 'medium']
        print(f"Calculus Medium tasks: {len(calc_medium)}")

        if calc_medium:
            success_rate = np.mean([t['correct'] for t in calc_medium])
            avg_time = np.mean([t['actual_time'] for t in calc_medium])
            print(f"  Success rate: {success_rate:.1%}")
            print(f"  Average time: {avg_time:.1f}s")

        print()
        print("="*90)
        print("TESTING FEATURE COMPUTATION")
        print("="*90)
        print()

        # Simulate different scenarios
        scenarios = [
            ("After 5 correct tasks", calc_medium[-5:] if len(calc_medium) >= 5 else calc_medium),
            ("After 10 correct tasks", calc_medium[-10:] if len(calc_medium) >= 10 else calc_medium),
            ("Full history", history),
        ]

        for scenario_name, scenario_history in scenarios:
            print(f"\n{scenario_name}:")
            print("-" * 50)

            # Compute features using the model's method
            features = service.model._compute_user_history_features(
                scenario_history,
                str(user_id),
                'Calculus',
                'medium'
            )

            print(f"  overall_success_rate: {features['overall_success_rate']:.3f}")
            print(f"  overall_avg_time: {features['overall_avg_time']:.1f}")
            print(f"  overall_task_count: {features['overall_task_count']:.3f}")
            print(f"  topic_success_rate: {features['topic_success_rate']:.3f}")
            print(f"  topic_avg_time: {features['topic_avg_time']:.3f} (normalized /100)")
            print(f"  topic_task_count: {features['topic_task_count']:.3f} (normalized /20)")
            print(f"  difficulty_success_rate: {features['difficulty_success_rate']:.3f}")
            print(f"  difficulty_avg_time: {features['difficulty_avg_time']:.3f} (normalized /100)")
            print(f"  difficulty_task_count: {features['difficulty_task_count']:.3f} (normalized /20)")
            print(f"  recent_success_rate: {features['recent_success_rate']:.3f}")
            print(f"  recent_avg_time: {features['recent_avg_time']:.3f} (normalized /100)")

            # Make prediction
            try:
                prob, time_est = service.predict(user_id, 'Calculus', 'medium')
                print(f"\n  → Prediction: {prob:.1%} correct, {time_est:.1f}s")
            except Exception as e:
                print(f"\n  → Prediction failed: {e}")

        print()
        print("="*90)
        print("PATTERN ANALYSIS")
        print("="*90)
        print()

        # Check if features are changing correctly
        print("Let's simulate completing tasks and see how features change:")
        print()

        # Baseline
        baseline_features = service.model._compute_user_history_features(
            history,
            str(user_id),
            'Calculus',
            'medium'
        )

        # Simulate adding a CORRECT task
        simulated_correct = history + [{
            'user_id': user_id,
            'topic': 'Calculus',
            'difficulty': 'medium',
            'correct': 1.0,  # Correct!
            'actual_time': 30.0  # Fast!
        }]

        correct_features = service.model._compute_user_history_features(
            simulated_correct,
            str(user_id),
            'Calculus',
            'medium'
        )

        # Simulate adding an INCORRECT task
        simulated_incorrect = history + [{
            'user_id': user_id,
            'topic': 'Calculus',
            'difficulty': 'medium',
            'correct': 0.0,  # Incorrect!
            'actual_time': 90.0  # Slow!
        }]

        incorrect_features = service.model._compute_user_history_features(
            simulated_incorrect,
            str(user_id),
            'Calculus',
            'medium'
        )

        print(f"{'Feature':<30} {'Baseline':<12} {'After Correct':<15} {'After Incorrect':<15}")
        print("-" * 75)

        for key in baseline_features.keys():
            baseline_val = baseline_features[key]
            correct_val = correct_features[key]
            incorrect_val = incorrect_features[key]

            # Determine if change is in right direction
            if 'success_rate' in key:
                correct_dir = "↑" if correct_val > baseline_val else "↓" if correct_val < baseline_val else "="
                incorrect_dir = "↑" if incorrect_val > baseline_val else "↓" if incorrect_val < baseline_val else "="
            elif 'avg_time' in key:
                # Lower time after correct is good
                correct_dir = "↓" if correct_val < baseline_val else "↑" if correct_val > baseline_val else "="
                incorrect_dir = "↑" if incorrect_val > baseline_val else "↓" if incorrect_val < baseline_val else "="
            else:
                correct_dir = ""
                incorrect_dir = ""

            print(f"{key:<30} {baseline_val:>10.3f}   {correct_val:>10.3f} {correct_dir:<2}   {incorrect_val:>10.3f} {incorrect_dir:<2}")

        print()
        print("Expected behavior:")
        print("  After CORRECT task: success_rate ↑, avg_time ↓")
        print("  After INCORRECT task: success_rate ↓, avg_time ↑")

    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()

    finally:
        db.close()


if __name__ == '__main__':
    main()
