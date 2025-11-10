"""
LNIRT Service for SmartStudy
Handles predictions, training, and database integration for LNIRT model
"""

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Tuple, Optional
from uuid import UUID
import json
from datetime import datetime

from .lnirt_model import TopicLNIRTModel, TopicModelManager


class LNIRTService:
    """
    Service layer for LNIRT predictions and training
    Integrates with PostgreSQL database
    """

    def __init__(self, db: Session):
        self.db = db
        self.model_manager = TopicModelManager()

    # ==================== PREDICTION ====================

    def predict(
        self,
        user_id: UUID,
        topic: str,
        difficulty: str  # 'easy', 'medium', 'hard'
    ) -> Tuple[float, float]:
        """
        Predict correctness probability and expected time for a task

        Args:
            user_id: User UUID
            topic: Topic name (e.g., 'calculus', 'algebra')
            difficulty: Difficulty level ('easy', 'medium', 'hard')

        Returns:
            (predicted_correct, predicted_time_seconds)
        """
        # Map string difficulty to numeric
        difficulty_map = {'easy': 1, 'medium': 2, 'hard': 3}
        diff_numeric = difficulty_map.get(difficulty.lower(), 2)

        # Load or initialize model for this topic
        model = self._get_or_create_model(topic)

        # Make prediction
        user_id_str = str(user_id)
        p_correct, expected_time = model.predict(user_id_str, diff_numeric)

        return p_correct, expected_time

    def predict_and_save(
        self,
        user_id: UUID,
        topic: str,
        difficulty: str
    ) -> Dict:
        """
        Make prediction and prepare data for saving with task

        Returns:
            Dict with prediction data and model version
        """
        p_correct, expected_time = self.predict(user_id, topic, difficulty)

        return {
            'predicted_correct': float(p_correct),
            'predicted_time_seconds': int(expected_time),
            'lnirt_model_version': 'v1.0'  # Track model version
        }

    # ==================== TRAINING ====================

    def train_general(self, topic: str, verbose: bool = False) -> Dict:
        """
        Train general model for a topic using all available training data

        Args:
            topic: Topic name
            verbose: Print training progress

        Returns:
            Dict with training statistics
        """
        # Fetch training data from database
        query = text("""
            SELECT
                user_id::text as user_id,
                difficulty,
                correct,
                response_time_seconds as response_time
            FROM lnirt_training_data
            WHERE topic = :topic
              AND used_for_general_training = FALSE
            ORDER BY created_at ASC
        """)

        result = self.db.execute(query, {"topic": topic})
        rows = result.fetchall()

        if not rows:
            return {"status": "no_new_data", "n_samples": 0}

        # Convert to DataFrame
        data = pd.DataFrame(rows, columns=['user_id', 'difficulty', 'correct', 'response_time'])

        # Load or create model
        model = self._get_or_create_model(topic)

        # Train model
        model.fit(data, verbose=verbose)

        # Save model to database
        self._save_model_to_db(topic, model, len(data))

        # Mark data as used for training
        update_query = text("""
            UPDATE lnirt_training_data
            SET used_for_general_training = TRUE
            WHERE topic = :topic
              AND used_for_general_training = FALSE
        """)
        self.db.execute(update_query, {"topic": topic})
        self.db.commit()

        return {
            "status": "success",
            "n_samples": len(data),
            "n_users": len(data['user_id'].unique()),
            "topic": topic
        }

    def train_user_specific(
        self,
        user_id: UUID,
        topic: str,
        verbose: bool = False
    ) -> Dict:
        """
        Train personalized model for a specific user
        Uses error-aware training with predicted vs actual data

        Args:
            user_id: User UUID
            topic: Topic name
            verbose: Print training progress

        Returns:
            Dict with training statistics
        """
        user_id_str = str(user_id)

        # Fetch user-specific training data with predictions
        query = text("""
            SELECT * FROM get_user_training_data(:user_id, :topic, 100)
        """)

        result = self.db.execute(query, {"user_id": user_id, "topic": topic})
        rows = result.fetchall()

        if not rows:
            return {"status": "no_data", "n_samples": 0}

        # Convert to DataFrame
        data = pd.DataFrame(rows, columns=[
            'difficulty', 'correct', 'response_time',
            'predicted_correct', 'predicted_time', 'created_at'
        ])

        # Filter out rows without predictions (needed for error-aware training)
        data_with_predictions = data[data['predicted_correct'].notna()].copy()

        if len(data_with_predictions) == 0:
            return {"status": "no_predictions", "n_samples": 0}

        # Rename columns for consistency with model
        data_with_predictions = data_with_predictions.rename(columns={
            'response_time': 'response_time',
            'predicted_time': 'predicted_time'
        })
        data_with_predictions['user_id'] = user_id_str

        # Load or create model
        model = self._get_or_create_model(topic)

        # Run error-aware user-specific training
        model.fit_user_specific(data_with_predictions, user_id_str, verbose=verbose)

        # Save updated model to database
        self._save_model_to_db(topic, model, len(data_with_predictions))

        return {
            "status": "success",
            "n_samples": len(data_with_predictions),
            "user_id": user_id_str,
            "topic": topic,
            "theta": model.user_params[user_id_str]['theta'],
            "tau": model.user_params[user_id_str]['tau']
        }

    def auto_train_on_completion(
        self,
        user_id: UUID,
        topic: str
    ) -> Dict:
        """
        Automatically trigger user-specific training when task is completed
        This is called after a user marks a task as correct/incorrect

        Args:
            user_id: User UUID
            topic: Topic name

        Returns:
            Dict with training results
        """
        return self.train_user_specific(user_id, topic, verbose=False)

    # ==================== DATABASE INTEGRATION ====================

    def _get_or_create_model(self, topic: str) -> TopicLNIRTModel:
        """
        Load model from database or create new one

        Args:
            topic: Topic name

        Returns:
            TopicLNIRTModel instance
        """
        # Try to load from database first
        query = text("""
            SELECT
                difficulty_params,
                user_params,
                sigma
            FROM lnirt_models
            WHERE topic = :topic
            ORDER BY last_trained_at DESC
            LIMIT 1
        """)

        result = self.db.execute(query, {"topic": topic})
        row = result.fetchone()

        model = TopicLNIRTModel(topic)

        if row:
            # Load existing model
            difficulty_params = row[0]  # JSONB
            user_params = row[1]  # JSONB
            sigma = row[2]

            # Convert JSON keys to integers for difficulty_params
            model.difficulty_params = {
                int(k): v for k, v in difficulty_params.items()
            }
            model.user_params = user_params
            model.sigma = sigma
            model.is_trained = True
        else:
            # New model with default parameters
            model.is_trained = False

        return model

    def _save_model_to_db(
        self,
        topic: str,
        model: TopicLNIRTModel,
        n_samples: int
    ):
        """
        Save trained model to database

        Args:
            topic: Topic name
            model: Trained model
            n_samples: Number of training samples
        """
        # Convert difficulty_params keys to strings for JSON
        difficulty_params_json = {
            str(k): v for k, v in model.difficulty_params.items()
        }

        # Upsert model
        query = text("""
            INSERT INTO lnirt_models (
                topic,
                model_version,
                n_users,
                n_training_samples,
                last_trained_at,
                difficulty_params,
                user_params,
                sigma,
                created_at,
                updated_at
            )
            VALUES (
                :topic,
                'v1.0',
                :n_users,
                :n_samples,
                :now,
                :difficulty_params,
                :user_params,
                :sigma,
                :now,
                :now
            )
            ON CONFLICT (topic, model_version)
            DO UPDATE SET
                n_users = :n_users,
                n_training_samples = lnirt_models.n_training_samples + :n_samples,
                last_trained_at = :now,
                difficulty_params = :difficulty_params,
                user_params = :user_params,
                sigma = :sigma,
                updated_at = :now
        """)

        self.db.execute(query, {
            "topic": topic,
            "n_users": len(model.user_params),
            "n_samples": n_samples,
            "now": datetime.utcnow(),
            "difficulty_params": json.dumps(difficulty_params_json),
            "user_params": json.dumps(model.user_params),
            "sigma": model.sigma
        })
        self.db.commit()

    # ==================== UTILITY ====================

    def get_model_stats(self, topic: str) -> Optional[Dict]:
        """
        Get statistics about trained model for a topic

        Args:
            topic: Topic name

        Returns:
            Dict with model statistics or None if not found
        """
        query = text("""
            SELECT
                model_version,
                n_users,
                n_training_samples,
                last_trained_at,
                difficulty_params
            FROM lnirt_models
            WHERE topic = :topic
            ORDER BY last_trained_at DESC
            LIMIT 1
        """)

        result = self.db.execute(query, {"topic": topic})
        row = result.fetchone()

        if not row:
            return None

        return {
            "topic": topic,
            "model_version": row[0],
            "n_users": row[1],
            "n_training_samples": row[2],
            "last_trained_at": row[3].isoformat(),
            "difficulty_params": row[4]
        }

    def get_user_parameters(
        self,
        user_id: UUID,
        topic: str
    ) -> Optional[Dict]:
        """
        Get user's personalized parameters for a topic

        Args:
            user_id: User UUID
            topic: Topic name

        Returns:
            Dict with theta and tau or None if not found
        """
        model = self._get_or_create_model(topic)
        user_id_str = str(user_id)

        if user_id_str in model.user_params:
            return {
                "user_id": user_id_str,
                "topic": topic,
                "theta": model.user_params[user_id_str]['theta'],
                "tau": model.user_params[user_id_str]['tau'],
                "is_personalized": True
            }

        # Return population average
        if model.user_params:
            avg_theta = np.mean([p['theta'] for p in model.user_params.values()])
            avg_tau = np.mean([p['tau'] for p in model.user_params.values()])
            return {
                "user_id": user_id_str,
                "topic": topic,
                "theta": avg_theta,
                "tau": avg_tau,
                "is_personalized": False
            }

        return None


# ==================== HELPER FUNCTIONS ====================

def get_lnirt_service(db: Session) -> LNIRTService:
    """Get LNIRT service instance"""
    return LNIRTService(db)
