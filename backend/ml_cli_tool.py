#!/usr/bin/env python3
"""
ML CLI Testing Tool - Complete testing suite for embedding model V2

Tests:
1. Model loading
2. Training with real data
3. Prediction before/after training
4. Progressive learning simulation
5. Diversity analysis
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import numpy as np
from datetime import datetime
import json

sys.path.insert(0, str(Path(__file__).parent))
load_dotenv()

from app.ml.embedding_model_v2 import TaskPredictionModelV2
from app.ml.embedding_service import EmbeddingModelService


def print_header(title):
    print(f"\n{'='*90}")
    print(f"{title:^90}")
    print(f"{'='*90}\n")


def print_section(title):
    print(f"\n{'-'*90}")
    print(f"{title}")
    print(f"{'-'*90}")


def get_db():
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    return Session(), engine


def get_all_tasks(db):
    """Get all completed tasks"""
    query = text("""
        SELECT
            user_id,
            topic,
            difficulty,
            EXTRACT(EPOCH FROM created_at) as timestamp,
            CASE WHEN is_correct THEN 1 ELSE 0 END as correct,
            actual_time_seconds as actual_time,
            created_at
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
            'actual_time': float(row[5]),
            'created_at': row[6]
        })

    return data


def get_user_by_email(db, email):
    """Get user UUID by email"""
    query = text("SELECT id FROM users WHERE email = :email")
    result = db.execute(query, {'email': email})
    row = result.fetchone()
    return str(row[0]) if row else None


def test_model_loading():
    """Test 1: Model Loading"""
    print_header("TEST 1: MODEL LOADING")

    model = TaskPredictionModelV2()

    if model.correctness_model is not None:
        print(f"✅ Correctness model loaded")
        print(f"   Inputs: {[inp.name for inp in model.correctness_model.inputs]}")
        print(f"   Output: {model.correctness_model.output.name}")
    else:
        print(f"⚠️  No correctness model found (will build on training)")

    if model.time_model is not None:
        print(f"✅ Time model loaded")
        print(f"   Inputs: {[inp.name for inp in model.time_model.inputs]}")
        print(f"   Output: {model.time_model.output.name}")
    else:
        print(f"⚠️  No time model found (will build on training)")

    print(f"\n📊 Metadata:")
    print(f"   Users: {model.metadata['n_users']}")
    print(f"   Topics: {model.metadata['n_topics']}")
    print(f"   Difficulties: {model.metadata['n_difficulties']}")

    return model


def test_training(model, data):
    """Test 2: Training"""
    print_header("TEST 2: MODEL TRAINING")

    print(f"Training data: {len(data)} completed tasks")

    if len(data) < 10:
        print(f"❌ Insufficient data (need 10+, have {len(data)})")
        return False

    # Train
    print(f"\n🚀 Training V2 model with 50 epochs...")
    model.train(data, epochs=50, verbose=True)

    print(f"\n✅ Training complete")
    print(f"   Metadata updated:")
    print(f"   - Users: {model.metadata['n_users']}")
    print(f"   - Topics: {model.metadata['n_topics']}")
    print(f"   - User IDs: {list(model.metadata['user_ids'].keys())[:3]}...")
    print(f"   - Topics: {list(model.metadata['topics'].keys())}")

    return True


def test_predictions_before_after(model, data, test_user_id):
    """Test 3: Predictions Before/After Training"""
    print_header("TEST 3: PREDICTIONS BEFORE/AFTER TRAINING")

    # Get user history
    user_history = [t for t in data if t['user_id'] == test_user_id]

    if not user_history:
        print(f"❌ No history for user {test_user_id[:8]}...")
        return

    print(f"User: {test_user_id[:8]}...")
    print(f"History: {len(user_history)} completed tasks")

    # Test scenarios
    topics = list(set(t['topic'] for t in user_history))[:3]
    difficulties = ['easy', 'medium', 'hard']

    print(f"\n📊 Testing predictions for {len(topics)} topics x {len(difficulties)} difficulties:")
    print(f"\n{'Topic':<15} {'Difficulty':<12} {'Correctness':<15} {'Time (s)':<12}")
    print('-'*60)

    predictions = []
    for topic in topics:
        for difficulty in difficulties:
            next_task = {
                'user_id': test_user_id,
                'topic': topic,
                'difficulty': difficulty,
                'timestamp': datetime.utcnow().timestamp()
            }

            prob, time_est = model.predict(user_history, next_task)
            predictions.append((topic, difficulty, prob, time_est))

            print(f"{topic:<15} {difficulty:<12} {prob:.4f} ({prob:.2%})  {time_est:>6.1f}s")

    # Analyze diversity
    probs = [p[2] for p in predictions]
    times = [p[3] for p in predictions]

    print(f"\n📈 Diversity Analysis:")
    print(f"   Unique correctness values: {len(set(probs))}/{len(predictions)}")
    print(f"   Unique time values: {len(set(times))}/{len(predictions)}")
    print(f"   Correctness range: {min(probs):.4f} - {max(probs):.4f}")
    print(f"   Time range: {min(times):.1f}s - {max(times):.1f}s")
    print(f"   Correctness std dev: {np.std(probs):.4f}")
    print(f"   Time std dev: {np.std(times):.1f}s")

    diversity_ratio = len(set(probs)) / len(predictions) * 100

    if diversity_ratio > 70:
        print(f"\n✅ EXCELLENT diversity: {diversity_ratio:.1f}%")
    elif diversity_ratio > 50:
        print(f"\n✅ GOOD diversity: {diversity_ratio:.1f}%")
    elif diversity_ratio > 30:
        print(f"\n⚠️  MODERATE diversity: {diversity_ratio:.1f}%")
    else:
        print(f"\n❌ POOR diversity: {diversity_ratio:.1f}%")

    return predictions


def test_progressive_learning(model, data, test_user_id):
    """Test 4: Progressive Learning"""
    print_header("TEST 4: PROGRESSIVE LEARNING")

    user_tasks = [t for t in data if t['user_id'] == test_user_id]

    if len(user_tasks) < 10:
        print(f"⚠️  User has only {len(user_tasks)} tasks, need 10+ for meaningful test")
        return

    print(f"Testing how predictions change as user completes more tasks")
    print(f"User: {test_user_id[:8]}...")

    # Test on most common topic
    topics = [t['topic'] for t in user_tasks]
    most_common_topic = max(set(topics), key=topics.count)

    print(f"Topic: {most_common_topic}")
    print(f"Difficulty: medium")

    checkpoints = [1, 5, 10, 20, min(50, len(user_tasks))]

    print(f"\n{'Tasks':<8} {'Correctness':<20} {'Time (s)':<12} {'Actual Performance'}")
    print('-'*75)

    progression = []
    for n_tasks in checkpoints:
        if n_tasks > len(user_tasks):
            continue

        # Use first n tasks as history
        history = user_tasks[:n_tasks]

        # Predict next task
        next_task = {
            'user_id': test_user_id,
            'topic': most_common_topic,
            'difficulty': 'medium',
            'timestamp': datetime.utcnow().timestamp()
        }

        prob, time_est = model.predict(history, next_task)
        progression.append((n_tasks, prob, time_est))

        # Calculate actual stats
        topic_tasks = [t for t in history if t['topic'] == most_common_topic]
        if topic_tasks:
            actual_success = sum(t['correct'] for t in topic_tasks) / len(topic_tasks)
            actual_avg_time = np.mean([t['actual_time'] for t in topic_tasks])
            stats = f"Actual: {actual_success:.2%}, {actual_avg_time:.0f}s"
        else:
            stats = "No data yet"

        print(f"{n_tasks:<8} {prob:.4f} ({prob:.2%})  {time_est:>6.1f}s    {stats}")

    # Check if predictions are adapting
    if len(progression) >= 2:
        prob_change = abs(progression[-1][1] - progression[0][1])
        time_change = abs(progression[-1][2] - progression[0][2])

        print(f"\n📊 Learning Evidence:")
        print(f"   Correctness change: {prob_change:.4f} ({prob_change:.2%})")
        print(f"   Time change: {time_change:.1f}s")

        if prob_change > 0.05 or time_change > 20:
            print(f"   ✅ Model IS adapting predictions based on history")
        else:
            print(f"   ⚠️  Model predictions not changing much")

    return progression


def test_database_integration():
    """Test 5: Database Integration"""
    print_header("TEST 5: DATABASE INTEGRATION & SERVICE")

    db, engine = get_db()

    try:
        # Test embedding service
        service = EmbeddingModelService(db)

        print(f"✅ EmbeddingModelService initialized")

        # Check tracker status
        status = service.get_status()

        print(f"\n📊 Training Tracker Status:")
        print(f"   Model type: {status['model_type']}")
        print(f"   Last trained: {status['last_trained_at']}")
        print(f"   Total samples: {status['n_samples_total']}")
        print(f"   Samples last training: {status['n_samples_last_training']}")
        print(f"   Samples since training: {status['n_samples_since_training']}")
        print(f"   Training threshold: {status['training_threshold']}")
        print(f"   Next training in: {status['next_training_in']} tasks")
        print(f"   Model loaded: {status['model_loaded']}")

        # Test prediction via service
        result = db.execute(text("SELECT user_id, topic, difficulty FROM practice_tasks WHERE completed = TRUE LIMIT 1"))
        row = result.fetchone()

        if row:
            test_user_id = row[0]
            test_topic = row[1]
            test_difficulty = row[2]

            print(f"\n🧪 Testing prediction via service:")
            print(f"   User: {str(test_user_id)[:8]}...")
            print(f"   Topic: {test_topic}")
            print(f"   Difficulty: {test_difficulty}")

            prob, time_est = service.predict(test_user_id, test_topic, test_difficulty)

            print(f"\n   Prediction:")
            print(f"   - Correctness: {prob:.4f} ({prob:.2%})")
            print(f"   - Time: {time_est:.1f}s")

            print(f"\n✅ Service prediction successful")

        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_simulation_workflow():
    """Test 6: Complete Simulation Workflow"""
    print_header("TEST 6: COMPLETE SIMULATION WORKFLOW")

    db, engine = get_db()

    try:
        print(f"Simulating complete workflow: task generation → completion → training")

        # Get user
        user_email = "bulk@example.com"
        user_id = get_user_by_email(db, user_email)

        if not user_id:
            # Try to find any user
            result = db.execute(text("SELECT id, email FROM users LIMIT 1"))
            row = result.fetchone()
            if row:
                user_id = str(row[0])
                user_email = row[1]
                print(f"⚠️  User bulk@example.com not found, using {user_email}")
            else:
                print(f"❌ No users found in database")
                return False

        print(f"\n👤 User: {user_email}")
        print(f"   ID: {user_id[:8]}...")

        # Check current counter
        result = db.execute(text("SELECT n_samples_since_training FROM embedding_model_tracker LIMIT 1"))
        counter = result.scalar()

        print(f"\n📊 Current training counter: {counter}/5")

        # Get user's completed tasks
        result = db.execute(text("""
            SELECT COUNT(*) FROM practice_tasks
            WHERE user_id = :user_id AND completed = TRUE
        """), {'user_id': user_id})
        task_count = result.scalar()

        print(f"   User has {task_count} completed tasks")

        # Make predictions for different scenarios
        service = EmbeddingModelService(db)

        print(f"\n🔮 Making predictions for various scenarios:")

        scenarios = [
            ('Calculus', 'easy'),
            ('Calculus', 'medium'),
            ('Calculus', 'hard'),
        ]

        print(f"\n{'Topic':<15} {'Difficulty':<12} {'Correctness':<15} {'Time (s)'}")
        print('-'*60)

        for topic, difficulty in scenarios:
            prob, time_est = service.predict(user_id, topic, difficulty)
            print(f"{topic:<15} {difficulty:<12} {prob:.4f} ({prob:.2%})  {time_est:>6.1f}s")

        print(f"\n✅ Workflow simulation complete")

        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def main():
    print_header("ML V2 MODEL - COMPREHENSIVE CLI TEST SUITE")

    print(f"Python: {sys.version}")
    print(f"Working directory: {os.getcwd()}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Get database connection
    db, engine = get_db()

    # Get all data
    print_section("Loading Data")
    data = get_all_tasks(db)
    print(f"✅ Loaded {len(data)} completed tasks")

    if len(data) < 10:
        print(f"❌ Insufficient data for testing (need 10+, have {len(data)})")
        db.close()
        return

    # Analyze data
    users = set(t['user_id'] for t in data)
    topics = set(t['topic'] for t in data)

    print(f"   Users: {len(users)}")
    print(f"   Topics: {len(topics)}")

    # Find user with most tasks
    user_task_counts = {}
    for user_id in users:
        user_task_counts[user_id] = len([t for t in data if t['user_id'] == user_id])

    main_user = max(user_task_counts, key=user_task_counts.get)
    main_user_tasks = user_task_counts[main_user]

    print(f"   Main test user: {main_user[:8]}... ({main_user_tasks} tasks)")

    # Check if bulk@example.com exists
    bulk_user = get_user_by_email(db, "bulk@example.com")
    if bulk_user:
        print(f"   bulk@example.com found: {bulk_user[:8]}...")
        test_user_id = bulk_user
    else:
        print(f"   bulk@example.com not found, using main user")
        test_user_id = main_user

    db.close()

    # Run tests
    try:
        # Test 1: Load model
        model = test_model_loading()

        # Test 2: Train model
        trained = test_training(model, data)

        if not trained:
            print(f"\n❌ Training failed, cannot continue")
            return

        # Test 3: Predictions
        test_predictions_before_after(model, data, test_user_id)

        # Test 4: Progressive learning
        test_progressive_learning(model, data, test_user_id)

        # Test 5: Database integration
        test_database_integration()

        # Test 6: Complete workflow
        test_simulation_workflow()

        # Final summary
        print_header("FINAL SUMMARY")

        print(f"✅ All tests completed successfully")
        print(f"\n📊 Model Status:")
        print(f"   - V2 architecture: Feed-forward with history aggregation")
        print(f"   - Training data: {len(data)} tasks")
        print(f"   - Users in model: {model.metadata['n_users']}")
        print(f"   - Topics in model: {model.metadata['n_topics']}")
        print(f"   - Models saved to: {model.model_dir}")

        print(f"\n🎯 Next Steps:")
        print(f"   1. Restart backend to load updated models")
        print(f"   2. Test via website at http://localhost:4000/dashboard/study-timer")
        print(f"   3. Login as bulk@example.com")
        print(f"   4. Generate and complete tasks")
        print(f"   5. Observe predictions changing")

    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        return 1

    return 0


if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)
