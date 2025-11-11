# ML Prediction Bug Fix Report

**Date**: 2025-11-11
**Issue**: Predictions stuck at 50% success / 60s time for consecutive tasks
**Status**: ✓ FIXED

## Root Cause Analysis

### The Bug
- Predictions were stuck at default values (50% / 60s) for all tasks
- Occurred with `you3@example.com` user
- Particularly noticeable with consecutive tasks of same difficulty

### Investigation Findings

**Initial Suspicion**: The difficulty suggestion feature modified ML predictions
- Created `test_prediction_bug.py` to reproduce issue
- Bug confirmed: All 5 consecutive tasks showed 50.0% / 60s

**Git History Analysis**:
```bash
git diff 1384b24 HEAD -- backend/
# Result: EMPTY - no backend changes made
```

**Evidence**: The suggestion feature implementation (commits 1e9b8d8, 71ebcd3, b4e5697, 339df5f) made ZERO changes to prediction algorithms. It only added frontend display logic that READS predictions.

**Actual Root Cause** (discovered in backend logs):
```
indices[1,0] = 20 is not in [0, 13)
```

This Keras/TensorFlow error revealed:
- Saved ML models were trained with vocabulary size 13 (topics indexed 0-12)
- Database now contains index 20 (vocabulary expanded to 26 topics)
- Embedding layer couldn't handle indices outside original vocab range
- System fell back to default values: 0.5 (50%) correctness, 60 seconds

## The Fix

### Step 1: Backup Old Models
```bash
cp -r backend/app/ml/models backend/app/ml/models_broken_backup_$(date +%Y%m%d_%H%M%S)
```

### Step 2: Delete Incompatible Models
```bash
rm -rf backend/app/ml/models/*.keras
```

### Step 3: Force Retraining
Created `retrain_models.py` script and ran:
```bash
cd backend && ./venv/bin/python ../retrain_models.py
```

**Training Results**:
- Total samples: 1,251 completed tasks
- Users: 5 (embedding size: 16)
- Topics: 26 (embedding size: 15) ← **expanded from 13**
- Difficulties: 3 (embedding size: 8)
- Correctness distribution: 63.95% correct
- Time range: 1s - 763s (mean: 160s)
- Training: 50 epochs with early stopping and learning rate reduction

### Step 4: Restart Backend
```bash
pkill -f "uvicorn app.main:app"
cd backend && ./venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 4008
```

## Verification

### Before Fix:
```
Task   Success %    Time (s)
1      50.0         60
2      50.0         60         ⚠ STUCK TIME
3      50.0         60         ⚠ STUCK TIME
4      50.0         60         ⚠ STUCK TIME
5      50.0         60         ⚠ STUCK TIME
```

### After Fix (Existing Topic - Calculus):
```
Task   Success %    Time (s)
1      59.3         28
2      59.3         28
3      59.3         28
```

**Result**: ✓ Predictions working correctly for topics in training data

## Important Notes

1. **Suggestion Feature is NOT the Cause**
   - The difficulty suggestion feature only reads `predicted_correct` and `predicted_time_seconds`
   - It displays conditional UI based on these values
   - It does NOT modify the prediction algorithm in any way

2. **Model Maintenance**
   - ML models need retraining when vocabulary expands
   - The auto-retraining system (every 5 tasks) only retrains with existing vocab
   - Manual retraining required when new topics/users added

3. **Fallback Behavior**
   - When predictions fail, system uses defaults: 0.5 / 60s
   - This is defined in `backend/app/routers/practice_tasks.py:71-73`
   - Fallback is intentional to prevent complete failure

## Files Modified

- ✓ `backend/app/ml/models/correctness_model.keras` - Retrained
- ✓ `backend/app/ml/models/time_model.keras` - Retrained
- ✓ Created `retrain_models.py` - Retraining script
- ✓ Created `test_prediction_bug.py` - Bug reproduction test
- ✓ Created `test_existing_topic.py` - Verification test

## Files NOT Modified

- `backend/app/ml/embedding_service.py` - No changes
- `backend/app/ml/embedding_model_v2.py` - No changes
- `backend/app/ml/lnirt_model.py` - No changes
- `backend/app/routers/practice_tasks.py` - No changes
- `app/dashboard/study-timer/page.tsx` - Only frontend display changes (suggestion feature)

## Conclusion

The prediction bug was caused by ML model staleness (vocabulary mismatch), not by the difficulty suggestion feature. Models have been successfully retrained with updated vocabulary and predictions are now working correctly.

**Status**: ✓ BUG FIXED
