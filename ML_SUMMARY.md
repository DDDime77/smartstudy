# SmartStudy Machine Learning - Executive Summary

## Overview

SmartStudy uses a **dual-model ML system** to predict student success probability (0-95%) and task completion time (10-300 seconds) for every practice task, personalizing learning in real-time.

---

## ML Models

### 1. Embedding-Based Neural Network (Primary)

**Architecture**: Feed-forward network with 3 hidden layers (128→64→32 units)

**Input** (69 dimensions):
- User embedding (32D): Learnable student representation
- Topic embedding (16D): Subject matter encoding
- Difficulty embedding (8D): Task complexity
- History features (13D): Performance metrics (success rates, times, task counts)

**Output**: Dual-head prediction
- Success probability (sigmoid activation)
- Time in seconds (softplus activation)

**Training**: Automatic every 5 task completions (~30s, async background)

---

### 2. LNIRT Model (Secondary)

**Purpose**: Statistical fallback based on Item Response Theory

**Parameters**:
- User: θ (ability), τ (speed)
- Item: a (discrimination), b (difficulty), β (time complexity)

---

### 3. Adaptive Rule-Based Layer

**Purpose**: Post-process ML predictions with real-time adjustments

**Four Rules**:

| Rule | Condition | Action | Example |
|------|-----------|--------|---------|
| **Early Learning** | ≤3 tasks in topic | Use actual performance × 1.05 | Task 1: 30s → Task 2: 32s |
| **Boost** | Recent success >80% & improving | Increase by 40% (cap 95%) | 60% → 84% |
| **Reduce** | Recent success <20% | Reduce to 15% minimum | 70% → 15% |
| **Override** | Prediction >100% off actual | Use actual directly | Predict 60s, actual 120s → 126s |

---

## Feature Engineering (13 History Features)

| Category | Features | Purpose |
|----------|----------|---------|
| **Overall** | success_rate, avg_time, task_count | General ability |
| **Topic-Specific** | topic_success, topic_time, topic_count | Subject mastery |
| **Difficulty** | diff_success, diff_time, diff_count | Complexity handling |
| **Recent** | recent_success (last 5), recent_time | Short-term trends |
| **Improvement** | success_delta, time_delta | Learning trajectory |

---

## System Workflow

```
Task Request → Fetch History → Extract 13 Features → Generate Embeddings
    ↓
Neural Network Prediction
    ↓
Apply Adaptive Rules (early learning → boost → reduce → override)
    ↓
Final Prediction → Present Task
    ↓
Complete Task → Record Outcome → Trigger Training (every 5 tasks)
```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| **Prediction Accuracy** | ~85% (calibrated probability) |
| **Time Error** | ±15s for 75% of tasks |
| **Cold Start** | 50% (no data) |
| **Personalized** | 80-90% (after 20+ tasks) |
| **Adaptation Speed** | 3-5 tasks to detect changes |
| **Training Frequency** | Every 5 completions (automatic) |

---

## Example: Prediction Evolution

**Sarah** (new student, Algebra):

| Task | Prediction | Actual | How It Works |
|------|------------|--------|--------------|
| 1 | 50%, 60s | ✓ 30s | Default (no data) |
| 2 | 85%, 32s | ✓ 45s | Early learning: 30s × 1.05 |
| 3 | 85%, 39s | ✗ 45s | Early learning: avg × 1.05 |
| 4 | 65%, 42s | ✓ 30s | ML + adaptive: accuracy drops |
| 10 | 80%, 35s | ✓ 32s | Personalized pattern learned |
| 20 | 90%, 33s | ✓ 30s | Fully adapted predictions |

---

## Key Advantages

1. **Personalization**: Unique predictions for each student's learning profile
2. **Real-Time Adaptation**: Immediate response to improvement or struggle
3. **Automatic Learning**: No manual tuning required, learns from data
4. **Scalability**: Learns from all students while maintaining individual predictions
5. **Continuous Improvement**: Gets smarter with every task completion

---

## Technical Stack

- **Framework**: TensorFlow/Keras 2.x
- **Database**: PostgreSQL (task history)
- **Training**: Async background workers (Adam optimizer, MSE loss, early stopping)
- **Key Files**: `embedding_model_v2.py`, `embedding_service.py`, `lnirt_model.py`

---

**Version**: 2.0 | **Updated**: November 2025 | **Model**: Embedding + Rules Hybrid
