#!/usr/bin/env python3
"""
Test to reproduce prediction bugs with you3@example.com
"""

import requests
import json

BASE_URL = "http://localhost:4008"

def test_consecutive_predictions():
    print("=" * 80)
    print("TESTING PREDICTION BUGS - you3@example.com")
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

    # Create 5 tasks with same difficulty and observe predictions
    topic = "Test Topic"
    difficulty = "medium"

    print(f"Creating 5 consecutive tasks: {topic} ({difficulty})\n")
    print(f"{'Task':<6} {'Success %':<12} {'Time (s)':<10} {'Notes'}")
    print("-" * 80)

    predictions = []

    for i in range(1, 6):
        task_data = {
            "subject": "Math",
            "topic": topic,
            "difficulty": difficulty,
            "task_content": f"Test task {i}",
            "solution_content": "Test solution",
            "answer_content": "Test answer",
            "estimated_time_minutes": 5
        }

        response = requests.post(f"{BASE_URL}/practice-tasks", json=task_data, headers=headers)

        if response.status_code != 201:
            print(f"✗ Task {i} creation failed")
            continue

        task = response.json()
        pred_correct = task.get('predicted_correct', 0) * 100
        pred_time = task.get('predicted_time_seconds', 0)

        predictions.append({
            'task_num': i,
            'success': pred_correct,
            'time': pred_time
        })

        notes = []
        if i > 1:
            prev = predictions[i-2]
            if pred_time == prev['time']:
                notes.append("⚠ STUCK TIME")
            if pred_correct > prev['success'] * 1.5:
                notes.append("⚠ PHANTOM ADD")

        print(f"{i:<6} {pred_correct:<12.1f} {pred_time:<10.0f} {' '.join(notes)}")

    print("\n" + "=" * 80)
    print("ANALYSIS")
    print("=" * 80)

    # Check for stuck times
    times = [p['time'] for p in predictions]
    if len(set(times)) == 1:
        print(f"✗ BUG CONFIRMED: All times stuck at {times[0]}s")
    else:
        print(f"✓ Times vary: {set(times)}")

    # Check for phantom adds
    for i in range(1, len(predictions)):
        if predictions[i]['success'] > predictions[i-1]['success'] * 1.5:
            print(f"✗ BUG CONFIRMED: Phantom add from task {i} to {i+1}")
            print(f"  Task {i}: {predictions[i-1]['success']:.1f}%")
            print(f"  Task {i+1}: {predictions[i]['success']:.1f}%")

    print("")

if __name__ == "__main__":
    test_consecutive_predictions()
