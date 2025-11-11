# AI Components & Implementation

We built a small, practical stack for the list of problems: generating study material, estimating the time needed for each task and optimizing user study schedule for exams. Below is the production breakdown.

**Task generator**: hosted language model accessed via API. Inputs: subject, topic, difficulty, task type. Output: structured text rendered as Markdown/LaTeX.

**Solution generator**: when requested, returns a worked solution using o-4 mini high model, and when requested - students can reveal after an attempt.

**Time & accuracy estimator**: dual-model neural network system on the server. Inputs: user/topic/difficulty embeddings (56D) + 13 performance features (success rates, average times, recent trends). Output: success probability (0-95%) and time estimate (10-300s). Training: automatic every 5 task completions via async background workers. Adaptive rules post-process predictions for early learners (≤3 tasks), high performers (boost), struggling students (reduce), and prediction errors (override).

**Training loop**: anonymized task history updates both embedding model and LNIRT fallback after each session. We do not store raw student content outside our database.

**Schedule optimizer**: hosted language model running through external api which receives data about specific user's time required for completing a set of tasks and adds N amount of tasks into the user's calendar each day according to user's input of busy hours.

**Safety**: server‑side API keys, rate limits, prompt size caps, and content filters.

**Evaluation**: absolute error of time estimates (~±15s for 75% of tasks), prediction accuracy (~85% calibrated), task acceptance rate, and frequency of manual adjustments.

---

# ML Prediction System - Technical Detail

## Architecture

**Hybrid three-layer system**: Embedding neural network (primary) → LNIRT statistical model (fallback) → Adaptive rule-based layer (post-processing)

**Neural Network (TensorFlow/Keras)**:
- Input: User embedding (32D), topic embedding (16D), difficulty embedding (8D), 13 history features
- Hidden layers: Dense 128→64→32 units with BatchNorm, ReLU, Dropout
- Output: Dual-head (success probability via sigmoid, time via softplus)

**13 History Features**:
- Overall: success_rate, avg_time, task_count
- Topic-specific: topic_success, topic_time, topic_count
- Difficulty-specific: diff_success, diff_time, diff_count
- Recent: recent_success, recent_time (last 5 tasks)
- Improvement: success_delta, time_delta

**Adaptive Rules** (applied sequentially):

| Rule | Trigger | Action |
|------|---------|--------|
| Early Learning | ≤3 tasks in topic | Use actual_time × 1.05, map success to 85% |
| Boost | Recent success >80% & improving | Increase by +40% (cap 95%) |
| Reduce | Recent success <20% | Reduce to 15% minimum |
| Override | Prediction error >100% | Use actual performance directly |

## Training & Performance

**Automatic Training**: Every 5 global task completions trigger async retraining (~30s, Adam optimizer, MSE loss, early stopping at 50 epochs)

**Performance Metrics**:
- Prediction accuracy: ~85% (calibrated probability)
- Time error: ±15s for 75% of tasks
- Cold start: 50% → Personalized: 80-90% (after 20+ tasks)
- Adaptation speed: 3-5 tasks to detect improvement/struggle

**Example Evolution** (Sarah, new student, Algebra):
- Task 1: 50%, 60s → ✓30s (default)
- Task 2: 85%, 32s → ✓45s (early learning)
- Task 4: 65%, 42s → ✓30s (ML + adaptive)
- Task 20: 90%, 33s → ✓30s (fully personalized)

## Implementation

**Tech Stack**: TensorFlow/Keras 2.x, PostgreSQL, async workers
**Key Files**: `embedding_model_v2.py` (neural net), `embedding_service.py` (prediction + rules), `lnirt_model.py` (statistical fallback)
**Storage**: Models saved as `.keras` files, loaded on-demand
**Data Flow**: Request → Fetch history → Extract features → Generate embeddings → NN prediction → Apply rules → Final output

---

**Version**: 2.0 | **Updated**: November 2025
