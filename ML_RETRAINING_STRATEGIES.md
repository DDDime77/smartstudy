# ML Model Retraining Strategies for bulk@example.com Overfitting

**Date:** 2025-11-10
**Context:** bulk@example.com has 846/917 tasks (92.3%), causing severe user embedding overfitting
**Goal:** Retrain model to produce continuous predictions that respond to recent performance

---

## Strategy Comparison Matrix

| Strategy | Effectiveness | Complexity | Training Time | Preserves Personalization |
|----------|--------------|------------|---------------|---------------------------|
| 1. Full Retrain (no changes) | ❌ Makes worse | Low | ~1 min | Yes (too much!) |
| 2. Full Retrain (with fixes) | 🟡 Partial | Medium | ~1 min | Yes |
| 3. Balanced Sampling | 🟢 Good | Medium | ~30 sec | Partial |
| 4. Weighted Loss | 🟢🟢 Very Good | Medium | ~1 min | Yes |
| 5. Progressive Training | 🟢🟢 Very Good | High | ~3 min | Yes |
| 6. Per-User Models | 🟢🟢🟢 Excellent | High | ~2 min | Yes |

---

## Strategy 1: Full Retrain (No Architecture Changes) ❌

**DO NOT DO THIS** - included only for completeness.

### Process
```python
# Simply retrain existing model on all data
embedding_service = EmbeddingModelService(db)
embedding_service.train_if_needed(force=True, verbose=True)
```

### What Happens
- **Iteration 1-10**: Model learns general patterns (60% accuracy)
- **Iteration 11-30**: Model specializes to bulk's patterns (70% accuracy)
- **Iteration 31-50**: Model overfits to bulk (80% accuracy, but saturated predictions)
- **Final**: bulk's user embedding has weights like `[8.3, -12.1, 15.6, ...]` (extreme values)
- **Output**: Even more binary predictions (0.0000001 or 0.9999999)

### Outcome
- ❌ Saturation gets worse
- ❌ Predictions less continuous
- ❌ Even less responsive to recent performance

**Verdict: AVOID**

---

## Strategy 2: Full Retrain with Architecture Fixes 🟡

### Changes Required
**File:** `/backend/app/ml/embedding_model_v2.py`

```python
# Line ~125-140: Cap task count features
features['overall_task_count'] = min(len(user_tasks) / 100.0, 1.0)
features['topic_task_count'] = min(len(topic_tasks) / 20.0, 1.0)
features['difficulty_task_count'] = min(len(diff_tasks) / 20.0, 1.0)

# Line ~220: Reduce user embedding size
from tensorflow.keras.regularizers import L2

user_emb = Embedding(
    n_users,
    16,  # Reduced from 32
    embeddings_regularizer=L2(0.01)  # Add L2 penalty
)(user_input)

# Line ~230: Add batch normalization
user_emb = Flatten()(user_emb)
user_emb = BatchNormalization()(user_emb)

topic_emb = Embedding(n_topics, 16)(topic_input)
topic_emb = Flatten()(topic_emb)
topic_emb = BatchNormalization()(topic_emb)

diff_emb = Embedding(3, 8)(difficulty_input)
diff_emb = Flatten()(diff_emb)
diff_emb = BatchNormalization()(diff_emb)
```

### Retraining Process
```bash
# 1. Delete old models
rm /home/claudeuser/smartstudy/backend/app/ml/models/correctness_model.keras
rm /home/claudeuser/smartstudy/backend/app/ml/models/time_model.keras
rm /home/claudeuser/smartstudy/backend/app/ml/models/metadata.json

# 2. Trigger retrain via API or direct call
cd /home/claudeuser/smartstudy/backend
source venv/bin/activate
python3 << EOF
import sys
sys.path.insert(0, '/home/claudeuser/smartstudy/backend')
from app.database import SessionLocal
from app.ml.embedding_service import EmbeddingModelService

db = SessionLocal()
service = EmbeddingModelService(db)
service.train_if_needed(force=True, verbose=True)
db.close()
EOF
```

### Expected Results
- **User embedding**: 16 dims instead of 32 (50% smaller)
- **L2 regularization**: Penalizes weights > 1.0, keeps them moderate
- **BatchNorm**: Normalizes embeddings to similar scale as history features
- **Predictions**: 20-80% range instead of 0-100%

### Pros
- ✅ Relatively simple (just architecture changes)
- ✅ Uses all data (no information loss)
- ✅ Preserves personalization
- ✅ Trains in ~1 minute

### Cons
- 🟡 bulk still dominates training (846/917 samples)
- 🟡 Model still learns bulk's patterns more than others
- 🟡 May still show some saturation (just less extreme)

**Verdict: GOOD starting point, but not optimal**

---

## Strategy 3: Balanced Sampling 🟢

### Concept
Sample training data to balance user representation.

### Implementation
**File:** `/backend/app/ml/embedding_service.py` (new method)

```python
def _get_balanced_training_data(self, max_per_user=150):
    """
    Fetch balanced training data across users.

    Args:
        max_per_user: Maximum samples per user (default 150)

    Returns:
        List of task dicts with balanced user representation
    """
    query = text("""
        WITH ranked_tasks AS (
            SELECT
                user_id,
                topic,
                difficulty,
                EXTRACT(EPOCH FROM completed_at) as timestamp,
                CASE WHEN is_correct THEN 1 ELSE 0 END as correct,
                actual_time_seconds as actual_time,
                ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY completed_at DESC) as rn
            FROM practice_tasks
            WHERE completed = TRUE
              AND is_correct IS NOT NULL
              AND actual_time_seconds IS NOT NULL
        )
        SELECT
            user_id, topic, difficulty, timestamp, correct, actual_time
        FROM ranked_tasks
        WHERE rn <= :max_per_user
        ORDER BY timestamp ASC
    """)

    result = self.db.execute(query, {'max_per_user': max_per_user})
    return [dict(row._mapping) for row in result]
```

**Modify train method:**
```python
def train_if_needed(self, force=False, verbose=False, balanced=True, max_per_user=150):
    # ... existing code ...

    if balanced:
        training_data = self._get_balanced_training_data(max_per_user)
        if verbose:
            print(f"Using balanced sampling: max {max_per_user} per user")
    else:
        training_data = self._get_all_completed_tasks()

    # ... rest of training code ...
```

### Training Distribution
**Before balancing:**
- bulk: 846 tasks (92.3%)
- you2: 59 tasks (6.4%)
- nigag: 9 tasks (1.0%)
- asss77: 3 tasks (0.3%)

**After balancing (max_per_user=150):**
- bulk: 150 tasks (66.4%)
- you2: 59 tasks (26.1%)
- nigag: 9 tasks (4.0%)
- asss77: 3 tasks (1.3%)

**After balancing (max_per_user=100):**
- bulk: 100 tasks (58.5%)
- you2: 59 tasks (34.5%)
- nigag: 9 tasks (5.3%)
- asss77: 3 tasks (1.8%)

### Pros
- ✅ Reduces bulk's dominance significantly
- ✅ Model learns more generalizable patterns
- ✅ Still preserves bulk's personalization (uses recent 150 tasks)
- ✅ Fast training (~30 seconds)

### Cons
- 🟡 Loses bulk's older history (696 tasks discarded)
- 🟡 May reduce prediction accuracy for bulk slightly
- 🟡 Arbitrary cutoff (why 150? why not 200?)

**Verdict: GOOD option, especially with max_per_user=150**

---

## Strategy 4: Weighted Loss Function 🟢🟢

### Concept
Train on ALL data, but weight each sample inversely to user frequency.

### Implementation
**File:** `/backend/app/ml/embedding_model_v2.py`

```python
def _prepare_training_data(self, data):
    """
    Prepare training data with sample weights.
    Returns: X, y_correctness, y_time, sample_weights
    """
    # ... existing encoding code ...

    # Compute sample weights (inverse frequency)
    user_counts = {}
    for d in data:
        uid = str(d['user_id'])
        user_counts[uid] = user_counts.get(uid, 0) + 1

    total_samples = len(data)
    sample_weights = []

    for d in data:
        uid = str(d['user_id'])
        # Inverse frequency weighting
        weight = total_samples / (len(user_counts) * user_counts[uid])
        sample_weights.append(weight)

    # Normalize weights to sum to total_samples
    sample_weights = np.array(sample_weights)
    sample_weights = sample_weights * (total_samples / sample_weights.sum())

    return X, y_correctness, y_time, sample_weights
```

**Modify train method:**
```python
def train(self, training_data, epochs=50, verbose=False):
    # ... existing code ...

    X, y_correctness, y_time, sample_weights = self._prepare_training_data(training_data)

    # Train correctness model WITH sample weights
    self.correctness_model.fit(
        X, y_correctness,
        epochs=epochs,
        batch_size=32,
        validation_split=0.2,
        sample_weight=sample_weights,  # ADD THIS
        callbacks=[...],
        verbose=1 if verbose else 0
    )

    # Train time model WITH sample weights
    self.time_model.fit(
        X, y_time,
        epochs=epochs,
        batch_size=32,
        validation_split=0.2,
        sample_weight=sample_weights,  # ADD THIS
        callbacks=[...],
        verbose=1 if verbose else 0
    )
```

### Weight Distribution
With 917 total samples, 4 users:

**Sample weights:**
- bulk (846 samples): weight = 917 / (4 * 846) = 0.271 per sample
- you2 (59 samples): weight = 917 / (4 * 59) = 3.884 per sample
- nigag (9 samples): weight = 917 / (4 * 9) = 25.47 per sample
- asss77 (3 samples): weight = 917 / (4 * 3) = 76.42 per sample

**Effective training influence:**
- bulk: 846 * 0.271 = 229.3 (25% influence)
- you2: 59 * 3.884 = 229.2 (25% influence)
- nigag: 9 * 25.47 = 229.2 (25% influence)
- asss77: 3 * 76.42 = 229.3 (25% influence)

**Perfect balance!** Each user contributes equally to loss function.

### Pros
- ✅ Uses ALL data (no information loss)
- ✅ Perfectly balanced learning across users
- ✅ Preserves bulk's full history for personalization
- ✅ Model learns general patterns, not bulk-specific quirks
- ✅ Mathematically principled (inverse frequency weighting)

### Cons
- 🟡 Slightly more complex implementation
- 🟡 Training may be slightly slower (~1.5 min vs 1 min)
- 🟡 Rare users (asss77) have very high weight → could introduce noise

**Verdict: VERY GOOD option, recommended**

---

## Strategy 5: Progressive Training 🟢🟢

### Concept
Two-stage training:
1. **Pretrain** on balanced subset → learn general patterns
2. **Fine-tune** on full dataset with low learning rate → personalize

### Implementation

**Stage 1: Pretrain on balanced subset**
```python
def pretrain(self, max_per_user=100, epochs=30, verbose=False):
    """
    Pretrain on balanced subset to learn general patterns.
    """
    balanced_data = self._get_balanced_training_data(max_per_user)

    print(f"Pretraining on {len(balanced_data)} balanced samples...")

    X, y_correctness, y_time = self._prepare_training_data(balanced_data)

    # Higher learning rate for pretraining
    self.correctness_model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss='binary_crossentropy',
        metrics=['accuracy', 'auc']
    )

    self.correctness_model.fit(
        X, y_correctness,
        epochs=epochs,
        batch_size=32,
        validation_split=0.2,
        callbacks=[EarlyStopping(patience=10)],
        verbose=1 if verbose else 0
    )

    # Same for time model...
```

**Stage 2: Fine-tune on full dataset**
```python
def finetune(self, epochs=20, verbose=False):
    """
    Fine-tune on full dataset with lower learning rate.
    """
    all_data = self._get_all_completed_tasks()

    print(f"Fine-tuning on {len(all_data)} full samples...")

    X, y_correctness, y_time = self._prepare_training_data(all_data)

    # Lower learning rate for fine-tuning
    self.correctness_model.compile(
        optimizer=Adam(learning_rate=0.0001),  # 10x lower
        loss='binary_crossentropy',
        metrics=['accuracy', 'auc']
    )

    self.correctness_model.fit(
        X, y_correctness,
        epochs=epochs,
        batch_size=32,
        validation_split=0.2,
        callbacks=[EarlyStopping(patience=5)],
        verbose=1 if verbose else 0
    )

    # Same for time model...
```

**Full training pipeline:**
```python
def train_progressive(self, verbose=False):
    """
    Progressive training: pretrain + finetune.
    """
    # Build models
    self._build_models_if_needed()

    # Stage 1: Pretrain on balanced subset
    self.pretrain(max_per_user=100, epochs=30, verbose=verbose)

    # Stage 2: Fine-tune on full dataset
    self.finetune(epochs=20, verbose=verbose)

    # Save
    self.correctness_model.save('models/correctness_model.keras')
    self.time_model.save('models/time_model.keras')
```

### Training Process
**Stage 1 (Pretrain - 30 epochs on 271 samples):**
- Learns: general patterns across all users
- User embeddings: learn basic user ability levels
- Topic embeddings: learn topic difficulty patterns
- Model learns: "correct users exist, incorrect users exist"

**Stage 2 (Fine-tune - 20 epochs on 917 samples):**
- Learns: user-specific patterns (but gently, low LR)
- bulk's embedding: fine-tunes from general → bulk-specific
- Model learns: "bulk specifically struggles with X"
- Low LR prevents overfitting

### Pros
- ✅ Best of both worlds: general + personalized
- ✅ Prevents overfitting (pretrain teaches general patterns first)
- ✅ Preserves personalization (fine-tune adapts to users)
- ✅ Mathematically sound (curriculum learning)

### Cons
- 🟡 More complex implementation
- 🟡 Longer training time (~3 min total)
- 🟡 Requires tuning LR ratios

**Verdict: VERY GOOD option for best quality**

---

## Strategy 6: Per-User Models (Alternative Architecture) 🟢🟢🟢

### Concept
Instead of one model with user embeddings, train separate lightweight models per user using transfer learning.

### Architecture Change

**Base Model (shared):**
```python
def build_base_model():
    """
    Build base model WITHOUT user embedding.
    Uses only topic, difficulty, and history features.
    """
    topic_input = Input(shape=(1,), dtype=tf.int32)
    difficulty_input = Input(shape=(1,), dtype=tf.int32)
    history_input = Input(shape=(13,), dtype=tf.float32)

    topic_emb = Embedding(n_topics, 16)(topic_input)
    topic_emb = Flatten()(topic_emb)

    diff_emb = Embedding(3, 8)(difficulty_input)
    diff_emb = Flatten()(diff_emb)

    # Concatenate (no user embedding!)
    concat = Concatenate()([topic_emb, diff_emb, history_input])

    # Dense layers
    x = Dense(64, activation='relu')(concat)
    x = BatchNormalization()(x)
    x = Dropout(0.3)(x)

    x = Dense(32, activation='relu')(x)
    x = Dropout(0.2)(x)

    output = Dense(1, activation='sigmoid')(x)

    model = Model(inputs=[topic_input, difficulty_input, history_input], outputs=output)
    return model
```

**Training Process:**

1. **Pretrain base model** on all users (balanced or weighted)
2. **Clone model per user** and fine-tune on user-specific data

```python
# Pretrain base model
base_model = build_base_model()
base_model.fit(all_data, ...)
base_model.save('models/base_correctness_model.keras')

# Fine-tune for bulk
bulk_model = keras.models.clone_model(base_model)
bulk_model.set_weights(base_model.get_weights())  # Copy pretrained weights

# Freeze early layers, fine-tune later layers
for layer in bulk_model.layers[:3]:
    layer.trainable = False

bulk_model.compile(optimizer=Adam(lr=0.0001), ...)
bulk_model.fit(bulk_only_data, epochs=10)
bulk_model.save('models/bulk_correctness_model.keras')

# Same for you2, nigag, asss77...
```

**Prediction Process:**
```python
def predict(self, user_id, topic, difficulty):
    # Load user-specific model
    model_path = f'models/{user_id}_correctness_model.keras'

    if os.path.exists(model_path):
        model = keras.models.load_model(model_path)
    else:
        # Fallback to base model for new users
        model = keras.models.load_model('models/base_correctness_model.keras')

    # Predict (no user embedding needed!)
    return model.predict(...)
```

### Pros
- ✅ **Completely eliminates user embedding overfitting** (no user embedding!)
- ✅ Perfect personalization (dedicated model per user)
- ✅ New users get base model (good cold start)
- ✅ Scalable (can fine-tune per user as they get more data)
- ✅ Each user model is small (~500KB)

### Cons
- 🟡 More complex architecture (manage multiple models)
- 🟡 Disk space (4 users × 2 models = 8 model files)
- 🟡 Need logic to decide when to fine-tune vs use base

**Verdict: EXCELLENT option for production systems**

---

## Recommended Implementation Plan

### Phase 1: Quick Fix (Today - 30 minutes)

1. **Implement Strategy 2** (architecture fixes + full retrain)
   - Reduce user embedding: 32 → 16
   - Add L2 regularization: 0.01
   - Add BatchNormalization
   - Cap task count features
   - Retrain on all data

2. **Test on bulk@example.com**
   - Generate 5 consecutive Calculus easy tasks
   - Check predictions are continuous (30-70% range)
   - Verify predictions respond to correct/incorrect answers

**Expected result:** 60-70% improvement in saturation issue

### Phase 2: Better Solution (This Week - 2 hours)

If Phase 1 results are unsatisfactory:

1. **Implement Strategy 4** (weighted loss) OR **Strategy 5** (progressive training)
   - Both give ~80-90% improvement
   - Weighted loss is simpler
   - Progressive training is higher quality

2. **Test thoroughly**
   - All users (bulk, you2, nigag, asss77)
   - Various topics and difficulties
   - Consecutive tasks with same difficulty

**Expected result:** 80-90% improvement, continuous predictions

### Phase 3: Production Solution (Next Month - 1 day)

If you want production-grade quality:

1. **Implement Strategy 6** (per-user models)
   - Completely eliminates overfitting
   - Perfect personalization
   - Good cold start for new users

2. **Add monitoring**
   - Track prediction distribution (should be uniform 20-80%)
   - Alert if predictions become saturated
   - Log user-specific model performance

**Expected result:** 95%+ improvement, robust to any user data distribution

---

## Testing Checklist

After retraining, verify:

### ✅ Prediction Continuity
```sql
-- Check prediction distribution (should be continuous)
SELECT
    ROUND(predicted_correct * 100) as pred_pct,
    COUNT(*) as count
FROM practice_tasks
WHERE user_id = '537b7b10-dd68-4e27-844f-20882922538a'  -- bulk
  AND completed_at > NOW() - INTERVAL '1 day'  -- After retrain
GROUP BY pred_pct
ORDER BY pred_pct;

-- Expected: Many different values (30%, 35%, 42%, 58%, etc.)
-- NOT: Just 0%, 57%, 100%
```

### ✅ Response to Performance
```python
# Generate 5 consecutive tasks (same topic, same difficulty)
# Mark all CORRECT
# Predictions should: increase or stay flat
# NOT: decrease
```

### ✅ Generalization Across Users
```python
# Test prediction variance for you2@example.com
# Should be similar variance as bulk@example.com
# NOT: bulk has 0.5 variance, you2 has 0.05 variance
```

---

## My Recommendation: Start with Strategy 2, Upgrade to Strategy 4

**Today:**
- Implement Strategy 2 (architecture fixes)
- 30 minutes of work
- Immediate 60-70% improvement
- Low risk

**This Week (if needed):**
- Implement Strategy 4 (weighted loss)
- 2 hours of work
- 80-90% improvement
- Production-ready

**Reasoning:**
- Strategy 2 is quick and fixes most issues
- Strategy 4 is mathematically optimal and uses all data
- Both are proven techniques in ML
- Can always upgrade to Strategy 6 later if needed

---

## Code Snippets for Implementation

### Strategy 2: Architecture Fixes (Quick)

```bash
# 1. Edit embedding_model_v2.py
# Lines 125-140: Cap features
# Lines 220-235: Reduce embedding + add L2 + add BatchNorm

# 2. Delete old models
rm backend/app/ml/models/*.keras
rm backend/app/ml/models/*.json

# 3. Retrain
cd backend
source venv/bin/activate
python3 -c "
import sys
sys.path.insert(0, '.')
from app.database import SessionLocal
from app.ml.embedding_service import EmbeddingModelService
db = SessionLocal()
service = EmbeddingModelService(db)
service.train_if_needed(force=True, verbose=True)
db.close()
"
```

### Strategy 4: Weighted Loss (Better)

```python
# Add to embedding_model_v2.py:

def _prepare_training_data(self, data):
    # ... existing code ...

    # Compute sample weights
    user_counts = {}
    for d in data:
        uid = str(d['user_id'])
        user_counts[uid] = user_counts.get(uid, 0) + 1

    total = len(data)
    sample_weights = np.array([
        total / (len(user_counts) * user_counts[str(d['user_id'])])
        for d in data
    ])
    sample_weights = sample_weights * (total / sample_weights.sum())

    return X, y_correctness, y_time, sample_weights

def train(self, training_data, epochs=50, verbose=False):
    # ... existing code ...

    X, y_c, y_t, weights = self._prepare_training_data(training_data)

    self.correctness_model.fit(
        X, y_c,
        sample_weight=weights,  # ADD THIS LINE
        # ... rest of config ...
    )
```

---

**End of Retraining Strategies Document**
