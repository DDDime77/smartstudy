# SmartStudy Machine Learning - One-Page Summary

**SmartStudy** uses a **hybrid ML system** combining neural networks and adaptive rules to predict student success probability (0-95%) and task completion time (10-300s), personalizing learning in real-time.

---

## Three-Layer ML Architecture

**1. Embedding Neural Network (Primary)** - Feed-forward network (128→64→32 units)
- **Input** (69D): User embedding (32D) + Topic embedding (16D) + Difficulty (8D) + 13 history features
- **13 Features**: Overall/topic/difficulty metrics (success_rate, avg_time, task_count) + recent performance + improvement trends
- **Output**: Success probability (sigmoid), time estimate (softplus)
- **Training**: Auto-trigger every 5 completions (~30s async, Adam optimizer, early stopping)

**2. LNIRT Model (Fallback)** - Item Response Theory statistical model with user ability (θ, τ) and item difficulty (a, b, β)

**3. Adaptive Rules (Post-Processing)** - Real-time adjustments:

| Rule | Trigger | Action | Example |
|------|---------|--------|---------|
| Early Learning | ≤3 tasks | Use actual × 1.05 | 30s → 32s |
| Boost | >80% recent success | +40% (cap 95%) | 60% → 84% |
| Reduce | <20% recent success | Min 15% | 70% → 15% |
| Override | >100% prediction error | Use actual | 60s pred, 120s actual → 126s |

---

## Workflow
```
Request → History → Features → Embeddings → Neural Net → Adaptive Rules → Prediction
                                                ↓
                            Complete → Record → Train (every 5 tasks)
```

---

## Performance

| Metric | Value | Metric | Value |
|--------|-------|--------|-------|
| Accuracy | ~85% | Cold Start | 50% |
| Time Error | ±15s | Personalized | 80-90% (20+ tasks) |
| Adaptation | 3-5 tasks | Training | Every 5 completions |

---

## Example: Student Progression (Sarah, Algebra)

| Task | Prediction | Actual | Mechanism |
|------|------------|--------|-----------|
| 1 | 50%, 60s | ✓ 30s | Default |
| 2 | 85%, 32s | ✓ 45s | Early learning |
| 4 | 65%, 42s | ✓ 30s | ML + adaptive |
| 20 | 90%, 33s | ✓ 30s | Fully personalized |

---

## Key Benefits
**Personalization** • **Real-time adaptation** • **Automatic learning** • **Scalability** • **Continuous improvement**

**Tech Stack**: TensorFlow/Keras 2.x • PostgreSQL • Async workers
**Files**: `embedding_model_v2.py`, `embedding_service.py`, `lnirt_model.py`

---
*Version 2.0 | November 2025 | Embedding + Rules Hybrid*
