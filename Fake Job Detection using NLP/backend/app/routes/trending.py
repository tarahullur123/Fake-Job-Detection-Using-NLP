"""
Trending scam patterns endpoint.
Analyses recent predictions to surface common fraud patterns.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import re
from collections import Counter

from app.database import get_db
from app.models import Prediction

router = APIRouter()

# Known scam keyword groups
SCAM_PATTERNS = {
    "Work From Home Scam": ["work from home", "remote work", "work at home", "earn from home", "home based"],
    "Advance Fee Fraud": ["processing fee", "registration fee", "training fee", "pay to apply", "upfront payment", "send money"],
    "Data Harvesting": ["ssn", "social security", "bank details", "credit card", "passport number", "personal information"],
    "Fake Urgency": ["limited spots", "act now", "immediately", "urgent hiring", "don't miss", "apply today only"],
    "Unrealistic Pay": ["$5000 weekly", "earn $", "guaranteed income", "unlimited earning", "high salary", "easy money"],
    "Crypto / Investment Scam": ["crypto", "bitcoin", "forex", "investment opportunity", "trading", "nft"],
    "Impersonation": ["google hiring", "amazon hiring", "microsoft hiring", "fake brand", "on behalf of"],
    "Contact Red Flags": ["whatsapp", "telegram", "personal email", "gmail.com", "yahoo.com"],
}


@router.get("/trending")
async def trending_scam_patterns(
    days: int = 30,
    db: Session = Depends(get_db),
):
    """
    Returns trending scam patterns found in recent fake predictions.
    """
    cutoff = datetime.utcnow() - timedelta(days=min(days, 90))

    fake_posts = (
        db.query(Prediction.job_text, Prediction.created_at, Prediction.confidence)
        .filter(Prediction.prediction == "Fake", Prediction.created_at >= cutoff)
        .order_by(Prediction.created_at.desc())
        .limit(500)
        .all()
    )

    total_fake = len(fake_posts)
    if total_fake == 0:
        return {
            "period_days": days,
            "total_fake_detected": 0,
            "patterns": [],
            "top_keywords": [],
        }

    # Count pattern occurrences
    pattern_counts = Counter()
    keyword_counts = Counter()

    for post in fake_posts:
        text_lower = (post.job_text or "").lower()
        for pattern_name, keywords in SCAM_PATTERNS.items():
            for kw in keywords:
                if kw in text_lower:
                    pattern_counts[pattern_name] += 1
                    keyword_counts[kw] += 1
                    break  # count each pattern once per post

    # Build pattern list sorted by frequency
    patterns = []
    for name, count in pattern_counts.most_common(10):
        patterns.append({
            "pattern": name,
            "count": count,
            "percentage": round(count / total_fake * 100, 1),
            "severity": "high" if count / total_fake > 0.3 else "medium" if count / total_fake > 0.1 else "low",
        })

    # Top individual keywords
    top_keywords = [
        {"keyword": kw, "count": c}
        for kw, c in keyword_counts.most_common(15)
    ]

    # Daily trend (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    daily_counts = (
        db.query(
            func.date(Prediction.created_at).label("date"),
            func.count(Prediction.id).label("count"),
        )
        .filter(Prediction.prediction == "Fake", Prediction.created_at >= seven_days_ago)
        .group_by("date")
        .order_by("date")
        .all()
    )
    daily_trend = [{"date": str(r.date), "count": r.count} for r in daily_counts]

    return {
        "period_days": days,
        "total_fake_detected": total_fake,
        "patterns": patterns,
        "top_keywords": top_keywords,
        "daily_trend": daily_trend,
    }
