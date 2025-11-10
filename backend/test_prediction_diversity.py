#!/usr/bin/env python3
"""
Test prediction diversity by querying database for recent predictions
This avoids TensorFlow segfaults by not loading models directly
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

def main():
    print("="*90)
    print("PREDICTION DIVERSITY TEST - Analyzing Recent Predictions from Database")
    print("="*90)
    print()

    engine = create_engine(os.getenv('DATABASE_URL'))

    with engine.connect() as conn:
        # Get bulk@example.com user ID
        result = conn.execute(text("SELECT id, email FROM users WHERE email = 'bulk@example.com'"))
        user = result.fetchone()

        if not user:
            print("❌ bulk@example.com not found")
            return

        user_id = user[0]
        print(f"User: {user[1]}")
        print(f"ID: {user_id}")
        print()

        # Check training status
        result = conn.execute(text('SELECT n_samples_since_training, last_trained_at FROM embedding_model_tracker'))
        tracker = result.fetchone()
        print(f"Training Status: {tracker[0]}/5 tasks since last training")
        print(f"Last trained: {tracker[1]}")
        print()

        # Get ALL recent predictions from embedding model
        result = conn.execute(text('''
            SELECT
                topic,
                difficulty,
                predicted_correct,
                predicted_time_seconds,
                lnirt_model_version,
                created_at
            FROM practice_tasks
            WHERE user_id = :user_id
              AND predicted_correct IS NOT NULL
              AND lnirt_model_version LIKE '%embedding%'
            ORDER BY created_at DESC
            LIMIT 50
        '''), {'user_id': user_id})

        predictions = []
        print("Recent V2 Embedding Predictions:")
        print()
        print(f"{'#':<4} {'Topic':<25} {'Difficulty':<12} {'Correctness':<18} {'Time':<12} {'Created'}")
        print("-" * 100)

        for idx, row in enumerate(result.fetchall(), 1):
            predictions.append({
                'topic': row[0],
                'difficulty': row[1],
                'correct': row[2],
                'time': row[3],
                'model': row[4],
                'created': row[5]
            })
            print(f"{idx:<4} {row[0]:<25} {row[1]:<12} {row[2]:.4f} ({row[2]:>5.1%})   {row[3]:>6.1f}s      {str(row[5])[:19]}")

        if not predictions:
            print("\n⚠️  No V2 embedding predictions found in database")
            print("   This could mean:")
            print("   1. User hasn't generated any tasks yet")
            print("   2. All predictions are still using old LNIRT model")
            print("   3. V2 model is failing and falling back to LNIRT")
            print()

            # Check if there are ANY predictions (even non-embedding)
            result = conn.execute(text('''
                SELECT COUNT(*), lnirt_model_version
                FROM practice_tasks
                WHERE user_id = :user_id
                  AND predicted_correct IS NOT NULL
                GROUP BY lnirt_model_version
                ORDER BY COUNT(*) DESC
                LIMIT 5
            '''), {'user_id': user_id})

            print("Model Version Distribution:")
            for row in result.fetchall():
                print(f"  {row[1]}: {row[0]} predictions")

            return

        print()
        print("="*90)
        print("DIVERSITY ANALYSIS")
        print("="*90)
        print()

        # Analyze diversity
        import numpy as np

        correctness_probs = [p['correct'] for p in predictions]
        time_estimates = [p['time'] for p in predictions]
        unique_correct = len(set(correctness_probs))
        unique_times = len(set(time_estimates))

        print(f"Total predictions analyzed: {len(predictions)}")
        print(f"Unique correctness values: {unique_correct}/{len(predictions)} ({unique_correct/len(predictions)*100:.1f}%)")
        print(f"Unique time values: {unique_times}/{len(predictions)} ({unique_times/len(predictions)*100:.1f}%)")
        print()
        print(f"Correctness range: {min(correctness_probs):.4f} - {max(correctness_probs):.4f}")
        print(f"Time range: {min(time_estimates):.1f}s - {max(time_estimates):.1f}s")
        print()
        print(f"Correctness std deviation: {np.std(correctness_probs):.4f}")
        print(f"Time std deviation: {np.std(time_estimates):.1f}s")
        print()

        # Analyze by topic and difficulty
        print("="*90)
        print("BREAKDOWN BY TOPIC & DIFFICULTY")
        print("="*90)
        print()

        # Group by topic and difficulty
        from collections import defaultdict
        grouped = defaultdict(list)
        for p in predictions:
            key = f"{p['topic']} - {p['difficulty']}"
            grouped[key].append(p)

        print(f"{'Scenario':<40} {'Count':<8} {'Avg Correct':<15} {'Avg Time':<12} {'Range'}")
        print("-" * 95)

        for scenario, preds in sorted(grouped.items()):
            if len(preds) > 0:
                avg_correct = np.mean([p['correct'] for p in preds])
                avg_time = np.mean([p['time'] for p in preds])
                min_correct = min([p['correct'] for p in preds])
                max_correct = max([p['correct'] for p in preds])

                range_str = f"{min_correct:.3f}-{max_correct:.3f}"
                print(f"{scenario:<40} {len(preds):<8} {avg_correct:.4f} ({avg_correct:>5.1%})   {avg_time:>6.1f}s      {range_str}")

        print()
        print("="*90)
        print("VERDICT")
        print("="*90)
        print()

        diversity_ratio = unique_correct / len(predictions)

        if diversity_ratio >= 0.7:
            print(f"✅ EXCELLENT: High diversity ({diversity_ratio*100:.1f}%)")
            print(f"   Model is varying predictions significantly across scenarios")
            print(f"   V2 embedding model is working correctly!")
        elif diversity_ratio >= 0.5:
            print(f"✅ GOOD: Moderate diversity ({diversity_ratio*100:.1f}%)")
            print(f"   Model differentiates most scenarios")
            print(f"   V2 embedding model is working!")
        elif diversity_ratio >= 0.3:
            print(f"⚠️  MODERATE: Some diversity ({diversity_ratio*100:.1f}%)")
            print(f"   Model varies predictions but could be better")
            print(f"   May need more training data or model tuning")
        elif diversity_ratio >= 0.15:
            print(f"⚠️  LOW: Limited diversity ({diversity_ratio*100:.1f}%)")
            print(f"   Model is not differentiating scenarios well")
            print(f"   Check if model is loading correctly")
        else:
            print(f"❌ VERY LOW: Almost no diversity ({diversity_ratio*100:.1f}%)")
            print(f"   All predictions are too similar")
            print(f"   Model may be using fallback values")

        # Check if all predictions are the same (fallback detection)
        if len(set(correctness_probs)) == 1 and len(set(time_estimates)) == 1:
            print()
            print(f"⚠️  WARNING: All predictions are IDENTICAL ({correctness_probs[0]:.4f}, {time_estimates[0]:.1f}s)")
            print(f"   This suggests model is using default fallback values")
            print(f"   Check backend logs for errors")

        print()
        print("="*90)
        print("RECOMMENDATIONS")
        print("="*90)
        print()

        if diversity_ratio < 0.5:
            print("To improve prediction diversity:")
            print("1. Complete more tasks across different topics and difficulties")
            print("2. Trigger training by completing 3 more tasks (currently at 2/5)")
            print("3. Vary your performance (some correct, some incorrect)")
            print("4. Test with more diverse topics (Calculus, Economics, History, etc.)")
        else:
            print("✅ System is working well!")
            print("Continue using the system to further improve predictions:")
            print("1. Complete tasks regularly to provide more training data")
            print("2. Model will automatically retrain every 5 completed tasks")
            print("3. Predictions will become more personalized over time")

        print()


if __name__ == '__main__':
    main()
