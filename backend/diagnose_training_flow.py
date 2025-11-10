"""
Comprehensive Training Flow Diagnosis

Traces EXACTLY what happens when a task is completed:
1. Initial prediction
2. Task completion
3. Training triggered (general + user-specific)
4. New prediction
5. Shows parameters at each step to identify where smoothing breaks
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
import json

load_dotenv()

BULK_USER_ID = UUID('537b7b10-dd68-4e27-844f-20882922538a')


def get_db_session():
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    return Session()


def get_model_state(db, topic):
    """Get current model state from database"""
    query = text("""
        SELECT difficulty_params, user_params, n_training_samples
        FROM lnirt_models
        WHERE topic = :topic AND model_version = 'v1.0'
    """)
    result = db.execute(query, {'topic': topic})
    row = result.fetchone()

    if row:
        return {
            'difficulty_params': row[0],
            'user_params': row[1],
            'n_training_samples': row[2]
        }
    return None


def main():
    print('='*90)
    print('TRAINING FLOW DIAGNOSIS - EXACT USER SCENARIO')
    print('='*90)
    print()

    db = get_db_session()
    lnirt = LNIRTService(db)

    topic = 'Microeconomics'
    difficulty = 'medium'

    # STEP 1: Initial state
    print('STEP 1: INITIAL STATE')
    print('-'*90)

    model_before = get_model_state(db, topic)
    print(f'Model state BEFORE:')
    print(f'  Training samples: {model_before["n_training_samples"] if model_before else "N/A"}')

    if model_before:
        print(f'  Difficulty params (medium = 2):')
        if '2' in model_before['difficulty_params']:
            params = model_before['difficulty_params']['2']
            print(f'    a={params.get("a", "N/A"):.3f}, b={params.get("b", "N/A"):.3f}, beta={params.get("beta", "N/A"):.3f}')

        bulk_id_str = str(BULK_USER_ID)
        if bulk_id_str in model_before['user_params']:
            user_params = model_before['user_params'][bulk_id_str]
            print(f'  User params: θ={user_params["theta"]:.3f}, τ={user_params["tau"]:.3f}')

    # Initial prediction
    p_before, t_before = lnirt.predict(BULK_USER_ID, topic, difficulty)
    print(f'\nInitial prediction: {p_before:.1%} @ {t_before:.0f}s')
    print()

    # STEP 2: Simulate task completion
    print('STEP 2: SIMULATE TASK COMPLETION')
    print('-'*90)
    print(f'User completes task:')
    print(f'  Result: CORRECT')
    print(f'  Time: 30 seconds')
    print()

    # Create practice task
    task_id = uuid4()
    pred_data = lnirt.predict_and_save(BULK_USER_ID, topic, difficulty)

    create_task_query = text("""
        INSERT INTO practice_tasks (
            id, user_id, subject, topic, difficulty, difficulty_numeric,
            task_content, solution_content, answer_content,
            predicted_correct, predicted_time_seconds,
            lnirt_model_version, completed, is_correct, actual_time_seconds,
            created_at, updated_at
        )
        VALUES (
            :id, :user_id, 'Mathematics', :topic, :difficulty, 2,
            'Test task', 'Test solution', 'Test answer',
            :predicted_correct, :predicted_time_seconds,
            'v1.0', TRUE, TRUE, 30,
            :created_at, :updated_at
        )
    """)

    db.execute(create_task_query, {
        'id': task_id,
        'user_id': BULK_USER_ID,
        'topic': topic,
        'difficulty': difficulty,
        'predicted_correct': pred_data['predicted_correct'],
        'predicted_time_seconds': pred_data['predicted_time_seconds'],
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    })
    db.commit()

    # Sync to training data
    sync_query = text("""
        INSERT INTO lnirt_training_data (
            user_id, topic, difficulty, correct, response_time_seconds,
            practice_task_id, used_for_general_training, created_at
        )
        VALUES (
            :user_id, :topic, 2, 1, 30,
            :practice_task_id, FALSE, :created_at
        )
    """)

    db.execute(sync_query, {
        'user_id': BULK_USER_ID,
        'topic': topic,
        'practice_task_id': task_id,
        'created_at': datetime.utcnow()
    })
    db.commit()

    print('Task created and synced to training data')
    print()

    # STEP 3: Trigger training
    print('STEP 3: TRIGGER AUTO-TRAINING')
    print('-'*90)

    print('Calling auto_train_on_completion()...')
    train_result = lnirt.auto_train_on_completion(BULK_USER_ID, topic)

    print(f'\nGeneral training result:')
    print(f'  Status: {train_result["general_training"]["status"]}')
    if train_result["general_training"]["status"] == "success":
        print(f'  Samples: {train_result["general_training"]["n_samples"]}')

    print(f'\nUser-specific training result:')
    print(f'  Status: {train_result["user_training"]["status"]}')
    if train_result["user_training"]["status"] == "success":
        print(f'  Samples: {train_result["user_training"]["n_samples"]}')
        print(f'  θ: {train_result["user_training"].get("theta", "N/A")}')
        print(f'  τ: {train_result["user_training"].get("tau", "N/A")}')
    elif train_result["user_training"]["status"] == "no_data":
        print(f'  ⚠ WARNING: User-specific training returned no_data')
        print(f'  This means error-aware training did not run!')
    print()

    # STEP 4: Model state after training
    print('STEP 4: MODEL STATE AFTER TRAINING')
    print('-'*90)

    model_after = get_model_state(db, topic)
    print(f'Model state AFTER:')
    print(f'  Training samples: {model_after["n_training_samples"]}')

    if '2' in model_after['difficulty_params']:
        params_after = model_after['difficulty_params']['2']
        params_before_medium = model_before['difficulty_params']['2'] if model_before and '2' in model_before['difficulty_params'] else None

        print(f'  Difficulty params (medium = 2):')
        print(f'    BEFORE: a={params_before_medium.get("a") if params_before_medium else "N/A"}, '
              f'b={params_before_medium.get("b") if params_before_medium else "N/A"}, '
              f'beta={params_before_medium.get("beta") if params_before_medium else "N/A"}')
        print(f'    AFTER:  a={params_after.get("a"):.3f}, b={params_after.get("b"):.3f}, beta={params_after.get("beta"):.3f}')

        if params_before_medium:
            print(f'    CHANGES:')
            print(f'      Δa = {params_after.get("a") - params_before_medium.get("a"):.3f}')
            print(f'      Δb = {params_after.get("b") - params_before_medium.get("b"):.3f}')
            print(f'      Δbeta = {params_after.get("beta") - params_before_medium.get("beta"):.3f}')

    bulk_id_str = str(BULK_USER_ID)
    if bulk_id_str in model_after['user_params']:
        user_after = model_after['user_params'][bulk_id_str]
        user_before = model_before['user_params'][bulk_id_str] if model_before and bulk_id_str in model_before['user_params'] else None

        print(f'  User params:')
        if user_before:
            print(f'    BEFORE: θ={user_before["theta"]:.3f}, τ={user_before["tau"]:.3f}')
        print(f'    AFTER:  θ={user_after["theta"]:.3f}, τ={user_after["tau"]:.3f}')

        if user_before:
            print(f'    CHANGES:')
            print(f'      Δθ = {user_after["theta"] - user_before["theta"]:.3f}')
            print(f'      Δτ = {user_after["tau"] - user_before["tau"]:.3f}')
    print()

    # STEP 5: New prediction
    print('STEP 5: NEW PREDICTION')
    print('-'*90)

    p_after, t_after = lnirt.predict(BULK_USER_ID, topic, difficulty)

    print(f'Before:  {p_before:.1%} @ {t_before:.0f}s')
    print(f'After:   {p_after:.1%} @ {t_after:.0f}s')
    print(f'Changes: Δp={abs(p_after - p_before):.1%}, Δt={abs(t_after - t_before):.0f}s')
    print()

    # DIAGNOSIS
    print('='*90)
    print('DIAGNOSIS')
    print('='*90)
    print()

    issues = []

    # Check if prediction changed drastically
    if abs(p_after - p_before) > 0.15:
        issues.append(f'❌ Prediction changed by {abs(p_after - p_before):.1%} (> 15% threshold)')
        issues.append('   This indicates smoothing is NOT working!')
    else:
        print(f'✅ Prediction change ({abs(p_after - p_before):.1%}) is within reasonable range')

    # Check if user-specific training ran
    if train_result["user_training"]["status"] != "success":
        issues.append(f'❌ User-specific training did not run: {train_result["user_training"]["status"]}')
        issues.append('   EMA and regularization require user-specific training!')
    else:
        print(f'✅ User-specific training ran successfully')

    # Check if difficulty params changed drastically
    if params_before_medium and '2' in model_after['difficulty_params']:
        b_change = abs(model_after['difficulty_params']['2'].get('b') - params_before_medium.get('b'))
        if b_change > 1.0:
            issues.append(f'❌ Difficulty parameter b changed by {b_change:.3f} (> 1.0 threshold)')
            issues.append('   This suggests general training is corrupting parameters!')

    # Check for extreme predictions
    if p_after >= 0.99 or p_after <= 0.01:
        issues.append(f'❌ Prediction at extreme: {p_after:.1%}')
        issues.append('   This indicates difficulty parameters are corrupted!')
    else:
        print(f'✅ Prediction not at extreme ({p_after:.1%})')

    print()

    if issues:
        print('ISSUES FOUND:')
        for issue in issues:
            print(issue)
    else:
        print('✅ NO ISSUES FOUND - Smoothing working correctly!')

    print()
    print('='*90)

    # Cleanup
    print('\nCleaning up test task...')
    db.execute(text("DELETE FROM lnirt_training_data WHERE practice_task_id = :task_id"), {'task_id': task_id})
    db.execute(text("DELETE FROM practice_tasks WHERE id = :task_id"), {'task_id': task_id})
    db.commit()
    print('Test task removed')

    db.close()

    return len(issues) == 0


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
