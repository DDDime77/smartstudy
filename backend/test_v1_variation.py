"""
Test if V1 model predictions vary by user, topic, and difficulty
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()


def main():
    print('='*90)
    print('V1 MODEL VARIATION TEST')
    print('='*90)
    print('\nTesting if predictions vary by user, topic, and difficulty...\n')

    engine = create_engine(os.getenv('DATABASE_URL'))

    with engine.connect() as conn:
        # Get predictions grouped by user, topic, difficulty
        result = conn.execute(text('''
            SELECT
                user_id,
                topic,
                difficulty,
                AVG(predicted_correct) as avg_prob,
                MIN(predicted_correct) as min_prob,
                MAX(predicted_correct) as max_prob,
                AVG(predicted_time_seconds) as avg_time,
                COUNT(*) as n_predictions
            FROM practice_tasks
            WHERE predicted_correct IS NOT NULL
              AND lnirt_model_version = 'embedding_lstm'
            GROUP BY user_id, topic, difficulty
            HAVING COUNT(*) >= 2
            ORDER BY n_predictions DESC
            LIMIT 20
        '''))

        rows = result.fetchall()

        print('Predictions by User/Topic/Difficulty combination:\n')
        print(f"{'User':<12} {'Topic':<15} {'Diff':<8} {'Avg Prob':<12} {'Range':<15} {'Avg Time':<12} {'Count'}")
        print('-'*90)

        for row in rows:
            user_short = str(row[0])[:8]
            topic = row[1][:13]
            difficulty = row[2][:6]
            avg_prob = row[3]
            min_prob = row[4]
            max_prob = row[5]
            prob_range = f'{min_prob:.3f}-{max_prob:.3f}'
            avg_time = row[6]
            count = row[7]

            print(f'{user_short}...  {topic:<15} {difficulty:<8} {avg_prob:.4f}{" "*6} {prob_range:<15} {avg_time:>6.1f}s{" "*4} {count}')

        print('\n' + '='*90)
        print('ANALYSIS')
        print('='*90)

        # Check if predictions are truly stuck
        if rows:
            stuck_count = 0
            varied_count = 0

            for row in rows:
                min_prob = row[4]
                max_prob = row[5]
                prob_range = max_prob - min_prob

                if prob_range < 0.001:  # Essentially no variation
                    stuck_count += 1
                else:
                    varied_count += 1

            print(f'\nOut of {len(rows)} user/topic/difficulty combinations with 2+ predictions:')
            print(f'  Varied predictions: {varied_count} ({varied_count/len(rows)*100:.1f}%)')
            print(f'  Stuck predictions: {stuck_count} ({stuck_count/len(rows)*100:.1f}%)')

            if stuck_count > varied_count:
                print(f'\n❌ PROBLEM: Most combinations have stuck predictions')
                print(f'   Model is not learning different patterns')
            else:
                print(f'\n⚠️ MIXED: Some variation exists but model could be better')

        # Now check across different scenarios
        print('\n' + '='*90)
        print('CROSS-SCENARIO VARIATION TEST')
        print('='*90)

        result = conn.execute(text('''
            SELECT
                user_id,
                AVG(CASE WHEN topic = 'Calculus' THEN predicted_correct END) as calculus_prob,
                AVG(CASE WHEN topic = 'Sum' THEN predicted_correct END) as sum_prob,
                AVG(CASE WHEN difficulty = 'easy' THEN predicted_correct END) as easy_prob,
                AVG(CASE WHEN difficulty = 'medium' THEN predicted_correct END) as medium_prob,
                AVG(CASE WHEN difficulty = 'hard' THEN predicted_correct END) as hard_prob
            FROM practice_tasks
            WHERE predicted_correct IS NOT NULL
              AND lnirt_model_version = 'embedding_lstm'
            GROUP BY user_id
            HAVING COUNT(DISTINCT topic) >= 2 OR COUNT(DISTINCT difficulty) >= 2
        '''))

        users = result.fetchall()

        if users:
            print(f'\nTesting if predictions differ by topic and difficulty:\n')

            for user in users:
                user_short = str(user[0])[:8]
                calculus = user[1] if user[1] else None
                sum_topic = user[2] if user[2] else None
                easy = user[3] if user[3] else None
                medium = user[4] if user[4] else None
                hard = user[5] if user[5] else None

                print(f'User {user_short}...:')
                if calculus and sum_topic:
                    diff = abs(calculus - sum_topic)
                    print(f'  Calculus: {calculus:.4f} | Sum: {sum_topic:.4f} | Diff: {diff:.4f}')

                if easy and medium and hard:
                    print(f'  Easy: {easy:.4f} | Medium: {medium:.4f} | Hard: {hard:.4f}')
                elif easy and medium:
                    diff = abs(easy - medium)
                    print(f'  Easy: {easy:.4f} | Medium: {medium:.4f} | Diff: {diff:.4f}')

        print('\n' + '='*90)


if __name__ == '__main__':
    main()
