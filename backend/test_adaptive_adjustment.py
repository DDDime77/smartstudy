#!/usr/bin/env python3
"""
Test Adaptive Adjustment Logic
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).parent))
load_dotenv()

def apply_adaptive_adjustment(base_prob, base_time, relevant_tasks):
    """
    Simulate the adaptive adjustment logic
    """
    if len(relevant_tasks) < 3:
        return base_prob, base_time, "Not enough history"

    # Analyze recent performance (last 5 tasks)
    recent_n = min(5, len(relevant_tasks))
    recent_tasks = relevant_tasks[-recent_n:]
    recent_success_rate = sum(t['correct'] for t in recent_tasks) / len(recent_tasks)
    recent_avg_time = sum(t['actual_time'] for t in recent_tasks) / len(recent_tasks)

    # Calculate overall performance for comparison
    overall_success_rate = sum(t['correct'] for t in relevant_tasks) / len(relevant_tasks)
    overall_avg_time = sum(t['actual_time'] for t in relevant_tasks) / len(relevant_tasks)

    # Compute improvement/decline
    success_improvement = recent_success_rate - overall_success_rate
    time_improvement = overall_avg_time - recent_avg_time

    # Apply adaptive adjustment
    adjusted_prob = base_prob
    adjusted_time = base_time
    reason = []

    # RULE 1
    if recent_success_rate > 0.8 and success_improvement > 0.1:
        boost_factor = 1.2 + (success_improvement * 0.5)
        adjusted_prob = min(0.95, base_prob * boost_factor)
        reason.append(f"RULE 1: Excellent recent performance → boost {boost_factor:.2f}x")
    elif success_improvement > 0.05:
        boost_factor = 1.1 + (success_improvement * 0.3)
        adjusted_prob = min(0.95, base_prob * boost_factor)
        reason.append(f"RULE 1: Good improvement → boost {boost_factor:.2f}x")

    # RULE 2
    elif recent_success_rate < 0.3 and success_improvement < -0.1:
        reduction_factor = 0.8 + (success_improvement * 0.5)
        adjusted_prob = max(0.05, base_prob * reduction_factor)
        reason.append(f"RULE 2: Significant decline → reduce {reduction_factor:.2f}x")
    elif success_improvement < -0.05:
        reduction_factor = 0.9 + (success_improvement * 0.3)
        adjusted_prob = max(0.05, base_prob * reduction_factor)
        reason.append(f"RULE 2: Moderate decline → reduce {reduction_factor:.2f}x")

    # RULE 3
    if time_improvement > 30:
        adjusted_time = max(10, base_time * 0.9)
        reason.append(f"RULE 3: Getting faster → reduce time 0.9x")
    elif time_improvement < -30:
        adjusted_time = min(300, base_time * 1.1)
        reason.append(f"RULE 3: Getting slower → increase time 1.1x")

    # RULE 4
    if len(relevant_tasks) >= 10:
        if adjusted_prob < 0.15 and overall_success_rate > 0.5:
            old_prob = adjusted_prob
            adjusted_prob = max(0.4, overall_success_rate * 0.8)
            reason.append(f"RULE 4: Constrain low prediction {old_prob:.2f} → {adjusted_prob:.2f}")
        elif adjusted_prob > 0.85 and overall_success_rate < 0.3:
            old_prob = adjusted_prob
            adjusted_prob = min(0.5, overall_success_rate * 1.2)
            reason.append(f"RULE 4: Constrain high prediction {old_prob:.2f} → {adjusted_prob:.2f}")

    return adjusted_prob, adjusted_time, reason, {
        'recent_success': recent_success_rate,
        'overall_success': overall_success_rate,
        'improvement': success_improvement,
        'recent_avg_time': recent_avg_time,
        'overall_avg_time': overall_avg_time
    }

def main():
    print("="*90)
    print("TEST ADAPTIVE ADJUSTMENT LOGIC")
    print("="*90)
    print()

    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Get bulk user
        result = db.execute(text("SELECT id FROM users WHERE email = 'bulk@example.com'"))
        user_id = result.scalar()

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
        """), {'user_id': str(user_id)})

        tasks = [{'correct': row[0], 'actual_time': row[1]} for row in result.fetchall()]

        if len(tasks) < 3:
            print("Not enough tasks for testing")
            return

        print(f"Total Calculus Medium tasks: {len(tasks)}")
        print()

        # Simulate adjustment with current history
        # Assume model predicts 18% (the current low prediction)
        base_prob = 0.18
        base_time = 200.0

        print("="*90)
        print("TEST WITH CURRENT HISTORY")
        print("="*90)
        print()

        adjusted_prob, adjusted_time, reasons, stats = apply_adaptive_adjustment(
            base_prob, base_time, tasks
        )

        print(f"Model base prediction: {base_prob:.1%} correct, {base_time:.0f}s")
        print()
        print(f"Recent 5 tasks success: {stats['recent_success']:.1%}")
        print(f"Overall success: {stats['overall_success']:.1%}")
        print(f"Success improvement: {stats['improvement']:+.2f}")
        print()
        print(f"Adaptive adjustment applied:")
        for reason in reasons:
            print(f"  • {reason}")
        print()
        print(f"Final prediction: {adjusted_prob:.1%} correct, {adjusted_time:.0f}s")
        print()

        if adjusted_prob > base_prob:
            print(f"✅ Prediction INCREASED from {base_prob:.1%} to {adjusted_prob:.1%}")
        elif adjusted_prob < base_prob:
            print(f"⚠️  Prediction DECREASED from {base_prob:.1%} to {adjusted_prob:.1%}")
        else:
            print(f"→ Prediction unchanged at {base_prob:.1%}")

        print()

        # Test with recent tasks only (last 20)
        if len(tasks) > 20:
            print("="*90)
            print("TEST WITH RECENT 20 TASKS ONLY")
            print("="*90)
            print()

            recent_20 = tasks[-20:]
            adjusted_prob_2, adjusted_time_2, reasons_2, stats_2 = apply_adaptive_adjustment(
                base_prob, base_time, recent_20
            )

            print(f"Recent 5 tasks success: {stats_2['recent_success']:.1%}")
            print(f"Overall success (last 20): {stats_2['overall_success']:.1%}")
            print(f"Success improvement: {stats_2['improvement']:+.2f}")
            print()
            print(f"Adaptive adjustment applied:")
            for reason in reasons_2:
                print(f"  • {reason}")
            print()
            print(f"Final prediction: {adjusted_prob_2:.1%} correct, {adjusted_time_2:.0f}s")

        db.close()

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

    print()
    print("="*90)

if __name__ == '__main__':
    main()
