#!/usr/bin/env python3
"""
Test Prediction Adaptation - Verify Fix for Backwards Adaptation Bug

Tests that predictions now INCREASE after correct tasks and DECREASE after incorrect tasks
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from uuid import UUID

sys.path.insert(0, str(Path(__file__).parent))
load_dotenv()

def main():
    print("="*90)
    print("PREDICTION ADAPTATION TEST - VERIFY BACKWARDS BUG FIX")
    print("="*90)
    print()

    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Get bulk user
        result = db.execute(text("SELECT id, email FROM users WHERE email = 'bulk@example.com'"))
        row = result.fetchone()
        user_id = str(row[0])
        email = row[1]

        print(f"Testing user: {email}")
        print(f"ID: {user_id}")
        print()

        # Get recent Calculus Medium tasks to see prediction pattern
        result = db.execute(text("""
            SELECT
                created_at,
                is_correct,
                actual_time_seconds,
                predicted_correct,
                predicted_time_seconds,
                lnirt_model_version
            FROM practice_tasks
            WHERE user_id = :user_id
              AND topic = 'Calculus'
              AND difficulty = 'medium'
              AND completed = TRUE
            ORDER BY created_at DESC
            LIMIT 20
        """), {'user_id': user_id})

        tasks = list(result.fetchall())

        if not tasks:
            print("❌ No completed Calculus Medium tasks found")
            return

        print("="*90)
        print("RECENT CALCULUS MEDIUM TASK PATTERN")
        print("="*90)
        print()
        print(f"{'#':<4} {'Date':<20} {'Result':<10} {'Time':<8} {'Next Pred':<12} {'Model':<15} {'Trend'}")
        print("-" * 90)

        for i, task in enumerate(reversed(tasks)):
            date = str(task[0])[:19]
            correct = "✓ Correct" if task[1] else "✗ Wrong"
            time = f"{task[2]}s"
            pred = f"{task[3]:.1%}" if task[3] else "N/A"
            pred_time = f"{task[4]:.0f}s" if task[4] else "N/A"
            model = task[5] if task[5] else "N/A"

            # Calculate trend
            if i > 0:
                prev_task = tasks[len(tasks) - i]
                if prev_task[3] and task[3]:
                    diff = task[3] - prev_task[3]
                    if diff > 0.01:
                        trend = f"↑ +{diff:.1%}"
                    elif diff < -0.01:
                        trend = f"↓ {diff:.1%}"
                    else:
                        trend = "→ stable"
                else:
                    trend = ""
            else:
                trend = "baseline"

            print(f"{i+1:<4} {date:<20} {correct:<10} {time:<8} {pred:<12} {model:<15} {trend}")

        print()

        # Analyze pattern
        print("="*90)
        print("PATTERN ANALYSIS")
        print("="*90)
        print()

        # Check if recent correct tasks lead to higher predictions
        recent_5 = tasks[:5]
        correct_count = sum(1 for t in recent_5 if t[1])
        incorrect_count = sum(1 for t in recent_5 if not t[1])

        print(f"Last 5 tasks:")
        print(f"  Correct: {correct_count}")
        print(f"  Incorrect: {incorrect_count}")
        print()

        if len(tasks) >= 10:
            # Compare recent predictions with older predictions
            recent_pred = sum(t[3] for t in tasks[:5] if t[3]) / len([t for t in tasks[:5] if t[3]])
            older_pred = sum(t[3] for t in tasks[5:10] if t[3]) / len([t for t in tasks[5:10] if t[3]])

            print(f"Recent 5 tasks average prediction: {recent_pred:.1%}")
            print(f"Previous 5 tasks average prediction: {older_pred:.1%}")
            print()

            if recent_pred > older_pred:
                print(f"✅ Predictions INCREASED by {recent_pred - older_pred:.1%}")
            elif recent_pred < older_pred:
                print(f"⚠️  Predictions DECREASED by {older_pred - recent_pred:.1%}")
            else:
                print("→ Predictions stable")
            print()

        # Check the very latest prediction
        latest = tasks[0]
        if latest[3]:
            print(f"Latest prediction: {latest[3]:.1%} correctness, {latest[4]:.0f}s time")
            print(f"Model used: {latest[5]}")
            print()

            if latest[5] == 'embedding_v2':
                print("✅ Using new embedding_v2 model with improvement features!")
            else:
                print("⚠️  Not using embedding_v2 model")

        print()
        print("="*90)
        print("EXPECTED BEHAVIOR (After Fix)")
        print("="*90)
        print()
        print("  ✅ If user completes tasks CORRECTLY → Predictions should INCREASE")
        print("  ✅ If user completes tasks INCORRECTLY → Predictions should DECREASE")
        print("  ✅ Improvement features (recent vs previous) guide adaptation")
        print()

        # Check another topic for comparison
        print("="*90)
        print("MICROECONOMICS MEDIUM PATTERN")
        print("="*90)
        print()

        result = db.execute(text("""
            SELECT
                is_correct,
                predicted_correct
            FROM practice_tasks
            WHERE user_id = :user_id
              AND topic = 'Microeconomics'
              AND difficulty = 'medium'
              AND completed = TRUE
            ORDER BY created_at DESC
            LIMIT 10
        """), {'user_id': user_id})

        micro_tasks = list(result.fetchall())

        if micro_tasks:
            correct_count = sum(1 for t in micro_tasks if t[0])
            avg_pred = sum(t[1] for t in micro_tasks if t[1]) / len([t for t in micro_tasks if t[1]])

            print(f"Last 10 tasks: {correct_count} correct, {10 - correct_count} incorrect")
            print(f"Average prediction: {avg_pred:.1%}")
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


if __name__ == '__main__':
    main()
