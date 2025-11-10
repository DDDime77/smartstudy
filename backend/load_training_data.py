"""
Load LNIRT training data from CSV for testing
Populates lnirt_training_data table with sample data
"""

import pandas as pd
import psycopg2
from datetime import datetime, timedelta
import random
import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings

def load_calculus_data():
    """Load calculus training data from CSV"""

    # Read CSV from ML playground
    csv_path = "/home/claudeuser/ml_lnirt_playground/data/ib/calculus.csv"

    if not os.path.exists(csv_path):
        print(f"CSV file not found: {csv_path}")
        return

    print(f"Loading data from {csv_path}...")
    df = pd.read_csv(csv_path)

    print(f"Loaded {len(df)} records")
    print(f"Columns: {df.columns.tolist()}")
    print(f"Sample:\n{df.head()}")

    # Connect to database
    conn = psycopg2.connect(settings.DATABASE_URL)
    cursor = conn.cursor()

    # Get or create test users
    print("\nCreating test users...")

    # First, get existing users from database
    cursor.execute("SELECT id, email FROM users LIMIT 5")
    existing_users = cursor.fetchall()

    if len(existing_users) < 5:
        print("Need at least 5 users in database for testing")
        print("Please create users through the app first")
        conn.close()
        return

    # Map CSV user_ids to database user UUIDs
    user_mapping = {}
    csv_users = df['user_id'].unique()[:min(len(existing_users), len(df['user_id'].unique()))]

    for i, csv_user in enumerate(csv_users):
        if i < len(existing_users):
            user_mapping[csv_user] = existing_users[i][0]  # UUID

    print(f"Mapped {len(user_mapping)} users")

    # Insert training data
    print("\nInserting training data...")

    inserted = 0
    skipped = 0

    base_time = datetime.utcnow() - timedelta(days=30)

    for idx, row in df.iterrows():
        csv_user = row['user_id']

        if csv_user not in user_mapping:
            skipped += 1
            continue

        db_user_id = user_mapping[csv_user]

        # Create timestamp (spread over last 30 days)
        timestamp = base_time + timedelta(
            days=random.randint(0, 30),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59)
        )

        try:
            cursor.execute("""
                INSERT INTO lnirt_training_data (
                    user_id,
                    topic,
                    difficulty,
                    correct,
                    response_time_seconds,
                    used_for_general_training,
                    created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                db_user_id,
                'calculus',
                int(row['difficulty']),
                int(row['correct']),
                int(row['response_time']),
                False,  # Not yet used for training
                timestamp
            ))

            inserted += 1

            if inserted % 100 == 0:
                print(f"Inserted {inserted} records...")
                conn.commit()

        except Exception as e:
            print(f"Error inserting row {idx}: {e}")
            continue

    conn.commit()

    print(f"\nCompleted!")
    print(f"Inserted: {inserted}")
    print(f"Skipped: {skipped}")

    # Verify insertion
    cursor.execute("SELECT COUNT(*) FROM lnirt_training_data WHERE topic='calculus'")
    count = cursor.fetchone()[0]
    print(f"\nTotal calculus records in database: {count}")

    cursor.close()
    conn.close()


if __name__ == "__main__":
    print("=" * 70)
    print("LOAD LNIRT TRAINING DATA")
    print("=" * 70)
    print()

    load_calculus_data()

    print()
    print("=" * 70)
    print("DONE!")
    print("=" * 70)
    print()
    print("Next steps:")
    print("1. Train general model: curl -X POST http://localhost:8000/lnirt/train/general/calculus")
    print("2. Check model stats: curl http://localhost:8000/lnirt/model/stats/calculus")
    print("3. Test prediction: curl -X POST http://localhost:8000/lnirt/predict?topic=calculus&difficulty=medium")
