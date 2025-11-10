"""
Reset Corrupted Models and Retrain with NEW Regularization

Deletes corrupted models and retrains from clean practice_tasks data
using the NEW regularization/EMA code in fit() method.
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

load_dotenv()

BULK_USER_ID = UUID('537b7b10-dd68-4e27-844f-20882922538a')


def main():
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()

    print('='*90)
    print('RESET AND RETRAIN WITH NEW REGULARIZATION')
    print('='*90)
    print()

    # Delete corrupted models
    print('Step 1: Deleting corrupted models...')
    result = db.execute(text("DELETE FROM lnirt_models"))
    db.commit()
    print(f'  Deleted {result.rowcount} models')
    print()

    # Retrain from scratch with NEW regularization code
    print('Step 2: Retraining with regularization + EMA...')
    print()

    lnirt = LNIRTService(db)

    # Train Calculus
    print('Training Calculus...')
    result = lnirt.train_general('Calculus', verbose=True)
    print(f'  Status: {result["status"]}')
    if result['status'] == 'success':
        print(f'  Samples: {result["n_samples"]}, Users: {result["n_users"]}')
    print()

    # Train user-specific for Calculus
    if result['status'] == 'success':
        print('Training Calculus user-specific...')
        user_result = lnirt.train_user_specific(BULK_USER_ID, 'Calculus', verbose=True)
        print(f'  Status: {user_result["status"]}')
        if user_result['status'] == 'success':
            print(f'  θ={user_result["theta"]:.3f}, τ={user_result["tau"]:.3f}')
        print()

    # Train Microeconomics
    print('Training Microeconomics...')
    result = lnirt.train_general('Microeconomics', verbose=True)
    print(f'  Status: {result["status"]}')
    if result['status'] == 'success':
        print(f'  Samples: {result["n_samples"]}, Users: {result["n_users"]}')
    print()

    # Train user-specific for Microeconomics
    if result['status'] == 'success':
        print('Training Microeconomics user-specific...')
        user_result = lnirt.train_user_specific(BULK_USER_ID, 'Microeconomics', verbose=True)
        print(f'  Status: {user_result["status"]}')
        if user_result['status'] == 'success':
            print(f'  θ={user_result["theta"]:.3f}, τ={user_result["tau"]:.3f}')
        print()

    # Verify predictions
    print('='*90)
    print('VERIFICATION')
    print('='*90)
    print()

    for topic in ['Calculus', 'Microeconomics']:
        print(f'{topic}:')
        for diff in ['easy', 'medium', 'hard']:
            try:
                p, t = lnirt.predict(BULK_USER_ID, topic, diff)
                status = '✅' if 0.05 < p < 0.95 else '⚠'
                print(f'  {diff:6}: {p:5.1%} @ {t:4.0f}s {status}')
            except Exception as e:
                print(f'  {diff:6}: ERROR - {e}')
        print()

    db.close()

    print('='*90)
    print('✅ RESET AND RETRAIN COMPLETE')
    print('='*90)


if __name__ == "__main__":
    main()
