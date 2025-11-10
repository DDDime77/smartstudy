"""
Retrain LNIRT models to include all users

This ensures both general training (shared parameters) and
personalized training (individual parameters) include all users with data.
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
import psycopg2

load_dotenv()


def retrain_all_users():
    """
    Retrain models for all users
    """
    print('='*90)
    print('RETRAINING LNIRT MODELS FOR ALL USERS')
    print('='*90)
    print()

    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()

    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()
    lnirt = LNIRTService(db)

    # Get all users with Calculus data
    cursor.execute("""
        SELECT DISTINCT user_id
        FROM practice_tasks
        WHERE topic = 'Calculus' AND completed = TRUE
    """)
    calculus_users = [UUID(str(row[0])) for row in cursor.fetchall()]

    # Get all users with Microeconomics data
    cursor.execute("""
        SELECT DISTINCT user_id
        FROM practice_tasks
        WHERE topic = 'Microeconomics' AND completed = TRUE
    """)
    micro_users = [UUID(str(row[0])) for row in cursor.fetchall()]

    print(f'Found {len(calculus_users)} users with Calculus data')
    print(f'Found {len(micro_users)} users with Microeconomics data')
    print()

    # Retrain Calculus
    if calculus_users:
        print('CALCULUS')
        print('-' * 90)

        # General training
        print('\\n1. General training (all users):')
        try:
            result = lnirt.train_general('Calculus', verbose=False)
            print(f'   Status: {result.get("status")}')
            if result.get('status') == 'success':
                print(f'   Samples: {result.get("n_samples")}')
                print(f'   Users: {result.get("n_users")}')
        except Exception as e:
            print(f'   ✗ Failed: {e}')

        # Personalized training for each user
        print('\\n2. Personalized training:')
        for i, user_id in enumerate(calculus_users, 1):
            try:
                result = lnirt.train_user_specific(user_id, 'Calculus', verbose=False)
                status = result.get('status')

                cursor.execute('SELECT email FROM users WHERE id = %s', (str(user_id),))
                email = cursor.fetchone()[0] if cursor.fetchone() else 'Unknown'

                if status == 'success':
                    theta = result.get('theta', 0)
                    tau = result.get('tau', 0)
                    print(f'   {i}. {email[:20]:20} - θ={theta:6.3f}, τ={tau:6.3f}')
                elif status == 'no_data':
                    print(f'   {i}. {email[:20]:20} - no_data (waiting for more tasks)')
                else:
                    print(f'   {i}. {email[:20]:20} - {status}')
            except Exception as e:
                print(f'   {i}. Error: {e}')

    # Retrain Microeconomics
    if micro_users:
        print('\\n\\nMICROECONOMICS')
        print('-' * 90)

        # General training
        print('\\n1. General training (all users):')
        try:
            result = lnirt.train_general('Microeconomics', verbose=False)
            print(f'   Status: {result.get("status")}')
            if result.get('status') == 'success':
                print(f'   Samples: {result.get("n_samples")}')
                print(f'   Users: {result.get("n_users")}')
        except Exception as e:
            print(f'   ✗ Failed: {e}')

        # Personalized training for each user
        print('\\n2. Personalized training:')
        for i, user_id in enumerate(micro_users, 1):
            try:
                result = lnirt.train_user_specific(user_id, 'Microeconomics', verbose=False)
                status = result.get('status')

                cursor.execute('SELECT email FROM users WHERE id = %s', (str(user_id),))
                email_result = cursor.fetchone()
                email = email_result[0] if email_result else 'Unknown'

                if status == 'success':
                    theta = result.get('theta', 0)
                    tau = result.get('tau', 0)
                    print(f'   {i}. {email[:20]:20} - θ={theta:6.3f}, τ={tau:6.3f}')
                elif status == 'no_data':
                    print(f'   {i}. {email[:20]:20} - no_data (waiting for more tasks)')
                else:
                    print(f'   {i}. {email[:20]:20} - {status}')
            except Exception as e:
                print(f'   {i}. Error: {e}')

    cursor.close()
    conn.close()
    db.close()


def verify_all_users_in_models():
    """
    Verify all users with data are in their respective models
    """
    print('\\n\\n' + '='*90)
    print('VERIFICATION')
    print('='*90)
    print()

    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()

    for topic in ['Calculus', 'Microeconomics']:
        # Get users with data
        cursor.execute("""
            SELECT COUNT(DISTINCT user_id)
            FROM practice_tasks
            WHERE topic = %s AND completed = TRUE
        """, (topic,))
        users_with_data = cursor.fetchone()[0]

        # Get users in model
        cursor.execute("""
            SELECT n_users FROM lnirt_models WHERE topic = %s
        """, (topic,))
        result = cursor.fetchone()
        users_in_model = result[0] if result else 0

        status = '✓' if users_with_data == users_in_model else '✗'
        print(f'{status} {topic}:')
        print(f'    Users with data: {users_with_data}')
        print(f'    Users in model: {users_in_model}')

    cursor.close()
    conn.close()


def main():
    """
    Main execution
    """
    retrain_all_users()
    verify_all_users_in_models()

    print('\\n' + '='*90)
    print('✅ RETRAINING COMPLETE')
    print('='*90)


if __name__ == "__main__":
    main()
