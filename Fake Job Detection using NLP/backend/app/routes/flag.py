"""
Flag endpoint for marking suspicious job posts.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Prediction, FlaggedPost
from app.schemas import FlagRequest, FlagResponse
from app.auth import get_current_user

router = APIRouter()


@router.post("/flag", response_model=FlagResponse)
async def flag_post(
    request: FlagRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Flag a prediction as suspicious."""
    prediction = db.query(Prediction).filter(Prediction.id == request.prediction_id).first()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")
    
    existing = db.query(FlaggedPost).filter(FlaggedPost.prediction_id == request.prediction_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="This prediction is already flagged")
    
    flagged_by = current_user.username if current_user else "anonymous"
    
    flagged = FlaggedPost(
        prediction_id=request.prediction_id,
        reason=request.reason,
        flagged_by=flagged_by,
        flagged_at=datetime.now(timezone.utc)
    )
    db.add(flagged)
    db.commit()
    db.refresh(flagged)
    
    return flagged


@router.get("/flagged")
async def get_flagged_posts(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get all flagged posts."""
    flagged = db.query(FlaggedPost).order_by(
        FlaggedPost.flagged_at.desc()
    ).offset(skip).limit(limit).all()
    
    result = []
    for f in flagged:
        prediction = db.query(Prediction).filter(Prediction.id == f.prediction_id).first()
        result.append({
            "id": f.id,
            "prediction_id": f.prediction_id,
            "job_text": prediction.job_text[:200] + "..." if prediction and len(prediction.job_text) > 200 else (prediction.job_text if prediction else ""),
            "prediction": prediction.prediction if prediction else "",
            "confidence": prediction.confidence if prediction else 0,
            "reason": f.reason,
            "flagged_by": f.flagged_by,
            "flagged_at": f.flagged_at.isoformat()
        })
    
    return {"flagged_posts": result, "total": db.query(FlaggedPost).count()}
