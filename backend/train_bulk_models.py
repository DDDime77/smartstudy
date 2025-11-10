"""
Train LNIRT models for bulk user's data

This script trains both general and personalized models for:
- Calculus (300 tasks)
- Microeconomics (300 tasks)
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

BULK_USER_ID = '537b7b10-dd68-4e27-844f-20882922538a'


def train_models():
    """
    Train LNIRT models for both topics
    """
    print('='*90)
    print('TRAINING LNIRT MODELS FOR BULK USER')
    print('='*90)
    print()

    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()
    lnirt = LNIRTService(db)

    user_uuid = UUID(BULK_USER_ID)

    # Train Calculus
    print('CALCULUS MODEL')
    print('-' * 90)
    try:
        print('\n1. General Training (all users):')
        general_result = lnirt.train_general('Calculus', verbose=True)
        print(f'   Status: {general_result.get("status")}')
        if general_result.get('status') == 'success':
            print(f'   Samples: {general_result.get("n_samples")}')
            print(f'   Users: {general_result.get("n_users")}')

        print('\n2. Personalized Training (bulk user):')
        user_result = lnirt.train_user_specific(user_uuid, 'Calculus', verbose=True)
        print(f'   Status: {user_result.get("status")}')
        if user_result.get('status') == 'success':
            print(f'   Samples: {user_result.get("n_samples")}')
            print(f'   θ: {user_result.get("theta", 0):.3f}')
            print(f'   τ: {user_result.get("tau", 0):.3f}')

        print('\n3. Test Predictions:')
        for difficulty in ['easy', 'medium', 'hard']:
            p_correct, pred_time = lnirt.predict(user_uuid, 'Calculus', difficulty)
            print(f'   {difficulty:6}: {p_correct:5.1%} success, {pred_time:4.0f}s')

        params = lnirt.get_user_parameters(user_uuid, 'Calculus')
        print(f'\n   Personalized: {params["is_personalized"]}')
        print(f'   θ={params["theta"]:.3f}, τ={params["tau"]:.3f}')
        print('\n✓ Calculus model complete\n')

    except Exception as e:
        print(f'\n✗ Calculus training failed: {e}\n')
        import traceback
        traceback.print_exc()

    # Train Microeconomics
    print('\n' + '='*90)
    print('MICROECONOMICS MODEL')
    print('-' * 90)
    try:
        print('\n1. General Training (all users):')
        general_result = lnirt.train_general('Microeconomics', verbose=True)
        print(f'   Status: {general_result.get("status")}')
        if general_result.get('status') == 'success':
            print(f'   Samples: {general_result.get("n_samples")}')
            print(f'   Users: {general_result.get("n_users")}')

        print('\n2. Personalized Training (bulk user):')
        user_result = lnirt.train_user_specific(user_uuid, 'Microeconomics', verbose=True)
        print(f'   Status: {user_result.get("status")}')
        if user_result.get('status') == 'success':
            print(f'   Samples: {user_result.get("n_samples")}')
            print(f'   θ: {user_result.get("theta", 0):.3f}')
            print(f'   τ: {user_result.get("tau", 0):.3f}')

        print('\n3. Test Predictions:')
        for difficulty in ['easy', 'medium', 'hard']:
            p_correct, pred_time = lnirt.predict(user_uuid, 'Microeconomics', difficulty)
            print(f'   {difficulty:6}: {p_correct:5.1%} success, {pred_time:4.0f}s')

        params = lnirt.get_user_parameters(user_uuid, 'Microeconomics')
        print(f'\n   Personalized: {params["is_personalized"]}')
        print(f'   θ={params["theta"]:.3f}, τ={params["tau"]:.3f}')
        print('\n✓ Microeconomics model complete\n')

    except Exception as e:
        print(f'\n✗ Microeconomics training failed: {e}\n')
        import traceback
        traceback.print_exc()

    db.close()


def main():
    """
    Main execution
    """
    train_models()

    print('='*90)
    print('✅ MODEL TRAINING COMPLETE')
    print('='*90)


if __name__ == "__main__":
    main()
