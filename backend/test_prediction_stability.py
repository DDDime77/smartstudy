"""
Comprehensive Prediction Stability Test

Tests that LNIRT model predictions remain stable when encountering outlier behavior.

Critical Test Case (User-Reported Bug):
- Initial prediction: 53% success @ 2m19s
- User completes ONE incorrect task in 10 seconds (extreme outlier)
- Expected: Prediction should remain relatively stable (NOT drop to ~10% @ 20s)
- Why: Model trained on 300 tasks shouldn't be drastically affected by single outlier

This test validates:
1. Regularization prevents wild parameter swings
2. Exponential moving average smooths updates
3. All 300 tasks are used (not just 100)
4. Sample-weighted updates (single task has minimal impact)
"""

import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
from uuid import UUID
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.ml import LNIRTService
from datetime import datetime, timedelta
import numpy as np

load_dotenv()

# Bulk user ID
BULK_USER_ID = UUID('537b7b10-dd68-4e27-844f-20882922538a')

# Stability thresholds
MAX_PROBABILITY_CHANGE = 0.15  # Max 15% change in success probability
MAX_TIME_CHANGE_RATIO = 0.30   # Max 30% change in predicted time


def get_db_session():
    """Create database session"""
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    return Session()


def insert_training_data(db, user_id, topic, difficulty, correct, response_time):
    """Insert a single training data point"""
    query = text("""
        INSERT INTO lnirt_training_data (
            user_id, topic, difficulty, correct, response_time_seconds,
            used_for_general_training, created_at
        )
        VALUES (
            :user_id, :topic, :difficulty, :correct, :response_time,
            FALSE, :created_at
        )
    """)

    # Convert boolean to int for database
    correct_int = 1 if correct else 0

    db.execute(query, {
        'user_id': user_id,
        'topic': topic,
        'difficulty': difficulty,
        'correct': correct_int,
        'response_time': response_time,
        'created_at': datetime.utcnow()
    })
    db.commit()


def test_single_outlier_stability():
    """
    TEST 1: Single Outlier Stability (User-Reported Bug)

    Scenario:
    - User has 300 Microeconomics tasks with ~53% success @ ~2m19s
    - Completes ONE incorrect task in 10 seconds (extreme outlier)
    - Prediction should remain stable (NOT drop to ~10% @ 20s)
    """
    print('='*90)
    print('TEST 1: SINGLE OUTLIER STABILITY (USER-REPORTED BUG)')
    print('='*90)
    print()

    db = get_db_session()
    lnirt = LNIRTService(db)

    # Get baseline prediction
    print('Step 1: Get baseline prediction for Microeconomics (medium difficulty)')
    p_before, t_before = lnirt.predict(BULK_USER_ID, 'Microeconomics', 'medium')
    print(f'  Baseline: {p_before:.1%} success, {t_before:.0f}s ({t_before/60:.1f}m)')
    print()

    # Get user parameters before
    params_before = lnirt.get_user_parameters(BULK_USER_ID, 'Microeconomics')
    print('Step 2: Current user parameters')
    print(f'  θ (ability): {params_before["theta"]:.4f}')
    print(f'  τ (speed): {params_before["tau"]:.4f}')
    print(f'  Personalized: {params_before["is_personalized"]}')
    print()

    # Simulate ONE outlier: incorrect task completed in 10 seconds
    print('Step 3: Simulate outlier behavior')
    print('  Completing ONE task:')
    print('    - Difficulty: medium')
    print('    - Result: INCORRECT (0%)')
    print('    - Time: 10 seconds (very fast)')
    print('    - This is extreme outlier vs baseline (~53% @ 139s)')
    print()

    insert_training_data(db, BULK_USER_ID, 'Microeconomics', 2, False, 10)

    # Train model with outlier
    print('Step 4: Train model with new data (includes outlier)')
    train_result = lnirt.auto_train_on_completion(BULK_USER_ID, 'Microeconomics')
    print(f'  General training: {train_result["general_training"]["status"]}')
    print(f'  User training: {train_result["user_training"]["status"]}')

    if train_result['user_training']['status'] == 'success':
        print(f'  Samples used: {train_result["user_training"]["n_samples"]}')
    print()

    # Get parameters after
    params_after = lnirt.get_user_parameters(BULK_USER_ID, 'Microeconomics')
    print('Step 5: Updated user parameters')
    print(f'  θ (ability): {params_before["theta"]:.4f} → {params_after["theta"]:.4f}')
    print(f'  τ (speed): {params_before["tau"]:.4f} → {params_after["tau"]:.4f}')

    theta_change = abs(params_after["theta"] - params_before["theta"])
    tau_change = abs(params_after["tau"] - params_before["tau"])
    print(f'  Changes: Δθ={theta_change:.4f}, Δτ={tau_change:.4f}')
    print()

    # Get new prediction
    print('Step 6: Get new prediction after outlier')
    p_after, t_after = lnirt.predict(BULK_USER_ID, 'Microeconomics', 'medium')
    print(f'  New prediction: {p_after:.1%} success, {t_after:.0f}s ({t_after/60:.1f}m)')
    print()

    # Calculate changes
    p_change = abs(p_after - p_before)
    p_change_pct = p_change
    t_change_ratio = abs(t_after - t_before) / t_before if t_before > 0 else 0

    print('Step 7: Stability Analysis')
    print(f'  Prediction changes:')
    print(f'    Success probability: {p_before:.1%} → {p_after:.1%} (Δ={p_change:.1%})')
    print(f'    Expected time: {t_before:.0f}s → {t_after:.0f}s (Δ={t_change_ratio:.1%})')
    print()

    # Validate stability
    print('Step 8: Validation')
    passed = True

    if p_change <= MAX_PROBABILITY_CHANGE:
        print(f'  ✅ Probability change ({p_change:.1%}) within threshold ({MAX_PROBABILITY_CHANGE:.1%})')
    else:
        print(f'  ✗ Probability change ({p_change:.1%}) exceeds threshold ({MAX_PROBABILITY_CHANGE:.1%})')
        passed = False

    if t_change_ratio <= MAX_TIME_CHANGE_RATIO:
        print(f'  ✅ Time change ({t_change_ratio:.1%}) within threshold ({MAX_TIME_CHANGE_RATIO:.1%})')
    else:
        print(f'  ✗ Time change ({t_change_ratio:.1%}) exceeds threshold ({MAX_TIME_CHANGE_RATIO:.1%})')
        passed = False

    print()

    if passed:
        print('✅ TEST PASSED: Model remains stable with single outlier')
    else:
        print('✗ TEST FAILED: Model too sensitive to single outlier')

    db.close()
    return passed


def test_multiple_outliers():
    """
    TEST 2: Multiple Outliers Stability

    Tests that model remains stable even with multiple consecutive outliers
    """
    print('\n' + '='*90)
    print('TEST 2: MULTIPLE CONSECUTIVE OUTLIERS')
    print('='*90)
    print()

    db = get_db_session()
    lnirt = LNIRTService(db)

    # Get baseline
    p_baseline, t_baseline = lnirt.predict(BULK_USER_ID, 'Microeconomics', 'medium')
    print(f'Baseline: {p_baseline:.1%} @ {t_baseline:.0f}s')
    print()

    # Add 5 outliers
    print('Adding 5 consecutive outliers (all incorrect, very fast):')
    for i in range(5):
        insert_training_data(db, BULK_USER_ID, 'Microeconomics', 2, False, 15)
        lnirt.auto_train_on_completion(BULK_USER_ID, 'Microeconomics')
        p_new, t_new = lnirt.predict(BULK_USER_ID, 'Microeconomics', 'medium')
        print(f'  After outlier {i+1}: {p_new:.1%} @ {t_new:.0f}s')

    print()

    # Final check
    p_final, t_final = lnirt.predict(BULK_USER_ID, 'Microeconomics', 'medium')
    p_change = abs(p_final - p_baseline)
    t_change_ratio = abs(t_final - t_baseline) / t_baseline

    print(f'Total change: Δp={p_change:.1%}, Δt={t_change_ratio:.1%}')

    # More lenient threshold for multiple outliers
    passed = p_change <= 0.25 and t_change_ratio <= 0.50

    if passed:
        print('✅ TEST PASSED: Model stable with multiple outliers')
    else:
        print('✗ TEST FAILED: Model too sensitive to outliers')

    db.close()
    return passed


def test_opposite_outlier():
    """
    TEST 3: Opposite Outlier (Very Slow Correct)

    Tests stability with opposite type of outlier
    """
    print('\n' + '='*90)
    print('TEST 3: OPPOSITE OUTLIER (SLOW CORRECT)')
    print('='*90)
    print()

    db = get_db_session()
    lnirt = LNIRTService(db)

    # Get baseline
    p_before, t_before = lnirt.predict(BULK_USER_ID, 'Calculus', 'hard')
    print(f'Baseline (Calculus hard): {p_before:.1%} @ {t_before:.0f}s')
    print()

    # Add very slow correct answer (opposite of fast incorrect)
    print('Adding outlier: Correct answer in 900 seconds (15 minutes - very slow)')
    insert_training_data(db, BULK_USER_ID, 'Calculus', 3, True, 900)
    lnirt.auto_train_on_completion(BULK_USER_ID, 'Calculus')

    p_after, t_after = lnirt.predict(BULK_USER_ID, 'Calculus', 'hard')
    print(f'After outlier: {p_after:.1%} @ {t_after:.0f}s')
    print()

    p_change = abs(p_after - p_before)
    t_change_ratio = abs(t_after - t_before) / t_before

    print(f'Changes: Δp={p_change:.1%}, Δt={t_change_ratio:.1%}')

    passed = p_change <= MAX_PROBABILITY_CHANGE and t_change_ratio <= MAX_TIME_CHANGE_RATIO

    if passed:
        print('✅ TEST PASSED: Model stable with opposite outlier')
    else:
        print('✗ TEST FAILED: Model too sensitive')

    db.close()
    return passed


def test_rapid_behavior_change():
    """
    TEST 4: Rapid Behavior Change Detection

    Tests that model CAN adapt to genuine behavior changes (not single outliers)
    """
    print('\n' + '='*90)
    print('TEST 4: GENUINE BEHAVIOR CHANGE DETECTION')
    print('='*90)
    print()

    db = get_db_session()
    lnirt = LNIRTService(db)

    # Get baseline
    p_before, t_before = lnirt.predict(BULK_USER_ID, 'Calculus', 'easy')
    print(f'Baseline (Calculus easy): {p_before:.1%} @ {t_before:.0f}s')
    print()

    # Add 20 consistent new behavior (incorrect + fast = genuine change)
    print('Simulating genuine behavior change: 20 incorrect tasks in 30s each')
    for i in range(20):
        insert_training_data(db, BULK_USER_ID, 'Calculus', 1, False, 30)
        if (i + 1) % 5 == 0:
            lnirt.auto_train_on_completion(BULK_USER_ID, 'Calculus')
            p_new, t_new = lnirt.predict(BULK_USER_ID, 'Calculus', 'easy')
            print(f'  After {i+1} tasks: {p_new:.1%} @ {t_new:.0f}s')

    print()

    p_after, t_after = lnirt.predict(BULK_USER_ID, 'Calculus', 'easy')
    p_change = abs(p_after - p_before)

    print(f'Total change: {p_before:.1%} → {p_after:.1%} (Δ={p_change:.1%})')

    # Model SHOULD adapt to genuine changes (opposite of stability test)
    passed = p_change >= 0.10  # Should change by at least 10% with 20 consistent tasks

    if passed:
        print('✅ TEST PASSED: Model adapts to genuine behavior changes')
    else:
        print('⚠ Warning: Model may be too resistant to genuine changes')

    db.close()
    return passed


def test_all_difficulties_stability():
    """
    TEST 5: Stability Across All Difficulties

    Tests that outlier doesn't affect predictions for other difficulties
    """
    print('\n' + '='*90)
    print('TEST 5: CROSS-DIFFICULTY STABILITY')
    print('='*90)
    print()

    db = get_db_session()
    lnirt = LNIRTService(db)

    # Get baseline for all difficulties
    print('Baseline predictions for Microeconomics:')
    baseline = {}
    for difficulty in ['easy', 'medium', 'hard']:
        p, t = lnirt.predict(BULK_USER_ID, 'Microeconomics', difficulty)
        baseline[difficulty] = (p, t)
        print(f'  {difficulty:6}: {p:.1%} @ {t:.0f}s')
    print()

    # Add outlier on medium difficulty
    print('Adding outlier on MEDIUM difficulty only (incorrect @ 10s)')
    insert_training_data(db, BULK_USER_ID, 'Microeconomics', 2, False, 10)
    lnirt.auto_train_on_completion(BULK_USER_ID, 'Microeconomics')
    print()

    # Check all difficulties
    print('Predictions after outlier:')
    passed = True
    for difficulty in ['easy', 'medium', 'hard']:
        p, t = lnirt.predict(BULK_USER_ID, 'Microeconomics', difficulty)
        p_before, t_before = baseline[difficulty]
        p_change = abs(p - p_before)
        t_change_ratio = abs(t - t_before) / t_before

        print(f'  {difficulty:6}: {p:.1%} @ {t:.0f}s (Δp={p_change:.1%}, Δt={t_change_ratio:.1%})')

        # All difficulties should remain relatively stable
        if p_change > MAX_PROBABILITY_CHANGE or t_change_ratio > MAX_TIME_CHANGE_RATIO:
            passed = False

    print()
    if passed:
        print('✅ TEST PASSED: Outlier has minimal cross-difficulty impact')
    else:
        print('✗ TEST FAILED: Outlier affects other difficulties too much')

    db.close()
    return passed


def test_parameter_recovery():
    """
    TEST 6: Parameter Recovery After Outliers

    Tests that parameters return to baseline after outliers are balanced by normal data
    """
    print('\n' + '='*90)
    print('TEST 6: PARAMETER RECOVERY')
    print('='*90)
    print()

    db = get_db_session()
    lnirt = LNIRTService(db)

    # Get baseline parameters
    params_baseline = lnirt.get_user_parameters(BULK_USER_ID, 'Calculus')
    theta_baseline = params_baseline['theta']
    tau_baseline = params_baseline['tau']

    print(f'Baseline parameters: θ={theta_baseline:.4f}, τ={tau_baseline:.4f}')
    print()

    # Add 3 outliers
    print('Adding 3 outliers (incorrect @ 10s each):')
    for _ in range(3):
        insert_training_data(db, BULK_USER_ID, 'Calculus', 2, False, 10)
        lnirt.auto_train_on_completion(BULK_USER_ID, 'Calculus')

    params_outlier = lnirt.get_user_parameters(BULK_USER_ID, 'Calculus')
    theta_outlier = params_outlier['theta']
    tau_outlier = params_outlier['tau']
    print(f'After outliers: θ={theta_outlier:.4f}, τ={tau_outlier:.4f}')
    print()

    # Add 10 normal tasks (correct 60%, avg 200s)
    print('Adding 10 normal tasks (60% correct, ~200s each):')
    for i in range(10):
        correct = np.random.random() < 0.6
        time = int(np.random.normal(200, 30))
        insert_training_data(db, BULK_USER_ID, 'Calculus', 2, correct, time)
        if (i + 1) % 5 == 0:
            lnirt.auto_train_on_completion(BULK_USER_ID, 'Calculus')

    params_recovery = lnirt.get_user_parameters(BULK_USER_ID, 'Calculus')
    theta_recovery = params_recovery['theta']
    tau_recovery = params_recovery['tau']
    print(f'After recovery: θ={theta_recovery:.4f}, τ={tau_recovery:.4f}')
    print()

    # Check if parameters moved back towards baseline
    dist_to_baseline_before = abs(theta_outlier - theta_baseline) + abs(tau_outlier - tau_baseline)
    dist_to_baseline_after = abs(theta_recovery - theta_baseline) + abs(tau_recovery - tau_baseline)

    print(f'Distance from baseline:')
    print(f'  After outliers: {dist_to_baseline_before:.4f}')
    print(f'  After recovery: {dist_to_baseline_after:.4f}')
    print()

    passed = dist_to_baseline_after < dist_to_baseline_before

    if passed:
        print('✅ TEST PASSED: Parameters recover towards baseline with normal data')
    else:
        print('⚠ Warning: Parameters did not recover (may need more data)')

    db.close()
    return passed


def main():
    """
    Run all prediction stability tests
    """
    print('='*90)
    print('COMPREHENSIVE PREDICTION STABILITY TEST SUITE')
    print('='*90)
    print()
    print('Testing LNIRT Model Stability After Implementation of:')
    print('  1. Regularization (L2 penalty, sample-adaptive strength)')
    print('  2. Exponential Moving Average (adaptive learning rate)')
    print('  3. ALL historical data usage (changed from 100 to 10000 samples)')
    print('  4. Dampening for small samples')
    print('  5. Soft error guidance (reduced from aggressive penalties)')
    print()
    print('Thresholds:')
    print(f'  Max probability change: {MAX_PROBABILITY_CHANGE:.1%}')
    print(f'  Max time change ratio: {MAX_TIME_CHANGE_RATIO:.1%}')
    print()

    results = {}

    try:
        results['Single Outlier Stability'] = test_single_outlier_stability()
    except Exception as e:
        print(f'✗ ERROR in test: {e}')
        results['Single Outlier Stability'] = False

    try:
        results['Multiple Outliers'] = test_multiple_outliers()
    except Exception as e:
        print(f'✗ ERROR in test: {e}')
        results['Multiple Outliers'] = False

    try:
        results['Opposite Outlier'] = test_opposite_outlier()
    except Exception as e:
        print(f'✗ ERROR in test: {e}')
        results['Opposite Outlier'] = False

    try:
        results['Behavior Change Detection'] = test_rapid_behavior_change()
    except Exception as e:
        print(f'✗ ERROR in test: {e}')
        results['Behavior Change Detection'] = False

    try:
        results['Cross-Difficulty Stability'] = test_all_difficulties_stability()
    except Exception as e:
        print(f'✗ ERROR in test: {e}')
        results['Cross-Difficulty Stability'] = False

    try:
        results['Parameter Recovery'] = test_parameter_recovery()
    except Exception as e:
        print(f'✗ ERROR in test: {e}')
        results['Parameter Recovery'] = False

    # Summary
    print('\n' + '='*90)
    print('TEST SUMMARY')
    print('='*90)
    print()

    all_passed = True
    for test_name, passed in results.items():
        status = '✅ PASSED' if passed else '✗ FAILED'
        print(f'{test_name:35} {status}')
        if not passed:
            all_passed = False

    print()

    if all_passed:
        print('✅ ALL TESTS PASSED - Model is stable and realistic')
    else:
        print('⚠ SOME TESTS FAILED - Review results above')

    print('='*90)

    return all_passed


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
