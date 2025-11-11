#!/usr/bin/env python3
"""
Debug slow completion test
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
    print("DEBUG: SLOW COMPLETION TEST")
    print("=" * 80)

    token = login("bulk@example.com", "password123")
    if not token:
        print("Failed to login")
        return

    print("Logged in as bulk@example.com\n")

    topic = "Complex Numbers"  # New topic
    difficulty = "hard"

    print(f"Topic: {topic} {difficulty}")
    print(f"Completing 5 tasks SLOWLY (150s each)\n")

    for i in range(5):
        task = create_task(token, topic, difficulty)
        if not task:
            print(f"Failed to create task {i+1}")
            return

        pred_time = task.get('predicted_time_seconds', 0)

        print(f"Task {i+1}: Predicted Time={pred_time:3.0f}s | Completing with 150s")

        # Complete task slowly
        complete_task(token, task['id'], True, 150)
        time.sleep(0.5)

    print("\n" + "=" * 80)
    print("Check /tmp/backend.log for [Adaptive] debug output")
    print("=" * 80)

if __name__ == '__main__':
    main()
