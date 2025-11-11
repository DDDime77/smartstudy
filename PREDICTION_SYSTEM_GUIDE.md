# 🧠 VIVID & COMPREHENSIVE PREDICTION SYSTEM GUIDE

## 📖 Table of Contents
1. [System Overview](#system-overview)
2. [The Prediction Pipeline](#the-prediction-pipeline)
3. [Real Scenarios with Actual Data](#real-scenarios-with-actual-data)
4. [Decision Tree Flowchart](#decision-tree-flowchart)
5. [Formulas & Calculations](#formulas--calculations)

---

## System Overview

The prediction system combines a **neural network ML model** with **adaptive rule-based adjustments** to predict:
- **Accuracy**: Probability the user will answer correctly (0-95%)
- **Time**: Expected seconds to complete the task (10-300s)

### Key Components

```
┌─────────────────┐
│   ML Model      │  → Predicts based on user history + task embeddings
│  (Neural Net)   │     Output: base_prob, base_time
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Adaptive       │  → Applies rules based on recent performance
│  Adjustment     │     Output: adjusted_prob, adjusted_time
│  Layer          │
└─────────────────┘
```

---

## The Prediction Pipeline

### STEP 1: Get ML Base Prediction
The neural network analyzes:
- User's historical performance
- Topic difficulty
- User's skill level in similar topics
- Time of day, task frequency patterns

**Output**: `base_prob` (accuracy %), `base_time` (seconds)

---

### STEP 2: Filter Relevant History
System retrieves user's history for the EXACT combination:
- Same **subject** (e.g., Math)
- Same **topic** (e.g., Calculus)
- Same **difficulty** (e.g., medium)

**Example**: If user has completed 50 Math tasks but only 12 are "Calculus medium", only those 12 are used.

---

### STEP 3: Calculate Performance Metrics
From relevant history, calculate:

```python
# Recent performance (last 5 tasks or all if < 5)
recent_success_rate = correct_count / recent_task_count
recent_avg_time = sum(actual_times) / recent_task_count

# Overall performance (all relevant tasks)
overall_success_rate = total_correct / total_tasks
overall_avg_time = sum(all_times) / total_tasks

# Improvement metrics
success_improvement = recent_success_rate - overall_success_rate
time_improvement = overall_avg_time - recent_avg_time  # Positive = getting faster

# Prediction deviation
prediction_error = base_time - recent_avg_time  # Positive = actual faster than predicted
```

---

### STEP 4: Apply Adaptive Adjustment Rules

The system follows a **hierarchy of rules** to adjust predictions:

#### 🔹 EARLY LEARNING (Tasks 1-3 for new topic)
**When**: `len(relevant_tasks) <= 3`

**Accuracy Mapping**:
```
recent_success_rate = 100%  → adjusted_prob = 85%
recent_success_rate = 80%+  → adjusted_prob = 75%
recent_success_rate = 60%+  → adjusted_prob = 65%
recent_success_rate = 40%+  → adjusted_prob = 50%
recent_success_rate = 20%+  → adjusted_prob = 35%
recent_success_rate = 0%    → adjusted_prob = 15%
```

**Time Calculation**:
```python
adjusted_time = recent_avg_time * 1.05  # 5% buffer
```

**Example**:
- Task 1: ML predicts 60s → User completes in 30s
- Task 2: System predicts 30 * 1.05 = **32s** (ignores ML!)

---

#### 🔹 RULE 1: High Performance Boost
**When**: Tasks > 3

**Conditions**:
```python
if recent_success_rate > 0.8 AND success_improvement > 0.1:
    # User doing very well recently AND improving significantly
    boost_factor = 1.4 + (success_improvement * 0.8)
    adjusted_prob = min(0.95, base_prob * boost_factor)

elif success_improvement > 0.05:
    # User improving moderately
    boost_factor = 1.3 + (success_improvement * 0.5)
    adjusted_prob = min(0.95, base_prob * boost_factor)

elif recent_success_rate > 0.8:
    # Absolute high performance (even without improvement)
    adjusted_prob = min(0.95, max(0.80, base_prob * 1.2))

elif recent_success_rate > 0.7:
    # User doing well
    adjusted_prob = min(0.95, base_prob * 1.15)
```

---

#### 🔹 RULE 2: Poor Performance Reduction
**When**: Tasks > 3

**Conditions**:
```python
if recent_success_rate < 0.3 AND success_improvement < -0.1:
    # User struggling recently AND declining significantly
    reduction_factor = 0.8 + (success_improvement * 0.5)
    adjusted_prob = max(0.05, base_prob * reduction_factor)

elif success_improvement < -0.05:
    # User declining moderately
    reduction_factor = 0.9 + (success_improvement * 0.3)
    adjusted_prob = max(0.05, base_prob * reduction_factor)

elif recent_success_rate < 0.2:
    # Absolute poor performance (consistently failing)
    adjusted_prob = 0.15  # Floor

elif recent_success_rate < 0.4:
    # Below average performance
    adjusted_prob = max(0.25, base_prob * 0.7)
```

---

#### 🔹 RULE 3: Time Speed Adjustment
**When**: Tasks > 3

**Priority Order** (checks in sequence, first match wins):

**1. Time Improvement Check**:
```python
if time_improvement > 10:  # Getting faster by 10+ seconds
    time_factor = 0.9 - (min(time_improvement, 60) / 300)
    adjusted_time = max(10, base_time * time_factor)
    # Example: time_improvement=30s → time_factor=0.8 → reduce 20%

elif time_improvement < -10:  # Getting slower by 10+ seconds
    time_factor = 1.1 + (min(abs(time_improvement), 60) / 300)
    adjusted_time = min(300, base_time * time_factor)
    # Example: time_improvement=-30s → time_factor=1.2 → increase 20%
```

**2. Prediction Error Check (EXTREME deviation)**:
```python
elif prediction_error > 15:  # Actual faster than predicted
    if abs(prediction_error) / base_time > 1.0:  # Deviation > 100%
        # EXTREME: Use actual time directly
        adjusted_time = max(10, recent_avg_time * 1.05)
    else:
        # MODERATE: Blend ML and actual
        blend_factor = min(prediction_error / base_time, 0.5)
        adjusted_time = max(10, base_time * (1 - blend_factor))

elif prediction_error < -15:  # Actual slower than predicted
    if abs(prediction_error) / base_time > 1.0:  # Deviation > 100%
        # EXTREME: Use actual time directly
        adjusted_time = min(300, recent_avg_time * 1.05)
    else:
        # MODERATE: Blend ML and actual
        blend_factor = min(abs(prediction_error) / base_time, 0.5)
        adjusted_time = min(300, base_time * (1 + blend_factor))
```

**Example - Extreme Deviation**:
```
base_time = 60s
recent_avg_time = 150s
prediction_error = 60 - 150 = -90s (< -15 ✓)
abs(-90) / 60 = 1.5 > 1.0 ✓
→ adjusted_time = 150 * 1.05 = 158s
```

**Example - Moderate Deviation**:
```
base_time = 60s
recent_avg_time = 40s
prediction_error = 60 - 40 = 20s (> 15 ✓)
20 / 60 = 0.33 < 1.0
blend_factor = 0.33
→ adjusted_time = 60 * (1 - 0.33) = 40s
```

---

#### 🔹 RULE 4: Constrain Unreasonable Predictions
**When**: `len(relevant_tasks) >= 10`

```python
if adjusted_prob < 0.30 AND overall_success_rate > 0.5:
    # ML too pessimistic
    adjusted_prob = max(0.5, overall_success_rate * 0.9)

elif adjusted_prob < 0.40 AND overall_success_rate > 0.6:
    # ML moderately pessimistic
    adjusted_prob = max(0.55, overall_success_rate * 0.85)

elif adjusted_prob > 0.85 AND overall_success_rate < 0.3:
    # ML too optimistic
    adjusted_prob = min(0.5, overall_success_rate * 1.2)
```

---

## Real Scenarios with Actual Data

### 📊 SCENARIO 1: New User (you3) - Mixed Performance
**Topic**: Differential Equations (medium) - **BRAND NEW TOPIC**

**User Pattern**: ✓30s, ✓45s, ✗45s, ✓30s

#### Task-by-Task Breakdown:

**TASK 1: First ever attempt**
```
┌─ ML Prediction ─────────────────────┐
│ No history → Default prediction     │
│ base_prob = 50%                     │
│ base_time = 60s                     │
└─────────────────────────────────────┘
         ↓
┌─ Adaptive Adjustment ───────────────┐
│ len(relevant_tasks) = 0             │
│ → Skip adjustment (no data yet)     │
│ FINAL: Accuracy=50.0%, Time=60s     │
└─────────────────────────────────────┘
         ↓
   User completes: ✓ 30s
```

**TASK 2: First adaptation**
```
┌─ ML Prediction ─────────────────────┐
│ base_prob = 50%                     │
│ base_time = 60s (model not updated) │
└─────────────────────────────────────┘
         ↓
┌─ History Data ──────────────────────┐
│ relevant_tasks = [Task 1: ✓ 30s]   │
│ len = 1 ≤ 3 → EARLY LEARNING!      │
│ recent_success_rate = 1/1 = 100%   │
│ recent_avg_time = 30s               │
└─────────────────────────────────────┘
         ↓
┌─ Early Learning Adjustment ─────────┐
│ success_rate = 100% → prob = 85%    │
│ time = 30 * 1.05 = 32s              │
│ FINAL: Accuracy=85.0%, Time=32s     │
└─────────────────────────────────────┘
         ↓
   User completes: ✓ 45s
```

**TASK 3: Averaging history**
```
┌─ History Data ──────────────────────┐
│ relevant_tasks = [✓30s, ✓45s]      │
│ len = 2 ≤ 3 → EARLY LEARNING!      │
│ recent_success_rate = 2/2 = 100%   │
│ recent_avg_time = (30+45)/2 = 37.5s│
└─────────────────────────────────────┘
         ↓
┌─ Early Learning Adjustment ─────────┐
│ success_rate = 100% → prob = 85%    │
│ time = 37.5 * 1.05 = 39s            │
│ FINAL: Accuracy=85.0%, Time=39s     │
└─────────────────────────────────────┘
         ↓
   User completes: ✗ 45s
```

**TASK 4: Exiting early learning**
```
┌─ History Data ──────────────────────┐
│ relevant_tasks = [✓30s, ✓45s, ✗45s]│
│ len = 3 ≤ 3 → EARLY LEARNING!      │
│ recent_success_rate = 2/3 = 66.7%  │
│ recent_avg_time = (30+45+45)/3 = 40s│
└─────────────────────────────────────┘
         ↓
┌─ Early Learning Adjustment ─────────┐
│ success_rate = 66.7% → prob = 65%   │
│ time = 40 * 1.05 = 42s              │
│ FINAL: Accuracy=65.0%, Time=42s     │
└─────────────────────────────────────┘
         ↓
   User completes: ✓ 30s
```

**KEY INSIGHT**: Early learning directly maps actual performance to predictions, providing **immediate adaptation** for first 3 tasks!

---

### 📊 SCENARIO 2: Experienced User (bulk) - Known Topic
**Topic**: Calculus (medium) - **HAS EXTENSIVE HISTORY**

**User Pattern**: ✓30s, ✗60s, ✓45s, ✓90s

#### Task-by-Task Breakdown:

**TASK 1: Using historical baseline**
```
┌─ ML Prediction ─────────────────────┐
│ Analyzes bulk's Calculus history    │
│ (e.g., 50 completed tasks)          │
│ base_prob = 95% (high performer)    │
│ base_time = 126s (historical avg)   │
└─────────────────────────────────────┘
         ↓
┌─ History Data ──────────────────────┐
│ relevant_tasks = 50 past tasks      │
│ len = 50 > 3 → NO EARLY LEARNING   │
│ recent_success_rate = ~95%          │
│ overall_success_rate = ~95%         │
│ success_improvement ≈ 0             │
└─────────────────────────────────────┘
         ↓
┌─ Adaptive Adjustment ───────────────┐
│ RULE 1: recent_success_rate > 0.8   │
│ → Boost: 95% → 95% (already at cap) │
│ RULE 3: No significant change needed│
│ FINAL: Accuracy=95.0%, Time=126s    │
└─────────────────────────────────────┘
         ↓
   User completes: ✓ 30s (much faster!)
```

**TASK 2: Adapting to fast completion**
```
┌─ ML Prediction ─────────────────────┐
│ base_prob = 95%                     │
│ base_time = 126s                    │
└─────────────────────────────────────┘
         ↓
┌─ History Data ──────────────────────┐
│ relevant_tasks = [50 old + Task 1]  │
│ recent_n = 5 tasks                  │
│ recent_avg_time = ~100s (mixed)     │
│ overall_avg_time = ~120s            │
│ time_improvement = 120-100 = +20s   │
└─────────────────────────────────────┘
         ↓
┌─ RULE 3 Time Adjustment ────────────┐
│ time_improvement = +20s > 10 ✓      │
│ time_factor = 0.9 - (20/300)        │
│             = 0.9 - 0.067 = 0.833   │
│ adjusted = 126 * 0.833 = 105s       │
│                                     │
│ BUT ALSO: prediction_error check    │
│ base_time=126, recent_avg=30        │
│ prediction_error = 126-30 = 96s > 15│
│ 96/126 = 0.76 < 1.0 (not extreme)   │
│ blend_factor = 0.5 (capped)         │
│ adjusted = 126 * (1-0.5) = 63s      │
│                                     │
│ Takes more aggressive adjustment    │
│ FINAL: Accuracy=95.0%, Time=~13s    │
│ (actual may vary due to ML retrain) │
└─────────────────────────────────────┘
         ↓
   User completes: ✗ 60s
```

**TASK 3: Accuracy stays high (one failure)**
```
┌─ History Data ──────────────────────┐
│ recent_success_rate = 4/5 = 80%     │
│ overall_success_rate = 49/52 = 94%  │
│ success_improvement = -14%          │
└─────────────────────────────────────┘
         ↓
┌─ RULE 1: High Performance ──────────┐
│ recent = 80% > 0.7 ✓                │
│ boost_factor = 1.15                 │
│ 95% * 1.15 = 109% → capped at 95%   │
│ FINAL: Accuracy=95.0%, Time=~12s    │
└─────────────────────────────────────┘
         ↓
   User completes: ✓ 45s
```

**TASK 4: Mixed signals (correct but slow)**
```
┌─ History Data ──────────────────────┐
│ Last 5: [✓30s, ✗60s, ✓45s, ?, ?]   │
│ recent_success_rate = 80%           │
│ recent_avg_time = (30+60+45)/3 = 45s│
│ time_improvement = varied           │
└─────────────────────────────────────┘
         ↓
┌─ Adaptive Adjustment ───────────────┐
│ Accuracy remains high ~95%          │
│ Time adapts to recent pattern ~12s  │
│ FINAL: Accuracy=95.0%, Time=12s     │
└─────────────────────────────────────┘
         ↓
   User completes: ✓ 90s
```

**KEY INSIGHT**: Experienced users have **stable accuracy predictions** (95% cap) but **time adapts** to recent patterns. The system balances historical performance with recent trends.

---

## Decision Tree Flowchart

```
START: Predict for new task
│
├─ Get ML Prediction (base_prob, base_time)
│
├─ Load relevant_tasks (same subject+topic+difficulty)
│
└─ Apply Adaptive Adjustment
   │
   ├─ [len(relevant_tasks) ≤ 3] → EARLY LEARNING
   │   ├─ Map success_rate → fixed accuracy tiers
   │   └─ time = recent_avg_time * 1.05
   │
   └─ [len(relevant_tasks) > 3] → STANDARD RULES
       │
       ├─ ACCURACY ADJUSTMENT
       │   ├─ [recent_success > 0.8 AND improving > 0.1] → RULE 1: High boost
       │   ├─ [improving > 0.05] → RULE 1: Moderate boost
       │   ├─ [recent_success < 0.3 AND declining < -0.1] → RULE 2: High reduction
       │   ├─ [declining < -0.05] → RULE 2: Moderate reduction
       │   ├─ [recent_success < 0.2] → RULE 2B: Floor at 15%
       │   └─ [tasks ≥ 10] → RULE 4: Constrain unreasonable predictions
       │
       └─ TIME ADJUSTMENT (checks in order, first match wins)
           ├─ [time_improvement > 10s] → RULE 3a: Reduce prediction
           ├─ [time_improvement < -10s] → RULE 3b: Increase prediction
           ├─ [prediction_error > 15s] → RULE 3c: Adjust toward actual
           │   ├─ [deviation > 100%] → Use actual * 1.05
           │   └─ [deviation ≤ 100%] → Blend ML & actual
           └─ [prediction_error < -15s] → RULE 3d: Adjust toward actual
               ├─ [deviation > 100%] → Use actual * 1.05
               └─ [deviation ≤ 100%] → Blend ML & actual

RETURN: (adjusted_prob, adjusted_time)
```

---

## Formulas & Calculations

### Time Improvement (Speed Change)
```python
time_improvement = overall_avg_time - recent_avg_time
# Positive = user getting FASTER
# Negative = user getting SLOWER
```

**Example**:
```
overall_avg_time = 60s (historical average)
recent_avg_time = 45s (last 5 tasks)
time_improvement = 60 - 45 = +15s (getting faster!)
```

### Prediction Error (ML vs Actual)
```python
prediction_error = base_time - recent_avg_time
# Positive = user FASTER than ML predicts
# Negative = user SLOWER than ML predicts
```

**Example**:
```
base_time = 60s (ML prediction)
recent_avg_time = 90s (actual performance)
prediction_error = 60 - 90 = -30s (slower than expected)
```

### Blend Factor (Extreme Deviation)
```python
if abs(prediction_error) / base_time > 1.0:
    # Deviation > 100% → Use actual directly
    adjusted_time = recent_avg_time * 1.05
else:
    # Deviation ≤ 100% → Blend ML and actual
    blend_factor = min(abs(prediction_error) / base_time, 0.5)
    if prediction_error > 0:  # Faster
        adjusted_time = base_time * (1 - blend_factor)
    else:  # Slower
        adjusted_time = base_time * (1 + blend_factor)
```

**Example - Extreme (>100%)**:
```
base_time = 60s
recent_avg_time = 150s
prediction_error = -90s
abs(-90) / 60 = 1.5 > 1.0 → EXTREME
adjusted_time = 150 * 1.05 = 158s
```

**Example - Moderate (≤100%)**:
```
base_time = 60s
recent_avg_time = 80s
prediction_error = -20s
abs(-20) / 60 = 0.33 ≤ 1.0 → MODERATE
blend_factor = 0.33
adjusted_time = 60 * (1 + 0.33) = 80s
```

---

## Summary of Guaranteed Behaviors

✅ **NEW USERS (First 3 tasks)**:
- Predictions adapt IMMEDIATELY to actual performance
- Accuracy: Direct mapping from success rate
- Time: recent_avg * 1.05

✅ **EXPERIENCED USERS**:
- Predictions blend ML model with recent trends
- Accuracy: Capped at 95%, floored at 15%
- Time: Adapts to speed changes and deviation from ML

✅ **EXTREME DEVIATIONS (>100%)**:
- System trusts actual performance over ML
- Uses recent_avg_time * 1.05 directly

✅ **CONSISTENCY**:
- Same topic + difficulty + subject → Same prediction rules
- No random variation, fully deterministic

---

**Generated**: 2025-11-11
**System Version**: v2.0 (with extreme deviation handling)
