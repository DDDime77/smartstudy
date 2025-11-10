#!/usr/bin/env python3
"""
Study Timer API Testing Tool - Test predictions through actual API

This tests the complete flow:
1. Get predictions via API
2. Complete tasks via API
3. Verify predictions adapt correctly
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:4008"
FRONTEND_URL = "http://localhost:4000"

def login(email, password):
    """Login and get access token"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )

    if response.status_code == 200:
        return response.json()['access_token']
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(response.text)
        return None

def create_practice_task(token, topic, difficulty):
    """Create a new practice task with predictions"""
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "subject": "Math",
        "topic": topic,
        "difficulty": difficulty,
        "task_content": f"Test {topic} {difficulty} task",
        "solution_content": "Test solution",
        "answer_content": "Test answer",
        "estimated_time_minutes": 5
    }

    response = requests.post(
        f"{BASE_URL}/practice-tasks",
        json=payload,
        headers=headers
    )

    if response.status_code == 201:
        return response.json()
    else:
        print(f"❌ Create task failed: {response.status_code}")
        print(response.text)
        return None

def complete_task(token, task_id, is_correct, actual_time_seconds):
    """Complete a practice task"""
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "completed": True,
        "is_correct": is_correct,
        "actual_time_seconds": actual_time_seconds
    }

    response = requests.patch(
        f"{BASE_URL}/practice-tasks/{task_id}",
        json=payload,
        headers=headers
    )

    if response.status_code == 200:
        return response.json()
    else:
        print(f"❌ Complete task failed: {response.status_code}")
        print(response.text)
        return None

def get_recent_tasks(token, topic=None, difficulty=None, limit=10):
    """Get recent practice tasks"""
    headers = {"Authorization": f"Bearer {token}"}

    params = {"limit": limit}
    if topic:
        params["topic"] = topic

    response = requests.get(
        f"{BASE_URL}/practice-tasks",
        params=params,
        headers=headers
    )

    if response.status_code == 200:
        tasks = response.json()
        if topic and difficulty:
            tasks = [t for t in tasks if t['topic'] == topic and t['difficulty'] == difficulty]
        return tasks
    else:
        print(f"❌ Get tasks failed: {response.status_code}")
        return []

def print_header(title):
    print(f"\n{'='*90}")
    print(f"{title:^90}")
    print(f"{'='*90}\n")

def print_section(title):
    print(f"\n{'-'*90}")
    print(f"{title}")
    print(f"{'-'*90}")

def test_prediction_adaptation(token, topic, difficulty, num_tasks=5):
    """
    Test that predictions adapt correctly when completing tasks

    Tests both scenarios:
    1. Completing CORRECT tasks → Predictions should INCREASE
    2. Completing INCORRECT tasks → Predictions should DECREASE
    """
    print_header(f"TESTING PREDICTION ADAPTATION - {topic} {difficulty}")

    predictions = []

    print(f"Will complete {num_tasks} tasks and track prediction changes\n")

    for i in range(num_tasks):
        print(f"Task {i+1}/{num_tasks}:")
        print(f"{'-'*50}")

        # Create task (this makes a prediction)
        task = create_practice_task(token, topic, difficulty)

        if not task:
            print(f"❌ Failed to create task {i+1}")
            continue

        pred_correct = task.get('predicted_correct', 0)
        pred_time = task.get('predicted_time_seconds', 0)
        task_id = task['id']

        print(f"  Created task ID: {task_id}")
        print(f"  Prediction: {pred_correct:.1%} correct, {pred_time:.0f}s")

        # Store prediction
        predictions.append({
            'task_num': i+1,
            'predicted_correct': pred_correct,
            'predicted_time': pred_time,
            'task_id': task_id
        })

        # Complete the task (CORRECT with fast time)
        is_correct = True  # Complete correctly
        actual_time = 20  # Fast time

        completed = complete_task(token, task_id, is_correct, actual_time)

        if completed:
            result = "✓ Correct" if is_correct else "✗ Wrong"
            print(f"  Completed: {result}, {actual_time}s")
        else:
            print(f"  ❌ Failed to complete task")

        print()
        time.sleep(0.5)  # Small delay between tasks

    # Analyze prediction trend
    print_section("PREDICTION TREND ANALYSIS")

    print(f"{'Task':<8} {'Predicted %':<15} {'Change':<15}")
    print('-' * 50)

    for i, pred in enumerate(predictions):
        if i == 0:
            change = "baseline"
        else:
            prev_pred = predictions[i-1]['predicted_correct']
            curr_pred = pred['predicted_correct']
            diff = curr_pred - prev_pred

            if diff > 0.01:
                change = f"↑ +{diff:.1%}"
            elif diff < -0.01:
                change = f"↓ {diff:.1%}"
            else:
                change = "→ stable"

        print(f"Task {pred['task_num']:<3} {pred['predicted_correct']:<14.1%} {change:<15}")

    print()

    # Determine if adaptation is correct
    if len(predictions) >= 3:
        first_pred = predictions[0]['predicted_correct']
        last_pred = predictions[-1]['predicted_correct']
        overall_change = last_pred - first_pred

        print_section("RESULT")

        print(f"First prediction: {first_pred:.1%}")
        print(f"Last prediction: {last_pred:.1%}")
        print(f"Overall change: {overall_change:+.1%}")
        print()

        if overall_change > 0.02:
            print(f"✅ CORRECT: Predictions INCREASED (completing correct tasks)")
            print(f"   Adaptation is working in the RIGHT direction!")
            return True
        elif overall_change < -0.02:
            print(f"❌ WRONG: Predictions DECREASED (backwards adaptation bug!)")
            print(f"   This is the bug we need to fix!")
            return False
        else:
            print(f"⚠️  NEUTRAL: Predictions stayed stable")
            print(f"   Change was too small to determine trend")
            return None

    return None

def test_current_predictions(token, topic, difficulty):
    """Test current prediction values"""
    print_header(f"CURRENT PREDICTIONS - {topic} {difficulty}")

    # Create a task to see prediction
    task = create_practice_task(token, topic, difficulty)

    if task:
        pred_correct = task.get('predicted_correct', 0)
        pred_time = task.get('predicted_time_seconds', 0)
        model_type = task.get('lnirt_model_version', 'unknown')

        print(f"Current prediction:")
        print(f"  Correctness: {pred_correct:.1%}")
        print(f"  Time: {pred_time:.0f}s")
        print(f"  Model: {model_type}")
        print()

        # Don't complete this task, just delete it
        # (We'll leave cleanup for later)

        return pred_correct, pred_time

    return None, None

def main():
    print_header("STUDY TIMER API TESTING TOOL")

    print("Testing prediction adaptation through actual API calls...")
    print()

    # Login
    print("Logging in as bulk@example.com...")
    token = login("bulk@example.com", "bulkpass123")

    if not token:
        print("❌ Failed to login. Cannot proceed with tests.")
        return

    print(f"✅ Logged in successfully")
    print()

    # Test 1: Check current predictions
    print_section("TEST 1: CURRENT PREDICTION VALUES")
    pred_correct, pred_time = test_current_predictions(token, "Calculus", "medium")

    if pred_correct is not None:
        if pred_correct < 0.30:
            print(f"⚠️  WARNING: Predictions are very low ({pred_correct:.1%})")
            print(f"   This might indicate backwards adaptation issue")
        elif pred_correct > 0.70:
            print(f"✅ Predictions look reasonable ({pred_correct:.1%})")
        else:
            print(f"→ Predictions are moderate ({pred_correct:.1%})")

    print()

    # Test 2: Adaptation test
    print_section("TEST 2: PREDICTION ADAPTATION TEST")
    print("Completing 5 CORRECT tasks to test adaptation direction...")
    print()

    result = test_prediction_adaptation(token, "Calculus", "medium", num_tasks=5)

    print()
    print_header("TEST COMPLETE")

    if result is True:
        print("✅ All tests PASSED")
        print("   Predictions are adapting correctly!")
    elif result is False:
        print("❌ Tests FAILED")
        print("   Backwards adaptation bug detected!")
    else:
        print("⚠️  Tests INCONCLUSIVE")
        print("   Unable to determine adaptation direction")

if __name__ == '__main__':
    main()
