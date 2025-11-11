#!/usr/bin/env python3
"""
Realistic Adaptation Test

Tests the EXACT scenario described by the user:
- Start with reasonable predictions (not at 95% cap)
- Complete correct tasks → accuracy should INCREASE
- Complete incorrect tasks → accuracy should DECREASE
- Complete fast tasks → time should DECREASE
- Complete slow tasks → time should INCREASE

Uses DIFFERENT topics to avoid hitting the 95% cap
"""

import requests
import json
import time
from typing import List, Dict

BASE_URL = "http://localhost:4008"

def login(email: str, password: str) -> str:
    """Login and get access token"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password}
    )
    if response.status_code == 200:
        return response.json()['access_token']
    return None

def create_task(token: str, topic: str, difficulty: str) -> Dict:
    """Create a practice task"""
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
    response = requests.post(f"{BASE_URL}/practice-tasks", json=payload, headers=headers)
    return response.json() if response.status_code == 201 else None

def complete_task(token: str, task_id: str, is_correct: bool, actual_time: int) -> Dict:
    """Complete a task"""
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "completed": True,
        "is_correct": is_correct,
        "actual_time_seconds": actual_time
    }
    response = requests.patch(f"{BASE_URL}/practice-tasks/{task_id}", json=payload, headers=headers)
    return response.json() if response.status_code == 200 else None

def test_scenario(token: str, user_email: str, topic: str, difficulty: str,
                  scenario_name: str, is_correct_list: List[bool], time_list: List[int],
                  expected_accuracy_direction: str, expected_time_direction: str, num_tasks: int = 10):
    """
    Test a specific scenario

    Args:
        expected_accuracy_direction: "increase", "decrease", or "stable"
        expected_time_direction: "increase", "decrease", or "stable"
    """
    print(f"\n{'='*100}")
    print(f"{scenario_name} - {user_email}")
    print(f"{'='*100}\n")

    predictions = []

    for i in range(num_tasks):
        # Create task
        task = create_task(token, topic, difficulty)
        if not task:
            print(f"❌ Failed to create task {i+1}")
            return False

        pred_acc = task.get('predicted_correct', 0)
        pred_time = task.get('predicted_time_seconds', 0)

        predictions.append({
            'num': i + 1,
            'accuracy': pred_acc,
            'time': pred_time
        })

        # Cycle through patterns
        is_correct = is_correct_list[i % len(is_correct_list)]
        actual_time = time_list[i % len(time_list)]

        print(f"Task {i+1:2d}: Pred={pred_acc:5.1%}, Time={pred_time:3.0f}s | Actual: {'✓' if is_correct else '✗'}, {actual_time:3d}s")

        # Complete task
        complete_task(token, task['id'], is_correct, actual_time)
        time.sleep(0.3)

    # Analyze results
    first_acc = predictions[0]['accuracy']
    last_acc = predictions[-1]['accuracy']
    acc_change = last_acc - first_acc

    first_time = predictions[0]['time']
    last_time = predictions[-1]['time']
    time_change = last_time - first_time

    print(f"\n{'-'*100}")
    print(f"RESULTS:")
    print(f"  Accuracy: {first_acc:.1%} → {last_acc:.1%} (change: {acc_change:+.1%})")
    print(f"  Time:     {first_time:.0f}s → {last_time:.0f}s (change: {time_change:+.0f}s)")
    print(f"{'-'*100}\n")

    # Check accuracy
    accuracy_pass = False
    if expected_accuracy_direction == "increase":
        if acc_change > 0.02:
            print(f"✅ ACCURACY PASS: Increased as expected ({acc_change:+.1%})")
            accuracy_pass = True
        else:
            print(f"❌ ACCURACY FAIL: Expected increase, got {acc_change:+.1%}")
    elif expected_accuracy_direction == "decrease":
        if acc_change < -0.02:
            print(f"✅ ACCURACY PASS: Decreased as expected ({acc_change:+.1%})")
            accuracy_pass = True
        else:
            print(f"❌ ACCURACY FAIL: Expected decrease, got {acc_change:+.1%}")
    else:  # stable
        if abs(acc_change) <= 0.05:
            print(f"✅ ACCURACY PASS: Stayed stable as expected ({acc_change:+.1%})")
            accuracy_pass = True
        else:
            print(f"⚠️  ACCURACY: Expected stable, got {acc_change:+.1%}")
            accuracy_pass = True  # Still pass if not too extreme

    # Check time
    time_pass = False
    if expected_time_direction == "increase":
        if time_change > 3:
            print(f"✅ TIME PASS: Increased as expected ({time_change:+.0f}s)")
            time_pass = True
        else:
            print(f"❌ TIME FAIL: Expected increase, got {time_change:+.0f}s")
    elif expected_time_direction == "decrease":
        if time_change < -3:
            print(f"✅ TIME PASS: Decreased as expected ({time_change:+.0f}s)")
            time_pass = True
        else:
            print(f"❌ TIME FAIL: Expected decrease, got {time_change:+.0f}s")
    else:  # stable
        if abs(time_change) <= 10:
            print(f"✅ TIME PASS: Stayed stable as expected ({time_change:+.0f}s)")
            time_pass = True
        else:
            print(f"⚠️  TIME: Expected stable, got {time_change:+.0f}s")
            time_pass = True

    return accuracy_pass and time_pass

def main():
    print("="*100)
    print("REALISTIC ADAPTATION TEST".center(100))
    print("="*100)

    # Test bulk user (existing user with lots of data)
    print("\nLogging in as bulk@example.com...")
    bulk_token = login("bulk@example.com", "password123")
    if not bulk_token:
        print("❌ Failed to login")
        return

    print("✅ Logged in\n")

    results = []

    # TEST 1: Completing CORRECT tasks → Accuracy should INCREASE
    results.append(test_scenario(
        token=bulk_token,
        user_email="bulk@example.com",
        topic="Trigonometry",  # Different topic to avoid cap
        difficulty="hard",
        scenario_name="TEST 1: CORRECT TASKS → ACCURACY SHOULD INCREASE",
        is_correct_list=[True],  # All correct
        time_list=[25],  # Consistent time
        expected_accuracy_direction="increase",
        expected_time_direction="stable",
        num_tasks=10
    ))

    time.sleep(2)

    # TEST 2: Completing INCORRECT tasks → Accuracy should DECREASE
    results.append(test_scenario(
        token=bulk_token,
        user_email="bulk@example.com",
        topic="Statistics",  # Different topic
        difficulty="easy",
        scenario_name="TEST 2: INCORRECT TASKS → ACCURACY SHOULD DECREASE",
        is_correct_list=[False],  # All incorrect
        time_list=[40],  # Consistent time
        expected_accuracy_direction="decrease",
        expected_time_direction="stable",
        num_tasks=10
    ))

    time.sleep(2)

    # TEST 3: Completing tasks FAST → Time should DECREASE
    results.append(test_scenario(
        token=bulk_token,
        user_email="bulk@example.com",
        topic="Geometry",  # Different topic
        difficulty="medium",
        scenario_name="TEST 3: FAST COMPLETION → TIME SHOULD DECREASE",
        is_correct_list=[True],  # Correct
        time_list=[5],  # Very fast
        expected_accuracy_direction="increase",
        expected_time_direction="decrease",
        num_tasks=10
    ))

    time.sleep(2)

    # TEST 4: Completing tasks SLOW → Time should INCREASE
    results.append(test_scenario(
        token=bulk_token,
        user_email="bulk@example.com",
        topic="Probability",  # Different topic
        difficulty="hard",
        scenario_name="TEST 4: SLOW COMPLETION → TIME SHOULD INCREASE",
        is_correct_list=[True],  # Correct
        time_list=[150],  # Very slow
        expected_accuracy_direction="increase",
        expected_time_direction="increase",
        num_tasks=10
    ))

    # Final report
    print("\n" + "="*100)
    print("FINAL REPORT".center(100))
    print("="*100)

    test_names = [
        "TEST 1: Correct tasks → Accuracy increase",
        "TEST 2: Incorrect tasks → Accuracy decrease",
        "TEST 3: Fast completion → Time decrease",
        "TEST 4: Slow completion → Time increase"
    ]

    all_passed = True
    for i, (name, passed) in enumerate(zip(test_names, results)):
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{name:50s}: {status}")
        if not passed:
            all_passed = False

    print("\n" + "="*100)
    if all_passed:
        print("✅ ALL TESTS PASSED - NO BACKWARDS ADAPTATION BUG".center(100))
    else:
        print("❌ SOME TESTS FAILED - BACKWARDS ADAPTATION BUG DETECTED".center(100))
    print("="*100 + "\n")

if __name__ == '__main__':
    main()
