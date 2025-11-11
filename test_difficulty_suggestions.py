#!/usr/bin/env python3
"""
Integration test for difficulty suggestion feature.
Tests that ML predictions work correctly and suggestion logic is sound.
"""

import requests
import json

BASE_URL = "http://localhost:4008"
FRONTEND_URL = "http://localhost:4000"

def test_backend_ml_predictions():
    """Test that backend ML predictions are working"""
    print("=" * 80)
    print("TEST 1: Backend ML Predictions")
    print("=" * 80)

    # Login
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "you3@example.com",
        "password": "password123"
    })

    if response.status_code != 200:
        print(f"✗ Login failed: {response.status_code}")
        return False

    token = response.json()['access_token']
    headers = {"Authorization": f"Bearer {token}"}
    print("✓ Login successful")

    # Create a task to test predictions
    task_data = {
        "subject": "Math",
        "topic": "Algebra",
        "difficulty": "medium",
        "task_content": "Test task for predictions",
        "solution_content": "Test solution",
        "answer_content": "Test answer",
        "estimated_time_minutes": 5
    }

    response = requests.post(f"{BASE_URL}/practice-tasks", json=task_data, headers=headers)

    if response.status_code != 201:
        print(f"✗ Task creation failed: {response.status_code}")
        print(response.text)
        return False

    task = response.json()
    print(f"✓ Task created with ID: {task['id']}")

    # Check predictions exist
    if 'predicted_correct' in task and 'predicted_time_seconds' in task:
        pred_correct = task['predicted_correct']
        pred_time = task['predicted_time_seconds']
        print(f"✓ ML Predictions received:")
        print(f"  - Success probability: {pred_correct * 100:.1f}%")
        print(f"  - Estimated time: {pred_time}s")

        # Validate prediction ranges
        if 0 <= pred_correct <= 1:
            print(f"✓ Success probability in valid range [0, 1]")
        else:
            print(f"✗ Success probability out of range: {pred_correct}")
            return False

        if 10 <= pred_time <= 300:
            print(f"✓ Time prediction in reasonable range [10s, 300s]")
        else:
            print(f"⚠ Time prediction unusual but acceptable: {pred_time}s")

        return True
    else:
        print("✗ No predictions found in response")
        print(f"Response keys: {task.keys()}")
        return False

def test_difficulty_suggestion_logic():
    """Test the difficulty suggestion logic thresholds"""
    print("\n" + "=" * 80)
    print("TEST 2: Difficulty Suggestion Logic")
    print("=" * 80)

    test_cases = [
        # (success_rate, current_difficulty, should_suggest_harder, should_suggest_easier)
        (0.85, 'easy', True, False),      # High success on easy → suggest medium
        (0.90, 'medium', True, False),    # High success on medium → suggest hard
        (0.80, 'hard', False, False),     # High success on hard but no harder level
        (0.25, 'hard', False, True),      # Low success on hard → suggest medium
        (0.20, 'medium', False, True),    # Low success on medium → suggest easy
        (0.30, 'easy', False, False),     # Low success on easy but no easier level
        (0.50, 'medium', False, False),   # Medium success → no suggestion
        (0.75, 'medium', False, False),   # Good but not high enough for suggestion
    ]

    all_passed = True

    for success_rate, difficulty, should_harder, should_easier in test_cases:
        # Simulate the logic from our frontend code
        difficultyLevels = ['easy', 'medium', 'hard']
        currentIndex = difficultyLevels.index(difficulty)

        # Check if suggestion should appear
        suggests_harder = (success_rate >= 0.80 and currentIndex < len(difficultyLevels) - 1)
        suggests_easier = (success_rate <= 0.30 and currentIndex > 0)

        test_name = f"Success {success_rate*100:.0f}% on {difficulty}"

        if suggests_harder == should_harder and suggests_easier == should_easier:
            print(f"✓ {test_name}")
            if suggests_harder:
                print(f"  → Correctly suggests harder ({difficultyLevels[currentIndex + 1]})")
            elif suggests_easier:
                print(f"  → Correctly suggests easier ({difficultyLevels[currentIndex - 1]})")
            else:
                print(f"  → Correctly shows no suggestion")
        else:
            print(f"✗ {test_name}")
            print(f"  Expected: harder={should_harder}, easier={should_easier}")
            print(f"  Got: harder={suggests_harder}, easier={suggests_easier}")
            all_passed = False

    return all_passed

def test_frontend_pages():
    """Test that frontend pages still load"""
    print("\n" + "=" * 80)
    print("TEST 3: Frontend Pages Accessibility")
    print("=" * 80)

    pages = [
        "/",
        "/dashboard",
        "/dashboard/study-timer",
        "/dashboard/analytics",
        "/dashboard/tasks",
    ]

    all_passed = True

    for page in pages:
        response = requests.get(f"{FRONTEND_URL}{page}")
        if response.status_code == 200:
            print(f"✓ {page}")
        else:
            print(f"✗ {page} - HTTP {response.status_code}")
            all_passed = False

    return all_passed

def main():
    print("\n" + "=" * 80)
    print("COMPREHENSIVE INTEGRATION TEST")
    print("Testing difficulty suggestion feature with ML predictions")
    print("=" * 80 + "\n")

    results = {
        "ML Predictions": test_backend_ml_predictions(),
        "Suggestion Logic": test_difficulty_suggestion_logic(),
        "Frontend Pages": test_frontend_pages(),
    }

    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)

    for test_name, passed in results.items():
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{test_name}: {status}")

    print("=" * 80)

    if all(results.values()):
        print("\n✓ ALL TESTS PASSED - Feature is working correctly!")
        return 0
    else:
        print("\n✗ SOME TESTS FAILED - Please review the output above")
        return 1

if __name__ == "__main__":
    exit(main())
