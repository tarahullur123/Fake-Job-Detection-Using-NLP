"""
Prediction endpoint for job analysis.
"""
import os
import joblib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Prediction
from app.schemas import PredictRequest, PredictResponse
from app.auth import get_current_user

import sys
# __file__ is in backend/app/routes/ → go up 3 levels to backend/
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BACKEND_DIR)
from ml.preprocess import preprocess_text

router = APIRouter()

# Model cache
_model = None
_vectorizer = None

MODEL_DIR = os.path.join(BACKEND_DIR, 'ml', 'models')


def get_model():
    global _model, _vectorizer
    if _model is None:
        model_path = os.path.join(MODEL_DIR, 'best_model.pkl')
        tfidf_path = os.path.join(MODEL_DIR, 'tfidf_vectorizer.pkl')
        if not os.path.exists(model_path) or not os.path.exists(tfidf_path):
            raise HTTPException(
                status_code=503,
                detail="Model not available. Please train the model first."
            )
        _model = joblib.load(model_path)
        _vectorizer = joblib.load(tfidf_path)
    return _model, _vectorizer


def reload_model():
    """Force reload model from disk."""
    global _model, _vectorizer
    _model = None
    _vectorizer = None
    return get_model()


@router.post("/predict")
async def predict_job(
    request: PredictRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Analyze a job posting and predict if it's fake or real."""
    model, vectorizer = get_model()

    original_text = request.job_text
    detected_language = None
    was_translated = False
    translated_text = None

    # ── Feature 7: Multi-language support ──
    try:
        from googletrans import Translator
        translator = Translator()
        detection = translator.detect(original_text)
        detected_language = detection.lang if detection else None

        if detected_language and detected_language != 'en':
            translation = translator.translate(original_text, dest='en')
            translated_text = translation.text
            was_translated = True
    except Exception:
        # If googletrans fails, proceed with original text
        pass

    text_to_analyze = translated_text if was_translated else original_text

    # Preprocess
    clean_text = preprocess_text(text_to_analyze)
    if not clean_text.strip():
        raise HTTPException(status_code=400, detail="Job text is empty after preprocessing")
    
    # Predict with primary model (Model A)
    features = vectorizer.transform([clean_text])
    prediction_label = model.predict(features)[0]
    
    if hasattr(model, 'predict_proba'):
        probas = model.predict_proba(features)[0]
        confidence = float(max(probas))
    else:
        confidence = 0.85
    
    result = "Fake" if prediction_label == 1 else "Real"
    model_used = "model_a"

    # ── Feature 10: A/B Testing ──
    model_b_result = None
    model_b_path = os.path.join(MODEL_DIR, 'model_b.pkl')
    if os.path.exists(model_b_path):
        try:
            model_b = joblib.load(model_b_path)
            pred_b = model_b.predict(features)[0]
            if hasattr(model_b, 'predict_proba'):
                probas_b = model_b.predict_proba(features)[0]
                conf_b = float(max(probas_b))
            else:
                conf_b = 0.85
            model_b_result = {
                "prediction": "Fake" if pred_b == 1 else "Real",
                "confidence": round(conf_b * 100, 2),
                "model": "model_b",
            }
        except Exception:
            pass
    
    # Log to database
    user_id = current_user.id if current_user else None
    prediction_record = Prediction(
        user_id=user_id,
        job_text=original_text[:5000],
        prediction=result,
        confidence=round(confidence, 4),
        model_used=model_used,
        created_at=datetime.now(timezone.utc)
    )
    db.add(prediction_record)
    db.commit()
    db.refresh(prediction_record)
    
    # Risk breakdown
    risk_factors = _extract_risk_factors(model, vectorizer, features, clean_text)

    response = {
        "prediction": result,
        "confidence": round(confidence * 100, 2),
        "prediction_id": prediction_record.id,
        "analyzed_at": prediction_record.created_at.isoformat(),
        "risk_factors": risk_factors,
        "model_used": model_used,
    }

    # Multi-language info
    if detected_language:
        response["detected_language"] = detected_language
    if was_translated:
        response["was_translated"] = True
        response["translated_text_preview"] = (translated_text or "")[:500]

    # A/B test info
    if model_b_result:
        response["model_b_result"] = model_b_result

    return response


def _extract_risk_factors(model, vectorizer, features, clean_text):
    """Extract top risk-contributing features from the prediction."""
    try:
        feature_names = vectorizer.get_feature_names_out()

        if hasattr(model, 'coef_'):
            importances = model.coef_[0]
        elif hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
        else:
            return []

        feature_vector = features.toarray()[0]
        contributions = feature_vector * importances
        top_indices = contributions.argsort()[-15:][::-1]

        categories = {
            "Financial Red Flag": ["fee", "payment", "bank", "wire", "money", "cost", "invest",
                                   "pay", "cash", "earn", "salary", "income", "profit", "dollar", "price"],
            "Urgency Pressure": ["urgent", "immediately", "hurry", "limited", "act now", "fast",
                                 "asap", "deadline", "expire", "quick", "rush", "today"],
            "Identity Harvesting": ["ssn", "social security", "bank detail", "personal info",
                                    "passport", "id card", "credit card", "account number", "dob"],
            "Vague Description": ["easy", "anyone", "no experience", "no skill", "simple",
                                  "work from home", "guaranteed", "unlimited"],
        }

        risk_factors = []
        seen = set()
        for idx in top_indices:
            if contributions[idx] <= 0:
                continue
            phrase = feature_names[idx]
            if phrase in seen or len(phrase) < 2:
                continue
            seen.add(phrase)

            category = "Suspicious Pattern"
            for cat, keywords in categories.items():
                if any(kw in phrase.lower() for kw in keywords):
                    category = cat
                    break

            risk_factors.append({
                "phrase": phrase,
                "category": category,
                "weight": round(float(contributions[idx]), 4),
            })
            if len(risk_factors) >= 8:
                break

        return risk_factors
    except Exception:
        return []
