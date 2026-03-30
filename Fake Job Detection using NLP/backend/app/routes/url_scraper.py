"""
URL scraper endpoint — scrapes job posting from a URL and analyzes it.
"""
import re
import requests
from bs4 import BeautifulSoup
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app.routes.predict import get_model, preprocess_text
from app.models import Prediction
from datetime import datetime, timezone

router = APIRouter()

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def _scrape_job_text(url: str) -> dict:
    """Fetch a URL and extract the main text content."""
    import urllib.parse
    parsed = urllib.parse.urlparse(url)
    if "linkedin.com" in parsed.netloc and "currentJobId" in parsed.query:
        qs = urllib.parse.parse_qs(parsed.query)
        if "currentJobId" in qs:
            job_id = qs["currentJobId"][0]
            url = f"https://www.linkedin.com/jobs/view/{job_id}"

    try:
        resp = requests.get(url, headers=HEADERS, timeout=15, allow_redirects=True)
        resp.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Could not fetch URL: {str(e)}")

    soup = BeautifulSoup(resp.text, "html.parser")

    # Remove script/style tags
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    # Try to extract title
    title = ""
    title_tag = soup.find("h1")
    if title_tag:
        title = title_tag.get_text(strip=True)

    # Try to find company name (common patterns)
    company = ""
    for selector in [
        "[data-company]", ".company-name", ".topcard__org-name-link",
        "[itemprop='hiringOrganization']", ".JobInfoHeader-subtitle"
    ]:
        el = soup.select_one(selector)
        if el:
            company = el.get_text(strip=True)
            break

    # Extract main body text
    body = soup.get_text(separator="\n", strip=True)
    # Clean up: collapse whitespace
    body = re.sub(r'\n{3,}', '\n\n', body)
    body = re.sub(r' {2,}', ' ', body)
    # Limit length
    body = body[:10000]

    return {"title": title, "company": company, "text": body}


@router.post("/predict-url")
async def predict_from_url(
    request: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Scrape a job posting URL and analyze it."""
    url = request.get("url", "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    scraped = _scrape_job_text(url)
    job_text = scraped["text"]

    if len(job_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Could not extract enough text from this URL")

    model, vectorizer = get_model()
    clean_text = preprocess_text(job_text)
    features = vectorizer.transform([clean_text])
    prediction_label = model.predict(features)[0]

    if hasattr(model, 'predict_proba'):
        probas = model.predict_proba(features)[0]
        confidence = float(max(probas))
    else:
        confidence = 0.85

    result = "Fake" if prediction_label == 1 else "Real"

    # Log to db
    user_id = current_user.id if current_user else None
    record = Prediction(
        user_id=user_id,
        job_text=job_text[:5000],
        prediction=result,
        confidence=round(confidence, 4),
        created_at=datetime.now(timezone.utc),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # Risk breakdown
    risk_factors = _extract_risk_factors(model, vectorizer, features, clean_text)

    return {
        "prediction": result,
        "confidence": round(confidence * 100, 2),
        "prediction_id": record.id,
        "analyzed_at": record.created_at.isoformat(),
        "scraped_title": scraped["title"],
        "scraped_company": scraped["company"],
        "scraped_preview": job_text[:500],
        "risk_factors": risk_factors,
    }


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

        # Category mapping for known red-flag patterns
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
