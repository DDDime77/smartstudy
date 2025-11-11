#!/usr/bin/env python3
"""
SCENARIO 1: New user (you3) - Mixed performance pattern
Calculus medium topic

Task 1: Correct, 30s
Task 2: Correct, 45s
Task 3: Incorrect, 45s
Task 4: Correct, 30s
"""

import requests
import time

BASE_URL = "http://localhost:4008"

def login(email: str, password: str) -> str:
    response = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if response.status_code == 200:
        return response.json()['access_token']
    return None

def create_task(token: str, topic: str, difficulty: str):
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

def complete_task(token: str, task_id: str, is_correct: bool, actual_time: int):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "completed": True,
        "is_correct": is_correct,
        "actual_time_seconds": actual_time
    }
    response = requests.patch(f"{BASE_URL}/practice-tasks/{task_id}", json=payload, headers=headers)
    return response.json() if response.status_code == 200 else None

def main():
    print("=" * 100)
    print("SCENARIO 1: NEW USER (you3) - MIXED PERFORMANCE PATTERN")
    print("=" * 100)

    token = login("you3@example.com", "password123")
    if not token:
        print("❌ Failed to login")
        return

    print("✅ Logged in as you3@example.com\n")

    # Use a BRAND NEW topic for you3 to ensure clean slate
    topic = "Differential Equations"
    difficulty = "medium"

    print(f"📚 Topic: {topic} ({difficulty})")
    print("🎯 Testing pattern: ✓30s, ✓45s, ✗45s, ✓30s\n")
    print("=" * 100)

    tasks_data = [
        (True, 30, "✓", "Correct, fast"),
        (True, 45, "✓", "Correct, slower"),
        (False, 45, "✗", "Incorrect, same time"),
        (True, 30, "✓", "Correct, fast again"),
    ]

    for i, (is_correct, actual_time, symbol, description) in enumerate(tasks_data, 1):
        # Create task
        task = create_task(token, topic, difficulty)
        if not task:
            print(f"❌ Failed to create task {i}")
            return

        pred_acc = task.get('predicted_correct', 0)
        pred_time = task.get('predicted_time_seconds', 0)

        print(f"\n📋 TASK {i}:")
        print(f"  Prediction:  Accuracy={pred_acc:6.1%}, Time={pred_time:3.0f}s")
        print(f"  Actual:      {symbol} {description} (time={actual_time}s)")

        # Complete task
        complete_task(token, task['id'], is_correct, actual_time)
        time.sleep(0.3)

    print("\n" + "=" * 100)
    print("📊 ANALYSIS - HOW PREDICTIONS EVOLVED:")
    print("=" * 100)
    print("Task 1 → Task 2: Should adapt to actual performance from Task 1")
    print("Task 2 → Task 3: Should reflect mix of Task 1 (30s) and Task 2 (45s)")
    print("Task 3 → Task 4: Should drop accuracy due to Task 3 incorrect")
    print("Task 4: Should exit early learning, use prediction_error adjustment")
    print("=" * 100)

if __name__ == '__main__':
    main()
