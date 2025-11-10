#!/usr/bin/env python3
"""
Comprehensive Test for Backwards Adaptation Bug

Tests BOTH users (you2 and bulk) with ALL edge cases:
1. Correct answer → Accuracy should INCREASE
2. Incorrect answer → Accuracy should DECREASE
3. Fast completion → Time should DECREASE
4. Slow completion → Time should INCREASE
"""

import requests
import json
import time
from datetime import datetime
from typing import List, Dict, Tuple

BASE_URL = "http://localhost:4008"

def login(email: str, password: str) -> str:
    """Login and get access token"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password}
    )
    if response.status_code == 200:
        return response.json()['access_token']
    else:
        print(f"❌ Login failed for {email}: {response.status_code}")
        print(response.text)
        return None

def create_task(token: str, topic: str, difficulty: str) -> Dict:
    """Create a practice task and get prediction"""
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

def complete_task(token: str, task_id: str, is_correct: bool, actual_time: int) -> Dict:
    """Complete a practice task"""
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "completed": True,
        "is_correct": is_correct,
        "actual_time_seconds": actual_time
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

def print_header(title: str):
    print(f"\n{'='*100}")
    print(f"{title:^100}")
    print(f"{'='*100}\n")

def print_section(title: str):
    print(f"\n{'-'*100}")
    print(f"{title}")
    print(f"{'-'*100}")

def test_correct_answers_increase_accuracy(token: str, user_email: str, topic: str, difficulty: str, num_tasks: int = 3) -> bool:
    """
    TEST 1: Completing CORRECT answers should INCREASE accuracy predictions
    """
    print_section(f"TEST 1: CORRECT ANSWERS → ACCURACY SHOULD INCREASE ({user_email})")

    predictions = []

    for i in range(num_tasks):
        # Create task (makes prediction)
        task = create_task(token, topic, difficulty)
        if not task:
            return False

        pred_correct = task.get('predicted_correct', 0)
        pred_time = task.get('predicted_time_seconds', 0)
        task_id = task['id']

        predictions.append({
            'num': i + 1,
            'accuracy': pred_correct,
            'time': pred_time,
            'task_id': task_id
        })

        print(f"Task {i+1}: Accuracy={pred_correct:.1%}, Time={pred_time:.0f}s")

        # Complete CORRECTLY with medium time
        complete_task(token, task_id, is_correct=True, actual_time=30)
        time.sleep(0.5)

    # Analyze
    first_acc = predictions[0]['accuracy']
    last_acc = predictions[-1]['accuracy']
    acc_change = last_acc - first_acc

    print(f"\nFirst accuracy: {first_acc:.1%}")
    print(f"Last accuracy:  {last_acc:.1%}")
    print(f"Change:         {acc_change:+.1%}")

    if acc_change > 0.01:
        print(f"✅ PASS: Accuracy INCREASED after correct answers")
        return True
    elif acc_change < -0.01:
        print(f"❌ FAIL: Accuracy DECREASED after correct answers (BACKWARDS BUG!)")
        return False
    else:
        print(f"⚠️  NEUTRAL: Accuracy stayed stable")
        return None

def test_incorrect_answers_decrease_accuracy(token: str, user_email: str, topic: str, difficulty: str, num_tasks: int = 3) -> bool:
    """
    TEST 2: Completing INCORRECT answers should DECREASE accuracy predictions
    """
    print_section(f"TEST 2: INCORRECT ANSWERS → ACCURACY SHOULD DECREASE ({user_email})")

    predictions = []

    for i in range(num_tasks):
        task = create_task(token, topic, difficulty)
        if not task:
            return False

        pred_correct = task.get('predicted_correct', 0)
        pred_time = task.get('predicted_time_seconds', 0)
        task_id = task['id']

        predictions.append({
            'num': i + 1,
            'accuracy': pred_correct,
            'time': pred_time
        })

        print(f"Task {i+1}: Accuracy={pred_correct:.1%}, Time={pred_time:.0f}s")

        # Complete INCORRECTLY with medium time
        complete_task(token, task_id, is_correct=False, actual_time=30)
        time.sleep(0.5)

    # Analyze
    first_acc = predictions[0]['accuracy']
    last_acc = predictions[-1]['accuracy']
    acc_change = last_acc - first_acc

    print(f"\nFirst accuracy: {first_acc:.1%}")
    print(f"Last accuracy:  {last_acc:.1%}")
    print(f"Change:         {acc_change:+.1%}")

    if acc_change < -0.01:
        print(f"✅ PASS: Accuracy DECREASED after incorrect answers")
        return True
    elif acc_change > 0.01:
        print(f"❌ FAIL: Accuracy INCREASED after incorrect answers (BACKWARDS BUG!)")
        return False
    else:
        print(f"⚠️  NEUTRAL: Accuracy stayed stable")
        return None

def test_fast_completion_decreases_time(token: str, user_email: str, topic: str, difficulty: str, num_tasks: int = 3) -> bool:
    """
    TEST 3: Fast completions should DECREASE time predictions
    """
    print_section(f"TEST 3: FAST COMPLETION → TIME SHOULD DECREASE ({user_email})")

    predictions = []

    for i in range(num_tasks):
        task = create_task(token, topic, difficulty)
        if not task:
            return False

        pred_correct = task.get('predicted_correct', 0)
        pred_time = task.get('predicted_time_seconds', 0)
        task_id = task['id']

        predictions.append({
            'num': i + 1,
            'accuracy': pred_correct,
            'time': pred_time
        })

        print(f"Task {i+1}: Accuracy={pred_correct:.1%}, Time={pred_time:.0f}s")

        # Complete FAST (5 seconds)
        complete_task(token, task_id, is_correct=True, actual_time=5)
        time.sleep(0.5)

    # Analyze
    first_time = predictions[0]['time']
    last_time = predictions[-1]['time']
    time_change = last_time - first_time

    print(f"\nFirst time: {first_time:.0f}s")
    print(f"Last time:  {last_time:.0f}s")
    print(f"Change:     {time_change:+.0f}s")

    if time_change < -5:
        print(f"✅ PASS: Time DECREASED after fast completions")
        return True
    elif time_change > 5:
        print(f"❌ FAIL: Time INCREASED after fast completions (BACKWARDS BUG!)")
        return False
    else:
        print(f"⚠️  NEUTRAL: Time stayed stable (NOT ADAPTING!)")
        return None

def test_slow_completion_increases_time(token: str, user_email: str, topic: str, difficulty: str, num_tasks: int = 3) -> bool:
    """
    TEST 4: Slow completions should INCREASE time predictions
    """
    print_section(f"TEST 4: SLOW COMPLETION → TIME SHOULD INCREASE ({user_email})")

    predictions = []

    for i in range(num_tasks):
        task = create_task(token, topic, difficulty)
        if not task:
            return False

        pred_correct = task.get('predicted_correct', 0)
        pred_time = task.get('predicted_time_seconds', 0)
        task_id = task['id']

        predictions.append({
            'num': i + 1,
            'accuracy': pred_correct,
            'time': pred_time
        })

        print(f"Task {i+1}: Accuracy={pred_correct:.1%}, Time={pred_time:.0f}s")

        # Complete SLOW (120 seconds)
        complete_task(token, task_id, is_correct=True, actual_time=120)
        time.sleep(0.5)

    # Analyze
    first_time = predictions[0]['time']
    last_time = predictions[-1]['time']
    time_change = last_time - first_time

    print(f"\nFirst time: {first_time:.0f}s")
    print(f"Last time:  {last_time:.0f}s")
    print(f"Change:     {time_change:+.0f}s")

    if time_change > 5:
        print(f"✅ PASS: Time INCREASED after slow completions")
        return True
    elif time_change < -5:
        print(f"❌ FAIL: Time DECREASED after slow completions (BACKWARDS BUG!)")
        return False
    else:
        print(f"⚠️  NEUTRAL: Time stayed stable (NOT ADAPTING!)")
        return None

def test_user(email: str, password: str, topic: str, difficulty: str) -> Dict[str, bool]:
    """Test all scenarios for a user"""
    print_header(f"TESTING USER: {email}")

    # Login
    print(f"Logging in as {email}...")
    token = login(email, password)
    if not token:
        print(f"❌ Failed to login as {email}")
        return {}

    print(f"✅ Logged in successfully\n")

    results = {}

    # TEST 1: Correct answers → Accuracy should INCREASE
    results['correct_increases_acc'] = test_correct_answers_increase_accuracy(
        token, email, topic, difficulty, num_tasks=5
    )

    time.sleep(1)

    # TEST 2: Incorrect answers → Accuracy should DECREASE
    results['incorrect_decreases_acc'] = test_incorrect_answers_decrease_accuracy(
        token, email, topic, difficulty, num_tasks=5
    )

    time.sleep(1)

    # TEST 3: Fast completion → Time should DECREASE
    results['fast_decreases_time'] = test_fast_completion_decreases_time(
        token, email, topic, difficulty, num_tasks=5
    )

    time.sleep(1)

    # TEST 4: Slow completion → Time should INCREASE
    results['slow_increases_time'] = test_slow_completion_increases_time(
        token, email, topic, difficulty, num_tasks=5
    )

    return results

def print_final_report(you2_results: Dict, bulk_results: Dict):
    """Print final test report"""
    print_header("FINAL TEST REPORT")

    all_passed = True

    # you2 results
    print(f"\n📊 YOU2@EXAMPLE.COM (New User) Results:")
    print(f"{'-'*60}")
    for test_name, result in you2_results.items():
        if result is True:
            status = "✅ PASS"
        elif result is False:
            status = "❌ FAIL"
            all_passed = False
        else:
            status = "⚠️  NEUTRAL"
        print(f"{test_name:30s}: {status}")

    # bulk results
    print(f"\n📊 BULK@EXAMPLE.COM (Existing User) Results:")
    print(f"{'-'*60}")
    for test_name, result in bulk_results.items():
        if result is True:
            status = "✅ PASS"
        elif result is False:
            status = "❌ FAIL"
            all_passed = False
        else:
            status = "⚠️  NEUTRAL"
        print(f"{test_name:30s}: {status}")

    print(f"\n{'='*100}")
    if all_passed:
        print(f"{'✅ ALL TESTS PASSED - NO BACKWARDS ADAPTATION BUG':^100}")
    else:
        print(f"{'❌ TESTS FAILED - BACKWARDS ADAPTATION BUG DETECTED':^100}")
    print(f"{'='*100}\n")

def main():
    print_header("COMPREHENSIVE BACKWARDS ADAPTATION BUG TEST")
    print("Testing BOTH users with ALL edge cases:")
    print("  1. Correct answers → Accuracy should INCREASE")
    print("  2. Incorrect answers → Accuracy should DECREASE")
    print("  3. Fast completion → Time should DECREASE")
    print("  4. Slow completion → Time should INCREASE")
    print()

    # Test you2 (new user with some data)
    you2_results = test_user(
        email="you2@example.com",
        password="password123",
        topic="Algebra",
        difficulty="medium"
    )

    time.sleep(2)

    # Test bulk (existing user with lots of data)
    bulk_results = test_user(
        email="bulk@example.com",
        password="bulkpass123",
        topic="Calculus",
        difficulty="medium"
    )

    # Final report
    print_final_report(you2_results, bulk_results)

if __name__ == '__main__':
    main()
