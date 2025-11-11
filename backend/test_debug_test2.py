#!/usr/bin/env python3
"""
Debug TEST 2 specifically - the incorrect tasks test
"""

import requests
import json
import time

BASE_URL = "http://localhost:4008"

def login(email: str, password: str) -> str:
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password}
    )
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
    print("=" * 80)
    print("DEBUG TEST 2: INCORRECT TASKS (Statistics easy)")
    print("=" * 80)

    token = login("bulk@example.com", "password123")
    if not token:
        print("Failed to login")
        return

    print("Logged in as bulk@example.com\n")

    topic = "Statistics"
    difficulty = "easy"

    print(f"Topic: {topic} {difficulty}")
    print(f"Completing 10 tasks INCORRECTLY (40s each)\n")

    predictions = []

    for i in range(10):
        task = create_task(token, topic, difficulty)
        if not task:
            print(f"Failed to create task {i+1}")
            return

        pred_acc = task.get('predicted_correct', 0)
        pred_time = task.get('predicted_time_seconds', 0)

        predictions.append({
            'num': i + 1,
            'accuracy': pred_acc,
            'time': pred_time
        })

        print(f"Task {i+1:2d}: Pred={pred_acc:5.1%}, Time={pred_time:3.0f}s | Completing: INCORRECT ✗, 40s")

        # Complete task INCORRECTLY
        complete_task(token, task['id'], False, 40)
        time.sleep(0.3)

    # Analyze results
    first_acc = predictions[0]['accuracy']
    last_acc = predictions[-1]['accuracy']
    acc_change = last_acc - first_acc

    first_time = predictions[0]['time']
    last_time = predictions[-1]['time']
    time_change = last_time - first_time

    print(f"\n{'-'*80}")
    print(f"RESULTS:")
    print(f"  Accuracy: {first_acc:.1%} → {last_acc:.1%} (change: {acc_change:+.1%})")
    print(f"  Time:     {first_time:.0f}s → {last_time:.0f}s (change: {time_change:+.0f}s)")
    print(f"{'-'*80}\n")

    print("EXPECTED:")
    print("  - Accuracy should DECREASE (negative change)")
    print("  - Time should stay stable")

if __name__ == '__main__':
    main()
