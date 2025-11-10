"""
LNIRT API Router
Provides endpoints for LNIRT model management, training, and statistics
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Optional
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User
from app.ml import LNIRTService

router = APIRouter(prefix="/lnirt", tags=["lnirt"])


@router.post("/predict")
async def predict_task(
    user_id: Optional[UUID] = None,
    topic: str = "calculus",
    difficulty: str = "medium",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Get LNIRT prediction for a task

    Args:
        user_id: User UUID (defaults to current user)
        topic: Topic name
        difficulty: Difficulty level (easy, medium, hard)

    Returns:
        Dict with predicted_correct and predicted_time_seconds
    """
    if user_id is None:
        user_id = current_user.id

    try:
        lnirt_service = LNIRTService(db)
        predicted_correct, predicted_time = lnirt_service.predict(
            user_id=user_id,
            topic=topic,
            difficulty=difficulty
        )

        return {
            "user_id": str(user_id),
            "topic": topic,
            "difficulty": difficulty,
            "predicted_correct": float(predicted_correct),
            "predicted_time_seconds": int(predicted_time),
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )


@router.post("/train/general/{topic}")
async def train_general_model(
    topic: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Manually trigger general model training for a topic

    Args:
        topic: Topic name

    Returns:
        Dict with training results
    """
    try:
        lnirt_service = LNIRTService(db)
        result = lnirt_service.train_general(topic, verbose=False)

        return {
            "topic": topic,
            "result": result,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Training failed: {str(e)}"
        )


@router.post("/train/user/{topic}")
async def train_user_model(
    topic: str,
    user_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Manually trigger user-specific training for a topic

    Args:
        topic: Topic name
        user_id: User UUID (defaults to current user)

    Returns:
        Dict with training results
    """
    if user_id is None:
        user_id = current_user.id

    try:
        lnirt_service = LNIRTService(db)
        result = lnirt_service.train_user_specific(user_id, topic, verbose=False)

        return {
            "topic": topic,
            "user_id": str(user_id),
            "result": result,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Training failed: {str(e)}"
        )


@router.get("/model/stats/{topic}")
async def get_model_statistics(
    topic: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Get statistics about trained model for a topic

    Args:
        topic: Topic name

    Returns:
        Dict with model statistics
    """
    try:
        lnirt_service = LNIRTService(db)
        stats = lnirt_service.get_model_stats(topic)

        if stats is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No trained model found for topic: {topic}"
            )

        return {
            "topic": topic,
            "stats": stats,
            "status": "success"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get statistics: {str(e)}"
        )


@router.get("/user/parameters/{topic}")
async def get_user_parameters(
    topic: str,
    user_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Get user's personalized parameters for a topic

    Args:
        topic: Topic name
        user_id: User UUID (defaults to current user)

    Returns:
        Dict with user parameters (theta, tau)
    """
    if user_id is None:
        user_id = current_user.id

    try:
        lnirt_service = LNIRTService(db)
        params = lnirt_service.get_user_parameters(user_id, topic)

        if params is None:
            return {
                "topic": topic,
                "user_id": str(user_id),
                "message": "No model trained for this topic yet",
                "is_personalized": False,
                "status": "no_model"
            }

        return {
            "topic": topic,
            "parameters": params,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get parameters: {str(e)}"
        )
