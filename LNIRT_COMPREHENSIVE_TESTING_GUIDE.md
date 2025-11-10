# LNIRT Comprehensive Testing Guide

**Version:** 2.0
**Date:** November 10, 2025
**Test User:** you2@example.com (John Doe)
**Status:** ✅ Ready for Testing

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Pre-Test Setup](#pre-test-setup)
4. [Testing Workflow](#testing-workflow)
5. [Expected Behaviors](#expected-behaviors)
6. [Verification Steps](#verification-steps)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Testing](#advanced-testing)

---

## Overview

### What is LNIRT?

**LNIRT (Lognormal Item Response Theory)** is a machine learning model that predicts:
- **Correctness probability**: How likely you are to answer correctly (0-100%)
- **Expected time**: How long it will take you to complete the task (seconds)

### Key Features

✅ **Automatic Model Creation**: When you work on a new topic, a model is automatically created
✅ **General Training**: Every task completion trains the model on all users' data
✅ **Personalized Learning**: After your first task, predictions adapt to YOUR performance
✅ **Real-Time Adaptation**: Parameters update immediately after each task
✅ **Error-Aware Training**: System learns from prediction mistakes to improve accuracy

---

## System Architecture

```
User completes task
        ↓
Database trigger syncs to training_data
        ↓
Auto-training starts
        ↓
   ┌────────────────────┐
   │  GENERAL TRAINING  │ ← Trains difficulty parameters using ALL users
   └────────────────────┘
        ↓
   ┌────────────────────┐
   │  USER TRAINING     │ ← Trains YOUR personal parameters (θ, τ)
   └────────────────────┘
        ↓
Model saved to database
        ↓
Next prediction uses updated parameters
```

### Database Tables

1. **practice_tasks**: Stores tasks with predictions and actual results
2. **lnirt_training_data**: Stores completed tasks for training
3. **lnirt_models**: Stores trained model parameters

### Model Parameters

**Difficulty Parameters** (per difficulty level 1-3):
- `a`: Discrimination (how well it separates abilities)
- `b`: Difficulty (item difficulty level)
- `beta`: Time intensity (log-time parameter)

**User Parameters** (per user per topic):
- `θ` (theta): Ability (higher = more likely to be correct)
- `τ` (tau): Speed (higher = faster completion)

---

## Pre-Test Setup

### Current State

The test user `you2@example.com` has been pre-populated with:

- **2 easy Calculus tasks** (both correct, ~30s each)
- **5 medium Calculus tasks** (3 correct, ~65s each)
- **3 hard Calculus tasks** (none correct, ~109s each)

**Total**: 10 tasks, 5 correct (50% accuracy), avg time 71s

### User Parameters (after pre-training)

```
Topic: Calculus
θ (ability): 2.698
τ (speed): 0.022
```

These parameters mean:
- Moderate-to-high ability for calculus
- Average speed (neither fast nor slow)

### Servers Running

Ensure both servers are running:

```bash
# Backend (port 8000)
cd /home/claudeuser/smartstudy/backend
source venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (port 3000)
cd /home/claudeuser/smartstudy
npm start
```

**Check servers:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8000/docs

---

## Testing Workflow

### Test 1: View Existing Predictions

**Objective**: Verify predictions are displaying in the UI

1. Navigate to http://localhost:3000
2. Login as `you2@example.com`
3. Go to **Study Timer** page
4. You should NOT see any active tasks (we already completed the 10 pre-training tasks)

### Test 2: Generate New Task with Prediction

**Objective**: Test prediction generation for existing topic

1. On Study Timer page, fill in:
   - **Subject**: Mathematics
   - **Topic**: Calculus
   - **Difficulty**: Medium
2. Click **"Generate Task"**

**Expected Result**:
- Task generates successfully
- Below the task content, you see a **blue info box**:
  ```
  LNIRT ML Predictions:
  Success: ~28-40% Time: ~60-65s
  ```

**Why these predictions?**
- You struggled with medium tasks before (60% accuracy)
- Your ability θ=2.698 combined with medium difficulty parameters
- Your speed τ=0.022 gives ~63s expected time

### Test 3: Complete Task (Correct)

**Objective**: Test automatic training when answering correctly

1. Read the generated task
2. Solve it (or pretend you did)
3. Click the **✓ (checkmark)** button
4. Wait a few seconds

**Expected Result**:
- Task marked as completed
- **Behind the scenes** (check backend logs):
  ```
  General training: 1 sample processed
  User training: θ updated, τ updated
  ```

5. Generate another medium Calculus task

**Expected Result**:
- Predictions should **IMPROVE** (higher success probability)
- If you answered correctly, expect ~35-50% now (up from ~28%)

### Test 4: Complete Task (Incorrect)

**Objective**: Test adaptation when answering incorrectly

1. Generate another medium Calculus task
2. Click the **✗ (cross)** button (mark as incorrect)
3. Wait a few seconds
4. Generate another medium Calculus task

**Expected Result**:
- Predictions should **DECREASE** (lower success probability)
- Expect ~20-30% now (down from previous)

### Test 5: Test Different Difficulties

**Objective**: Verify predictions vary by difficulty

1. Generate **Easy** Calculus task

   **Expected**: High success (~90-100%), low time (~25-35s)

2. Generate **Medium** Calculus task

   **Expected**: Moderate success (~25-40%), medium time (~60-70s)

3. Generate **Hard** Calculus task

   **Expected**: Low success (~25-35%), high time (~100-130s)

**Why?**
- You performed very well on easy tasks (100% accuracy)
- Struggled with medium (60%) and hard (0%)
- Predictions reflect your personal performance pattern

### Test 6: New Topic (Auto-Model Creation)

**Objective**: Test automatic model creation for new topics

1. On Study Timer page:
   - **Subject**: Mathematics
   - **Topic**: Algebra (NEW topic!)
   - **Difficulty**: Medium
2. Click **"Generate Task"**

**Expected Result**:
- Task generates successfully
- Predictions shown: **~50% success, ~55s time**

**Why?**
- No Algebra model exists yet
- System auto-creates model with default parameters
- Uses population average (no personalization yet)

3. Complete the Algebra task (mark correct/incorrect)
4. Generate another Algebra task

**Expected Result**:
- Predictions should now be **PERSONALIZED** for Algebra
- Different from Calculus predictions (independent personalization per topic)

### Test 7: Multiple Tasks Sequence

**Objective**: Observe prediction convergence

1. Complete 5 medium Calculus tasks in a row
2. Mark all as **CORRECT**
3. Observe how predictions change:

   | Task | Expected Success | Actual | Expected Time | Actual |
   |------|-----------------|--------|---------------|--------|
   | 1    | ~30%            | ✓      | ~63s          | ~55s   |
   | 2    | ~45%            | ✓      | ~58s          | ~53s   |
   | 3    | ~55%            | ✓      | ~55s          | ~52s   |
   | 4    | ~65%            | ✓      | ~53s          | ~51s   |
   | 5    | ~70%            | ✓      | ~52s          | ~50s   |

**Expected Pattern**:
- Success probability **increases** with each correct answer
- Time prediction **decreases** as system learns you're faster
- Predictions **converge** toward your true performance

---

## Expected Behaviors

### Behavior 1: First Task for New Topic

- **Prediction**: Uses default parameters (θ=0, τ=0)
- **Success**: ~50% (population average)
- **Time**: ~55s (population average)
- **Personalization**: NOT YET

### Behavior 2: After First Completion

- **Prediction**: Uses YOUR personalized parameters
- **Success**: Adjusted based on your actual correctness
- **Time**: Adjusted based on your actual time
- **Personalization**: YES!

### Behavior 3: Improving Performance

- If you answer **correctly** more often:
  - Success predictions **increase**
  - θ (ability) increases

- If you complete tasks **faster**:
  - Time predictions **decrease**
  - τ (speed) increases

### Behavior 4: Declining Performance

- If you answer **incorrectly** more often:
  - Success predictions **decrease**
  - θ (ability) decreases

- If you complete tasks **slower**:
  - Time predictions **increase**
  - τ (speed) decreases

### Behavior 5: Cross-Difficulty Predictions

For a user with θ=2.7, τ=0.0:
- **Easy (diff=1)**: ~100% success, ~28s
- **Medium (diff=2)**: ~30% success, ~63s
- **Hard (diff=3)**: ~30% success, ~120s

Why? Difficulty parameters (a, b, beta) are learned from general training.

---

## Verification Steps

### Verify 1: Check Database Predictions

```bash
cd /home/claudeuser/smartstudy/backend
source venv/bin/activate
python3 -c "
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cursor = conn.cursor()

cursor.execute('''
    SELECT topic, difficulty, predicted_correct, predicted_time_seconds,
           is_correct, actual_time_seconds, created_at
    FROM practice_tasks
    WHERE user_id = (SELECT id FROM users WHERE email = 'you2@example.com')
    ORDER BY created_at DESC
    LIMIT 5
''')

print('Recent tasks:')
for row in cursor.fetchall():
    print(f'  {row[0]} {row[1]:6} - Pred: {row[2]:.1%}/{row[3]:3}s | Actual: {\"✓\" if row[4] else \"✗\" if row[4] is not None else \"-\"} {row[5] if row[5] else \"-\":>3}s | {row[6]}')

cursor.close()
conn.close()
"
```

### Verify 2: Check User Parameters

```bash
python3 -c "
import psycopg2
import os
from dotenv import load_dotenv
import json

load_dotenv()
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cursor = conn.cursor()

user_id = '202e7cca-51d9-4a87-b6e5-cdd083b3a6c5'

cursor.execute('''
    SELECT user_params FROM lnirt_models WHERE topic = 'Calculus'
''')
row = cursor.fetchone()

if row:
    user_params = row[0]
    if user_id in user_params:
        print(f'User parameters:')
        print(f'  θ (ability): {user_params[user_id][\"theta\"]:.3f}')
        print(f'  τ (speed): {user_params[user_id][\"tau\"]:.3f}')
    else:
        print('User not in model')
else:
    print('No model found')

cursor.close()
conn.close()
"
```

### Verify 3: Check Training Data

```bash
python3 -c "
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cursor = conn.cursor()

cursor.execute('''
    SELECT COUNT(*), SUM(CASE WHEN used_for_general_training THEN 1 ELSE 0 END)
    FROM lnirt_training_data
    WHERE user_id = (SELECT id FROM users WHERE email = 'you2@example.com')
''')

total, used = cursor.fetchone()
print(f'Training records: {total}')
print(f'Used for general training: {used}/{total}')

cursor.close()
conn.close()
"
```

### Verify 4: Check Model Stats

```bash
python3 -c "
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cursor = conn.cursor()

cursor.execute('''
    SELECT topic, n_users, n_training_samples, last_trained_at
    FROM lnirt_models
    ORDER BY last_trained_at DESC
''')

print('Trained models:')
for row in cursor.fetchall():
    print(f'  {row[0]:10} - {row[1]} users, {row[2]} samples, last: {row[3]}')

cursor.close()
conn.close()
"
```

### Verify 5: Backend Logs

```bash
# Check for auto-training messages
tail -50 /tmp/backend.log | grep -i "training"
```

Expected output:
```
Auto-training completed: {'general_training': {'status': 'success', ...}, 'user_training': {'status': 'success', ...}}
```

---

## Troubleshooting

### Issue 1: Predictions Not Showing in UI

**Symptoms**: Blue prediction box doesn't appear

**Checks**:
1. Open browser console (F12) - any JavaScript errors?
2. Check network tab - is POST /practice-tasks returning predictions?
3. Verify frontend build is up-to-date: `npm run build`

**Fix**:
```bash
cd /home/claudeuser/smartstudy
pkill -f "next-server"
npm start
```

### Issue 2: Predictions Are Always the Same

**Symptoms**: Success probability doesn't change after completing tasks

**Checks**:
1. Check backend logs: `tail -f /tmp/backend.log`
2. Verify training is triggering
3. Check user parameters in database

**Fix**:
```bash
# Manually trigger training
curl -X POST "http://localhost:8000/lnirt/train/user/Calculus" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Issue 3: Very Low Success Predictions

**Symptoms**: All predictions show <10% success

**Possible Causes**:
- You've been answering many incorrectly
- θ (ability) has decreased significantly

**Check**:
```bash
# View your ability parameter
python3 -c "
from app.ml import LNIRTService
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

engine = create_engine(os.getenv('DATABASE_URL'))
Session = sessionmaker(bind=engine)
db = Session()

lnirt = LNIRTService(db)
params = lnirt.get_user_parameters('202e7cca-51d9-4a87-b6e5-cdd083b3a6c5', 'Calculus')
print(f'θ={params[\"theta\"]:.3f}, τ={params[\"tau\"]:.3f}')
"
```

**This is normal!** The system is accurately reflecting your performance. Answer more correctly to improve predictions.

### Issue 4: Backend Errors

**Symptoms**: 500 errors when creating/completing tasks

**Check logs**:
```bash
tail -100 /tmp/backend.log
```

**Common issues**:
- Database connection error → Check DATABASE_URL
- Import error → Activate venv: `source venv/bin/activate`
- Missing scipy → Install: `pip install scipy numpy pandas`

### Issue 5: Auto-Training Not Triggering

**Symptoms**: Parameters don't update after completion

**Checks**:
1. Verify task has is_correct AND actual_time_seconds
2. Check database trigger exists:
```sql
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'trigger_sync_to_training_data';
```

**Fix**: Re-apply migration:
```bash
psql $DATABASE_URL < migrations/001_add_lnirt_support.sql
```

---

## Advanced Testing

### Test A: Extreme Values

1. Complete 10 easy tasks, all correct, in ~15s each
2. Expected: θ increases to ~3.0, τ increases significantly
3. Generate easy task: Should predict ~99-100% success, ~15-20s

### Test B: Performance Decline

1. Complete 10 hard tasks, all incorrect, in ~200s each
2. Expected: θ decreases to ~-1.0, τ decreases
3. Generate hard task: Should predict ~5-15% success, ~200+s

### Test C: Mixed Performance

1. Complete tasks with 50% accuracy, varying time
2. Expected: θ stays near 0, τ varies with time
3. Predictions should reflect average performance

### Test D: Multiple Topics

1. Complete 5 Calculus tasks (all correct)
2. Complete 5 Algebra tasks (all incorrect)
3. Expected:
   - Calculus predictions: HIGH success
   - Algebra predictions: LOW success
   - **Independent** personalization per topic

### Test E: Error-Aware Training

1. Generate task with prediction: 30% success, 60s
2. Complete in 40s, mark as CORRECT
3. Model detects:
   - Correctness bias: +0.7 (actual better than predicted)
   - Time bias: -0.4 (actual faster than predicted)
4. Next prediction should be HIGHER success, LOWER time

### Test F: API Testing

Test LNIRT endpoints directly:

```bash
# Get token
TOKEN=$(curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you2@example.com","password":"yourpassword"}' \
  | jq -r '.access_token')

# Get prediction
curl "http://localhost:8000/lnirt/predict?topic=Calculus&difficulty=medium" \
  -H "Authorization: Bearer $TOKEN"

# Get user parameters
curl "http://localhost:8000/lnirt/user/parameters/Calculus" \
  -H "Authorization: Bearer $TOKEN"

# Get model stats
curl "http://localhost:8000/lnirt/model/stats/Calculus" \
  -H "Authorization: Bearer $TOKEN"

# Manual training (not usually needed)
curl -X POST "http://localhost:8000/lnirt/train/user/Calculus" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Testing Checklist

Use this checklist to ensure comprehensive testing:

### Frontend
- [ ] Prediction box displays correctly
- [ ] Predictions show valid percentages (0-100%)
- [ ] Predictions show valid times (> 0 seconds)
- [ ] Format is correct: "Success: XX.X% Time: Xm XXs"
- [ ] Box appears below task content
- [ ] Styling matches design (blue background, proper spacing)

### Backend
- [ ] Tasks created with predictions
- [ ] Predictions saved to database
- [ ] Auto-training triggers on completion
- [ ] General training processes new data
- [ ] User-specific training updates parameters
- [ ] No errors in logs

### Database
- [ ] practice_tasks has predicted_correct and predicted_time_seconds
- [ ] lnirt_training_data syncs automatically
- [ ] lnirt_models stores parameters correctly
- [ ] Trigger fires on task completion

### ML Predictions
- [ ] New topics get default predictions
- [ ] Existing topics use personalized predictions
- [ ] Predictions improve with good performance
- [ ] Predictions decline with poor performance
- [ ] Difficulty affects predictions correctly
- [ ] Predictions are reasonable (not 0% or 100% always)

### Training
- [ ] General training updates difficulty parameters
- [ ] User training updates θ and τ
- [ ] Parameters stay within bounds (-3 to 3)
- [ ] Training completes without errors
- [ ] Model saved to database after training

---

## Success Criteria

✅ **System is working correctly if:**

1. Predictions display in UI
2. Predictions change based on your performance
3. Easy tasks predict higher success than hard tasks
4. Predictions improve after correct answers
5. Predictions decline after incorrect answers
6. New topics auto-create models
7. No errors in backend logs
8. Training triggers automatically

❌ **Issues to fix if:**

- Predictions are always identical
- Predictions are always 50%/55s (default)
- Predictions don't change after 5+ tasks
- Backend errors in logs
- Training doesn't trigger
- Predictions are nonsensical (e.g., 0% or 100% always)

---

## Performance Expectations

### Latency
- Task creation: < 500ms (includes prediction)
- Task completion: < 1000ms (includes training)
- API prediction call: < 100ms

### Accuracy
- After 1 task: ~20-40% accuracy (wide variance)
- After 5 tasks: ~40-60% accuracy
- After 10 tasks: ~60-75% accuracy
- After 20+ tasks: ~75-85% accuracy

### Model Size
- Users per topic: 1-1000s
- Samples per topic: 10-100,000s
- Database storage: ~10KB per model

---

## Next Steps

After successful testing:

1. **Gather User Feedback**: Are predictions helpful? Accurate?
2. **Monitor Accuracy**: Track prediction vs actual over time
3. **Expand Topics**: Add more subjects with training data
4. **Improve Model**: Fine-tune parameters based on real data
5. **Add Features**:
   - Confidence intervals for predictions
   - Explanation of prediction changes
   - Progress tracking over time
   - Achievements based on performance

---

## Support

For issues during testing:

1. **Check logs**:
   - Backend: `tail -f /tmp/backend.log`
   - Frontend: Browser console (F12)

2. **Verify database**:
   - Use SQL queries from Verification section

3. **Reference docs**:
   - `LNIRT_INTEGRATION_SUMMARY.md` - Implementation details
   - `LNIRT_TESTING_GUIDE.md` - Original testing guide

4. **Contact support**: Report issues with:
   - User email
   - Topic/difficulty
   - Expected vs actual behavior
   - Backend logs
   - Database query results

---

## Appendix: Quick Reference

### URLs
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Test User
- Email: you2@example.com
- ID: 202e7cca-51d9-4a87-b6e5-cdd083b3a6c5

### Key Files
- LNIRT Model: `/home/claudeuser/smartstudy/backend/app/ml/lnirt_model.py`
- LNIRT Service: `/home/claudeuser/smartstudy/backend/app/ml/lnirt_service.py`
- Practice Tasks Router: `/home/claudeuser/smartstudy/backend/app/routers/practice_tasks.py`
- Frontend Page: `/home/claudeuser/smartstudy/app/dashboard/study-timer/page.tsx`

### Key Commands
```bash
# Start backend
cd /home/claudeuser/smartstudy/backend && source venv/bin/activate && \
  python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Start frontend
cd /home/claudeuser/smartstudy && npm start

# Check database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM practice_tasks WHERE predicted_correct IS NOT NULL"

# View logs
tail -f /tmp/backend.log

# Run simulation
cd /home/claudeuser/smartstudy/backend && source venv/bin/activate && \
  python simulate_training_data.py
```

---

**Happy Testing! 🎉**

The LNIRT system is ready for comprehensive testing. Follow this guide to verify all functionality is working correctly.
