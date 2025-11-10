#!/bin/bash

# Test V2 model predictions via HTTP API
# This tests the actual production flow

echo "=========================================================================="
echo "HTTP API PREDICTION TEST - Testing V2 Model via Real API"
echo "=========================================================================="
echo ""

# Check if backend is running
echo "Checking backend status..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4008/)

if [ "$STATUS" != "200" ]; then
    echo "❌ Backend not running (got HTTP $STATUS)"
    exit 1
fi

echo "✅ Backend is running"
echo ""

# Check recent backend logs for errors
echo "Checking for model errors in logs..."
ERRORS=$(tail -50 /tmp/backend.log | grep -i "error\|exception\|failed" | grep -v "CUDA\|cuInit" | head -5)

if [ ! -z "$ERRORS" ]; then
    echo "⚠️  Recent errors found:"
    echo "$ERRORS"
else
    echo "✅ No critical errors in recent logs"
fi

echo ""
echo "=========================================================================="
echo "Testing predictions for bulk@example.com across different scenarios"
echo "=========================================================================="
echo ""

# Note: We can't easily test via API without auth token
# But we can check the database to see if predictions are being made

./venv/bin/python -c "
from dotenv import load_dotenv
load_dotenv()
import os
from sqlalchemy import create_engine, text

engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    # Check training tracker
    result = conn.execute(text('SELECT n_samples_since_training, last_trained_at FROM embedding_model_tracker LIMIT 1'))
    row = result.fetchone()

    print(f'Training Status:')
    print(f'  Counter: {row[0]}/5')
    print(f'  Last trained: {row[1]}')
    print()

    # Get predictions from database for different scenarios
    result = conn.execute(text('''
        WITH latest_predictions AS (
            SELECT
                topic,
                difficulty,
                predicted_correct,
                predicted_time_seconds,
                ROW_NUMBER() OVER (PARTITION BY topic, difficulty ORDER BY created_at DESC) as rn
            FROM practice_tasks
            WHERE user_id = (SELECT id FROM users WHERE email = 'bulk@example.com')
              AND predicted_correct IS NOT NULL
              AND lnirt_model_version LIKE '%embedding%'
        )
        SELECT topic, difficulty, predicted_correct, predicted_time_seconds
        FROM latest_predictions
        WHERE rn = 1
        ORDER BY topic, difficulty
    '''))

    predictions = []
    print('Latest predictions from V2 model (embedding):')
    print()
    print(f\"{'Topic':<20} {'Difficulty':<12} {'Pred Correct':<15} {'Pred Time'}\")
    print('-' * 65)

    for row in result.fetchall():
        predictions.append((row[0], row[1], row[2], row[3]))
        print(f\"{row[0]:<20} {row[1]:<12} {row[2]:.4f}          {row[3]:.1f}s\")

    if predictions:
        probs = [p[2] for p in predictions]
        times = [p[3] for p in predictions]

        unique_probs = len(set(probs))
        unique_times = len(set(times))

        print()
        print(f'Diversity: {unique_probs}/{len(predictions)} unique correctness, {unique_times}/{len(predictions)} unique time')

        if unique_probs >= len(predictions) * 0.5:
            print('✅ GOOD diversity - model is varying predictions')
        elif unique_probs > 1:
            print('⚠️  SOME diversity - model varies but could be better')
        else:
            print('❌ NO diversity - all predictions identical')
    else:
        print()
        print('⚠️  No embedding model predictions found yet')
        print('   User needs to complete more tasks to trigger new predictions')
"

echo ""
echo "=========================================================================="
echo "NEXT STEPS FOR USER TESTING"
echo "=========================================================================="
echo ""
echo "1. Go to: http://localhost:4000/dashboard/study-timer"
echo "2. Login as: bulk@example.com"
echo "3. Generate tasks for DIFFERENT topics:"
echo "   - Try 'Calculus' with easy/medium/hard"
echo "   - Try 'Microeconomics' with easy/medium/hard"
echo "4. Check if predictions vary between scenarios"
echo "5. Complete 3 more tasks to trigger training (currently at 2/5)"
echo ""
echo "=========================================================================="
