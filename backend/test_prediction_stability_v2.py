"""
Comprehensive Prediction Stability Test V2

Tests LNIRT model stability using the ACTUAL workflow:
1. Create practice task
2. Get prediction
3. Complete task
4. Train model
5. Verify stability

This properly tests the regularization and EMA fixes by using the full system.
"""

import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
from uuid import UUID, uuid4
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.ml import LNIRTService
from datetime import datetime
import numpy as np

load_dotenv()

# Bulk user ID
BULK_USER_ID = UUID('537b7b10-dd68-4e27-844f-20882922538a')

# Stability thresholds
MAX_PROBABILITY_CHANGE = 0.20  # Max 20% change (more lenient for real workflow)
MAX_TIME_CHANGE_RATIO = 0.40   # Max 40% change


def get_db_session():
    """Create database session"""
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    return Session()


def create_and_complete_task(db, lnirt, user_id, topic, difficulty, correct, time_seconds):
    """
    Simulate the full workflow: predict -> create task -> complete task -> train

    Returns: (prediction_before, prediction_after, task_id)
    """
    # Step 1: Get prediction before task
    p_before, t_before = lnirt.predict(user_id, topic, difficulty)

    # Step 2: Get prediction data for task creation
    pred_data = lnirt.predict_and_save(user_id, topic, difficulty)

    # Step 3: Create practice task with prediction
    task_id = uuid4()
    difficulty_map = {'easy': 1, 'medium': 2, 'hard': 3}
    diff_str = difficulty.lower()

    query = text("""
        INSERT INTO practice_tasks (
            id, user_id, subject, topic, difficulty, difficulty_numeric,
            task_content, solution_content, answer_content,
            predicted_correct, predicted_time_seconds,
            lnirt_model_version, completed, is_correct, actual_time_seconds,
            created_at, updated_at
        )
        VALUES (
            :id, :user_id, :subject, :topic, :difficulty, :difficulty_numeric,
            :task_content, :solution_content, :answer_content,
            :predicted_correct, :predicted_time_seconds,
            :lnirt_model_version, TRUE, :is_correct, :actual_time_seconds,
            :created_at, :updated_at
        )
    """)

    # practice_tasks uses boolean, lnirt_training_data uses integer
    correct_bool = True if correct else False
    correct_int = 1 if correct else 0

    db.execute(query, {
        'id': task_id,
        'user_id': user_id,
        'subject': 'Mathematics',  # Required field
        'topic': topic,
        'difficulty': diff_str,
        'difficulty_numeric': difficulty_map[diff_str],
        'task_content': f'Test task for {topic} ({difficulty})',  # Required
        'solution_content': 'Test solution',  # Required
        'answer_content': 'Test answer',  # Required
        'predicted_correct': pred_data['predicted_correct'],
        'predicted_time_seconds': pred_data['predicted_time_seconds'],
        'lnirt_model_version': pred_data['lnirt_model_version'],
        'is_correct': correct_bool,  # Boolean for practice_tasks
        'actual_time_seconds': time_seconds,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    })
    db.commit()

    # Step 4: Manually sync to training data (normally done by trigger on UPDATE)
    sync_query = text("""
        INSERT INTO lnirt_training_data (
            user_id, topic, difficulty, correct, response_time_seconds,
            practice_task_id, used_for_general_training, created_at
        )
        VALUES (
            :user_id, :topic, :difficulty_numeric, :is_correct, :actual_time_seconds,
            :practice_task_id, FALSE, :created_at
        )
    """)

    db.execute(sync_query, {
        'user_id': user_id,
        'topic': topic,
        'difficulty_numeric': difficulty_map[diff_str],
        'is_correct': correct_int,
        'actual_time_seconds': time_seconds,
        'practice_task_id': task_id,
        'created_at': datetime.utcnow()
    })
    db.commit()

    # Step 5: Train model
    train_result = lnirt.auto_train_on_completion(user_id, topic)

    # Step 6: Get prediction after training
    p_after, t_after = lnirt.predict(user_id, topic, difficulty)

    return {
        'prediction_before': (p_before, t_before),
        'prediction_after': (p_after, t_after),
        'task_id': task_id,
        'train_result': train_result
    }


def test_single_outlier_with_real_workflow():
    """
    TEST 1: Single Outlier with Real Workflow

    This tests the actual reported bug using the real system workflow
    """
    print('='*90)
    print('TEST 1: SINGLE OUTLIER STABILITY (REAL WORKFLOW)')
    print('='*90)
    print()

    db = get_db_session()
    lnirt = LNIRTService(db)

    # Get baseline
    print('Step 1: Get baseline prediction')
    p_base, t_base = lnirt.predict(BULK_USER_ID, 'Microeconomics', 'medium')
    params_before = lnirt.get_user_parameters(BULK_USER_ID, 'Microeconomics')

    print(f'  Baseline: {p_base:.1%} @ {t_base:.0f}s')
    print(f'  Parameters: θ={params_before["theta"]:.4f}, τ={params_before["tau"]:.4f}')
    print()

    # Complete ONE outlier task
    print('Step 2: Complete ONE outlier task (incorrect @ 10s)')
    result = create_and_complete_task(
        db, lnirt, BULK_USER_ID, 'Microeconomics', 'medium',
        correct=False, time_seconds=10
    )

    print(f'  Task created with prediction: {result["prediction_before"][0]:.1%} @ {result["prediction_before"][1]:.0f}s')
    print(f'  Actual result: 0% @ 10s (extreme outlier)')
    print(f'  Training: general={result["train_result"]["general_training"]["status"]}, user={result["train_result"]["user_training"]["status"]}')
    print()

    # Get new prediction and parameters
    print('Step 3: Get new prediction and parameters')
    p_after, t_after = result['prediction_after']
    params_after = lnirt.get_user_parameters(BULK_USER_ID, 'Microeconomics')

    print(f'  New prediction: {p_after:.1%} @ {t_after:.0f}s')
    print(f'  New parameters: θ={params_after["theta"]:.4f}, τ={params_after["tau"]:.4f}')
    print(f'  Changes: Δθ={abs(params_after["theta"] - params_before["theta"]):.4f}, Δτ={abs(params_after["tau"] - params_before["tau"]):.4f}')
    print()

    # Analyze stability
    print('Step 4: Stability Analysis')
    p_change = abs(p_after - p_base)
    t_change_ratio = abs(t_after - t_base) / t_base if t_base > 0 else 0

    print(f'  Success probability: {p_base:.1%} → {p_after:.1%} (Δ={p_change:.1%})')
    print(f'  Expected time: {t_base:.0f}s → {t_after:.0f}s (Δ={t_change_ratio:.1%})')
    print()

    # Validation
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

    # Check for negative tau (invalid)
    if params_after["tau"] < 0:
        print(f'  ✗ CRITICAL: Negative τ detected ({params_after["tau"]:.4f})')
        passed = False
    else:
        print(f'  ✅ τ is positive ({params_after["tau"]:.4f})')

    print()
    if passed:
        print('✅ TEST PASSED: Model remains stable')
    else:
        print('✗ TEST FAILED: Model too volatile')

    db.close()
    return passed


def test_multiple_outliers_real():
    """
    TEST 2: Multiple Consecutive Outliers
    """
    print('\n' + '='*90)
    print('TEST 2: MULTIPLE CONSECUTIVE OUTLIERS (REAL WORKFLOW)')
    print('='*90)
    print()

    db = get_db_session()
    lnirt = LNIRTService(db)

    # Baseline
    p_base, t_base = lnirt.predict(BULK_USER_ID, 'Calculus', 'medium')
    print(f'Baseline (Calculus medium): {p_base:.1%} @ {t_base:.0f}s')
    print()

    # Add 5 outliers
    print('Adding 5 consecutive outliers (all incorrect @ 15s):')
    predictions = []
    for i in range(5):
        result = create_and_complete_task(
            db, lnirt, BULK_USER_ID, 'Calculus', 'medium',
            correct=False, time_seconds=15
        )
        p_new, t_new = result['prediction_after']
        predictions.append((p_new, t_new))
        print(f'  After outlier {i+1}: {p_new:.1%} @ {t_new:.0f}s')

    print()

    # Final check
    p_final, t_final = predictions[-1]
    p_change = abs(p_final - p_base)
    t_change_ratio = abs(t_final - t_base) / t_base if t_base > 0 else 0

    print(f'Total change: Δp={p_change:.1%}, Δt={t_change_ratio:.1%}')

    # More lenient for multiple outliers
    passed = p_change <= 0.30 and t_change_ratio <= 0.60

    if passed:
        print('✅ TEST PASSED: Model stable despite multiple outliers')
    else:
        print('✗ TEST FAILED: Model too sensitive')

    db.close()
    return passed


def test_behavior_recovery():
    """
    TEST 3: Recovery After Outliers

    Tests that model recovers when user returns to normal behavior
    """
    print('\n' + '='*90)
    print('TEST 3: BEHAVIOR RECOVERY (REAL WORKFLOW)')
    print('='*90)
    print()

    db = get_db_session()
    lnirt = LNIRTService(db)

    # Baseline
    p_base, t_base = lnirt.predict(BULK_USER_ID, 'Calculus', 'easy')
    params_base = lnirt.get_user_parameters(BULK_USER_ID, 'Calculus')

    print(f'Baseline: {p_base:.1%} @ {t_base:.0f}s')
    print(f'Parameters: θ={params_base["theta"]:.4f}, τ={params_base["tau"]:.4f}')
    print()

    # Add 3 outliers
    print('Adding 3 outliers (incorrect @ 10s):')
    for i in range(3):
        result = create_and_complete_task(
            db, lnirt, BULK_USER_ID, 'Calculus', 'easy',
            correct=False, time_seconds=10
        )
        p, t = result['prediction_after']
        print(f'  After outlier {i+1}: {p:.1%} @ {t:.0f}s')

    params_outlier = lnirt.get_user_parameters(BULK_USER_ID, 'Calculus')
    print(f'After outliers: θ={params_outlier["theta"]:.4f}, τ={params_outlier["tau"]:.4f}')
    print()

    # Add 10 normal tasks (match baseline performance)
    print('Adding 10 normal tasks (matching baseline performance):')
    for i in range(10):
        # Simulate baseline behavior: high success, moderate time
        correct = np.random.random() < 0.85  # 85% success (close to baseline)
        time = int(np.random.normal(50, 10))  # ~50s average

        create_and_complete_task(
            db, lnirt, BULK_USER_ID, 'Calculus', 'easy',
            correct=correct, time_seconds=max(time, 20)
        )

        if (i + 1) % 5 == 0:
            p, t = lnirt.predict(BULK_USER_ID, 'Calculus', 'easy')
            print(f'  After {i+1} tasks: {p:.1%} @ {t:.0f}s')

    params_recovery = lnirt.get_user_parameters(BULK_USER_ID, 'Calculus')
    print(f'After recovery: θ={params_recovery["theta"]:.4f}, τ={params_recovery["tau"]:.4f}')
    print()

    # Check if closer to baseline
    dist_base_to_outlier = abs(params_outlier["theta"] - params_base["theta"]) + abs(params_outlier["tau"] - params_base["tau"])
    dist_base_to_recovery = abs(params_recovery["theta"] - params_base["theta"]) + abs(params_recovery["tau"] - params_base["tau"])

    print(f'Distance from baseline:')
    print(f'  After outliers: {dist_base_to_outlier:.4f}')
    print(f'  After recovery: {dist_base_to_recovery:.4f}')
    print()

    passed = dist_base_to_recovery < dist_base_to_outlier

    if passed:
        print('✅ TEST PASSED: Parameters recover towards baseline')
    else:
        print('⚠ Warning: Parameters did not recover significantly')

    db.close()
    return passed


def test_tau_positivity():
    """
    TEST 4: Tau Always Positive

    Critical test: ensure τ never becomes negative (mathematically invalid)
    """
    print('\n' + '='*90)
    print('TEST 4: TAU POSITIVITY (CRITICAL)')
    print('='*90)
    print()

    db = get_db_session()
    lnirt = LNIRTService(db)

    # Get all models and check tau
    print('Checking τ values for all topics:')
    passed = True

    for topic in ['Calculus', 'Microeconomics']:
        params = lnirt.get_user_parameters(BULK_USER_ID, topic)
        tau = params['tau']

        if tau > 0:
            print(f'  {topic:20}: τ={tau:.4f} ✅')
        else:
            print(f'  {topic:20}: τ={tau:.4f} ✗ NEGATIVE!')
            passed = False

    print()
    if passed:
        print('✅ TEST PASSED: All τ values are positive')
    else:
        print('✗ TEST FAILED: Negative τ detected (invalid)')

    db.close()
    return passed


def main():
    """
    Run all stability tests with real workflow
    """
    print('='*90)
    print('PREDICTION STABILITY TEST - REAL WORKFLOW')
    print('='*90)
    print()
    print('Testing fixes:')
    print('  1. ALL historical data usage (10000 samples)')
    print('  2. Regularization (L2 penalty with sample-adaptive strength)')
    print('  3. Exponential Moving Average (adaptive learning rate)')
    print('  4. Dampening for small samples')
    print('  5. Soft error guidance')
    print()
    print('Using REAL workflow: predict → create task → complete → train → predict')
    print()

    results = {}

    try:
        results['Single Outlier Stability'] = test_single_outlier_with_real_workflow()
    except Exception as e:
        print(f'✗ ERROR: {e}')
        import traceback
        traceback.print_exc()
        results['Single Outlier Stability'] = False

    try:
        results['Multiple Outliers'] = test_multiple_outliers_real()
    except Exception as e:
        print(f'✗ ERROR: {e}')
        import traceback
        traceback.print_exc()
        results['Multiple Outliers'] = False

    try:
        results['Behavior Recovery'] = test_behavior_recovery()
    except Exception as e:
        print(f'✗ ERROR: {e}')
        import traceback
        traceback.print_exc()
        results['Behavior Recovery'] = False

    try:
        results['Tau Positivity'] = test_tau_positivity()
    except Exception as e:
        print(f'✗ ERROR: {e}')
        import traceback
        traceback.print_exc()
        results['Tau Positivity'] = False

    # Summary
    print('='*90)
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
        print('✅ ALL TESTS PASSED - Model is stable!')
    else:
        print('⚠ SOME TESTS FAILED - Further investigation needed')

    print('='*90)

    return all_passed


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
