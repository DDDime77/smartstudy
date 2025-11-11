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

# ML Prediction System

## What It Does

The system acts like a **personal tutor** that learns each student's ability and predicts two things for every practice task: **(1) Will they answer correctly?** (0-95% probability) and **(2) How long will it take?** (10-300 seconds). Predictions improve as students complete more tasks.

## How It Works

**Step 1 - Collect Data**: When you complete a task, we record: correct/incorrect, time taken, topic, difficulty.

**Step 2 - Learn Patterns**: A neural network (3-layer, 128→64→32 neurons) learns from all students' data. It creates unique "fingerprints" for each student (32 numbers), each topic (16 numbers), and each difficulty (8 numbers). It also tracks 13 performance metrics: overall success rate, topic-specific performance, recent trends (last 5 tasks), improvement speed.

**Step 3 - Make Smart Adjustments**: Four rules fine-tune predictions in real-time:
- **New learner** (≤3 tasks): Use your actual performance, not predictions
- **Doing great** (>80% recent success): Boost confidence +40% (max 95%)
- **Struggling** (<20% recent success): Lower to 15% minimum, offer easier content
- **Big mismatch** (predicted 60s but you take 120s): Trust your actual speed

**Step 4 - Keep Learning**: Every 5 task completions (from any student) trigger automatic retraining (~30 seconds in background). Your predictions get more accurate over time.

## Performance

| Metric | Value | What It Means |
|--------|-------|---------------|
| Accuracy | ~85% | If we predict 80% success, you succeed ~80% of the time |
| Time error | ±15s | Predictions within 15 seconds for 75% of tasks |
| Cold start | 50% | First task with no data (generic guess) |
| Personalized | 80-90% | After 20+ tasks (knows your abilities well) |
| Adapts in | 3-5 tasks | Detects if you're improving or struggling |

## Example: Sarah Learns Algebra

| Task | Prediction | Actual | Why? |
|------|------------|--------|------|
| 1 | 50%, 60s | ✓ 30s | No data yet—system guesses average |
| 2 | 85%, 32s | ✓ 45s | "You did well! Predicting similar success" |
| 4 | 65%, 42s | ✓ 30s | Got one wrong → confidence adjusts down |
| 20 | 90%, 33s | ✓ 30s | System knows Sarah well—accurate prediction |

**Tech**: TensorFlow neural network + PostgreSQL database + async training workers
**Files**: `embedding_model_v2.py`, `embedding_service.py`, `lnirt_model.py`

---
*Version 2.0 | November 2025*
