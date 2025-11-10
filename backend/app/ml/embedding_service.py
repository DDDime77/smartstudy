"""
Embedding Model Service

Manages embedding-based prediction models with automatic retraining
Trains every 5 new completed tasks globally
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from uuid import UUID
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import json

from .embedding_model_v2 import TaskPredictionModelV2 as TaskPredictionModel


class EmbeddingModelService:
    """
    Service for managing embedding-based task prediction

    Features:
    - Automatic training trigger every 5 new tasks
    - Predicts correctness and time using feed-forward NN with history features
    - Handles all users/topics in one global model
    """

    # Training trigger threshold
    TRAINING_THRESHOLD = 5

    def __init__(self, db: Session):
        self.db = db
        self.model = TaskPredictionModel()

        # Initialize training tracker in database if needed
        self._init_training_tracker()

    def _init_training_tracker(self):
        """Initialize training tracker table if it doesn't exist"""

        # Check if table exists
        result = self.db.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'embedding_model_tracker'
            )
        """))
        exists = result.scalar()

        if not exists:
            # Create table
            self.db.execute(text("""
                CREATE TABLE embedding_model_tracker (
                    id SERIAL PRIMARY KEY,
                    last_trained_at TIMESTAMP,
                    n_samples_last_training INTEGER DEFAULT 0,
                    n_samples_since_training INTEGER DEFAULT 0,
                    model_version VARCHAR(50) DEFAULT 'v1.0',
                    metadata JSONB DEFAULT '{}'::jsonb,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))

            # Insert initial row
            self.db.execute(text("""
                INSERT INTO embedding_model_tracker (
                    last_trained_at,
                    n_samples_last_training,
                    n_samples_since_training
                ) VALUES (NULL, 0, 0)
            """))

            self.db.commit()

    def _get_tracker_state(self) -> Dict:
        """Get current training tracker state"""
        result = self.db.execute(text("""
            SELECT
                last_trained_at,
                n_samples_last_training,
                n_samples_since_training,
                model_version,
                metadata
            FROM embedding_model_tracker
            LIMIT 1
        """))
        row = result.fetchone()

        if row:
            return {
                'last_trained_at': row[0],
                'n_samples_last_training': row[1],
                'n_samples_since_training': row[2],
                'model_version': row[3],
                'metadata': row[4] or {}
            }
        return {
            'last_trained_at': None,
            'n_samples_last_training': 0,
            'n_samples_since_training': 0,
            'model_version': 'v1.0',
            'metadata': {}
        }

    def _increment_samples_counter(self):
        """Increment counter of samples since last training"""
        self.db.execute(text("""
            UPDATE embedding_model_tracker
            SET n_samples_since_training = n_samples_since_training + 1,
                updated_at = CURRENT_TIMESTAMP
        """))
        self.db.commit()

    def _reset_training_counter(self, n_total_samples: int):
        """Reset counter after training"""
        self.db.execute(text("""
            UPDATE embedding_model_tracker
            SET last_trained_at = CURRENT_TIMESTAMP,
                n_samples_last_training = :n_total,
                n_samples_since_training = 0,
                updated_at = CURRENT_TIMESTAMP
        """), {'n_total': n_total_samples})
        self.db.commit()

    def _should_train(self) -> bool:
        """Check if we should trigger training"""
        tracker = self._get_tracker_state()
        return tracker['n_samples_since_training'] >= self.TRAINING_THRESHOLD

    def _get_all_completed_tasks(self) -> List[Dict]:
        """Fetch all completed tasks for training"""

        query = text("""
            SELECT
                user_id,
                topic,
                difficulty,
                EXTRACT(EPOCH FROM created_at) as timestamp,
                CASE WHEN is_correct THEN 1 ELSE 0 END as correct,
                actual_time_seconds as actual_time
            FROM practice_tasks
            WHERE completed = TRUE
              AND is_correct IS NOT NULL
              AND actual_time_seconds IS NOT NULL
              AND actual_time_seconds > 0
            ORDER BY created_at ASC
        """)

        result = self.db.execute(query)
        rows = result.fetchall()

        data = []
        for row in rows:
            data.append({
                'user_id': str(row[0]),
                'topic': row[1],
                'difficulty': row[2],
                'timestamp': float(row[3]),
                'correct': bool(row[4]),
                'actual_time': float(row[5])
            })

        return data

    def _get_user_history(self, user_id: UUID, topic: Optional[str] = None) -> List[Dict]:
        """Get completed tasks for a specific user"""

        if topic:
            query = text("""
                SELECT
                    user_id,
                    topic,
                    difficulty,
                    EXTRACT(EPOCH FROM created_at) as timestamp,
                    CASE WHEN is_correct THEN 1 ELSE 0 END as correct,
                    actual_time_seconds as actual_time
                FROM practice_tasks
                WHERE user_id = :user_id
                  AND topic = :topic
                  AND completed = TRUE
                  AND is_correct IS NOT NULL
                  AND actual_time_seconds IS NOT NULL
                  AND actual_time_seconds > 0
                ORDER BY created_at ASC
            """)
            result = self.db.execute(query, {'user_id': user_id, 'topic': topic})
        else:
            query = text("""
                SELECT
                    user_id,
                    topic,
                    difficulty,
                    EXTRACT(EPOCH FROM created_at) as timestamp,
                    CASE WHEN is_correct THEN 1 ELSE 0 END as correct,
                    actual_time_seconds as actual_time
                FROM practice_tasks
                WHERE user_id = :user_id
                  AND completed = TRUE
                  AND is_correct IS NOT NULL
                  AND actual_time_seconds IS NOT NULL
                  AND actual_time_seconds > 0
                ORDER BY created_at ASC
            """)
            result = self.db.execute(query, {'user_id': user_id})

        rows = result.fetchall()

        data = []
        for row in rows:
            data.append({
                'user_id': str(row[0]),
                'topic': row[1],
                'difficulty': row[2],
                'timestamp': float(row[3]),
                'correct': bool(row[4]),
                'actual_time': float(row[5])
            })

        return data

    def train_if_needed(self, verbose: bool = False) -> Dict:
        """
        Check if training is needed and train if so

        Returns: {
            'trained': bool,
            'n_samples': int,
            'n_samples_since_last': int,
            'message': str
        }
        """

        tracker = self._get_tracker_state()
        n_since_training = tracker['n_samples_since_training']

        if not self._should_train():
            return {
                'trained': False,
                'n_samples': tracker['n_samples_last_training'],
                'n_samples_since_last': n_since_training,
                'message': f'No training needed ({n_since_training}/{self.TRAINING_THRESHOLD} new samples)'
            }

        # Get all training data
        training_data = self._get_all_completed_tasks()

        if len(training_data) < 10:
            return {
                'trained': False,
                'n_samples': len(training_data),
                'n_samples_since_last': n_since_training,
                'message': f'Insufficient data for training (need 10+, have {len(training_data)})'
            }

        if verbose:
            print(f"\n{'='*90}")
            print(f"EMBEDDING MODEL AUTO-TRAINING TRIGGERED")
            print(f"{'='*90}")
            print(f"New samples since last training: {n_since_training}")
            print(f"Total samples: {len(training_data)}")
            print()

        # Train models
        self.model.train(training_data, epochs=50, verbose=verbose)

        # Reset counter
        self._reset_training_counter(len(training_data))

        return {
            'trained': True,
            'n_samples': len(training_data),
            'n_samples_since_last': n_since_training,
            'message': f'Training complete with {len(training_data)} samples'
        }

    def force_train(self, verbose: bool = True) -> Dict:
        """Force training regardless of counter"""

        training_data = self._get_all_completed_tasks()

        if len(training_data) < 10:
            return {
                'status': 'error',
                'message': f'Insufficient data (need 10+, have {len(training_data)})'
            }

        if verbose:
            print(f"\n{'='*90}")
            print(f"EMBEDDING MODEL FORCED TRAINING")
            print(f"{'='*90}")
            print(f"Total samples: {len(training_data)}")
            print()

        # Train
        self.model.train(training_data, epochs=50, verbose=verbose)

        # Reset counter
        self._reset_training_counter(len(training_data))

        return {
            'status': 'success',
            'n_samples': len(training_data),
            'message': f'Training complete with {len(training_data)} samples'
        }

    def _apply_adaptive_adjustment(self, base_prob: float, base_time: float,
                                   history: List[Dict], topic: str, difficulty: str) -> Tuple[float, float]:
        """
        Apply rule-based adaptive adjustment to ensure correct adaptation direction

        This ensures that predictions adapt in the RIGHT direction:
        - Recent correct tasks → Increase success probability
        - Recent incorrect tasks → Decrease success probability
        """

        # Filter for topic/difficulty
        relevant_tasks = [t for t in history
                         if t['topic'] == topic and t['difficulty'] == difficulty]

        if len(relevant_tasks) == 0:
            # No history - can't adjust
            return base_prob, base_time

        # Analyze recent performance (last 5 tasks, or all if less than 5)
        recent_n = min(5, len(relevant_tasks))
        recent_tasks = relevant_tasks[-recent_n:]
        recent_success_rate = sum(t['correct'] for t in recent_tasks) / len(recent_tasks)
        recent_avg_time = sum(t['actual_time'] for t in recent_tasks) / len(recent_tasks)

        # Calculate overall performance for comparison
        overall_success_rate = sum(t['correct'] for t in relevant_tasks) / len(relevant_tasks)
        overall_avg_time = sum(t['actual_time'] for t in relevant_tasks) / len(relevant_tasks)

        # Compute improvement/decline
        success_improvement = recent_success_rate - overall_success_rate
        time_improvement = overall_avg_time - recent_avg_time  # Positive = getting faster

        # Apply adaptive adjustment
        adjusted_prob = base_prob
        adjusted_time = base_time

        # EARLY LEARNING: For first few tasks, adapt immediately based on actual performance
        if len(relevant_tasks) <= 3:
            # Directly use actual performance for early predictions
            # This ensures predictions immediately reflect recent results
            if recent_success_rate == 1.0:
                # Perfect performance - high confidence
                adjusted_prob = 0.85
            elif recent_success_rate >= 0.8:
                # Very good performance
                adjusted_prob = 0.75
            elif recent_success_rate >= 0.6:
                # Good performance
                adjusted_prob = 0.65
            elif recent_success_rate >= 0.4:
                # Moderate performance
                adjusted_prob = 0.50
            elif recent_success_rate >= 0.2:
                # Struggling
                adjusted_prob = 0.35
            elif recent_success_rate == 0.0:
                # All wrong
                adjusted_prob = 0.15
            else:
                # Between 0 and 0.2
                adjusted_prob = 0.25

            # Adapt time based on actual performance with more direct mapping
            adjusted_time = recent_avg_time * 1.05  # Slight buffer for prediction

            return adjusted_prob, adjusted_time

        # RULE 1: If recent performance is significantly better, boost predictions
        if recent_success_rate > 0.8 and success_improvement > 0.1:
            # User is doing very well recently - boost significantly
            boost_factor = 1.4 + (success_improvement * 0.8)
            adjusted_prob = min(0.95, base_prob * boost_factor)
        elif success_improvement > 0.05:
            # User is improving - boost moderately
            boost_factor = 1.3 + (success_improvement * 0.5)
            adjusted_prob = min(0.95, base_prob * boost_factor)
        elif recent_success_rate > 0.8:
            # Absolute high performance - boost even without improvement
            adjusted_prob = min(0.95, max(0.80, base_prob * 1.2))
        elif recent_success_rate > 0.7:
            # User is doing well - boost slightly
            boost_factor = 1.15
            adjusted_prob = min(0.95, base_prob * boost_factor)

        # RULE 2: If recent performance is significantly worse, reduce predictions
        elif recent_success_rate < 0.3 and success_improvement < -0.1:
            # User is struggling recently - reduce significantly
            reduction_factor = 0.8 + (success_improvement * 0.5)
            adjusted_prob = max(0.05, base_prob * reduction_factor)
        elif success_improvement < -0.05:
            # User is declining - reduce moderately
            reduction_factor = 0.9 + (success_improvement * 0.3)
            adjusted_prob = max(0.05, base_prob * reduction_factor)

        # RULE 2B: Absolute performance check (not just improvement)
        # This catches cases where recent performance is poor but not declining (e.g., consistently failing)
        elif recent_success_rate < 0.2:
            # Recent performance is very poor - set low prediction
            adjusted_prob = 0.15
        elif recent_success_rate < 0.4:
            # Recent performance is below average - reduce prediction
            adjusted_prob = max(0.25, base_prob * 0.7)

        # RULE 3: Adjust time based on recent speed (MORE SENSITIVE)
        if time_improvement > 10:  # Getting faster by 10+ seconds
            # User is getting faster - reduce time prediction
            time_factor = 0.9 - (min(time_improvement, 60) / 300)  # Up to 10% reduction
            adjusted_time = max(10, base_time * time_factor)
        elif time_improvement < -10:  # Getting slower by 10+ seconds
            # User is getting slower - increase time prediction
            time_factor = 1.1 + (min(abs(time_improvement), 60) / 300)  # Up to 10% increase
            adjusted_time = min(300, base_time * time_factor)

        # RULE 4: If predictions are unreasonably low/high, constrain them
        if len(relevant_tasks) >= 10:
            if adjusted_prob < 0.30 and overall_success_rate > 0.5:
                # Model predicts too low when user is actually doing okay
                adjusted_prob = max(0.5, overall_success_rate * 0.9)
            elif adjusted_prob < 0.40 and overall_success_rate > 0.6:
                # Model predicts moderately low when user is doing well
                adjusted_prob = max(0.55, overall_success_rate * 0.85)
            elif adjusted_prob > 0.85 and overall_success_rate < 0.3:
                # Model predicts too high when user is actually struggling
                adjusted_prob = min(0.5, overall_success_rate * 1.2)

        return adjusted_prob, adjusted_time

    def predict(self, user_id: UUID, topic: str, difficulty: str) -> Tuple[float, float]:
        """
        Predict correctness probability and time for next task

        Returns: (correctness_probability, estimated_time_seconds)
        """

        # Get user's task history
        history = self._get_user_history(user_id)

        # Create next task template
        next_task = {
            'user_id': str(user_id),
            'topic': topic,
            'difficulty': difficulty,
            'timestamp': datetime.utcnow().timestamp()
        }

        # Get ML model prediction
        base_prob, base_time = self.model.predict(history, next_task)

        # Apply adaptive adjustment to ensure correct adaptation direction
        adjusted_prob, adjusted_time = self._apply_adaptive_adjustment(
            base_prob, base_time, history, topic, difficulty
        )

        # Log adjustment details for debugging
        if abs(adjusted_prob - base_prob) > 0.05 or abs(adjusted_time - base_time) > 5:
            print(f"[Adaptive Adjustment] {topic} {difficulty}:")
            print(f"  Accuracy: {base_prob:.1%} → {adjusted_prob:.1%} (change: {adjusted_prob - base_prob:+.1%})")
            print(f"  Time: {base_time:.0f}s → {adjusted_time:.0f}s (change: {adjusted_time - base_time:+.0f}s)")

        return adjusted_prob, adjusted_time

    def predict_and_save(self, user_id: UUID, topic: str, difficulty: str) -> Dict:
        """
        Make prediction and return in API format

        Returns: {
            'predicted_correct': float,
            'predicted_time_seconds': float,
            'is_personalized': bool,
            'model_type': str
        }
        """

        correctness_prob, estimated_time = self.predict(user_id, topic, difficulty)

        # Check if user has history
        history = self._get_user_history(user_id)
        is_personalized = len(history) > 0

        return {
            'predicted_correct': correctness_prob,
            'predicted_time_seconds': estimated_time,
            'is_personalized': is_personalized,
            'model_type': 'embedding_v2'
        }

    def on_task_completed(self, user_id: UUID, topic: str, verbose: bool = False, async_training: bool = True) -> Dict:
        """
        Called when a task is completed

        Increments counter and triggers training if needed

        Args:
            async_training: If True, training runs in background thread (non-blocking)

        Returns: {
            'training_triggered': bool,
            'training_scheduled': bool,  # True if background training started
            'counter': int
        }
        """

        # Increment counter
        self._increment_samples_counter()

        # Check if training needed
        if self._should_train():
            if async_training:
                # Start background training
                import threading
                import os
                from dotenv import load_dotenv
                from sqlalchemy import create_engine
                from sqlalchemy.orm import sessionmaker

                def background_train():
                    load_dotenv()
                    bg_engine = create_engine(os.getenv('DATABASE_URL'))
                    BgSession = sessionmaker(bind=bg_engine)
                    bg_db = BgSession()

                    try:
                        print("\n🚀 Starting background training...")
                        bg_service = EmbeddingModelService(bg_db)
                        bg_service.train_if_needed(verbose=True)
                        print("✅ Background training complete\n")
                    except Exception as e:
                        print(f"❌ Background training failed: {e}")
                        import traceback
                        traceback.print_exc()
                    finally:
                        bg_db.close()

                train_thread = threading.Thread(target=background_train, daemon=True)
                train_thread.start()

                tracker = self._get_tracker_state()
                return {
                    'training_triggered': True,
                    'training_scheduled': True,
                    'counter': tracker['n_samples_since_training'],
                    'message': 'Background training started'
                }
            else:
                # Synchronous training (blocks)
                training_result = self.train_if_needed(verbose=verbose)
                return {
                    'training_triggered': training_result['trained'],
                    'training_scheduled': False,
                    'counter': 0,
                    'message': training_result['message']
                }
        else:
            # No training needed
            tracker = self._get_tracker_state()
            return {
                'training_triggered': False,
                'training_scheduled': False,
                'counter': tracker['n_samples_since_training'],
                'message': f"No training needed ({tracker['n_samples_since_training']}/{self.TRAINING_THRESHOLD})"
            }

    def get_status(self) -> Dict:
        """Get current model status"""

        tracker = self._get_tracker_state()
        all_tasks = self._get_all_completed_tasks()

        return {
            'model_type': 'embedding_v2',
            'last_trained_at': tracker['last_trained_at'],
            'n_samples_total': len(all_tasks),
            'n_samples_last_training': tracker['n_samples_last_training'],
            'n_samples_since_training': tracker['n_samples_since_training'],
            'training_threshold': self.TRAINING_THRESHOLD,
            'next_training_in': max(0, self.TRAINING_THRESHOLD - tracker['n_samples_since_training']),
            'model_loaded': self.model.correctness_model is not None
        }
