"""
Admin endpoints for internal operations
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.ml import EmbeddingModelService

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/train-embedding-model")
async def force_train_embedding_model(db: Session = Depends(get_db)):
    """
    Force retraining of the embedding model

    Use this endpoint to manually trigger model retraining with the latest data
    """
    try:
        service = EmbeddingModelService(db)
        result = service.force_train(verbose=True)

        if result['status'] == 'success':
            return {
                "status": "success",
                "message": "Model retrained successfully",
                "n_samples": result.get('n_samples', 0),
                "model_version": result.get('model_version', 'unknown')
            }
        else:
            raise HTTPException(status_code=500, detail=result.get('error', 'Training failed'))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/training-status")
async def get_training_status(db: Session = Depends(get_db)):
    """
    Get current training status
    """
    try:
        service = EmbeddingModelService(db)
        tracker = service._get_tracker_state()

        return {
            "last_trained_at": str(tracker['last_trained_at']) if tracker['last_trained_at'] else None,
            "n_samples_last_training": tracker['n_samples_last_training'],
            "n_samples_since_training": tracker['n_samples_since_training'],
            "training_needed": tracker['n_samples_since_training'] >= service.TRAINING_THRESHOLD,
            "threshold": service.TRAINING_THRESHOLD
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
