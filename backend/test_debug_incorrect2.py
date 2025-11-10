#!/usr/bin/env python3
"""
Debug Test for Incorrect Tasks - NEW TOPIC
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
    print("DEBUG TEST 2: INCORRECT TASKS WITH NEW TOPIC")
    print("=" * 80)

    token = login("bulk@example.com", "bulkpass123")
    if not token:
        print("Failed to login")
        return

    print("Logged in as bulk@example.com\n")

    # Use a BRAND NEW topic
    topic = "Linear Programming"
    difficulty = "hard"

    print(f"Testing with: {topic} {difficulty}")
    print(f"Completing 8 tasks INCORRECTLY\n")

    for i in range(8):
        task = create_task(token, topic, difficulty)
        if not task:
            print(f"Failed to create task {i+1}")
            return

        pred_acc = task.get('predicted_correct', 0)
        pred_time = task.get('predicted_time_seconds', 0)

        print(f"Task {i+1}: Pred={pred_acc:5.1%}, Time={pred_time:3.0f}s | Completing: INCORRECT ✗")

        # Complete task INCORRECTLY
        complete_task(token, task['id'], False, 40)
        time.sleep(0.5)

    print("\n" + "=" * 80)
    print("Expected:")
    print("  Tasks 1-3: Should use early learning (15%)")
    print("  Tasks 4+: Should use absolute performance rule (15%)")
    print("=" * 80)

if __name__ == '__main__':
    main()
