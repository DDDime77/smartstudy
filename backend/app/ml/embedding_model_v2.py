"""
Embedding-Based Model V2 - Redesigned for Better Learning

Key improvements:
1. User history aggregation (recent performance features)
2. Simplified architecture - Feed-forward instead of LSTM
3. Better feature engineering
4. Per-user, per-topic, per-difficulty learning
5. More interpretable predictions

Architecture:
- User embedding (learns user ability)
- Topic embedding (learns topic difficulty)
- Difficulty embedding
- History features: recent success rate, avg time, task count
- Dense layers with dropout
- Separate heads for correctness and time
"""

import os

# Configure TensorFlow for CPU-only mode
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['CUDA_VISIBLE_DEVICES'] = '-1'

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import json
from collections import defaultdict

# Set CPU-only mode
tf.config.set_visible_devices([], 'GPU')


class TaskPredictionModelV2:
    """
    Improved embedding-based model for task prediction

    Uses aggregated history features instead of pure sequence model
    """

    def __init__(self, model_dir: str = None):
        # Use absolute path
        if model_dir is None:
            current_file = Path(__file__).resolve()
            model_dir = current_file.parent / "models_v2"
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)

        # Model components
        self.correctness_model: Optional[keras.Model] = None
        self.time_model: Optional[keras.Model] = None

        # Metadata
        self.metadata = {
            'user_ids': {},
            'topics': {},
            'difficulties': {},
            'n_users': 0,
            'n_topics': 0,
            'n_difficulties': 3,
        }

        # Embedding dimensions
        self.user_embedding_dim = 32
        self.topic_embedding_dim = 16
        self.difficulty_embedding_dim = 8

        # Load if exists
        self._load_metadata()
        self._load_models()

    def _get_embedding_dim(self, n_categories: int, min_dim: int = 8, max_dim: int = 64) -> int:
        """Calculate optimal embedding dimension"""
        dim = int(n_categories ** 0.25 * 8)
        return max(min_dim, min(dim, max_dim))

    def _update_metadata(self, data: List[Dict]):
        """Update metadata with new categories"""

        user_ids_set = set()
        topics_set = set()
        difficulties_set = set()

        for sample in data:
            user_ids_set.add(str(sample['user_id']))
            topics_set.add(sample['topic'])
            difficulties_set.add(sample['difficulty'])

        # Update mappings
        for user_id in user_ids_set:
            if user_id not in self.metadata['user_ids']:
                self.metadata['user_ids'][user_id] = len(self.metadata['user_ids'])

        for topic in topics_set:
            if topic not in self.metadata['topics']:
                self.metadata['topics'][topic] = len(self.metadata['topics'])

        difficulty_order = ['easy', 'medium', 'hard']
        for i, diff in enumerate(difficulty_order):
            if diff in difficulties_set and diff not in self.metadata['difficulties']:
                self.metadata['difficulties'][diff] = i

        # Update counts
        self.metadata['n_users'] = len(self.metadata['user_ids'])
        self.metadata['n_topics'] = len(self.metadata['topics'])
        self.metadata['n_difficulties'] = 3

    def _compute_user_history_features(self, data: List[Dict], user_id: str, topic: str,
                                       difficulty: str) -> Dict[str, float]:
        """
        Compute aggregated history features for a user

        Returns features like:
        - Success rate (overall, per topic, per difficulty)
        - Average time (overall, per topic, per difficulty)
        - Task counts
        - Recent performance (last 5 tasks)
        """

        user_tasks = [t for t in data if str(t['user_id']) == user_id and 'correct' in t]

        if not user_tasks:
            return {
                'overall_success_rate': 0.5,
                'overall_avg_time': 60.0,
                'overall_task_count': 0.0,
                'topic_success_rate': 0.5,
                'topic_avg_time': 60.0,
                'topic_task_count': 0.0,
                'difficulty_success_rate': 0.5,
                'difficulty_avg_time': 60.0,
                'difficulty_task_count': 0.0,
                'recent_success_rate': 0.5,
                'recent_avg_time': 60.0,
            }

        # Overall stats
        overall_correct = [t['correct'] for t in user_tasks]
        overall_times = [t['actual_time'] for t in user_tasks]

        # Topic-specific stats
        topic_tasks = [t for t in user_tasks if t['topic'] == topic]
        topic_correct = [t['correct'] for t in topic_tasks] if topic_tasks else [0.5]
        topic_times = [t['actual_time'] for t in topic_tasks] if topic_tasks else [60.0]

        # Difficulty-specific stats
        diff_tasks = [t for t in user_tasks if t['difficulty'] == difficulty]
        diff_correct = [t['correct'] for t in diff_tasks] if diff_tasks else [0.5]
        diff_times = [t['actual_time'] for t in diff_tasks] if diff_tasks else [60.0]

        # Recent performance (last 5 tasks)
        recent_tasks = user_tasks[-5:]
        recent_correct = [t['correct'] for t in recent_tasks]
        recent_times = [t['actual_time'] for t in recent_tasks]

        return {
            'overall_success_rate': float(np.mean(overall_correct)),
            'overall_avg_time': float(np.mean(overall_times)),
            'overall_task_count': float(len(user_tasks)) / 100.0,  # Normalized
            'topic_success_rate': float(np.mean(topic_correct)),
            'topic_avg_time': float(np.mean(topic_times)) / 100.0,  # Normalized
            'topic_task_count': float(len(topic_tasks)) / 20.0,  # Normalized
            'difficulty_success_rate': float(np.mean(diff_correct)),
            'difficulty_avg_time': float(np.mean(diff_times)) / 100.0,  # Normalized
            'difficulty_task_count': float(len(diff_tasks)) / 20.0,  # Normalized
            'recent_success_rate': float(np.mean(recent_correct)),
            'recent_avg_time': float(np.mean(recent_times)) / 100.0,  # Normalized
        }

    def _build_correctness_model(self):
        """Build model for predicting correctness"""

        if self.metadata['n_users'] == 0 or self.metadata['n_topics'] == 0:
            raise ValueError(f"Cannot build model with 0 users or topics")

        # Update embedding dimensions
        self.user_embedding_dim = self._get_embedding_dim(self.metadata['n_users'], 16, 64)
        self.topic_embedding_dim = self._get_embedding_dim(self.metadata['n_topics'], 8, 32)

        # Input layers
        user_input = layers.Input(shape=(1,), dtype=tf.int32, name='user_id')
        topic_input = layers.Input(shape=(1,), dtype=tf.int32, name='topic')
        difficulty_input = layers.Input(shape=(1,), dtype=tf.int32, name='difficulty')
        history_input = layers.Input(shape=(11,), dtype=tf.float32, name='history_features')

        # Embeddings
        user_emb = layers.Embedding(self.metadata['n_users'], self.user_embedding_dim)(user_input)
        user_emb = layers.Flatten()(user_emb)

        topic_emb = layers.Embedding(self.metadata['n_topics'], self.topic_embedding_dim)(topic_input)
        topic_emb = layers.Flatten()(topic_emb)

        diff_emb = layers.Embedding(self.metadata['n_difficulties'], self.difficulty_embedding_dim)(difficulty_input)
        diff_emb = layers.Flatten()(diff_emb)

        # Concatenate all features
        concat = layers.Concatenate()([user_emb, topic_emb, diff_emb, history_input])

        # Dense layers
        x = layers.Dense(128, activation='relu')(concat)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(0.3)(x)

        x = layers.Dense(64, activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(0.2)(x)

        x = layers.Dense(32, activation='relu')(x)
        x = layers.Dropout(0.1)(x)

        # Output layer
        output = layers.Dense(1, activation='sigmoid', name='correctness')(x)

        # Build model
        model = keras.Model(
            inputs=[user_input, topic_input, difficulty_input, history_input],
            outputs=output,
            name='correctness_model_v2'
        )

        # Compile
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='binary_crossentropy',
            metrics=['accuracy', keras.metrics.AUC(name='auc')]
        )

        return model

    def _build_time_model(self):
        """Build model for predicting time"""

        if self.metadata['n_users'] == 0 or self.metadata['n_topics'] == 0:
            raise ValueError(f"Cannot build model with 0 users or topics")

        # Input layers (same as correctness model)
        user_input = layers.Input(shape=(1,), dtype=tf.int32, name='user_id')
        topic_input = layers.Input(shape=(1,), dtype=tf.int32, name='topic')
        difficulty_input = layers.Input(shape=(1,), dtype=tf.int32, name='difficulty')
        history_input = layers.Input(shape=(11,), dtype=tf.float32, name='history_features')

        # Embeddings
        user_emb = layers.Embedding(self.metadata['n_users'], self.user_embedding_dim)(user_input)
        user_emb = layers.Flatten()(user_emb)

        topic_emb = layers.Embedding(self.metadata['n_topics'], self.topic_embedding_dim)(topic_input)
        topic_emb = layers.Flatten()(topic_emb)

        diff_emb = layers.Embedding(self.metadata['n_difficulties'], self.difficulty_embedding_dim)(difficulty_input)
        diff_emb = layers.Flatten()(diff_emb)

        # Concatenate
        concat = layers.Concatenate()([user_emb, topic_emb, diff_emb, history_input])

        # Dense layers
        x = layers.Dense(128, activation='relu')(concat)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(0.3)(x)

        x = layers.Dense(64, activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(0.2)(x)

        x = layers.Dense(32, activation='relu')(x)
        x = layers.Dropout(0.1)(x)

        # Output layer (positive values only, reasonable range)
        x = layers.Dense(16, activation='relu')(x)
        output = layers.Dense(1, activation='softplus', name='time')(x)  # softplus ensures positive

        # Build model
        model = keras.Model(
            inputs=[user_input, topic_input, difficulty_input, history_input],
            outputs=output,
            name='time_model_v2'
        )

        # Compile
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='mse',
            metrics=['mae']
        )

        return model

    def _prepare_training_data(self, data: List[Dict]) -> Tuple:
        """
        Prepare training data with history features
        """

        user_ids = []
        topics = []
        difficulties = []
        history_features = []
        correctness_targets = []
        time_targets = []

        for sample in data:
            user_id = str(sample['user_id'])
            topic = sample['topic']
            difficulty = sample['difficulty']

            # Skip if not in metadata
            if (user_id not in self.metadata['user_ids'] or
                topic not in self.metadata['topics'] or
                difficulty not in self.metadata['difficulties']):
                continue

            # Compute history features
            hist_features = self._compute_user_history_features(data, user_id, topic, difficulty)

            # Append
            user_ids.append(self.metadata['user_ids'][user_id])
            topics.append(self.metadata['topics'][topic])
            difficulties.append(self.metadata['difficulties'][difficulty])

            history_features.append([
                hist_features['overall_success_rate'],
                hist_features['overall_avg_time'],
                hist_features['overall_task_count'],
                hist_features['topic_success_rate'],
                hist_features['topic_avg_time'],
                hist_features['topic_task_count'],
                hist_features['difficulty_success_rate'],
                hist_features['difficulty_avg_time'],
                hist_features['difficulty_task_count'],
                hist_features['recent_success_rate'],
                hist_features['recent_avg_time'],
            ])

            correctness_targets.append(float(sample['correct']))
            time_targets.append(float(sample['actual_time']))

        # Convert to numpy arrays
        X = {
            'user_id': np.array(user_ids).reshape(-1, 1),
            'topic': np.array(topics).reshape(-1, 1),
            'difficulty': np.array(difficulties).reshape(-1, 1),
            'history_features': np.array(history_features),
        }

        y_correctness = np.array(correctness_targets)
        y_time = np.array(time_targets)

        return X, y_correctness, y_time

    def train(self, training_data: List[Dict], epochs: int = 50, verbose: bool = True):
        """
        Train both models

        training_data format: same as V1
        """

        if verbose:
            print(f"\n{'='*80}")
            print(f"Training Embedding Model V2 with {len(training_data)} samples")
            print(f"{'='*80}")

        # Update metadata
        self._update_metadata(training_data)

        # Build models if needed
        if self.correctness_model is None:
            if verbose:
                print(f"\nBuilding models...")
                print(f"  Users: {self.metadata['n_users']} (embedding: {self.user_embedding_dim})")
                print(f"  Topics: {self.metadata['n_topics']} (embedding: {self.topic_embedding_dim})")
                print(f"  Difficulties: {self.metadata['n_difficulties']} (embedding: {self.difficulty_embedding_dim})")

            self.correctness_model = self._build_correctness_model()
            self.time_model = self._build_time_model()

        # Prepare training data
        X, y_correctness, y_time = self._prepare_training_data(training_data)

        if verbose:
            print(f"\nTraining samples: {len(y_correctness)}")
            print(f"Correctness distribution: {y_correctness.mean():.2%} correct")
            print(f"Time range: {y_time.min():.0f}s - {y_time.max():.0f}s (mean: {y_time.mean():.0f}s)")

        # Train correctness model
        if verbose:
            print(f"\n{'='*80}")
            print("Training Correctness Model")
            print(f"{'='*80}")

        self.correctness_model.fit(
            X, y_correctness,
            epochs=epochs,
            batch_size=32,
            validation_split=0.2,
            verbose=1 if verbose else 0,
            callbacks=[
                keras.callbacks.EarlyStopping(
                    monitor='val_loss',
                    patience=10,
                    restore_best_weights=True,
                    verbose=1 if verbose else 0
                ),
                keras.callbacks.ReduceLROnPlateau(
                    monitor='val_loss',
                    factor=0.5,
                    patience=5,
                    verbose=1 if verbose else 0
                )
            ]
        )

        # Train time model
        if verbose:
            print(f"\n{'='*80}")
            print("Training Time Model")
            print(f"{'='*80}")

        self.time_model.fit(
            X, y_time,
            epochs=epochs,
            batch_size=32,
            validation_split=0.2,
            verbose=1 if verbose else 0,
            callbacks=[
                keras.callbacks.EarlyStopping(
                    monitor='val_loss',
                    patience=10,
                    restore_best_weights=True,
                    verbose=1 if verbose else 0
                ),
                keras.callbacks.ReduceLROnPlateau(
                    monitor='val_loss',
                    factor=0.5,
                    patience=5,
                    verbose=1 if verbose else 0
                )
            ]
        )

        # Save models
        self._save_models()
        self._save_metadata()

        if verbose:
            print(f"\n{'='*80}")
            print("✅ Training Complete!")
            print(f"{'='*80}\n")

    def predict(self, user_history: List[Dict], user_id: str, topic: str, difficulty: str) -> Tuple[float, float]:
        """
        Predict correctness and time

        Args:
            user_history: List of completed tasks for this user
            user_id: User ID string
            topic: Topic string
            difficulty: Difficulty string

        Returns:
            (correctness_probability, estimated_time_seconds)
        """

        if self.correctness_model is None or self.time_model is None:
            return 0.5, 60.0

        # Check if categories are known
        if (user_id not in self.metadata['user_ids'] or
            topic not in self.metadata['topics'] or
            difficulty not in self.metadata['difficulties']):
            return 0.5, 60.0

        # Compute history features
        hist_features = self._compute_user_history_features(user_history, user_id, topic, difficulty)

        # Prepare input
        X = {
            'user_id': np.array([[self.metadata['user_ids'][user_id]]]),
            'topic': np.array([[self.metadata['topics'][topic]]]),
            'difficulty': np.array([[self.metadata['difficulties'][difficulty]]]),
            'history_features': np.array([[
                hist_features['overall_success_rate'],
                hist_features['overall_avg_time'],
                hist_features['overall_task_count'],
                hist_features['topic_success_rate'],
                hist_features['topic_avg_time'],
                hist_features['topic_task_count'],
                hist_features['difficulty_success_rate'],
                hist_features['difficulty_avg_time'],
                hist_features['difficulty_task_count'],
                hist_features['recent_success_rate'],
                hist_features['recent_avg_time'],
            ]]),
        }

        # Predict
        correctness_prob = float(self.correctness_model.predict(X, verbose=0)[0][0])
        estimated_time = float(self.time_model.predict(X, verbose=0)[0][0])

        # Clip to reasonable bounds
        correctness_prob = float(np.clip(correctness_prob, 0.01, 0.99))
        estimated_time = float(np.clip(estimated_time, 5.0, 600.0))

        return correctness_prob, estimated_time

    def _save_models(self):
        """Save models to disk"""
        if self.correctness_model:
            self.correctness_model.save(self.model_dir / 'correctness_model.keras')
        if self.time_model:
            self.time_model.save(self.model_dir / 'time_model.keras')

    def _load_models(self):
        """Load models from disk"""
        correctness_path = self.model_dir / 'correctness_model.keras'
        time_path = self.model_dir / 'time_model.keras'

        if correctness_path.exists():
            try:
                self.correctness_model = keras.models.load_model(correctness_path)
            except Exception as e:
                print(f"Warning: Could not load correctness model: {e}")

        if time_path.exists():
            try:
                self.time_model = keras.models.load_model(time_path)
            except Exception as e:
                print(f"Warning: Could not load time model: {e}")

    def _save_metadata(self):
        """Save metadata to disk"""
        with open(self.model_dir / 'metadata.json', 'w') as f:
            json.dump(self.metadata, f, indent=2)

    def _load_metadata(self):
        """Load metadata from disk"""
        metadata_path = self.model_dir / 'metadata.json'
        if metadata_path.exists():
            with open(metadata_path, 'r') as f:
                self.metadata = json.load(f)

                # Update embedding dimensions based on loaded metadata
                if self.metadata.get('n_users', 0) > 0:
                    self.user_embedding_dim = self._get_embedding_dim(self.metadata['n_users'], 16, 64)
                if self.metadata.get('n_topics', 0) > 0:
                    self.topic_embedding_dim = self._get_embedding_dim(self.metadata['n_topics'], 8, 32)
