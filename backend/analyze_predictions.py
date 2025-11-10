"""
Analyze prediction diversity from database (no TensorFlow loading)

This script examines predictions that have already been made and stored in the database
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import numpy as np

load_dotenv()


def main():
    print('='*90)
    print('PREDICTION DIVERSITY ANALYSIS')
    print('='*90)
    print()

    engine = create_engine(os.getenv('DATABASE_URL'))

    with engine.connect() as conn:
        # Get all tasks with predictions
        result = conn.execute(text('''
            SELECT
                user_id,
                topic,
                difficulty,
                predicted_correct,
                predicted_time_seconds,
                lnirt_model_version,
                is_correct,
                actual_time_seconds,
                completed
            FROM practice_tasks
            WHERE predicted_correct IS NOT NULL
              AND predicted_time_seconds IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 200
        '''))

        tasks = result.fetchall()

        print(f'TEST 1: Overall Prediction Statistics')
        print('-'*90)
        print(f'Total tasks with predictions: {len(tasks)}')

        if len(tasks) == 0:
            print('❌ No tasks with predictions found')
            return

        # Analyze predictions
        probs = [float(t[3]) for t in tasks if t[3] is not None]
        times = [float(t[4]) for t in tasks if t[4] is not None]
        models = [t[5] for t in tasks]

        # Count by model type
        from collections import Counter
        model_counts = Counter(models)

        print(f'\nPredictions by model type:')
        for model, count in model_counts.most_common():
            print(f'  {model}: {count} predictions')

        print(f'\nCorrectness Probability Statistics:')
        print(f'  Unique values: {len(set(probs))}')
        print(f'  Range: {min(probs):.4f} - {max(probs):.4f}')
        print(f'  Mean: {np.mean(probs):.4f}')
        print(f'  Median: {np.median(probs):.4f}')
        print(f'  Std Dev: {np.std(probs):.4f}')

        # Show distribution
        print(f'\n  Value distribution (top 10):')
        prob_counts = Counter(probs)
        for prob, count in prob_counts.most_common(10):
            print(f'    {prob:.4f}: {count} occurrences ({count/len(probs):.1%})')

        print(f'\nTime Prediction Statistics:')
        print(f'  Unique values: {len(set(times))}')
        print(f'  Range: {min(times):.1f}s - {max(times):.1f}s')
        print(f'  Mean: {np.mean(times):.1f}s')
        print(f'  Median: {np.median(times):.1f}s')
        print(f'  Std Dev: {np.std(times):.1f}s')

        # Show distribution
        print(f'\n  Value distribution (top 10):')
        time_counts = Counter(times)
        for time_val, count in time_counts.most_common(10):
            print(f'    {time_val:.1f}s: {count} occurrences ({count/len(times):.1%})')

        print(f'\n\nTEST 2: Per-User Analysis')
        print('-'*90)

        # Analyze by user
        result = conn.execute(text('''
            SELECT
                user_id,
                COUNT(*) as n_tasks,
                AVG(predicted_correct) as avg_prob,
                MIN(predicted_correct) as min_prob,
                MAX(predicted_correct) as max_prob,
                AVG(predicted_time_seconds) as avg_time,
                COUNT(DISTINCT predicted_correct) as unique_probs,
                COUNT(DISTINCT predicted_time_seconds) as unique_times
            FROM practice_tasks
            WHERE predicted_correct IS NOT NULL
              AND predicted_time_seconds IS NOT NULL
            GROUP BY user_id
            ORDER BY n_tasks DESC
        '''))

        users = result.fetchall()

        print(f'User-specific prediction diversity:\n')
        print(f"{'User':<12} {'Tasks':<8} {'Avg Prob':<12} {'Prob Range':<20} {'Unique Probs':<15} {'Unique Times'}")
        print('-'*90)

        for user in users:
            user_id_short = str(user[0])[:8]
            n_tasks = user[1]
            avg_prob = user[2]
            min_prob = user[3]
            max_prob = user[4]
            prob_range = f'{min_prob:.3f}-{max_prob:.3f}'
            unique_probs = user[6]
            unique_times = user[7]

            print(f'{user_id_short}...  {n_tasks:<8} {avg_prob:.4f}{" "*6} {prob_range:<20} {unique_probs:<15} {unique_times}')

        print(f'\n\nTEST 3: Per-Topic Analysis')
        print('-'*90)

        # Analyze by topic
        result = conn.execute(text('''
            SELECT
                topic,
                COUNT(*) as n_tasks,
                AVG(predicted_correct) as avg_prob,
                MIN(predicted_correct) as min_prob,
                MAX(predicted_correct) as max_prob,
                AVG(predicted_time_seconds) as avg_time,
                COUNT(DISTINCT predicted_correct) as unique_probs,
                COUNT(DISTINCT predicted_time_seconds) as unique_times
            FROM practice_tasks
            WHERE predicted_correct IS NOT NULL
              AND predicted_time_seconds IS NOT NULL
            GROUP BY topic
            ORDER BY n_tasks DESC
        '''))

        topics = result.fetchall()

        print(f'Topic-specific prediction diversity:\n')
        print(f"{'Topic':<20} {'Tasks':<8} {'Avg Prob':<12} {'Prob Range':<20} {'Unique Probs':<15} {'Unique Times'}")
        print('-'*90)

        for topic_row in topics:
            topic = topic_row[0]
            n_tasks = topic_row[1]
            avg_prob = topic_row[2]
            min_prob = topic_row[3]
            max_prob = topic_row[4]
            prob_range = f'{min_prob:.3f}-{max_prob:.3f}'
            unique_probs = topic_row[6]
            unique_times = topic_row[7]

            print(f'{topic:<20} {n_tasks:<8} {avg_prob:.4f}{" "*6} {prob_range:<20} {unique_probs:<15} {unique_times}')

        print(f'\n\nTEST 4: Recent Predictions (Last 20)')
        print('-'*90)

        # Show recent predictions
        result = conn.execute(text('''
            SELECT
                user_id,
                topic,
                difficulty,
                predicted_correct,
                predicted_time_seconds,
                lnirt_model_version,
                created_at
            FROM practice_tasks
            WHERE predicted_correct IS NOT NULL
              AND predicted_time_seconds IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 20
        '''))

        recent = result.fetchall()

        print(f"{'User':<12} {'Topic':<15} {'Difficulty':<12} {'Prob':<10} {'Time':<10} {'Model':<15} {'Date'}")
        print('-'*90)

        for task in recent:
            user_short = str(task[0])[:8]
            topic = task[1][:13]
            difficulty = task[2]
            prob = task[3]
            time_est = task[4]
            model = task[5]
            date = str(task[6])[:19]

            print(f'{user_short}...  {topic:<15} {difficulty:<12} {prob:.4f}{" "*4} {time_est:>6.0f}s{" "*2} {model:<15} {date}')

        print(f'\n\n' + '='*90)
        print('ANALYSIS SUMMARY')
        print('='*90)

        # Determine if predictions are diverse enough
        unique_probs = len(set(probs))
        unique_times = len(set(times))
        prob_std = np.std(probs)

        print(f'\nDiversity Metrics:')
        print(f'  Unique correctness values: {unique_probs}')
        print(f'  Unique time values: {unique_times}')
        print(f'  Correctness std dev: {prob_std:.4f}')

        if unique_probs > 20 and unique_times > 20 and prob_std > 0.1:
            print(f'\n✅ GOOD: Predictions show high diversity')
            print(f'   Model is producing varied, personalized predictions')
        elif unique_probs > 10 and unique_times > 10:
            print(f'\n⚠️  MODERATE: Predictions show some diversity')
            print(f'   Model is working but could be more varied')
        else:
            print(f'\n❌ POOR: Predictions show low diversity')
            print(f'   Model may not be learning user-specific patterns')
            print(f'   Only {unique_probs} unique correctness values found')

        print(f'\n' + '='*90)


if __name__ == '__main__':
    main()
