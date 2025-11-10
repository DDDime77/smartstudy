# Embedding Model Monitoring & Testing Guide

**Date:** November 10, 2025
**Purpose:** Guide for monitoring, testing, and verifying the embedding model system

---

## Quick Status Check

### 1. Check Backend Status
```bash
curl http://localhost:4008/
# Expected: {"message":"Welcome to StudySmart AI API","version":"1.0.0","docs":"/docs"}
```

### 2. Check Model Files
```bash
ls -lh /home/claudeuser/smartstudy/backend/app/ml/models/
# Expected:
# - correctness_model.keras (~520 KB)
# - time_model.keras (~520 KB)
# - metadata.json (~1 KB)
```

### 3. Check Training Counter
```bash
cd /home/claudeuser/smartstudy/backend
./venv/bin/python test_via_db_only.py
# Shows: Counter status, model files, training data
```

### 4. Monitor Real-Time Logs
```bash
cd /home/claudeuser/smartstudy/backend
./monitor_training.sh
# or
tail -f /tmp/backend.log | grep -E "training|Training|embedding|counter"
```

---

## What to Watch For

### Normal Operation

**Task Creation (Prediction):**
```
INFO: POST /practice-tasks - 201 Created
```
- Should return in < 1 second
- No error messages
- If user is unknown: Falls back to LNIRT or defaults (0.5, 60s)
- If user is known: Uses embedding model predictions

**Task Completion (Counter Increment):**
```
INFO: PATCH /practice-tasks/{id} - 200 OK
```
- Counter increments: 1/5, 2/5, 3/5, 4/5, 5/5
- Response returns immediately
- No blocking

**Training Trigger (At 5th Task):**
```
🔄 Training started in background: Background training started
🚀 Starting background training...
EMBEDDING MODEL AUTO-TRAINING TRIGGERED
New samples since last training: 5
Total samples: 679
Training embedding models with 679 samples...
Building models...
  Users: 4 (embedding: 32)
  Topics: 7 (embedding: 20)
Training sequences: 2034
Epoch 1/20: ...
Epoch 2/20: ...
...
✅ Background training complete
```

### Warning Signs

**⚠️ Prediction Errors:**
```
Embedding model prediction failed, falling back to LNIRT: 'some_error'
```
- If this happens frequently, check model files exist
- Verify metadata.json is valid
- Check backend logs for detailed errors

**❌ Training Failures:**
```
❌ Background training failed: <error>
```
- Check database connection
- Verify sufficient data (need 10+ samples)
- Check disk space for model saving

**⚠️ UI Freezing:**
```
# If UI freezes on task completion, check logs for:
Training correctness model... (running synchronously)
```
- Should NOT see synchronous training
- Should see "Background training started" instead
- If freezing occurs, async training may not be working

---

## Testing Procedures

### A. Quick System Test (5 minutes)

1. **Backend Health:**
   ```bash
   curl http://localhost:4008/
   ```

2. **Model Status:**
   ```bash
   cd /home/claudeuser/smartstudy/backend
   ./venv/bin/python test_via_db_only.py
   ```

3. **Check Counter:**
   - Note current counter value (e.g., 2/5)
   - Need to complete (5 - current) more tasks to trigger training

### B. UI Workflow Test (10-15 minutes)

**Goal:** Verify async training doesn't block UI

1. **Check Current Counter:**
   ```bash
   ./venv/bin/python test_via_db_only.py | grep "Counter:"
   # Output: Counter: X/5
   ```

2. **Start Real-Time Monitoring:**
   ```bash
   ./monitor_training.sh
   # Keep this terminal open
   ```

3. **Complete Tasks in UI:**
   - Go to `/dashboard/tasks`
   - Complete (5 - X) tasks
   - For each task:
     - Click correct/incorrect
     - Enter time
     - **Verify:** Response is immediate (< 1 second)
     - **Watch monitor:** Counter increments

4. **Verify Training Trigger:**
   - On 5th task completion:
     - UI should respond immediately
     - Monitor should show "🚀 Starting background training..."
     - Training runs in background (2-3 minutes)
     - UI remains responsive during training

5. **Verify Training Completion:**
   - Monitor shows: "✅ Background training complete"
   - Counter resets to 0/5
   - Models saved to disk

### C. Prediction Test (5 minutes)

**Test 1: Known User (in metadata)**
```bash
# Via UI: Create a new task for a user who has completed tasks before
# Expected: Personalized predictions (not 0.5, 60s)
```

**Test 2: Unknown User (not in metadata)**
```bash
# Via UI: Create a new task for a completely new user
# Expected: Default predictions (0.5, 60s) - graceful fallback
```

---

## Verification Checklist

Use this checklist after any changes or deployments:

- [ ] Backend running on port 4008
- [ ] API health check passes (`curl http://localhost:4008/`)
- [ ] Model files exist in `/backend/app/ml/models/`
- [ ] Metadata.json is valid JSON
- [ ] Tracker table exists in database
- [ ] Counter tracking works (increments on task completion)
- [ ] Predictions work for known users
- [ ] Predictions fallback gracefully for unknown users
- [ ] Task completion responds in < 1 second
- [ ] Training triggers at 5th task
- [ ] Training runs in background (async)
- [ ] UI remains responsive during training
- [ ] Training completes successfully
- [ ] Models save to disk
- [ ] Counter resets after training
- [ ] No error messages in logs
- [ ] Frontend pages load (dashboard, tasks, analytics, etc.)

---

## Troubleshooting

### Issue 1: "Embedding model prediction failed"

**Symptoms:**
```
Embedding model prediction failed, falling back to LNIRT: 'user_id_xyz'
```

**Cause:** User ID or topic not in trained model metadata

**Solution:**
- This is expected for new users
- Model gracefully falls back to defaults (0.5, 60s)
- After training with new user's data, predictions will be personalized

**Action:** No action needed if occasional. If frequent, verify training is occurring.

### Issue 2: UI Freezes on Task Completion

**Symptoms:**
- Click correct/incorrect on 5th task
- UI becomes unresponsive for 2-3 minutes
- Eventually responds

**Cause:** Training running synchronously instead of async

**Diagnosis:**
```bash
tail -f /tmp/backend.log
# Look for: Training without "Background training started" message
```

**Solution:**
1. Check `practice_tasks.py` line 213: `async_training=True`
2. Restart backend
3. Verify fix with test

### Issue 3: Models Not Found

**Symptoms:**
```
FileNotFoundError: [Errno 2] No such file or directory: 'backend/app/ml/models/correctness_model.keras'
```

**Cause:** Models not trained yet or saved to wrong location

**Solution:**
```bash
# Check if models exist
ls -lh /home/claudeuser/smartstudy/backend/app/ml/models/

# If not, check wrong location (old bug)
find /home/claudeuser/smartstudy/backend -name "*.keras"

# Force training (if enough data)
cd /home/claudeuser/smartstudy/backend
./venv/bin/python -c "
from dotenv import load_dotenv
import os
load_dotenv()
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.ml import EmbeddingModelService

engine = create_engine(os.getenv('DATABASE_URL'))
Session = sessionmaker(bind=engine)
db = Session()
service = EmbeddingModelService(db)
result = service.force_train(verbose=True)
print(result)
db.close()
"
```

### Issue 4: Training Not Triggering

**Symptoms:**
- Complete 5+ tasks
- No training message in logs
- Counter not resetting

**Diagnosis:**
```bash
./venv/bin/python test_via_db_only.py
# Check: Counter value and last training time
```

**Solution:**
1. Verify tracker table exists
2. Check counter increments on task completion
3. Manually reset counter if stuck:
   ```bash
   psql <DATABASE_URL> -c "UPDATE embedding_model_tracker SET n_samples_since_training = 4;"
   # Complete 1 more task to trigger
   ```

---

## Performance Metrics

### Expected Performance

| Operation | Expected Time | Notes |
|-----------|--------------|-------|
| Task creation (prediction) | < 1 second | Includes model inference |
| Task completion (non-training) | < 0.5 seconds | Just DB update |
| Task completion (training trigger) | < 1 second | Starts background, returns immediately |
| Background training | 2-3 minutes | Non-blocking, user can continue |
| Model loading on startup | < 5 seconds | Loads pre-trained models |

### Training Metrics (From Logs)

**Correctness Model:**
- Typical accuracy: 60-70%
- Training time: ~8-11 seconds/epoch
- Total epochs: 20 (with early stopping)
- Total time: ~160-220 seconds

**Time Model:**
- Metric: MAE (Mean Absolute Error)
- Training time: ~8-11 seconds/epoch
- Total epochs: 20 (with early stopping)
- Total time: ~160-220 seconds

**Overall Training:**
- Total time: ~320-440 seconds (5-7 minutes)
- Runs in background: ✅
- Blocks UI: ❌ (should NOT block)

---

## Advanced Monitoring

### Database Queries

**Check Training History:**
```sql
SELECT
    last_trained_at,
    n_samples_last_training,
    n_samples_since_training,
    model_version
FROM embedding_model_tracker;
```

**Check Recent Completed Tasks:**
```sql
SELECT
    user_id,
    topic,
    difficulty,
    is_correct,
    actual_time_seconds,
    created_at
FROM practice_tasks
WHERE completed = TRUE
ORDER BY created_at DESC
LIMIT 10;
```

**Count Tasks Per User:**
```sql
SELECT
    user_id,
    COUNT(*) as task_count
FROM practice_tasks
WHERE completed = TRUE
GROUP BY user_id
ORDER BY task_count DESC;
```

### Log Analysis

**Count Predictions:**
```bash
grep -c "POST /practice-tasks" /tmp/backend.log
```

**Count Training Triggers:**
```bash
grep -c "Background training started" /tmp/backend.log
```

**Find Errors:**
```bash
grep -E "ERROR|Exception|failed" /tmp/backend.log
```

---

## Maintenance

### Regular Tasks

**Daily:**
- Check backend logs for errors: `grep ERROR /tmp/backend.log`
- Verify backend is running: `curl http://localhost:4008/`

**Weekly:**
- Check training frequency: Should train every ~5 completed tasks
- Verify model file sizes haven't grown excessively
- Check database size growth

**Monthly:**
- Review model performance metrics
- Consider hyperparameter tuning if accuracy is low
- Archive old logs: `gzip /tmp/backend.log.old`

### Backup

**Important Files to Backup:**
```bash
# Models (auto-regenerate from data, but backup for quick recovery)
/home/claudeuser/smartstudy/backend/app/ml/models/*.keras
/home/claudeuser/smartstudy/backend/app/ml/models/metadata.json

# Database (contains training data)
# Use PostgreSQL pg_dump

# Code (already in git)
git push origin main
```

---

## Summary

**System is Working Correctly When:**
1. ✅ Backend responds to health check
2. ✅ Task creation returns predictions in < 1 second
3. ✅ Task completion returns in < 1 second (even on 5th task)
4. ✅ Training triggers every 5 tasks
5. ✅ Training runs in background
6. ✅ UI remains responsive during training
7. ✅ No errors in logs
8. ✅ Models save successfully
9. ✅ Counter resets after training
10. ✅ Frontend pages load without errors

**Key Success Indicator:**
**The UI should NEVER freeze, even when training is triggered.**

---

For detailed implementation documentation, see: `EMBEDDING_MODEL_IMPLEMENTATION.md`

For real-time monitoring, run: `./backend/monitor_training.sh`
