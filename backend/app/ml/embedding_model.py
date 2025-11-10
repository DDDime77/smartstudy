"""
Embedding-Based Sequence Model for Task Prediction

Uses LSTM with embeddings to predict:
1. Correctness (binary classification)
2. Time estimate (regression)

Architecture:
- Embeddings: user_id, topic, difficulty
- Features: unix_timestamp
- LSTM processes user's complete task history
- Two output heads: correctness and time
"""

import os

# Configure TensorFlow for CPU-only mode (prevent GPU issues)
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['CUDA_VISIBLE_DEVICES'] = '-1'

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import pickle
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import json

# Set CPU-only mode
tf.config.set_visible_devices([], 'GPU')


class TaskPredictionModel:
    """
    Embedding-based sequence model for predicting task outcomes
    """

    def __init__(self, model_dir: str = None):
        # Use absolute path to avoid duplicate backend/backend issue
        if model_dir is None:
            # Get the directory of this file and create models subdirectory
            current_file = Path(__file__).resolve()
            model_dir = current_file.parent / "models"
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)

        # Model components
        self.correctness_model: Optional[keras.Model] = None
        self.time_model: Optional[keras.Model] = None

        # Metadata for embeddings
        self.metadata = {
            'user_ids': {},      # {user_id_str: index}
            'topics': {},        # {topic_str: index}
            'difficulties': {},  # {difficulty_str: index}
            'n_users': 0,
            'n_topics': 0,
            'n_difficulties': 3,  # easy, medium, hard
            'timestamp_mean': 0.0,
            'timestamp_std': 1.0,
            'time_mean': 0.0,
            'time_std': 1.0,
        }

        # Embedding dimensions (will be auto-calculated)
        self.user_embedding_dim = 32
        self.topic_embedding_dim = 16
        self.difficulty_embedding_dim = 4
        self.lstm_units = 64

        # Load if exists
        self._load_metadata()
        self._load_models()

    def _get_embedding_dim(self, n_categories: int, min_dim: int = 4, max_dim: int = 64) -> int:
        """Calculate optimal embedding dimension based on category count"""
        # Rule of thumb: dim = min(max_dim, max(min_dim, n_categories ** 0.25 * 8))
        dim = int(n_categories ** 0.25 * 8)
        return max(min_dim, min(dim, max_dim))

    def _build_correctness_model(self):
        """Build model for predicting correctness (binary classification)"""

        # Safety check
        if self.metadata['n_users'] == 0 or self.metadata['n_topics'] == 0:
            raise ValueError(f"Cannot build model with 0 users or topics (users: {self.metadata['n_users']}, topics: {self.metadata['n_topics']})")

        # Input layers
        user_input = layers.Input(shape=(None,), dtype=tf.int32, name='user_ids')
        topic_input = layers.Input(shape=(None,), dtype=tf.int32, name='topics')
        difficulty_input = layers.Input(shape=(None,), dtype=tf.int32, name='difficulties')
        timestamp_input = layers.Input(shape=(None, 1), dtype=tf.float32, name='timestamps')

        # Calculate embedding dimensions
        self.user_embedding_dim = self._get_embedding_dim(self.metadata['n_users'], 8, 64)
        self.topic_embedding_dim = self._get_embedding_dim(self.metadata['n_topics'], 4, 32)

        # Embedding layers
        user_embedding = layers.Embedding(
            input_dim=self.metadata['n_users'],
            output_dim=self.user_embedding_dim,
            mask_zero=False,
            name='user_embedding'
        )(user_input)

        topic_embedding = layers.Embedding(
            input_dim=self.metadata['n_topics'],
            output_dim=self.topic_embedding_dim,
            mask_zero=False,
            name='topic_embedding'
        )(topic_input)

        difficulty_embedding = layers.Embedding(
            input_dim=self.metadata['n_difficulties'],
            output_dim=self.difficulty_embedding_dim,
            mask_zero=False,
            name='difficulty_embedding'
        )(difficulty_input)

        # Concatenate all features
        concat = layers.Concatenate(axis=-1)([
            user_embedding,
            topic_embedding,
            difficulty_embedding,
            timestamp_input
        ])

        # LSTM layers
        lstm_out = layers.LSTM(self.lstm_units, return_sequences=True)(concat)
        lstm_out = layers.Dropout(0.2)(lstm_out)
        lstm_out = layers.LSTM(self.lstm_units // 2, return_sequences=False)(lstm_out)
        lstm_out = layers.Dropout(0.2)(lstm_out)

        # Dense layers
        dense = layers.Dense(32, activation='relu')(lstm_out)
        dense = layers.Dropout(0.2)(dense)
        dense = layers.Dense(16, activation='relu')(dense)

        # Output layer (sigmoid for binary classification)
        output = layers.Dense(1, activation='sigmoid', name='correctness_output')(dense)

        # Build model
        model = keras.Model(
            inputs=[user_input, topic_input, difficulty_input, timestamp_input],
            outputs=output,
            name='correctness_model'
        )

        # Compile
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='binary_crossentropy',
            metrics=['accuracy', keras.metrics.AUC(name='auc')]
        )

        return model

    def _build_time_model(self):
        """Build model for predicting time (regression)"""

        # Safety check
        if self.metadata['n_users'] == 0 or self.metadata['n_topics'] == 0:
            raise ValueError(f"Cannot build model with 0 users or topics (users: {self.metadata['n_users']}, topics: {self.metadata['n_topics']})")

        # Input layers (same as correctness model)
        user_input = layers.Input(shape=(None,), dtype=tf.int32, name='user_ids')
        topic_input = layers.Input(shape=(None,), dtype=tf.int32, name='topics')
        difficulty_input = layers.Input(shape=(None,), dtype=tf.int32, name='difficulties')
        timestamp_input = layers.Input(shape=(None, 1), dtype=tf.float32, name='timestamps')

        # Embedding layers (same dimensions as correctness model)
        user_embedding = layers.Embedding(
            input_dim=self.metadata['n_users'],
            output_dim=self.user_embedding_dim,
            mask_zero=False,
            name='user_embedding'
        )(user_input)

        topic_embedding = layers.Embedding(
            input_dim=self.metadata['n_topics'],
            output_dim=self.topic_embedding_dim,
            mask_zero=False,
            name='topic_embedding'
        )(topic_input)

        difficulty_embedding = layers.Embedding(
            input_dim=self.metadata['n_difficulties'],
            output_dim=self.difficulty_embedding_dim,
            mask_zero=False,
            name='difficulty_embedding'
        )(difficulty_input)

        # Concatenate
        concat = layers.Concatenate(axis=-1)([
            user_embedding,
            topic_embedding,
            difficulty_embedding,
            timestamp_input
        ])

        # LSTM layers
        lstm_out = layers.LSTM(self.lstm_units, return_sequences=True)(concat)
        lstm_out = layers.Dropout(0.2)(lstm_out)
        lstm_out = layers.LSTM(self.lstm_units // 2, return_sequences=False)(lstm_out)
        lstm_out = layers.Dropout(0.2)(lstm_out)

        # Dense layers
        dense = layers.Dense(32, activation='relu')(lstm_out)
        dense = layers.Dropout(0.2)(dense)
        dense = layers.Dense(16, activation='relu')(dense)

        # Output layer (linear for regression, then exponential to ensure positive)
        output = layers.Dense(1, activation='exponential', name='time_output')(dense)

        # Build model
        model = keras.Model(
            inputs=[user_input, topic_input, difficulty_input, timestamp_input],
            outputs=output,
            name='time_model'
        )

        # Compile
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='mse',
            metrics=['mae']
        )

        return model

    def _update_metadata(self, data: List[Dict]):
        """Update metadata with new categories from data"""

        # Collect unique values
        user_ids_set = set()
        topics_set = set()
        difficulties_set = set()
        timestamps = []
        times = []

        for sample in data:
            user_ids_set.add(str(sample['user_id']))
            topics_set.add(sample['topic'])
            difficulties_set.add(sample['difficulty'])
            timestamps.append(sample['timestamp'])
            if 'actual_time' in sample:
                times.append(sample['actual_time'])

        # Update user_id mapping
        for user_id in user_ids_set:
            if user_id not in self.metadata['user_ids']:
                self.metadata['user_ids'][user_id] = len(self.metadata['user_ids'])

        # Update topic mapping
        for topic in topics_set:
            if topic not in self.metadata['topics']:
                self.metadata['topics'][topic] = len(self.metadata['topics'])

        # Update difficulty mapping (ensure consistent order)
        difficulty_order = ['easy', 'medium', 'hard']
        for i, diff in enumerate(difficulty_order):
            if diff in difficulties_set and diff not in self.metadata['difficulties']:
                self.metadata['difficulties'][diff] = i

        # Update counts
        self.metadata['n_users'] = len(self.metadata['user_ids'])
        self.metadata['n_topics'] = len(self.metadata['topics'])
        self.metadata['n_difficulties'] = 3

        # Update normalization stats
        if timestamps:
            self.metadata['timestamp_mean'] = float(np.mean(timestamps))
            self.metadata['timestamp_std'] = float(np.std(timestamps)) + 1e-8

        if times:
            self.metadata['time_mean'] = float(np.mean(times))
            self.metadata['time_std'] = float(np.std(times)) + 1e-8

    def _prepare_sequences(self, data: List[Dict], for_prediction: bool = False) -> Tuple:
        """
        Prepare sequences for training or prediction

        For training: all completed tasks
        For prediction: history + next task template
        """

        # Group by user
        user_data = {}
        for sample in data:
            user_id = str(sample['user_id'])
            if user_id not in user_data:
                user_data[user_id] = []
            user_data[user_id].append(sample)

        # Sort each user's tasks by timestamp
        for user_id in user_data:
            user_data[user_id].sort(key=lambda x: x['timestamp'])

        # Prepare sequences
        user_ids_seq = []
        topics_seq = []
        difficulties_seq = []
        timestamps_seq = []
        correctness_targets = []
        time_targets = []

        for user_id, tasks in user_data.items():
            if len(tasks) == 0:
                continue

            # For prediction, use all history
            # For training, create sequences of increasing length
            if for_prediction:
                sequences_to_create = [len(tasks)]
            else:
                # Create sequences of lengths 1, 2, 3, ..., len(tasks)
                sequences_to_create = range(1, len(tasks) + 1)

            for seq_len in sequences_to_create:
                seq_tasks = tasks[:seq_len]

                # Encode sequence
                user_ids_encoded = [self.metadata['user_ids'][user_id]] * seq_len
                topics_encoded = [self.metadata['topics'][t['topic']] for t in seq_tasks]
                difficulties_encoded = [self.metadata['difficulties'][t['difficulty']] for t in seq_tasks]
                timestamps_encoded = [(t['timestamp'] - self.metadata['timestamp_mean']) / self.metadata['timestamp_std']
                                     for t in seq_tasks]

                user_ids_seq.append(user_ids_encoded)
                topics_seq.append(topics_encoded)
                difficulties_seq.append(difficulties_encoded)
                timestamps_seq.append(timestamps_encoded)

                # Target is the last task's outcome
                if not for_prediction:
                    correctness_targets.append(float(seq_tasks[-1]['correct']))
                    # Normalize time
                    time_normalized = (seq_tasks[-1]['actual_time'] - self.metadata['time_mean']) / self.metadata['time_std']
                    time_targets.append(time_normalized)

        # Pad sequences
        max_len = max(len(seq) for seq in user_ids_seq) if user_ids_seq else 1

        user_ids_padded = keras.preprocessing.sequence.pad_sequences(user_ids_seq, maxlen=max_len, padding='pre', value=0)
        topics_padded = keras.preprocessing.sequence.pad_sequences(topics_seq, maxlen=max_len, padding='pre', value=0)
        difficulties_padded = keras.preprocessing.sequence.pad_sequences(difficulties_seq, maxlen=max_len, padding='pre', value=0)
        timestamps_padded = keras.preprocessing.sequence.pad_sequences(timestamps_seq, maxlen=max_len, padding='pre', value=0.0, dtype='float32')

        # Reshape timestamps to (batch, seq_len, 1)
        timestamps_padded = np.expand_dims(timestamps_padded, axis=-1)

        if for_prediction:
            return {
                'user_ids': user_ids_padded,
                'topics': topics_padded,
                'difficulties': difficulties_padded,
                'timestamps': timestamps_padded
            }
        else:
            return (
                {
                    'user_ids': user_ids_padded,
                    'topics': topics_padded,
                    'difficulties': difficulties_padded,
                    'timestamps': timestamps_padded
                },
                np.array(correctness_targets),
                np.array(time_targets)
            )

    def train(self, training_data: List[Dict], epochs: int = 20, verbose: bool = True):
        """
        Train both models on new data

        training_data format:
        [
            {
                'user_id': UUID or str,
                'topic': str,
                'difficulty': 'easy'|'medium'|'hard',
                'timestamp': float (unix timestamp),
                'correct': bool or 0/1,
                'actual_time': float (seconds)
            },
            ...
        ]
        """

        if verbose:
            print(f"Training embedding models with {len(training_data)} samples...")

        # Update metadata
        self._update_metadata(training_data)

        # Build models if not exist or if metadata changed
        if (self.correctness_model is None or
            self.correctness_model.input[0].shape[1] != self.metadata['n_users']):
            if verbose:
                print(f"Building models...")
                print(f"  Users: {self.metadata['n_users']} (embedding: {self.user_embedding_dim})")
                print(f"  Topics: {self.metadata['n_topics']} (embedding: {self.topic_embedding_dim})")
                print(f"  Difficulties: {self.metadata['n_difficulties']} (embedding: {self.difficulty_embedding_dim})")

            self.correctness_model = self._build_correctness_model()
            self.time_model = self._build_time_model()

        # Prepare training data
        X, y_correctness, y_time = self._prepare_sequences(training_data, for_prediction=False)

        if verbose:
            print(f"Training sequences: {len(y_correctness)}")
            print(f"Sequence length: {X['user_ids'].shape[1]}")

        # Train correctness model
        if verbose:
            print("\nTraining correctness model...")

        self.correctness_model.fit(
            X,
            y_correctness,
            epochs=epochs,
            batch_size=32,
            validation_split=0.2,
            verbose=1 if verbose else 0,
            callbacks=[
                keras.callbacks.EarlyStopping(
                    monitor='val_loss',
                    patience=5,
                    restore_best_weights=True
                )
            ]
        )

        # Train time model
        if verbose:
            print("\nTraining time model...")

        self.time_model.fit(
            X,
            y_time,
            epochs=epochs,
            batch_size=32,
            validation_split=0.2,
            verbose=1 if verbose else 0,
            callbacks=[
                keras.callbacks.EarlyStopping(
                    monitor='val_loss',
                    patience=5,
                    restore_best_weights=True
                )
            ]
        )

        # Save models
        self._save_models()
        self._save_metadata()

        if verbose:
            print("\n✓ Training complete!")

    def predict(self, user_history: List[Dict], next_task: Dict) -> Tuple[float, float]:
        """
        Predict correctness probability and time for next task

        user_history: List of completed tasks for this user
        next_task: {
            'user_id': UUID or str,
            'topic': str,
            'difficulty': 'easy'|'medium'|'hard',
            'timestamp': float (unix timestamp)
        }

        Returns: (correctness_probability, estimated_time_seconds)
        """

        if self.correctness_model is None or self.time_model is None:
            # Return defaults if no model
            return 0.5, 60.0

        # Check if all categories are known in metadata
        user_id_str = str(next_task['user_id'])
        topic = next_task['topic']
        difficulty = next_task['difficulty']

        # Check for unknown categories
        if user_id_str not in self.metadata['user_ids']:
            # Unknown user - return defaults
            return 0.5, 60.0

        if topic not in self.metadata['topics']:
            # Unknown topic - return defaults
            return 0.5, 60.0

        if difficulty not in self.metadata['difficulties']:
            # Unknown difficulty - return defaults
            return 0.5, 60.0

        # Check history for unknown categories
        for task in user_history:
            if str(task['user_id']) not in self.metadata['user_ids']:
                return 0.5, 60.0
            if task['topic'] not in self.metadata['topics']:
                return 0.5, 60.0
            if task['difficulty'] not in self.metadata['difficulties']:
                return 0.5, 60.0

        # Combine history + next task
        sequence_data = user_history + [next_task]

        # Prepare input
        X = self._prepare_sequences(sequence_data, for_prediction=True)

        # Predict
        correctness_prob = float(self.correctness_model.predict(X, verbose=0)[0][0])
        time_normalized = float(self.time_model.predict(X, verbose=0)[0][0])

        # Denormalize time
        estimated_time = time_normalized * self.metadata['time_std'] + self.metadata['time_mean']

        # Clip to reasonable bounds
        correctness_prob = np.clip(correctness_prob, 0.01, 0.99)
        estimated_time = np.clip(estimated_time, 5.0, 600.0)  # 5 seconds to 10 minutes

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
            self.correctness_model = keras.models.load_model(correctness_path)

        if time_path.exists():
            self.time_model = keras.models.load_model(time_path)

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
