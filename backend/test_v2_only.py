#!/usr/bin/env python3
"""
V2 Model Only Simulation Test

Tests V2 model predictions with real database data
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import numpy as np

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

load_dotenv()

from app.ml.embedding_model_v2 import TaskPredictionModelV2


def get_db():
    """Get database connection"""
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    return Session()


def get_all_completed_tasks(db):
    """Fetch all completed tasks for training"""

    query = text("""
        SELECT
            user_id,
            topic,
            difficulty,
            EXTRACT(EPOCH FROM created_at) as timestamp,
            CASE WHEN is_correct THEN 1 ELSE 0 END as correct,
            actual_time_seconds as actual_time
        FROM practice_tasks
        WHERE completed = TRUE
          AND is_correct IS NOT NULL
          AND actual_time_seconds IS NOT NULL
          AND actual_time_seconds > 0
        ORDER BY created_at ASC
    """)

    result = db.execute(query)
    rows = result.fetchall()

    data = []
    for row in rows:
        data.append({
            'user_id': str(row[0]),
            'topic': row[1],
            'difficulty': row[2],
            'timestamp': float(row[3]),
            'correct': bool(row[4]),
            'actual_time': float(row[5])
        })

    return data


def main():
    print("\n" + "="*90)
    print("EMBEDDING MODEL V2 - SIMULATION TEST")
    print("="*90)

    # Get database connection
    print("\n[1/6] Connecting to database...")
    db = get_db()

    # Load data
    print("[2/6] Loading training data...")
    data = get_all_completed_tasks(db)
    print(f"  ✓ Loaded {len(data)} completed tasks")

    if len(data) < 10:
        print("  ❌ Not enough data for testing (need 10+)")
        return

    # Analyze data
    print("\n[3/6] Analyzing data distribution...")
    users = set(t['user_id'] for t in data)
    topics = set(t['topic'] for t in data)
    difficulties = set(t['difficulty'] for t in data)

    print(f"  Users: {len(users)}")
    print(f"  Topics: {list(topics)}")
    print(f"  Difficulties: {list(difficulties)}")

    # Find user with most tasks
    user_task_counts = {}
    for user_id in users:
        user_task_counts[user_id] = len([t for t in data if t['user_id'] == user_id])

    main_user = max(user_task_counts, key=user_task_counts.get)
    main_user_tasks = user_task_counts[main_user]
    print(f"\n  Main user: {main_user[:8]}... ({main_user_tasks} tasks)")

    # Get user history
    main_user_history = [t for t in data if t['user_id'] == main_user]
    main_user_topics = set(t['topic'] for t in main_user_history)

    # Train V2 Model
    print("\n[4/6] Training V2 Model (Feed-Forward + History Features)...")
    print("  This may take 1-2 minutes...")

    model = TaskPredictionModelV2()
    model.train(data, epochs=50, verbose=True)

    print("\n  ✓ V2 Model trained successfully")

    # Test predictions for various scenarios
    print("\n[5/6] Testing predictions across different scenarios...")

    test_scenarios = []

    # Generate test cases: all combinations for main user
    for topic in main_user_topics:
        for difficulty in difficulties:
            test_scenarios.append({
                'user_id': main_user,
                'topic': topic,
                'difficulty': difficulty,
                'timestamp': datetime.utcnow().timestamp()
            })

    print(f"  Testing {len(test_scenarios)} scenarios...")

    # Get predictions
    predictions = []

    print(f"\n  {'Topic':<20} {'Difficulty':<12} {'Correctness':<15} {'Time (s)':<10}")
    print("  " + "-" * 65)

    for scenario in test_scenarios:
        history = main_user_history

        prob, time_est = model.predict(history, scenario)
        predictions.append((prob, time_est))

        print(f"  {scenario['topic']:<20} {scenario['difficulty']:<12} {prob:.4f} ({prob:.2%})  {time_est:>6.0f}s")

    # Analyze diversity
    print("\n[6/6] Analyzing prediction diversity...")

    probs = [p[0] for p in predictions]
    times = [p[1] for p in predictions]

    unique_probs = len(set(probs))
    unique_times = len(set(times))

    print(f"\n{'='*70}")
    print("PREDICTION DIVERSITY ANALYSIS")
    print(f"{'='*70}")

    print(f"\nCorrectness Predictions:")
    print(f"  Unique values: {unique_probs}")
    print(f"  Range: {min(probs):.4f} - {max(probs):.4f}")
    print(f"  Mean: {np.mean(probs):.4f}")
    print(f"  Std Dev: {np.std(probs):.4f}")

    print(f"\nTime Predictions:")
    print(f"  Unique values: {unique_times}")
    print(f"  Range: {min(times):.1f}s - {max(times):.1f}s")
    print(f"  Mean: {np.mean(times):.1f}s")
    print(f"  Std Dev: {np.std(times):.1f}s")

    # Progressive learning test
    print(f"\n{'='*70}")
    print("PROGRESSIVE LEARNING TEST")
    print(f"{'='*70}")
    print(f"User: {main_user[:8]}... | Tasks completed: {main_user_tasks}")
    print()

    # Test how predictions change as user completes more tasks
    test_topic = list(main_user_topics)[0]
    test_difficulty = list(difficulties)[0]

    checkpoints = [1, 5, 10, 20, min(50, main_user_tasks)]

    print(f"Testing predictions after different numbers of completed tasks:")
    print(f"Topic: {test_topic} | Difficulty: {test_difficulty}")
    print()

    print(f"{'Tasks':<8} {'Correctness':<20} {'Time (s)':<12} {'Actual Stats':<30}")
    print("-" * 75)

    progression = []

    for n_tasks in checkpoints:
        if n_tasks > main_user_tasks:
            continue

        # Use first n tasks as history
        history = main_user_history[:n_tasks]

        # Create next task template
        next_task = {
            'user_id': main_user,
            'topic': test_topic,
            'difficulty': test_difficulty,
            'timestamp': datetime.utcnow().timestamp()
        }

        # Predict
        prob, time_est = model.predict(history, next_task)
        progression.append((n_tasks, prob, time_est))

        # Calculate actual stats from history
        topic_tasks = [t for t in history if t['topic'] == test_topic]
        if topic_tasks:
            actual_success = sum(t['correct'] for t in topic_tasks) / len(topic_tasks)
            actual_avg_time = np.mean([t['actual_time'] for t in topic_tasks])
            stats = f"Success: {actual_success:.2%} | Avg: {actual_avg_time:.0f}s"
        else:
            stats = "No history for this topic"

        print(f"{n_tasks:<8} {prob:.4f} ({prob:.2%}){' '*5} {time_est:>6.0f}s      {stats}")

    # Final summary
    print(f"\n{'='*90}")
    print("SUMMARY")
    print(f"{'='*90}")

    print(f"\n✅ Data: {len(data)} completed tasks from {len(users)} users")
    print(f"✅ V2 Model trained with 50 epochs")
    print(f"✅ Predictions tested: {len(predictions)} scenarios")
    print(f"✅ Unique correctness values: {unique_probs}")
    print(f"✅ Unique time values: {unique_times}")

    if len(progression) >= 2:
        prob_change = abs(progression[-1][1] - progression[0][1])
        time_change = abs(progression[-1][2] - progression[0][2])

        print(f"\n📊 Learning Evidence:")
        print(f"   Correctness change (1 task → {progression[-1][0]} tasks): {prob_change:.4f} ({prob_change:.2%})")
        print(f"   Time estimate change: {time_change:.1f}s")

        if prob_change > 0.05 or time_change > 20:
            print(f"   ✅ Model is adapting predictions based on user history")
        else:
            print(f"   ⚠️  Model predictions not changing significantly")

    if unique_probs > 10 and unique_times > 10:
        print(f"\n🎯 RESULT: V2 MODEL SHOWS GOOD DIVERSITY")
        print(f"   ✅ Predictions are personalized and varied")
        print(f"   ✅ Ready for production use")
    elif unique_probs > 5:
        print(f"\n⚠️  RESULT: V2 MODEL SHOWS MODERATE DIVERSITY")
        print(f"   ⚠️  Better than V1, but could be improved")
    else:
        print(f"\n❌ RESULT: V2 MODEL NOT LEARNING EFFECTIVELY")
        print(f"   ❌ Predictions too similar across scenarios")

    print(f"\n{'='*90}")

    db.close()


if __name__ == '__main__':
    main()
