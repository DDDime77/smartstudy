# Prediction Backwards Issue - Analysis & Solution

**Date**: 2025-11-10
**Status**: 🔴 CRITICAL ISSUE IDENTIFIED
**Severity**: HIGH - Model adapts in wrong direction

---

## Issue Summary

When user completes tasks CORRECTLY:
- ❌ **Current behavior**: Predictions DROP (84% → 57%)
- ✅ **Expected behavior**: Predictions should RISE

When user completes tasks INCORRECTLY:
- ❌ **Current behavior**: Predictions RISE
- ✅ **Expected behavior**: Predictions should DROP

**Conclusion**: Model is adapting BACKWARDS!

---

## Root Cause Analysis

### Observed Pattern (Bulk User - Calculus Medium)

| Task | Actual Result | Predicted Next | Direction |
|------|--------------|----------------|-----------|
| #10 | ✓ Correct (13s) | 84.3% | baseline |
| #9 | ✗ Incorrect (10s) | 83.2% | ↓ (should ↑) |
| #8 | ✗ Incorrect (6s) | 83.8% | ↑ (correct!) |
| #7 | ✓ Correct (3s) | 84.3% | ↑ (should stay/↑) |
| #6 | ✓ Correct (2s) | 83.6% | ↓ (WRONG!) |
| #5 | ✓ Correct (3s) | 82.4% | ↓ (WRONG!) |
| #4 | ✓ Correct (2s) | 64.2% | ↓↓ (VERY WRONG!) |
| #3 | ✓ Correct (4s) | 58.8% | ↓ (WRONG!) |
| #2 | ✓ Correct (18s) | 56.1% | ↓ (WRONG!) |
| #1 | ✓ Correct (1s) | 57.2% | ↑ (correct) |

**Pattern**: User gets 7 correct tasks in a row → Predictions drop from 84% to 56%

---

## Why This Happens

### Theory 1: Spurious Correlation in Training Data

The model learned BACKWARDS correlations from training data:

```
Training data pattern:
- Users early in their journey: Few tasks, HIGH success (they're starting easy)
- Same users later: Many tasks, LOWER success (tasks got harder)

Model learns:
"More completed tasks → Lower success rate"
```

This is **Simpson's Paradox** - the model confuses:
- Task COUNT (increases over time)
- Task DIFFICULTY (also increases over time)

### Theory 2: Feature Normalization Issues

```python
# Current normalization
'topic_task_count': float(len(topic_tasks)) / 20.0

# As user completes more tasks
# Task #5: topic_task_count = 5/20 = 0.25
# Task #10: topic_task_count = 10/20 = 0.50

# Model might learn:
# "Higher task_count → User is experienced → Tasks are now harder → Lower success"
```

### Theory 3: Model Architecture Issue

The neural network learned:
- **Embedding weights** that associate "more history" with "lower success"
- **Dense layer weights** that combine features incorrectly

---

## Proposed Solutions

### Solution 1: Feature Engineering Fix (IMMEDIATE)

Change features to capture **improvement** not just **history**:

```python
# CURRENT (problematic)
features = {
    'topic_success_rate': 0.85,  # Average success
    'topic_task_count': 0.50,    # Total tasks / 20
}

# PROPOSED (better)
features = {
    'topic_success_rate': 0.85,  # Average success (keep)
    'recent_improvement': +0.15,  # Last 5 vs previous 5
    'success_trend': +0.05,       # Linear trend over time
    'task_count_normalized': 0.50,  # Total tasks / 20 (keep)
}
```

### Solution 2: Separate Global vs Personal Models

```
┌──────────────────────────────────────┐
│  GLOBAL MODEL (trained on all users) │
│  - Learns: topic difficulty          │
│  - Learns: general patterns          │
│  - Input: topic, difficulty only     │
│  - Output: baseline prediction       │
└──────────────────────────────────────┘
           ↓
┌──────────────────────────────────────┐
│  PERSONAL ADJUSTMENT (per-user)      │
│  - Learns: user skill level          │
│  - Learns: user improvement          │
│  - Input: user history features      │
│  - Output: +/- adjustment to baseline│
└──────────────────────────────────────┘
           ↓
   Final Prediction = Baseline + Adjustment
```

### Solution 3: Explicit Residual Learning

Train model to predict **CHANGE** not absolute values:

```python
# Current: Predict absolute value
prediction = model.predict(features)  # → 0.85

# Better: Predict change from baseline
baseline = 0.5  # Default for new users
delta = model.predict(features)  # → +0.35
prediction = baseline + delta  # → 0.85

# With recent success:
delta = +0.40  # Adjustment increases
prediction = 0.5 + 0.40 = 0.90  # ✓ Adapted correctly!
```

### Solution 4: Retrain with Synthetic Improvement Data

Add synthetic training samples that show clear improvement patterns:

```python
# User improves over time
samples = [
    {'task': 1, 'correct': 0.5, 'time': 90},   # Baseline
    {'task': 2, 'correct': 0.6, 'time': 80},   # Improving
    {'task': 3, 'correct': 0.7, 'time': 70},   # Improving
    {'task': 4, 'correct': 0.8, 'time': 60},   # Improving
    {'task': 5, 'correct': 0.9, 'time': 50},   # Improving
]
```

---

## Recommended Fix (Hybrid Approach)

### Phase 1: Quick Fix - Feature Engineering

1. **Add improvement features**:
   ```python
   def _compute_improvement_features(self, history, topic, difficulty):
       recent_5 = history[-5:]
       previous_5 = history[-10:-5] if len(history) >= 10 else []

       if previous_5:
           recent_success = mean([t['correct'] for t in recent_5])
           previous_success = mean([t['correct'] for t in previous_5])
           improvement = recent_success - previous_success
       else:
           improvement = 0.0

       return {
           'success_improvement': improvement,  # -1 to +1
           'time_improvement': previous_time - recent_time,
       }
   ```

2. **Cap task_count feature**:
   ```python
   # Prevent "more tasks = worse" correlation
   'topic_task_count': min(1.0, float(len(topic_tasks)) / 20.0)
   ```

3. **Add recency weighting**:
   ```python
   # Weight recent tasks more heavily
   def weighted_success_rate(tasks):
       weights = np.exp(np.linspace(-1, 0, len(tasks)))  # Exponential decay
       return np.average([t['correct'] for t in tasks], weights=weights)
   ```

### Phase 2: Model Architecture Change

1. **Two-stage prediction**:
   ```python
   # Stage 1: Topic difficulty baseline
   baseline_correct = topic_embedding → Dense → 0.65
   baseline_time = topic_embedding → Dense → 60.0

   # Stage 2: User personalization
   adjustment_correct = history_features → Dense → +0.15
   adjustment_time = history_features → Dense → -10.0

   # Final
   final_correct = baseline_correct + adjustment_correct
   final_time = baseline_time + adjustment_time
   ```

2. **Explicit constraints**:
   ```python
   # Force correct direction
   if recent_success_rate > overall_success_rate:
       adjustment = max(0, adjustment)  # Can only increase
   else:
       adjustment = min(0, adjustment)  # Can only decrease
   ```

### Phase 3: Retrain with Better Data

1. Add synthetic improvement samples
2. Balance dataset to avoid spurious correlations
3. Use cross-validation to verify correct adaptation

---

## Implementation Plan

### Step 1: Add Improvement Features (30 minutes)

**File**: `app/ml/embedding_model_v2.py`

```python
def _compute_user_history_features(self, data, user_id, topic, difficulty):
    # ... existing code ...

    # NEW: Compute improvement features
    recent_tasks = user_tasks[-5:]
    previous_tasks = user_tasks[-10:-5] if len(user_tasks) >= 10 else []

    if previous_tasks and recent_tasks:
        recent_success = np.mean([t['correct'] for t in recent_tasks])
        previous_success = np.mean([t['correct'] for t in previous_tasks])
        success_improvement = recent_success - previous_success

        recent_time = np.mean([t['actual_time'] for t in recent_tasks])
        previous_time = np.mean([t['actual_time'] for t in previous_tasks])
        time_improvement = (previous_time - recent_time) / 100.0  # Normalized
    else:
        success_improvement = 0.0
        time_improvement = 0.0

    return {
        # ... existing features ...
        'success_improvement': float(success_improvement),  # NEW
        'time_improvement': float(time_improvement),        # NEW
    }
```

### Step 2: Update Model Architecture (15 minutes)

Change from 11 history features to 13:

```python
history_input = Input(shape=(13,), dtype=tf.float32, name='history_features')
```

### Step 3: Retrain Model (5 minutes)

```bash
cd /home/claudeuser/smartstudy/backend
./venv/bin/python reset_models_and_retrain.py
```

### Step 4: Test Adaptation (10 minutes)

```bash
./venv/bin/python test_prediction_diversity.py
```

---

## Expected Outcome

### Before Fix

```
User completes 5 correct Calculus tasks:
├─ Task 1: Predict 80% → Actual: Correct
├─ Task 2: Predict 78% → Actual: Correct  ❌ Dropped!
├─ Task 3: Predict 75% → Actual: Correct  ❌ Dropped!
├─ Task 4: Predict 70% → Actual: Correct  ❌ Dropped!
└─ Task 5: Predict 65% → Actual: Correct  ❌ Dropped!
```

### After Fix

```
User completes 5 correct Calculus tasks:
├─ Task 1: Predict 80% → Actual: Correct
├─ Task 2: Predict 82% → Actual: Correct  ✓ Increased!
├─ Task 3: Predict 84% → Actual: Correct  ✓ Increased!
├─ Task 4: Predict 85% → Actual: Correct  ✓ Increased!
└─ Task 5: Predict 87% → Actual: Correct  ✓ Increased!

success_improvement = +0.15 (recent vs previous)
→ Model sees positive improvement
→ Predicts HIGHER success
```

---

## Alternative: Simple Rule-Based Adjustment

If ML fix is too complex, use simple rules:

```python
def adjust_prediction_based_on_trend(base_prediction, history):
    """Simple rule-based adjustment"""

    if len(history) < 3:
        return base_prediction  # Not enough data

    # Check recent trend
    recent_3 = history[-3:]
    success_rate = mean([t['correct'] for t in recent_3])

    # Adjust based on recent performance
    if success_rate > 0.8:
        # Doing well → boost by 10%
        return min(0.95, base_prediction * 1.1)
    elif success_rate < 0.4:
        # Struggling → reduce by 10%
        return max(0.1, base_prediction * 0.9)
    else:
        return base_prediction
```

---

## Testing Checklist

After implementing fix:

- [ ] Generate Calculus easy task → Complete correctly → Next prediction INCREASES
- [ ] Generate Calculus easy task → Complete incorrectly → Next prediction DECREASES
- [ ] Complete 5 correct tasks → Prediction should trend UP
- [ ] Complete 5 incorrect tasks → Prediction should trend DOWN
- [ ] Mix correct/incorrect → Prediction should stabilize
- [ ] New topic (no history) → Should use defaults
- [ ] After training → All users benefit from patterns

---

## Conclusion

The model is currently learning SPURIOUS CORRELATIONS from the training data. The fix requires:

1. **Immediate**: Add improvement features to capture user progress
2. **Short-term**: Retrain model with better feature engineering
3. **Long-term**: Consider two-stage model (baseline + adjustment)

**This is a common ML pitfall and is fixable!**

---

**Status**: Ready to implement
**Estimated time**: 1 hour
**Risk**: Low (backwards compatibility maintained)
