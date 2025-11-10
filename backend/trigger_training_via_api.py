"""
Trigger training through the backend API (more stable than standalone)
"""

import requests
import json

def main():
    print('='*90)
    print('TRIGGER V2 TRAINING VIA API')
    print('='*90)
    print()

    backend_url = 'http://localhost:4008'

    # First, create a dummy task completion to trigger counter increment
    # We'll do this by directly calling the database
    from dotenv import load_dotenv
    load_dotenv()

    import os
    from sqlalchemy import create_engine, text

    engine = create_engine(os.getenv('DATABASE_URL'))

    with engine.connect() as conn:
        # Check current counter
        result = conn.execute(text('SELECT n_samples_since_training FROM embedding_model_tracker LIMIT 1'))
        counter = result.scalar()

        print(f'Current counter: {counter}/5')

        if counter < 5:
            print(f'\nNeed to increment counter to 5 to trigger training')
            print(f'Incrementing counter by {5 - counter}...')

            # Increment counter to 5
            for i in range(5 - counter):
                conn.execute(text('UPDATE embedding_model_tracker SET n_samples_since_training = n_samples_since_training + 1'))
                conn.commit()

            print(f'✓ Counter set to 5')

        # Check again
        result = conn.execute(text('SELECT n_samples_since_training FROM embedding_model_tracker LIMIT 1'))
        counter = result.scalar()

        print(f'\nNew counter: {counter}/5')

        if counter >= 5:
            print(f'\n✅ Counter at threshold - next task completion will trigger training')
            print(f'\nTo trigger training:')
            print(f'  1. Go to http://localhost:4000/dashboard/study-timer')
            print(f'  2. Generate a task')
            print(f'  3. Mark it correct/incorrect')
            print(f'  4. Training will start in background')
            print(f'\nMonitor training with:')
            print(f'  tail -f /tmp/backend.log')
        else:
            print(f'\n⚠️ Counter not at threshold yet')

    print(f'\n' + '='*90)


if __name__ == '__main__':
    main()
