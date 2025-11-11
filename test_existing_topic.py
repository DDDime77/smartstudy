#!/usr/bin/env python3
"""
Test predictions with existing topic from training data
"""

import requests
import json

BASE_URL = "http://localhost:4008"

def test_existing_topic():
    print("=" * 80)
    print("TESTING PREDICTIONS WITH EXISTING TOPIC")
    print("=" * 80)

    # Login
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "you3@example.com",
        "password": "password123"
    })

    if response.status_code != 200:
        print(f"✗ Login failed: {response.status_code}")
        return

    token = response.json()['access_token']
    headers = {"Authorization": f"Bearer {token}"}
    print("✓ Logged in as you3@example.com\n")

    # Use an existing topic that should have training data
    # Let's use "Calculus" which we saw in the logs
    topic = "Calculus"
    difficulty = "medium"

    print(f"Creating 3 tasks: {topic} ({difficulty})\n")
    print(f"{'Task':<6} {'Success %':<12} {'Time (s)':<10}")
    print("-" * 80)

    for i in range(1, 4):
        task_data = {
            "subject": "Math",
            "topic": topic,
            "difficulty": difficulty,
            "task_content": f"Task {i}",
            "solution_content": "Solution",
            "answer_content": "Answer",
            "estimated_time_minutes": 5
        }

        response = requests.post(f"{BASE_URL}/practice-tasks", json=task_data, headers=headers)

        if response.status_code != 201:
            print(f"✗ Task {i} creation failed: {response.status_code}")
            print(response.text)
            continue

        task = response.json()
        pred_correct = task.get('predicted_correct', 0) * 100
        pred_time = task.get('predicted_time_seconds', 0)

        print(f"{i:<6} {pred_correct:<12.1f} {pred_time:<10.0f}")

if __name__ == "__main__":
    test_existing_topic()
