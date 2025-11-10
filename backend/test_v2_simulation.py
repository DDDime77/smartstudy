#!/usr/bin/env python3
"""
Comprehensive Simulation Test for V2 Model

Tests:
1. Load data from database
2. Train V1 and V2 models
3. Compare prediction diversity
4. Simulate task completion scenarios
5. Verify predictions are meaningful and changing
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

from app.ml.embedding_model import TaskPredictionModel as V1Model
from app.ml.embedding_model_v2 import TaskPredictionModelV2 as V2Model


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


def get_user_history(db, user_id):
    """Get completed tasks for a specific user"""

    query = text("""
        SELECT
            user_id,
            topic,
            difficulty,
            EXTRACT(EPOCH FROM created_at) as timestamp,
            CASE WHEN is_correct THEN 1 ELSE 0 END as correct,
            actual_time_seconds as actual_time
        FROM practice_tasks
        WHERE user_id = :user_id
          AND completed = TRUE
          AND is_correct IS NOT NULL
          AND actual_time_seconds IS NOT NULL
          AND actual_time_seconds > 0
        ORDER BY created_at ASC
    """)

    result = db.execute(query, {'user_id': user_id})
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


def analyze_prediction_diversity(predictions, model_name):
    """Analyze diversity of predictions"""

    probs = [p[0] for p in predictions]
    times = [p[1] for p in predictions]

    print(f"\n{model_name} Prediction Diversity:")
    print(f"{'='*70}")

    # Correctness probabilities
    unique_probs = len(set(probs))
    print(f"Correctness Predictions:")
    print(f"  Unique values: {unique_probs}")
    print(f"  Range: {min(probs):.4f} - {max(probs):.4f}")
    print(f"  Mean: {np.mean(probs):.4f}")
    print(f"  Std Dev: {np.std(probs):.4f}")

    # Time predictions
    unique_times = len(set(times))
    print(f"\nTime Predictions:")
    print(f"  Unique values: {unique_times}")
    print(f"  Range: {min(times):.1f}s - {max(times):.1f}s")
    print(f"  Mean: {np.mean(times):.1f}s")
    print(f"  Std Dev: {np.std(times):.1f}s")

    return {
        'unique_probs': unique_probs,
        'unique_times': unique_times,
        'prob_range': (min(probs), max(probs)),
        'time_range': (min(times), max(times)),
        'prob_std': np.std(probs),
        'time_std': np.std(times)
    }


def simulate_progressive_learning(model, data, user_id, topic, difficulty):
    """
    Simulate progressive learning: predict after 1, 5, 10, 20, 50 tasks

    Should show predictions changing as user completes more tasks
    """

    print(f"\n{model.__class__.__name__} - Progressive Learning Simulation")
    print(f"{'='*70}")
    print(f"User: {user_id[:8]}... | Topic: {topic} | Difficulty: {difficulty}")
    print()

    user_tasks = [t for t in data if t['user_id'] == user_id]

    if len(user_tasks) < 10:
        print("  Not enough tasks for this user")
        return []

    checkpoints = [1, 5, 10, 20, min(50, len(user_tasks))]
    predictions = []

    print(f"{'Tasks':<8} {'Correctness':<15} {'Time (s)':<12} {'Actual Stats':<30}")
    print("-" * 70)

    for n_tasks in checkpoints:
        if n_tasks > len(user_tasks):
            continue

        # Use first n tasks as history
        history = user_tasks[:n_tasks]

        # Create next task template
        next_task = {
            'user_id': user_id,
            'topic': topic,
            'difficulty': difficulty,
            'timestamp': datetime.utcnow().timestamp()
        }

        # Predict
        prob, time_est = model.predict(history, next_task)
        predictions.append((n_tasks, prob, time_est))

        # Calculate actual stats from history
        topic_tasks = [t for t in history if t['topic'] == topic]
        if topic_tasks:
            actual_success = sum(t['correct'] for t in topic_tasks) / len(topic_tasks)
            actual_avg_time = np.mean([t['actual_time'] for t in topic_tasks])
            stats = f"Success: {actual_success:.2%} | Avg: {actual_avg_time:.0f}s"
        else:
            stats = "No history for this topic"

        print(f"{n_tasks:<8} {prob:.4f} ({prob:.2%}){' '*4} {time_est:>6.0f}s      {stats}")

    return predictions


def main():
    print("\n" + "="*90)
    print("EMBEDDING MODEL V2 - COMPREHENSIVE SIMULATION TEST")
    print("="*90)

    # Get database connection
    print("\n[1/8] Connecting to database...")
    db = get_db()

    # Load data
    print("[2/8] Loading training data...")
    data = get_all_completed_tasks(db)
    print(f"  ✓ Loaded {len(data)} completed tasks")

    if len(data) < 10:
        print("  ❌ Not enough data for testing (need 10+)")
        return

    # Analyze data
    print("\n[3/8] Analyzing data distribution...")
    users = set(t['user_id'] for t in data)
    topics = set(t['topic'] for t in data)
    difficulties = set(t['difficulty'] for t in data)

    print(f"  Users: {len(users)}")
    print(f"  Topics: {len(topics)}")
    print(f"  Difficulties: {len(difficulties)}")

    # Find user with most tasks
    user_task_counts = {}
    for user_id in users:
        user_task_counts[user_id] = len([t for t in data if t['user_id'] == user_id])

    main_user = max(user_task_counts, key=user_task_counts.get)
    main_user_tasks = user_task_counts[main_user]
    print(f"  Main user: {main_user[:8]}... ({main_user_tasks} tasks)")

    # Train V1 Model
    print("\n[4/8] Training V1 Model (LSTM)...")
    v1_model = V1Model()
    v1_model.train(data, epochs=20, verbose=False)
    print("  ✓ V1 Model trained")

    # Train V2 Model
    print("\n[5/8] Training V2 Model (Feed-Forward + History Features)...")
    v2_model = V2Model()
    v2_model.train(data, epochs=50, verbose=False)
    print("  ✓ V2 Model trained")

    # Test predictions for various scenarios
    print("\n[6/8] Testing prediction diversity across different scenarios...")

    test_scenarios = []

    # Generate test cases: all combinations of topics, difficulties for main user
    main_user_history = [t for t in data if t['user_id'] == main_user]
    main_user_topics = set(t['topic'] for t in main_user_history)

    for topic in main_user_topics:
        for difficulty in difficulties:
            test_scenarios.append({
                'user_id': main_user,
                'topic': topic,
                'difficulty': difficulty,
                'timestamp': datetime.utcnow().timestamp()
            })

    print(f"  Testing {len(test_scenarios)} scenarios...")

    # Get predictions from both models
    v1_predictions = []
    v2_predictions = []

    for scenario in test_scenarios:
        history = main_user_history

        v1_prob, v1_time = v1_model.predict(history, scenario)
        v1_predictions.append((v1_prob, v1_time))

        v2_prob, v2_time = v2_model.predict(history, scenario)
        v2_predictions.append((v2_prob, v2_time))

    # Analyze diversity
    print("\n[7/8] Analyzing prediction diversity...")

    v1_diversity = analyze_prediction_diversity(v1_predictions, "V1 (LSTM)")
    v2_diversity = analyze_prediction_diversity(v2_predictions, "V2 (Feed-Forward)")

    # Compare models
    print(f"\n{'='*70}")
    print("MODEL COMPARISON")
    print(f"{'='*70}")

    print(f"\n{'Metric':<30} {'V1 (LSTM)':<20} {'V2 (Feed-Forward)':<20}")
    print("-" * 70)
    print(f"{'Unique Correctness Values':<30} {v1_diversity['unique_probs']:<20} {v2_diversity['unique_probs']:<20}")
    print(f"{'Unique Time Values':<30} {v1_diversity['unique_times']:<20} {v2_diversity['unique_times']:<20}")
    print(f"{'Correctness Std Dev':<30} {v1_diversity['prob_std']:.4f}{' ':<15} {v2_diversity['prob_std']:.4f}{' ':<15}")
    print(f"{'Time Std Dev':<30} {v1_diversity['time_std']:.1f}s{' ':<15} {v2_diversity['time_std']:.1f}s{' ':<15}")

    # Determine winner
    print(f"\n{'='*70}")
    v2_better = (
        v2_diversity['unique_probs'] > v1_diversity['unique_probs'] and
        v2_diversity['unique_times'] > v1_diversity['unique_times'] and
        v2_diversity['prob_std'] > v1_diversity['prob_std']
    )

    if v2_better:
        print("✅ V2 MODEL SHOWS SIGNIFICANTLY BETTER DIVERSITY")
        print("   V2 predictions are more varied and personalized")
    else:
        print("⚠️  Models show similar diversity")

    # Progressive learning test
    print("\n[8/8] Testing progressive learning...")

    # Test on main user
    test_topic = list(main_user_topics)[0]
    test_difficulty = list(difficulties)[0]

    v1_progression = simulate_progressive_learning(
        v1_model, data, main_user, test_topic, test_difficulty
    )

    v2_progression = simulate_progressive_learning(
        v2_model, data, main_user, test_topic, test_difficulty
    )

    # Analyze progression
    if len(v2_progression) >= 2:
        v2_prob_change = abs(v2_progression[-1][1] - v2_progression[0][1])
        v2_time_change = abs(v2_progression[-1][2] - v2_progression[0][2])

        print(f"\n{'='*70}")
        print(f"V2 Model Learning Evidence:")
        print(f"  Correctness change: {v2_prob_change:.4f} ({v2_prob_change:.2%})")
        print(f"  Time estimate change: {v2_time_change:.1f}s")

        if v2_prob_change > 0.05 or v2_time_change > 20:
            print("  ✅ Model is adapting predictions based on user history")
        else:
            print("  ⚠️  Model predictions not changing significantly")

    # Final summary
    print(f"\n{'='*90}")
    print("SUMMARY")
    print(f"{'='*90}")

    print(f"\n✅ Data: {len(data)} completed tasks from {len(users)} users")
    print(f"✅ V1 Model: {v1_diversity['unique_probs']} unique correctness predictions")
    print(f"✅ V2 Model: {v2_diversity['unique_probs']} unique correctness predictions")

    if v2_better:
        print(f"\n🎯 RECOMMENDATION: Use V2 Model")
        print(f"   - Better prediction diversity")
        print(f"   - More personalized predictions")
        print(f"   - Better learning from user history")
    else:
        print(f"\n⚠️  RECOMMENDATION: Further investigation needed")
        print(f"   - V2 not showing expected improvement")
        print(f"   - May need architecture adjustments")

    print(f"\n{'='*90}")

    db.close()


if __name__ == '__main__':
    main()
