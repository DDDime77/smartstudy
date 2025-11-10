#!/bin/bash
# Monitor embedding model training in real-time
# Usage: ./monitor_training.sh

echo "=========================================="
echo "EMBEDDING MODEL TRAINING MONITOR"
echo "=========================================="
echo ""
echo "Watching /tmp/backend.log for training activity..."
echo "Complete 5 tasks in the UI to trigger training!"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""
echo "=========================================="
echo ""

tail -f /tmp/backend.log | grep --line-buffered -E "training|Training|embedding|Embedding|🚀|✅|❌|epoch|Epoch|Counter|counter" --color=auto
