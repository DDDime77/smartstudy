"""
Test Case-Insensitive Topic Matching and Model Isolation

Tests:
1. Case-insensitive topic matching (lowercase, uppercase, mixed case)
2. Bulk user gets personalized predictions
3. Model isolation between bulk and normal users
"""

import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
from uuid import UUID
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.ml import LNIRTService

load_dotenv()

# User IDs
BULK_USER_ID = UUID('537b7b10-dd68-4e27-844f-20882922538a')
NORMAL_USER_ID = UUID('202e7cca-51d9-4a87-b6e5-cdd083b3a6c5')  # you2@example.com


def test_case_insensitive_topics():
    """
    Test that topic names are case-insensitive
    """
    print('='*90)
    print('TEST 1: CASE-INSENSITIVE TOPIC MATCHING')
    print('='*90)
    print()

    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()
    lnirt = LNIRTService(db)

    # Test with different cases for Calculus
    test_cases = [
        'Calculus',      # Original (title case)
        'calculus',      # Lowercase
        'CALCULUS',      # Uppercase
        'cAlCuLuS',      # Mixed case
    ]

    print('Testing Calculus topic with different cases:')
    print()

    predictions = {}
    for topic_input in test_cases:
        try:
            p_correct, pred_time = lnirt.predict(BULK_USER_ID, topic_input, 'easy')
            predictions[topic_input] = (p_correct, pred_time)
            print(f'  "{topic_input:12}" -> {p_correct:5.1%} success, {pred_time:4.0f}s')
        except Exception as e:
            print(f'  "{topic_input:12}" -> ERROR: {e}')

    # Verify all predictions are the same
    values = list(predictions.values())
    if len(set(values)) == 1:
        print(f'\n✅ All cases return same prediction: {values[0][0]:.1%} success, {values[0][1]:.0f}s')
    else:
        print(f'\n✗ Predictions differ across cases!')
        return False

    # Test with Microeconomics
    print('\n' + '-'*90)
    print('Testing Microeconomics topic with different cases:')
    print()

    test_cases_micro = [
        'Microeconomics',      # Original
        'microeconomics',      # Lowercase
        'MICROECONOMICS',      # Uppercase
        'MicroEconomics',      # Mixed case
    ]

    predictions_micro = {}
    for topic_input in test_cases_micro:
        try:
            p_correct, pred_time = lnirt.predict(BULK_USER_ID, topic_input, 'medium')
            predictions_micro[topic_input] = (p_correct, pred_time)
            print(f'  "{topic_input:16}" -> {p_correct:5.1%} success, {pred_time:4.0f}s')
        except Exception as e:
            print(f'  "{topic_input:16}" -> ERROR: {e}')

    # Verify all predictions are the same
    values_micro = list(predictions_micro.values())
    if len(set(values_micro)) == 1:
        print(f'\n✅ All cases return same prediction: {values_micro[0][0]:.1%} success, {values_micro[0][1]:.0f}s')
    else:
        print(f'\n✗ Predictions differ across cases!')
        return False

    db.close()
    return True


def test_bulk_user_personalization():
    """
    Test that bulk user has personalized predictions
    """
    print('\n' + '='*90)
    print('TEST 2: BULK USER PERSONALIZATION')
    print('='*90)
    print()

    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()
    lnirt = LNIRTService(db)

    print('Bulk user (bulk@example.com) predictions:')
    print()

    passed = True
    for topic in ['Calculus', 'Microeconomics']:
        print(f'{topic}:')

        # Get user parameters
        params = lnirt.get_user_parameters(BULK_USER_ID, topic)

        if params and params.get('is_personalized'):
            print(f'  ✓ Personalized: True')
            print(f'    θ (ability): {params["theta"]:.3f}')
            print(f'    τ (speed): {params["tau"]:.3f}')

            # Get predictions for all difficulties
            for difficulty in ['easy', 'medium', 'hard']:
                p_correct, pred_time = lnirt.predict(BULK_USER_ID, topic, difficulty)
                print(f'    {difficulty:6}: {p_correct:5.1%} success, {pred_time:4.0f}s')
        else:
            print(f'  ✗ Not personalized!')
            passed = False

        print()

    db.close()
    return passed


def test_model_isolation():
    """
    Test that bulk user and normal user have different predictions
    (model isolation)
    """
    print('='*90)
    print('TEST 3: MODEL ISOLATION')
    print('='*90)
    print()

    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()
    lnirt = LNIRTService(db)

    print('Comparing Calculus predictions (both users have data):')
    print()

    # Bulk user predictions
    print('Bulk user (bulk@example.com):')
    bulk_params = lnirt.get_user_parameters(BULK_USER_ID, 'Calculus')
    print(f'  θ={bulk_params["theta"]:.3f}, τ={bulk_params["tau"]:.3f}, personalized={bulk_params["is_personalized"]}')

    bulk_predictions = {}
    for difficulty in ['easy', 'medium', 'hard']:
        p_correct, pred_time = lnirt.predict(BULK_USER_ID, 'Calculus', difficulty)
        bulk_predictions[difficulty] = (p_correct, pred_time)
        print(f'  {difficulty:6}: {p_correct:5.1%} success, {pred_time:4.0f}s')

    print()

    # Normal user predictions
    print('Normal user (you2@example.com):')
    normal_params = lnirt.get_user_parameters(NORMAL_USER_ID, 'Calculus')
    print(f'  θ={normal_params["theta"]:.3f}, τ={normal_params["tau"]:.3f}, personalized={normal_params["is_personalized"]}')

    normal_predictions = {}
    for difficulty in ['easy', 'medium', 'hard']:
        p_correct, pred_time = lnirt.predict(NORMAL_USER_ID, 'Calculus', difficulty)
        normal_predictions[difficulty] = (p_correct, pred_time)
        print(f'  {difficulty:6}: {p_correct:5.1%} success, {pred_time:4.0f}s')

    print()

    # Compare predictions
    print('Comparison:')
    different = False
    for difficulty in ['easy', 'medium', 'hard']:
        bulk_p, bulk_t = bulk_predictions[difficulty]
        normal_p, normal_t = normal_predictions[difficulty]

        p_diff = abs(bulk_p - normal_p)
        t_diff = abs(bulk_t - normal_t)

        if p_diff > 0.01 or t_diff > 1:  # Different by more than 1% or 1 second
            print(f'  {difficulty:6}: ✓ Different predictions (Δp={p_diff:.1%}, Δt={t_diff:.0f}s)')
            different = True
        else:
            print(f'  {difficulty:6}: ✗ Same predictions')

    print()
    if different:
        print('✅ Model isolation confirmed: Users have different predictions')
    else:
        print('⚠ Warning: Users have very similar predictions')

    db.close()
    return different


def main():
    """
    Main execution
    """
    print('='*90)
    print('COMPREHENSIVE CASE-INSENSITIVE AND ISOLATION TESTS')
    print('='*90)
    print()

    results = {
        'Case-insensitive topics': test_case_insensitive_topics(),
        'Bulk user personalization': test_bulk_user_personalization(),
        'Model isolation': test_model_isolation(),
    }

    # Summary
    print('='*90)
    print('TEST SUMMARY')
    print('='*90)
    print()

    all_passed = True
    for test_name, passed in results.items():
        status = '✅ PASSED' if passed else '✗ FAILED'
        print(f'{test_name:30} {status}')
        if not passed:
            all_passed = False

    print()
    if all_passed:
        print('✅ ALL TESTS PASSED')
    else:
        print('⚠ SOME TESTS FAILED')

    print('='*90)

    return all_passed


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
