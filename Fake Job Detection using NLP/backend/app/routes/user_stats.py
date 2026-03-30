"""
User Analytics / Stats endpoint for dashboard.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime, timedelta

from app.database import get_db
from app.models import Prediction, UserFeedback, FlaggedPost
from app.auth import require_auth

router = APIRouter()


@router.get("/my-stats")
async def my_stats(
    db: Session = Depends(get_db),
    current_user=Depends(require_auth),
):
    """Personal analytics dashboard data for the logged-in user."""
    uid = current_user.id

    # ── Total analyses ──
    total = db.query(func.count(Prediction.id)).filter(Prediction.user_id == uid).scalar() or 0
    total_fake = db.query(func.count(Prediction.id)).filter(Prediction.user_id == uid, Prediction.prediction == "Fake").scalar() or 0
    total_real = total - total_fake
    avg_conf = db.query(func.avg(Prediction.confidence)).filter(Prediction.user_id == uid).scalar()
    avg_conf = round(float(avg_conf), 2) if avg_conf else 0

    # ── Weekly trend (last 8 weeks) ──
    eight_weeks_ago = datetime.utcnow() - timedelta(weeks=8)
    weekly_rows = (
        db.query(
            func.strftime('%Y-W%W', Prediction.created_at).label("week"),
            func.count(Prediction.id).label("count"),
            func.sum(case((Prediction.prediction == "Fake", 1), else_=0)).label("fake"),
        )
        .filter(Prediction.user_id == uid, Prediction.created_at >= eight_weeks_ago)
        .group_by("week")
        .order_by("week")
        .all()
    )
    weekly_trend = [
        {"week": r.week, "total": r.count, "fake": int(r.fake or 0), "real": r.count - int(r.fake or 0)}
        for r in weekly_rows
    ]

    # ── Recent predictions ──
    recent = (
        db.query(Prediction)
        .filter(Prediction.user_id == uid)
        .order_by(Prediction.created_at.desc())
        .limit(20)
        .all()
    )
    recent_list = [
        {
            "id": p.id,
            "prediction": p.prediction,
            "confidence": p.confidence,
            "preview": (p.job_text or "")[:120],
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in recent
    ]

    # ── Feedback summary ──
    fb_total = db.query(func.count(UserFeedback.id)).filter(UserFeedback.user_id == uid).scalar() or 0
    fb_agree = db.query(func.count(UserFeedback.id)).filter(UserFeedback.user_id == uid, UserFeedback.feedback == "agree").scalar() or 0

    return {
        "total_analyses": total,
        "total_fake": total_fake,
        "total_real": total_real,
        "avg_confidence": avg_conf,
        "fraud_rate": round((total_fake / total * 100), 1) if total > 0 else 0,
        "weekly_trend": weekly_trend,
        "recent_predictions": recent_list,
        "feedback_given": fb_total,
        "feedback_agree": fb_agree,
        "member_since": current_user.created_at.isoformat() if current_user.created_at else None,
    }
