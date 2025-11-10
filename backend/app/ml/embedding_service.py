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

from .embedding_model import TaskPredictionModel


class EmbeddingModelService:
    """
    Service for managing embedding-based task prediction

    Features:
    - Automatic training trigger every 5 new tasks
    - Predicts correctness and time using LSTM with embeddings
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
        self.model.train(training_data, epochs=20, verbose=verbose)

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
        self.model.train(training_data, epochs=20, verbose=verbose)

        # Reset counter
        self._reset_training_counter(len(training_data))

        return {
            'status': 'success',
            'n_samples': len(training_data),
            'message': f'Training complete with {len(training_data)} samples'
        }

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

        # Predict
        correctness_prob, estimated_time = self.model.predict(history, next_task)

        return correctness_prob, estimated_time

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
            'model_type': 'embedding_lstm'
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
            'model_type': 'embedding_lstm',
            'last_trained_at': tracker['last_trained_at'],
            'n_samples_total': len(all_tasks),
            'n_samples_last_training': tracker['n_samples_last_training'],
            'n_samples_since_training': tracker['n_samples_since_training'],
            'training_threshold': self.TRAINING_THRESHOLD,
            'next_training_in': max(0, self.TRAINING_THRESHOLD - tracker['n_samples_since_training']),
            'model_loaded': self.model.correctness_model is not None
        }
