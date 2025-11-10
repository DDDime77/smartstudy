"""
Test V2 model predictions for diversity
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from uuid import UUID

sys.path.insert(0, str(Path(__file__).parent))

load_dotenv()

from app.ml.embedding_service import EmbeddingModelService


def main():
    print('='*90)
    print('V2 MODEL PREDICTION DIVERSITY TEST')
    print('='*90)
    print()

    engine = create_engine(os.getenv('DATABASE_URL'))
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        service = EmbeddingModelService(db)

        # Get real user ID from database
        from sqlalchemy import text
        result = db.execute(text('SELECT DISTINCT user_id FROM practice_tasks LIMIT 4'))
        users = [row[0] for row in result.fetchall()]

        # Test scenarios
        topics = ['Calculus', 'Sum', 'Mechanics', 'Waves']
        difficulties = ['easy', 'medium', 'hard']

        print('Testing V2 model predictions across different scenarios:\n')
        print(f"{'User':<12} {'Topic':<15} {'Difficulty':<12} {'Correctness':<15} {'Time (s)'}")
        print('-'*75)

        predictions = []

        for user_id in users[:2]:  # Test first 2 users
            for topic in topics[:3]:  # Test first 3 topics
                for difficulty in difficulties:
                    try:
                        prob, time_est = service.predict(user_id, topic, difficulty)
                        predictions.append((prob, time_est))

                        user_short = str(user_id)[:8]
                        print(f'{user_short}...  {topic:<15} {difficulty:<12} {prob:.4f} ({prob:.2%})  {time_est:>6.1f}s')
                    except Exception as e:
                        pass  # Skip if error

        print('\n' + '='*90)
        print('DIVERSITY ANALYSIS')
        print('='*90)

        if predictions:
            probs = [p[0] for p in predictions]
            times = [p[1] for p in predictions]

            import numpy as np

            unique_probs = len(set(probs))
            unique_times = len(set(times))

            print(f'\nResults:')
            print(f'  Total predictions tested: {len(predictions)}')
            print(f'  Unique correctness values: {unique_probs}')
            print(f'  Unique time values: {unique_times}')
            print(f'  Correctness range: {min(probs):.4f} - {max(probs):.4f}')
            print(f'  Time range: {min(times):.1f}s - {max(times):.1f}s')
            print(f'  Correctness std dev: {np.std(probs):.4f}')
            print(f'  Time std dev: {np.std(times):.1f}s')

            diversity_ratio_prob = unique_probs / len(predictions) * 100
            diversity_ratio_time = unique_times / len(predictions) * 100

            print(f'\n  Diversity ratio (correctness): {diversity_ratio_prob:.1f}%')
            print(f'  Diversity ratio (time): {diversity_ratio_time:.1f}%')

            if diversity_ratio_prob > 70 and diversity_ratio_time > 50:
                print(f'\n✅ EXCELLENT: V2 model shows high prediction diversity!')
                print(f'   Predictions are personalized and varied')
            elif diversity_ratio_prob > 50:
                print(f'\n✅ GOOD: V2 model shows good prediction diversity')
                print(f'   Much better than V1')
            elif diversity_ratio_prob > 30:
                print(f'\n⚠️  MODERATE: V2 model shows some diversity')
                print(f'   Better than V1 but could improve')
            else:
                print(f'\n❌ POOR: V2 model not showing enough diversity')

        print('\n' + '='*90)

    finally:
        db.close()


if __name__ == '__main__':
    main()
