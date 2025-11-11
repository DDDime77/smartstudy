#!/usr/bin/env python3
"""
Quick verification that you3 user's stuck time bug is still fixed
"""

import requests
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
    print("VERIFICATION: you3 user stuck time bug fix")
    print("=" * 80)

    token = login("you3@example.com", "password123")
    if not token:
        print("Failed to login")
        return

    print("Logged in as you3@example.com\n")

    topic = "Linear Equations"  # New topic
    difficulty = "medium"

    print(f"Topic: {topic} {difficulty}")
    print(f"Completing 5 tasks with 30s each\n")

    for i in range(5):
        task = create_task(token, topic, difficulty)
        if not task:
            print(f"Failed to create task {i+1}")
            return

        pred_time = task.get('predicted_time_seconds', 0)

        print(f"Task {i+1}: Predicted Time={pred_time:3.0f}s (Expected to adapt toward 30s)")

        # Complete task
        complete_task(token, task['id'], True, 30)
        time.sleep(0.3)

    print("\n" + "=" * 80)
    print("Expected: Predictions should adapt from 60s → ~30s")
    print("If stuck at 60s, the bug is NOT fixed!")
    print("=" * 80)

if __name__ == '__main__':
    main()
