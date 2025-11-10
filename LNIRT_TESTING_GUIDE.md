# LNIRT Testing & Deployment Guide

**Status:** Ready for Testing ✅
**Date:** November 10, 2024

---

## Pre-Flight Checklist

### Backend Status
- ✅ Database migration applied
- ✅ LNIRT models copied to backend
- ✅ API endpoints created and registered
- ✅ Practice tasks router updated
- ✅ Automatic training implemented
- ✅ Training data loaded (150 records)
- ✅ Backend server running

### Frontend Status
- ✅ UI updated to display predictions
- ✅ TypeScript interfaces updated
- ✅ Task state management updated
- ✅ Styling matches existing design

---

## Step 1: Initial Setup (One-Time)

### 1.1 Train General Model

```bash
# Get authentication token first
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "yourpassword"}'

# Save the access_token from response
export TOKEN="eyJhbGc..."

# Train general model for calculus
curl -X POST "http://localhost:8000/lnirt/train/general/calculus" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "topic": "calculus",
  "result": {
    "status": "success",
    "n_samples": 150,
    "n_users": 5,
    "topic": "calculus"
  },
  "status": "success"
}
```

### 1.2 Verify Model Training

```bash
curl "http://localhost:8000/lnirt/model/stats/calculus" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "topic": "calculus",
  "stats": {
    "model_version": "v1.0",
    "n_users": 5,
    "n_training_samples": 150,
    "last_trained_at": "2024-11-10T...",
    "difficulty_params": {
      "1": {"a": 0.5, "b": -0.5, "beta": 3.5},
      "2": {"a": 1.2, "b": 0.0, "beta": 4.0},
      "3": {"a": 1.5, "b": 0.8, "beta": 4.5}
    }
  },
  "status": "success"
}
```

---

## Step 2: Test New User Workflow

### 2.1 Create Test User (if needed)

Use the signup page or create via API.

### 2.2 Login to Web App

1. Navigate to https://sshours.cfd (or localhost:3000)
2. Login with test credentials
3. Navigate to Study Timer page

### 2.3 Generate First Task

1. Select subject (e.g., "Calculus")
2. Enter topic (e.g., "derivatives")
3. Select difficulty (e.g., "Medium")
4. Click "Generate Task"

**Expected Behavior:**
- Task generates normally
- Blue info box appears below task header
- Shows: "LNIRT ML Predictions:"
- Success: ~30-35% (population average for new user)
- Time: ~120s (2m 0s)

**Backend Log Check:**
```bash
tail -f /tmp/backend.log | grep "LNIRT"
```

Should see:
- LNIRT prediction made
- Using population average (no user parameters yet)

### 2.4 Complete First Task

1. Read and solve the task
2. Click ✓ (checkmark) for correct, or ✗ for incorrect
3. Record actual time taken

**Expected Behavior:**
- Task marked as complete
- **Automatic training triggers** (check backend logs)
- Next task generates

**Backend Log Check:**
```bash
# Should see auto-training output
tail -20 /tmp/backend.log
```

Expected log entries:
```
Auto-training completed: {
  'status': 'success',
  'n_samples': 1,
  'user_id': '...',
  'topic': 'calculus',
  'theta': 2.5,
  'tau': 0.3
}
```

### 2.5 Generate Second Task

1. Same topic and difficulty
2. Click "Generate Task"

**Expected Behavior:**
- Blue info box shows DIFFERENT predictions:
- Success: ~70-80% (personalized!)
- Time: ~75-90s
- **HUGE improvement from first prediction!**

This proves personalization is working!

---

## Step 3: Test Prediction Improvement

### 3.1 Complete Multiple Tasks

Complete 5-10 tasks for the same topic and difficulty:

| Task | Predicted Success | Actual Result | Predicted Time | Actual Time |
|------|------------------|---------------|----------------|-------------|
| 1    | 32%              | ✓            | 122s           | 95s         |
| 2    | 78%              | ✓            | 77s            | 82s         |
| 3    | 79%              | ✓            | 76s            | 79s         |
| 4    | 80%              | ✓            | 75s            | 74s         |
| 5    | 81%              | ✓            | 74s            | 73s         |

**Expected Pattern:**
- Predictions converge to actual performance
- Success probability stabilizes around user's true ability
- Time predictions become more accurate
- Error decreases with each task

### 3.2 Verify Parameter Convergence

```bash
curl "http://localhost:8000/lnirt/user/parameters/calculus" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "topic": "calculus",
  "parameters": {
    "user_id": "...",
    "topic": "calculus",
    "theta": 2.456,
    "tau": 0.234,
    "is_personalized": true
  },
  "status": "success"
}
```

**Parameters should:**
- Be different from population average
- Reflect actual performance
- Stabilize after 5-10 tasks

---

## Step 4: Test Different Scenarios

### Scenario A: Different Difficulties

1. Complete easy tasks (difficulty: easy)
   - Expect: Higher success %, lower time
2. Complete hard tasks (difficulty: hard)
   - Expect: Lower success %, higher time

### Scenario B: Different Topics

1. Switch to "algebra" topic
   - Should use population average (no personalization for new topic)
2. Complete several algebra tasks
   - Should personalize for algebra specifically

### Scenario C: Poor Performance

1. Intentionally mark tasks as incorrect
   - Success predictions should decrease
2. Take longer than predicted
   - Time predictions should increase

---

## Step 5: Database Verification

### 5.1 Check Predictions Are Stored

```sql
SELECT
  id,
  user_id,
  topic,
  difficulty,
  predicted_correct,
  predicted_time_seconds,
  actual_correct,
  actual_time_seconds,
  is_correct,
  completed,
  created_at
FROM practice_tasks
WHERE user_id = 'YOUR_USER_ID'
  AND predicted_correct IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

**Verify:**
- predicted_correct values present (0.0 to 1.0)
- predicted_time_seconds present
- actual values filled in after completion

### 5.2 Check Training Data

```sql
SELECT
  topic,
  difficulty,
  correct,
  response_time_seconds,
  used_for_general_training,
  created_at
FROM lnirt_training_data
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;
```

**Verify:**
- Records created when tasks completed
- Matches practice_tasks data
- used_for_general_training = false initially

### 5.3 Check Trained Models

```sql
SELECT
  topic,
  model_version,
  n_users,
  n_training_samples,
  last_trained_at,
  (user_params->'YOUR_USER_ID')::jsonb as my_parameters
FROM lnirt_models
WHERE topic = 'calculus';
```

**Verify:**
- Model exists for calculus
- Your user_id appears in user_params
- last_trained_at updates when you complete tasks

---

## Step 6: Error Testing

### Test 1: No Model Trained

Before training general model, try to make prediction:
- Should fall back to default parameters
- Should not crash

### Test 2: Invalid Difficulty

Try API call with invalid difficulty:
```bash
curl -X POST "http://localhost:8000/lnirt/predict?topic=calculus&difficulty=invalid" \
  -H "Authorization: Bearer $TOKEN"
```

Should return error gracefully.

### Test 3: New Topic (No Training Data)

Generate task for topic with no training data:
- Should use default parameters
- Should not crash
- Predictions will be less accurate (expected)

---

## Step 7: Performance Testing

### Frontend Performance

1. Generate 10 tasks in quick succession
   - Should not lag
   - Predictions should appear quickly

2. Check network tab:
   - POST /practice-tasks should complete < 500ms
   - Should see predicted values in response

### Backend Performance

```bash
# Monitor backend logs
tail -f /tmp/backend.log | grep -E "(predict|train)"

# Time API calls
time curl -X POST "http://localhost:8000/lnirt/predict?topic=calculus&difficulty=medium" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:**
- Predictions: < 100ms
- User-specific training: < 1s
- General training: < 5s

---

## Troubleshooting

### Problem: Predictions Not Showing in UI

**Checklist:**
1. Check browser console for errors
2. Verify API response includes predicted_correct
3. Check TypeScript compilation errors
4. Rebuild frontend: `npm run build`

**Debug:**
```javascript
// In browser console
console.log(currentTask);
// Should show predicted_correct and predicted_time_seconds
```

### Problem: Auto-Training Not Working

**Checklist:**
1. Check backend logs: `tail -f /tmp/backend.log`
2. Verify trigger fired: Check database
3. Ensure task marked with is_correct AND actual_time_seconds

**Debug SQL:**
```sql
-- Check if trigger exists
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'trigger_sync_to_training_data';

-- Check training data was created
SELECT * FROM lnirt_training_data
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;
```

### Problem: Predictions Are Always the Same

**Possible Causes:**
1. General model not trained
2. User parameters not updating
3. Same difficulty being used

**Fix:**
```bash
# Retrain general model
curl -X POST "http://localhost:8000/lnirt/train/general/calculus" \
  -H "Authorization: Bearer $TOKEN"

# Check user parameters
curl "http://localhost:8000/lnirt/user/parameters/calculus" \
  -H "Authorization: Bearer $TOKEN"
```

### Problem: Backend Errors

**Check logs:**
```bash
tail -100 /tmp/backend.log | grep ERROR
```

**Common issues:**
1. Database connection error → Check DATABASE_URL
2. Import error → Activate venv: `source venv/bin/activate`
3. Missing scipy → Install: `pip install scipy`

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Backend logs show no errors
- [ ] Frontend compiles without errors
- [ ] Database migration applied to production DB
- [ ] Training data loaded for main topics
- [ ] General models trained

### Deployment Steps

1. **Database Migration:**
   ```bash
   psql $DATABASE_URL < migrations/001_add_lnirt_support.sql
   ```

2. **Load Training Data:**
   ```bash
   python3 backend/load_training_data.py
   ```

3. **Train Models:**
   ```bash
   # For each topic
   curl -X POST "https://api.sshours.cfd/lnirt/train/general/calculus"
   curl -X POST "https://api.sshours.cfd/lnirt/train/general/algebra"
   # etc.
   ```

4. **Deploy Backend:**
   ```bash
   # Restart backend service
   systemctl restart smartstudy-backend
   ```

5. **Deploy Frontend:**
   ```bash
   npm run build
   # Deploy to production
   ```

6. **Verify:**
   - Check health endpoint
   - Make test prediction
   - Complete test task
   - Verify auto-training

### Post-Deployment

- [ ] Monitor error logs
- [ ] Track prediction accuracy
- [ ] Monitor training performance
- [ ] Collect user feedback

---

## Monitoring

### Key Metrics to Track

1. **Prediction Accuracy:**
   ```sql
   SELECT
     topic,
     difficulty,
     AVG(ABS(predicted_correct - actual_correct)) as avg_error_correctness,
     AVG(ABS(predicted_time_seconds - actual_time_seconds)) as avg_error_time,
     COUNT(*) as n_predictions
   FROM practice_tasks
   WHERE predicted_correct IS NOT NULL
     AND actual_correct IS NOT NULL
   GROUP BY topic, difficulty;
   ```

2. **Model Usage:**
   ```sql
   SELECT
     topic,
     COUNT(DISTINCT user_id) as users_with_predictions,
     COUNT(*) as total_predictions
   FROM practice_tasks
   WHERE predicted_correct IS NOT NULL
   GROUP BY topic;
   ```

3. **Training Statistics:**
   ```sql
   SELECT
     topic,
     n_users,
     n_training_samples,
     last_trained_at
   FROM lnirt_models
   ORDER BY last_trained_at DESC;
   ```

---

## Success Criteria

✅ **Backend:**
- [ ] Predictions generated for all tasks
- [ ] Auto-training triggers on completion
- [ ] Parameters personalize after 1st task
- [ ] Predictions improve over time
- [ ] No errors in production logs

✅ **Frontend:**
- [ ] Predictions display correctly
- [ ] UI matches design
- [ ] No console errors
- [ ] Performance acceptable

✅ **User Experience:**
- [ ] Predictions help users plan time
- [ ] Personalization is noticeable
- [ ] System feels "smart"
- [ ] No confusion about predictions

---

## Next Steps

After successful testing:

1. **Gather Feedback:** Ask users if predictions are helpful
2. **Monitor Accuracy:** Track prediction vs actual over time
3. **Expand Topics:** Add training data for more subjects
4. **Improve Model:** Fine-tune parameters based on data
5. **Add Features:**
   - Show prediction confidence
   - Explain why prediction changed
   - Show progress over time
   - Leaderboards/achievements

---

## Support

For issues during testing:

1. **Check Logs:**
   - Backend: `tail -f /tmp/backend.log`
   - Frontend: Browser console
   - Database: Query tables directly

2. **Reference Documentation:**
   - `LNIRT_INTEGRATION_SUMMARY.md` - Implementation details
   - `CLI_GUIDE.md` (in ml_lnirt_playground) - CLI testing

3. **Contact:**
   - Check GitHub issues
   - Review commit history
   - Consult LNIRT research papers

---

**Happy Testing! 🎉**

The system is ready for real-world usage. All core features are implemented and tested locally.
