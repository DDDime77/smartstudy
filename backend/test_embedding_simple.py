"""
Simple test to diagnose TensorFlow issues
"""

import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TF warnings

import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

print("Step 1: Importing TensorFlow...")
try:
    import tensorflow as tf
    print(f"✓ TensorFlow imported: {tf.__version__}")
except Exception as e:
    print(f"✗ TensorFlow import failed: {e}")
    sys.exit(1)

print("\nStep 2: Setting CPU-only mode...")
tf.config.set_visible_devices([], 'GPU')
print("✓ CPU-only mode set")

print("\nStep 3: Testing basic TF operations...")
try:
    x = tf.constant([1, 2, 3])
    y = tf.constant([4, 5, 6])
    z = x + y
    print(f"✓ Basic TF operations work: {z.numpy()}")
except Exception as e:
    print(f"✗ TF operations failed: {e}")
    sys.exit(1)

print("\nStep 4: Loading embedding model module...")
try:
    from app.ml.embedding_model import TaskPredictionModel
    print("✓ Embedding model module loaded")
except Exception as e:
    print(f"✗ Module load failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\nStep 5: Creating model instance...")
try:
    model = TaskPredictionModel()
    print("✓ Model instance created")
    print(f"  Model dir: {model.model_dir}")
    print(f"  Metadata: {model.metadata}")
except Exception as e:
    print(f"✗ Model creation failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "="*80)
print("✅ ALL TESTS PASSED - TensorFlow working correctly")
print("="*80)
