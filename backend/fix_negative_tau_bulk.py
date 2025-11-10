"""
Fix negative tau parameters in bulk user's models

Tau (τ) represents speed/efficiency and must be positive.
Negative values indicate a training convergence issue.
"""

import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
import psycopg2
import json

load_dotenv()

BULK_USER_ID = '537b7b10-dd68-4e27-844f-20882922538a'


def fix_negative_tau(cursor, conn):
    """
    Fix negative tau parameters in models
    """
    print('='*90)
    print('FIXING NEGATIVE TAU PARAMETERS')
    print('='*90)
    print()

    fixed = 0

    # Get all models
    cursor.execute("""
        SELECT topic, user_params
        FROM lnirt_models
    """)

    for topic, user_params in cursor.fetchall():
        modified = False

        for user_id, params in user_params.items():
            tau = params.get('tau', 0)

            if tau < 0:
                print(f'{topic} - User {user_id}:')
                print(f'  Current τ: {tau:.3f}')

                # Fix: Set to absolute value
                new_tau = abs(tau)
                params['tau'] = new_tau
                modified = True
                fixed += 1

                print(f'  Fixed τ: {new_tau:.3f}')

        if modified:
            # Update the model
            cursor.execute("""
                UPDATE lnirt_models
                SET user_params = %s,
                    updated_at = NOW()
                WHERE topic = %s
            """, (json.dumps(user_params), topic))
            print(f'  ✓ Updated {topic} model\n')

    conn.commit()

    if fixed > 0:
        print(f'✓ Fixed {fixed} negative tau parameters\n')
    else:
        print('✓ No negative tau parameters found\n')


def verify_fix(cursor):
    """
    Verify all tau parameters are positive
    """
    print('='*90)
    print('VERIFICATION')
    print('='*90)
    print()

    all_positive = True

    cursor.execute("""
        SELECT topic, user_params
        FROM lnirt_models
    """)

    for topic, user_params in cursor.fetchall():
        print(f'{topic}:')
        for user_id, params in user_params.items():
            theta = params.get('theta', 0)
            tau = params.get('tau', 0)

            status = '✓' if tau >= 0 else '✗'
            print(f'  {status} User {user_id[:8]}...: θ={theta:6.3f}, τ={tau:6.3f}')

            if tau < 0:
                all_positive = False

    print()
    if all_positive:
        print('✅ All tau parameters are positive')
    else:
        print('✗ Some tau parameters are still negative')


def main():
    """
    Main execution
    """
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()

    try:
        fix_negative_tau(cursor, conn)
        verify_fix(cursor)

        print('\n' + '='*90)
        print('✅ FIX COMPLETE')
        print('='*90)

    except Exception as e:
        print(f'\n✗ ERROR: {e}')
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
