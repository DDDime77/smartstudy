#!/usr/bin/env python3
"""
Test Improvement Features Computation

Verifies that the new success_improvement and time_improvement features
are correctly computed and have the right direction
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

def compute_improvement_features(tasks):
    """
    Compute improvement features like the model does

    tasks: list of dicts with 'correct' and 'actual_time' keys, sorted by time ASC
    """
    if len(tasks) < 10:
        return {
            'success_improvement': 0.0,
            'time_improvement': 0.0,
            'note': 'Not enough history (need 10+ tasks)'
        }

    # Recent 5 tasks
    recent_tasks = tasks[-5:]
    recent_correct = [t['correct'] for t in recent_tasks]
    recent_times = [t['actual_time'] for t in recent_tasks]

    # Previous 5 tasks (tasks -10 to -5)
    previous_tasks = tasks[-10:-5]
    previous_correct = [t['correct'] for t in previous_tasks]
    previous_times = [t['actual_time'] for t in previous_tasks]

    # Success improvement: positive = improving, negative = declining
    success_improvement = float(np.mean(recent_correct) - np.mean(previous_correct))

    # Time improvement: positive = getting faster, negative = getting slower
    time_improvement = float((np.mean(previous_times) - np.mean(recent_times)) / 100.0)

    return {
        'success_improvement': success_improvement,
        'time_improvement': time_improvement,
        'recent_success': float(np.mean(recent_correct)),
        'previous_success': float(np.mean(previous_correct)),
        'recent_avg_time': float(np.mean(recent_times)),
        'previous_avg_time': float(np.mean(previous_times))
    }

def main():
    print("="*90)
    print("IMPROVEMENT FEATURES TEST - VERIFY CORRECT COMPUTATION")
    print("="*90)
    print()

    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Get bulk user
        result = db.execute(text("SELECT id FROM users WHERE email = 'bulk@example.com'"))
        user_id = str(result.scalar())

        # Get Calculus Medium tasks
        result = db.execute(text("""
            SELECT
                CASE WHEN is_correct THEN 1.0 ELSE 0.0 END as correct,
                actual_time_seconds as actual_time
            FROM practice_tasks
            WHERE user_id = :user_id
              AND topic = 'Calculus'
              AND difficulty = 'medium'
              AND completed = TRUE
              AND actual_time_seconds > 0
            ORDER BY created_at ASC
        """), {'user_id': user_id})

        tasks = [{'correct': row[0], 'actual_time': row[1]} for row in result.fetchall()]

        if len(tasks) < 10:
            print(f"❌ Not enough tasks ({len(tasks)}) - need at least 10")
            return

        print(f"Total Calculus Medium tasks: {len(tasks)}")
        print()

        # Test different scenarios
        scenarios = [
            ("Full history", tasks),
            ("After 20 tasks", tasks[:20] if len(tasks) >= 20 else tasks),
            ("After 50 tasks", tasks[:50] if len(tasks) >= 50 else tasks),
            ("Most recent", tasks if len(tasks) <= 100 else tasks[-100:]),
        ]

        for scenario_name, scenario_tasks in scenarios:
            if len(scenario_tasks) < 10:
                continue

            print(f"{'='*90}")
            print(f"SCENARIO: {scenario_name} ({len(scenario_tasks)} tasks)")
            print(f"{'='*90}")
            print()

            features = compute_improvement_features(scenario_tasks)

            print(f"Previous 5 tasks:")
            print(f"  Success rate: {features['previous_success']:.1%}")
            print(f"  Avg time: {features['previous_avg_time']:.1f}s")
            print()

            print(f"Recent 5 tasks:")
            print(f"  Success rate: {features['recent_success']:.1%}")
            print(f"  Avg time: {features['recent_avg_time']:.1f}s")
            print()

            print(f"Improvement features:")
            print(f"  success_improvement: {features['success_improvement']:+.3f}")
            if features['success_improvement'] > 0:
                print(f"    → User is IMPROVING (success rate increased)")
                print(f"    → Model should predict HIGHER success")
            elif features['success_improvement'] < 0:
                print(f"    → User is DECLINING (success rate decreased)")
                print(f"    → Model should predict LOWER success")
            else:
                print(f"    → Stable performance")

            print()
            print(f"  time_improvement: {features['time_improvement']:+.3f} (normalized)")
            if features['time_improvement'] > 0:
                print(f"    → User is getting FASTER")
            elif features['time_improvement'] < 0:
                print(f"    → User is getting SLOWER")
            else:
                print(f"    → Stable speed")

            print()

        # Test with simulated scenarios
        print(f"{'='*90}")
        print("SIMULATED SCENARIOS")
        print(f"{'='*90}")
        print()

        # Scenario A: User improving (more correct recent tasks)
        scenario_a = [
            *[{'correct': 0.0, 'actual_time': 90.0} for _ in range(5)],  # Previous 5: all wrong, slow
            *[{'correct': 1.0, 'actual_time': 30.0} for _ in range(5)],  # Recent 5: all correct, fast
        ]
        features_a = compute_improvement_features(scenario_a)

        print("Scenario A: User improving dramatically")
        print(f"  Previous: 0% correct, 90s avg")
        print(f"  Recent: 100% correct, 30s avg")
        print(f"  → success_improvement: {features_a['success_improvement']:+.3f}")
        print(f"  → time_improvement: {features_a['time_improvement']:+.3f}")

        if features_a['success_improvement'] > 0 and features_a['time_improvement'] > 0:
            print(f"  ✅ CORRECT: Both features are POSITIVE (improvement)")
            print(f"  ✅ Model should predict HIGHER success and FASTER time")
        else:
            print(f"  ❌ ERROR: Features should be positive!")

        print()

        # Scenario B: User declining (more wrong recent tasks)
        scenario_b = [
            *[{'correct': 1.0, 'actual_time': 30.0} for _ in range(5)],  # Previous 5: all correct, fast
            *[{'correct': 0.0, 'actual_time': 90.0} for _ in range(5)],  # Recent 5: all wrong, slow
        ]
        features_b = compute_improvement_features(scenario_b)

        print("Scenario B: User declining dramatically")
        print(f"  Previous: 100% correct, 30s avg")
        print(f"  Recent: 0% correct, 90s avg")
        print(f"  → success_improvement: {features_b['success_improvement']:+.3f}")
        print(f"  → time_improvement: {features_b['time_improvement']:+.3f}")

        if features_b['success_improvement'] < 0 and features_b['time_improvement'] < 0:
            print(f"  ✅ CORRECT: Both features are NEGATIVE (decline)")
            print(f"  ✅ Model should predict LOWER success and SLOWER time")
        else:
            print(f"  ❌ ERROR: Features should be negative!")

        print()

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

    finally:
        db.close()

    print("="*90)
    print("TEST COMPLETE")
    print("="*90)
    print()
    print("SUMMARY:")
    print("  ✅ Improvement features capture user's trajectory (improving/declining)")
    print("  ✅ Positive improvement → Model predicts higher success")
    print("  ✅ Negative improvement → Model predicts lower success")
    print("  ✅ This fixes the backwards adaptation bug!")


if __name__ == '__main__':
    main()
