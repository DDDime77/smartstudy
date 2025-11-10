"""
Fix All Negative Tau Values in LNIRT Models

Negative tau is mathematically invalid (tau is a speed parameter, must be positive).
This script detects and fixes all negative tau values by taking absolute value.
"""

import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import json

load_dotenv()


def fix_negative_tau():
    """Fix all negative tau values in all models"""
    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()

    print('='*90)
    print('FIXING ALL NEGATIVE TAU VALUES')
    print('='*90)
    print()

    # Get all models
    query = text("SELECT topic, model_version, user_params FROM lnirt_models")
    result = db.execute(query)
    models = result.fetchall()

    print(f'Found {len(models)} models')
    print()

    total_negative = 0
    fixes = []

    for topic, model_version, user_params in models:
        print(f'Checking {topic} (version {model_version}):')

        negative_users = []
        fixed_params = dict(user_params)  # Copy

        for user_id, params in user_params.items():
            tau = params['tau']
            theta = params['theta']

            if tau < 0:
                negative_users.append(user_id)
                fixed_params[user_id] = {
                    'theta': theta,
                    'tau': abs(tau)  # Take absolute value
                }
                print(f'  User {user_id[:8]}...: τ={tau:.4f} → {abs(tau):.4f} (fixed)')
                total_negative += 1

        if negative_users:
            # Update database
            update_query = text("""
                UPDATE lnirt_models
                SET user_params = :user_params,
                    updated_at = NOW()
                WHERE topic = :topic AND model_version = :model_version
            """)

            db.execute(update_query, {
                'topic': topic,
                'model_version': model_version,
                'user_params': json.dumps(fixed_params)
            })

            fixes.append(f'{topic}: fixed {len(negative_users)} users')
            print(f'  ✅ Updated {len(negative_users)} users')
        else:
            print(f'  ✅ All τ values positive')

        print()

    if fixes:
        db.commit()
        print('='*90)
        print('SUMMARY')
        print('='*90)
        print()
        print(f'Total negative τ values found: {total_negative}')
        print(f'Models updated: {len(fixes)}')
        for fix in fixes:
            print(f'  - {fix}')
        print()
        print('✅ All negative τ values fixed and committed')
    else:
        print('✅ No negative τ values found - database is clean')

    db.close()

    return len(fixes) > 0


if __name__ == "__main__":
    had_issues = fix_negative_tau()
    sys.exit(0 if not had_issues else 1)  # Exit 0 if clean, 1 if had to fix
