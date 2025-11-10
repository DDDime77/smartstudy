"""
Properly Reset Models and Retrain with NEW Regularization

1. Delete corrupted models
2. Reset ALL training flags to unused
3. Retrain from clean data with new regularization
4. Verify predictions are stable and realistic
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
    print('RESET AND RETRAIN WITH NEW REGULARIZATION (PROPER)')
    print('='*90)
    print()

    # Step 1: Delete corrupted models
    print('Step 1: Deleting corrupted models...')
    result = db.execute(text("DELETE FROM lnirt_models"))
    db.commit()
    print(f'  Deleted {result.rowcount} models')
    print()

    # Step 2: Reset ALL training flags
    print('Step 2: Resetting training flags to unused...')
    result = db.execute(text("""
        UPDATE lnirt_training_data
        SET used_for_general_training = FALSE
        WHERE used_for_general_training = TRUE
    """))
    db.commit()
    print(f'  Reset {result.rowcount} training samples to unused')
    print()

    # Verify reset
    check_query = text("""
        SELECT topic, COUNT(*) as unused_count
        FROM lnirt_training_data
        WHERE used_for_general_training = FALSE
        GROUP BY topic
        ORDER BY topic
    """)
    result = db.execute(check_query)
    rows = result.fetchall()

    print('Unused training data per topic:')
    for row in rows:
        print(f'  {row[0]:20} {row[1]:5} samples')
    print()

    # Step 3: Retrain from scratch with NEW regularization code
    print('Step 3: Retraining with regularization + EMA...')
    print()

    lnirt = LNIRTService(db)

    # Train Calculus
    print('='*90)
    print('Training Calculus...')
    print('='*90)
    result = lnirt.train_general('Calculus', verbose=True)
    print(f'\nStatus: {result["status"]}')
    if result['status'] == 'success':
        print(f'Samples: {result["n_samples"]}, Users: {result["n_users"]}')
    print()

    # Train user-specific for Calculus
    if result['status'] == 'success':
        print('Training Calculus user-specific...')
        user_result = lnirt.train_user_specific(BULK_USER_ID, 'Calculus', verbose=True)
        print(f'Status: {user_result["status"]}')
        if user_result['status'] == 'success':
            print(f'θ={user_result["theta"]:.3f}, τ={user_result["tau"]:.3f}')
        print()

    # Train Microeconomics
    print('='*90)
    print('Training Microeconomics...')
    print('='*90)
    result = lnirt.train_general('Microeconomics', verbose=True)
    print(f'\nStatus: {result["status"]}')
    if result['status'] == 'success':
        print(f'Samples: {result["n_samples"]}, Users: {result["n_users"]}')
    print()

    # Train user-specific for Microeconomics
    if result['status'] == 'success':
        print('Training Microeconomics user-specific...')
        user_result = lnirt.train_user_specific(BULK_USER_ID, 'Microeconomics', verbose=True)
        print(f'Status: {user_result["status"]}')
        if user_result['status'] == 'success':
            print(f'θ={user_result["theta"]:.3f}, τ={user_result["tau"]:.3f}')
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
