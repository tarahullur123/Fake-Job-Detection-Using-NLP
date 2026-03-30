"""
User feedback endpoint — allows users to agree/disagree with predictions.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.database import get_db
from app.auth import get_current_user, require_auth
from app.models import Prediction, UserFeedback

router = APIRouter()


class FeedbackRequest(BaseModel):
    prediction_id: int
    feedback: str  # "agree" or "disagree"
    correct_label: str = ""  # optional: what user thinks is correct


@router.post("/feedback")
async def submit_feedback(
    request: FeedbackRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_auth),
):
    """Submit agree/disagree feedback for a prediction."""
    if request.feedback not in ("agree", "disagree"):
        raise HTTPException(status_code=400, detail="Feedback must be 'agree' or 'disagree'")

    prediction = db.query(Prediction).filter(Prediction.id == request.prediction_id).first()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")

    # Check if user already gave feedback on this prediction
    existing = db.query(UserFeedback).filter(
        UserFeedback.prediction_id == request.prediction_id,
        UserFeedback.user_id == current_user.id,
    ).first()
    if existing:
        # Update existing feedback
        existing.feedback = request.feedback
        existing.correct_label = request.correct_label or ""
        existing.created_at = datetime.now(timezone.utc)
    else:
        fb = UserFeedback(
            prediction_id=request.prediction_id,
            user_id=current_user.id,
            feedback=request.feedback,
            correct_label=request.correct_label or "",
            created_at=datetime.now(timezone.utc),
        )
        db.add(fb)

    db.commit()
    return {"message": "Feedback recorded", "feedback": request.feedback}


@router.get("/feedback/stats")
async def feedback_stats(db: Session = Depends(get_db)):
    """Get overall feedback stats for admin dashboard."""
    total = db.query(UserFeedback).count()
    agrees = db.query(UserFeedback).filter(UserFeedback.feedback == "agree").count()
    disagrees = db.query(UserFeedback).filter(UserFeedback.feedback == "disagree").count()

    accuracy = round((agrees / total) * 100, 1) if total > 0 else 0

    # Recent feedback entries
    recent = db.query(UserFeedback).order_by(
        UserFeedback.created_at.desc()
    ).limit(20).all()

    recent_list = []
    for fb in recent:
        pred = db.query(Prediction).filter(Prediction.id == fb.prediction_id).first()
        recent_list.append({
            "id": fb.id,
            "prediction_id": fb.prediction_id,
            "prediction_result": pred.prediction if pred else "—",
            "feedback": fb.feedback,
            "correct_label": fb.correct_label,
            "created_at": fb.created_at.isoformat() if fb.created_at else "",
        })

    return {
        "total_feedback": total,
        "agrees": agrees,
        "disagrees": disagrees,
        "user_agreement_rate": accuracy,
        "recent": recent_list,
    }
