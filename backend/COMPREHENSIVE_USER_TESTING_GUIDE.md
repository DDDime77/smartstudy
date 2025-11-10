# Comprehensive User Testing Guide for V2 Embedding Model

## System Status

**Date**: 2025-11-10
**User**: bulk@example.com
**Backend**: Running on http://localhost:4008
**Frontend**: Running on http://localhost:4000
**Model**: V2 Embedding Model (Feed-forward NN with history aggregation)

### Current State
- ✅ Critical bug FIXED: V2 model predict() signature corrected
- ✅ Backend running cleanly (no prediction errors)
- ✅ All 8 frontend pages verified working (200 OK)
- ⚠️ Training counter: **2/5** (need 3 more completed tasks to trigger training)
- 📊 Completed tasks: 668

---

## Quick Start Testing

### 1. Access the Study Timer
1. Open browser: http://localhost:4000/dashboard/study-timer
2. Login as: **bulk@example.com**
3. Click "Start New Session" or use existing session

---

## Part 1: Testing Prediction Diversity (Critical Test)

**Goal**: Verify V2 model produces DIFFERENT predictions for different scenarios

### Test Scenarios

Create practice tasks for these 6 scenarios and observe the predicted values:

| # | Topic | Difficulty | Expected Behavior |
|---|-------|-----------|-------------------|
| 1 | Calculus | easy | Should predict HIGHER correctness, LOWER time |
| 2 | Calculus | medium | Baseline prediction |
| 3 | Calculus | hard | Should predict LOWER correctness, HIGHER time |
| 4 | Microeconomics | easy | Should differ from Calculus easy |
| 5 | Microeconomics | medium | Should differ from Calculus medium |
| 6 | Microeconomics | hard | Should differ from Calculus hard |

### How to Generate Tasks

1. Go to: http://localhost:4000/dashboard/study-timer
2. Click "Generate Practice Task" button
3. Select subject (e.g., "Mathematics: Analysis & Approaches")
4. Select topic (e.g., "Calculus")
5. Select difficulty (e.g., "easy")
6. Click "Generate"

### What to Look For

**In the task card, you'll see predictions like:**
```
Estimated Time: 45 seconds
Predicted Correctness: 68%
Model: embedding_v2_20251110_205255
```

**IMPORTANT**: Record the predictions for each scenario:

| Topic | Difficulty | Pred. Correctness | Pred. Time | Notes |
|-------|-----------|------------------|------------|-------|
| Calculus | easy | ___% | ___s | |
| Calculus | medium | ___% | ___s | Baseline |
| Calculus | hard | ___% | ___s | |
| Microeconomics | easy | ___% | ___s | |
| Microeconomics | medium | ___% | ___s | |
| Microeconomics | hard | ___% | ___s | |

### Success Criteria

✅ **GOOD**: At least 4 out of 6 predictions are DIFFERENT (varies by >2% or >5 seconds)
⚠️ **MODERATE**: 2-3 predictions differ
❌ **BAD**: All predictions are the same (model not working)

---

## Part 2: Trigger Model Training

**Goal**: Complete enough tasks to trigger automatic retraining

### Current Status
- Training Counter: **2/5** completed since last training
- Need: **3 MORE** completed tasks to trigger training

### Steps to Trigger Training

1. **Generate a practice task** (any topic/difficulty)
2. **Complete the task**:
   - Click "Mark as Complete"
   - Select "Correct" or "Incorrect"
   - Enter actual time spent
3. **Repeat 2 more times** (total 3 tasks)
4. **On the 3rd completion**, training will automatically trigger

### How to Verify Training Was Triggered

**Check backend logs:**
```bash
tail -50 /tmp/backend.log | grep -i "training\|embedding"
```

**Look for:**
```
🔄 Training started in background: Training scheduled for topic: [topic]
📊 Starting training on X samples...
✅ Training complete! Models saved.
```

**Check database counter:**
```bash
cd /home/claudeuser/smartstudy/backend
./venv/bin/python -c "
from dotenv import load_dotenv
load_dotenv()
import os
from sqlalchemy import create_engine, text

engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    result = conn.execute(text('SELECT n_samples_since_training, last_trained_at FROM embedding_model_tracker LIMIT 1'))
    row = result.fetchone()
    print(f'Counter: {row[0]}/5')
    print(f'Last trained: {row[1]}')
"
```

**After training:**
- Counter should reset to **0/5**
- `last_trained_at` should show current timestamp

---

## Part 3: Verify Predictions Change After Training

**Goal**: Confirm predictions adapt based on your actual performance

### Test Flow

1. **BEFORE TRAINING**: Generate task for "Calculus - medium"
   - Record prediction: ___% correctness, ___s time

2. **Complete 3 tasks with SPECIFIC pattern**:
   - Task 1: Calculus - easy → Mark CORRECT, actual time: 30s
   - Task 2: Calculus - easy → Mark CORRECT, actual time: 25s
   - Task 3: Calculus - easy → Mark CORRECT, actual time: 28s

   This tells the model: "I'm GOOD at easy Calculus"

3. **AFTER TRAINING** (wait 30 seconds for training to complete):
   - Generate NEW task: "Calculus - easy"
   - Check if prediction changed:
     - Correctness should be HIGHER (you performed well)
     - Time should be LOWER (you were fast)

4. **Contrast Test**:
   - Generate task: "Calculus - hard"
   - Prediction should be LOWER than easy (you haven't proven yourself here yet)

### Expected Results

| Scenario | Before Training | After Training | Expected Change |
|----------|----------------|----------------|-----------------|
| Calculus easy | ~50% / 60s | >60% / <45s | ↑ correctness, ↓ time |
| Calculus hard | ~50% / 60s | ~40% / >70s | ↓ correctness, ↑ time |

---

## Part 4: Advanced Testing

### Test Progressive Learning

1. Complete 10 tasks on SAME topic (e.g., "Linear Algebra - medium")
2. Vary your performance:
   - Tasks 1-5: Mark as INCORRECT, slow time (90s+)
   - Tasks 6-10: Mark as CORRECT, fast time (30s)
3. After each batch of 5, check how predictions evolve
4. Model should "learn" you're improving

### Test Cross-Topic Generalization

1. Complete many "Calculus" tasks → Get good at math
2. Generate "Statistics" task → Should benefit from math skills
3. Generate "History" task → Should NOT benefit (different domain)

### Test Difficulty Scaling

Generate 3 tasks for SAME topic:
- Easy → Should predict ~70% correct, 30s
- Medium → Should predict ~50% correct, 60s
- Hard → Should predict ~30% correct, 90s

Predictions should scale logically with difficulty.

---

## Part 5: Database Verification

### Check Recent Predictions

```bash
cd /home/claudeuser/smartstudy/backend
./venv/bin/python -c "
from dotenv import load_dotenv
load_dotenv()
import os
from sqlalchemy import create_engine, text

engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    result = conn.execute(text('''
        SELECT topic, difficulty, predicted_correct, predicted_time_seconds, created_at
        FROM practice_tasks
        WHERE user_id = (SELECT id FROM users WHERE email = 'bulk@example.com')
          AND predicted_correct IS NOT NULL
          AND lnirt_model_version LIKE '%embedding%'
        ORDER BY created_at DESC
        LIMIT 10
    '''))

    print('Recent V2 Predictions:')
    print(f\"{'Topic':<20} {'Difficulty':<12} {'Pred Correct':<15} {'Pred Time':<12} {'Created'}\")
    print('-' * 85)

    for row in result.fetchall():
        print(f\"{row[0]:<20} {row[1]:<12} {row[2]:.4f} ({row[2]:>5.1%})   {row[3]:>6.1f}s      {row[4]}\")
"
```

### Check Training History

```bash
cd /home/claudeuser/smartstudy/backend
./venv/bin/python -c "
from dotenv import load_dotenv
load_dotenv()
import os
from sqlalchemy import create_engine, text

engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    result = conn.execute(text('''
        SELECT last_trained_at, n_samples_since_training
        FROM embedding_model_tracker
        ORDER BY last_trained_at DESC
        LIMIT 5
    '''))

    print('Training History:')
    for row in result.fetchall():
        print(f\"Trained at: {row[0]}, Counter: {row[1]}/5\")
"
```

---

## Part 6: Frontend Pages Verification

**All pages should load without errors:**

| # | Page | URL | Status |
|---|------|-----|--------|
| 1 | Dashboard | http://localhost:4000/dashboard | ✅ |
| 2 | Study Timer | http://localhost:4000/dashboard/study-timer | ✅ |
| 3 | Assignments | http://localhost:4000/dashboard/assignments | ✅ |
| 4 | Exams | http://localhost:4000/dashboard/exams | ✅ |
| 5 | AI Assistant | http://localhost:4000/dashboard/ai-assistant | ✅ |
| 6 | Onboarding | http://localhost:4000/onboarding | ✅ |
| 7 | Profile | http://localhost:4000/dashboard/profile | ✅ |
| 8 | Calendar | http://localhost:4000/dashboard/calendar | ✅ |

### Quick Verification

```bash
for page in "" "/dashboard" "/dashboard/study-timer" "/dashboard/assignments" "/dashboard/exams" "/dashboard/ai-assistant" "/onboarding" "/dashboard/profile" "/dashboard/calendar"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4000$page")
    if [ "$status" = "200" ]; then
        echo "✅ $page → $status"
    else
        echo "❌ $page → $status"
    fi
done
```

---

## Part 7: Troubleshooting

### Problem: Predictions Not Changing

**Check 1**: Verify model is being used
```bash
tail -20 /tmp/backend.log | grep "embedding_v2"
```

**Check 2**: Verify no errors in logs
```bash
tail -50 /tmp/backend.log | grep -i "error\|exception" | grep -v "CUDA"
```

**Check 3**: Verify predictions are actually from V2
- Look at task card, should show: `Model: embedding_v2_YYYYMMDD_HHMMSS`
- If it shows `lnirt_*`, V2 is not being used

### Problem: Training Not Triggering

**Check counter:**
```bash
cd /home/claudeuser/smartstudy/backend && ./venv/bin/python -c "
from dotenv import load_dotenv; load_dotenv()
import os
from sqlalchemy import create_engine, text
engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    result = conn.execute(text('SELECT n_samples_since_training FROM embedding_model_tracker'))
    print(f'Counter: {result.scalar()}/5')
"
```

**Verify tasks are being counted:**
- Tasks must be marked as COMPLETED
- Tasks must have `is_correct` set (not NULL)
- Tasks must have `actual_time_seconds` set

### Problem: Backend Crashes

**Check logs:**
```bash
tail -100 /tmp/backend.log
```

**Restart backend:**
```bash
# Kill existing
pkill -f "uvicorn app.main:app"

# Start fresh
cd /home/claudeuser/smartstudy/backend
nohup ./venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 4008 > /tmp/backend.log 2>&1 &

# Verify
sleep 3
curl http://localhost:4008/
```

### Problem: Frontend Not Loading

**Check if Next.js is running:**
```bash
curl -I http://localhost:4000
```

**Check logs:**
```bash
# Look for Next.js process logs
ps aux | grep next
```

---

## Part 8: Success Metrics

### ✅ System is Working If:

1. **Prediction Diversity**: At least 50% of predictions vary across scenarios
2. **Training Triggers**: Counter increments and resets at 5
3. **Model Adaptation**: Predictions change after training
4. **No Errors**: Backend logs show no prediction failures
5. **All Pages Load**: All 8 frontend pages return 200 OK

### Current Status Summary

```
✅ V2 Model: FIXED and deployed
✅ Backend: Running cleanly on port 4008
✅ Frontend: All 8 pages working
⚠️ Training: 2/5 (needs 3 more tasks)
⏳ Testing: Awaiting user verification
```

---

## Part 9: Next Steps

### Immediate Actions (Next 10 Minutes)

1. **Generate 6 test tasks** (different topics/difficulties)
2. **Record predictions** for each scenario
3. **Verify diversity** (predictions should vary)
4. **Complete 3 tasks** to trigger training
5. **Wait 30 seconds** for training to complete
6. **Re-test predictions** to confirm they changed

### Short-Term Testing (Next 1 Hour)

1. Complete 20 tasks with varied performance
2. Monitor how predictions evolve
3. Test cross-topic and difficulty scaling
4. Verify all edge cases work

### Long-Term Monitoring (Next 1 Week)

1. Use system normally
2. Monitor prediction quality over time
3. Check training triggers regularly
4. Report any anomalies

---

## Part 10: Quick Reference Commands

### Check System Status
```bash
# Backend health
curl http://localhost:4008/health

# Frontend health
curl -I http://localhost:4000

# Training status
cd /home/claudeuser/smartstudy/backend && ./venv/bin/python -c "
from dotenv import load_dotenv; load_dotenv()
import os; from sqlalchemy import create_engine, text
engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    result = conn.execute(text('SELECT n_samples_since_training, last_trained_at FROM embedding_model_tracker'))
    row = result.fetchone()
    print(f'{row[0]}/5 tasks | Last: {row[1]}')
"
```

### View Recent Activity
```bash
# Backend logs (last 50 lines, no CUDA errors)
tail -50 /tmp/backend.log | grep -v "CUDA\|cuInit"

# Recent predictions
cd /home/claudeuser/smartstudy/backend && ./venv/bin/python -c "
from dotenv import load_dotenv; load_dotenv()
import os; from sqlalchemy import create_engine, text
engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    result = conn.execute(text('''
        SELECT topic, difficulty, predicted_correct, predicted_time_seconds
        FROM practice_tasks
        WHERE user_id = (SELECT id FROM users WHERE email = 'bulk@example.com')
        AND lnirt_model_version LIKE '%embedding%'
        ORDER BY created_at DESC LIMIT 5
    '''))
    for row in result.fetchall():
        print(f'{row[0]:<20} {row[1]:<10} {row[2]:.1%} {row[3]:.0f}s')
"
```

### Force Training (Manual Override)
```bash
cd /home/claudeuser/smartstudy/backend && ./venv/bin/python -c "
from dotenv import load_dotenv; load_dotenv()
import os; from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
engine = create_engine(os.getenv('DATABASE_URL'))
Session = sessionmaker(bind=engine)
db = Session()

# Import and run training
import sys; from pathlib import Path
sys.path.insert(0, str(Path.cwd()))
from app.ml.embedding_service import EmbeddingModelService

service = EmbeddingModelService(db)
result = service.train_if_needed(force=True, verbose=True, async_training=False)
print(f'Training result: {result}')

db.close()
"
```

---

## Contact & Support

**Project**: SmartStudy AI
**Model**: V2 Embedding Model (Feed-forward NN)
**Status**: ✅ Fixed and deployed
**Last Updated**: 2025-11-10 21:30

For issues or questions, check:
1. Backend logs: `/tmp/backend.log`
2. This guide: `/home/claudeuser/smartstudy/backend/COMPREHENSIVE_USER_TESTING_GUIDE.md`
3. Test scripts: `/home/claudeuser/smartstudy/backend/test_via_http_api.sh`

---

**Remember**: The model learns from YOUR behavior. The more you use it, the better it gets at predicting YOUR performance!
