"""
Bulk CSV analysis endpoint — upload a CSV of job postings and get batch results.
"""
import io
import csv
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app.routes.predict import get_model, preprocess_text
from app.models import Prediction

router = APIRouter()

MAX_ROWS = 500  # Limit to prevent abuse


@router.post("/predict-bulk")
async def predict_bulk(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Analyze multiple job postings from a CSV file."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = await file.read()
    try:
        text_content = content.decode("utf-8")
    except UnicodeDecodeError:
        text_content = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text_content))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV has no headers")

    # Find the text column (try common names)
    text_col = None
    for candidate in ["job_text", "text", "description", "job_description", "posting", "content"]:
        for col in reader.fieldnames:
            if col.strip().lower() == candidate:
                text_col = col
                break
        if text_col:
            break

    if not text_col:
        # Fallback: use first column
        text_col = reader.fieldnames[0]

    model, vectorizer = get_model()
    user_id = current_user.id if current_user else None

    results = []
    total_fake = 0
    total_real = 0

    for i, row in enumerate(reader):
        if i >= MAX_ROWS:
            break

        job_text = row.get(text_col, "").strip()
        if not job_text or len(job_text) < 10:
            results.append({
                "row": i + 1,
                "preview": job_text[:100] if job_text else "(empty)",
                "prediction": "Skipped",
                "confidence": 0,
                "reason": "Text too short",
            })
            continue

        clean_text = preprocess_text(job_text)
        if not clean_text.strip():
            results.append({
                "row": i + 1,
                "preview": job_text[:100],
                "prediction": "Skipped",
                "confidence": 0,
                "reason": "Empty after preprocessing",
            })
            continue

        features = vectorizer.transform([clean_text])
        prediction_label = model.predict(features)[0]

        if hasattr(model, 'predict_proba'):
            probas = model.predict_proba(features)[0]
            confidence = float(max(probas))
        else:
            confidence = 0.85

        result = "Fake" if prediction_label == 1 else "Real"

        if result == "Fake":
            total_fake += 1
        else:
            total_real += 1

        # Log to database
        record = Prediction(
            user_id=user_id,
            job_text=job_text[:5000],
            prediction=result,
            confidence=round(confidence, 4),
            created_at=datetime.now(timezone.utc),
        )
        db.add(record)

        results.append({
            "row": i + 1,
            "preview": job_text[:100] + "..." if len(job_text) > 100 else job_text,
            "prediction": result,
            "confidence": round(confidence * 100, 2),
        })

    db.commit()

    total = total_fake + total_real
    return {
        "total_analyzed": total,
        "total_fake": total_fake,
        "total_real": total_real,
        "fraud_rate": round((total_fake / total) * 100, 1) if total > 0 else 0,
        "results": results,
    }


@router.post("/predict-bulk/download")
async def predict_bulk_download(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """Analyze CSV and return results as a downloadable CSV."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = await file.read()
    try:
        text_content = content.decode("utf-8")
    except UnicodeDecodeError:
        text_content = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text_content))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV has no headers")

    text_col = None
    for candidate in ["job_text", "text", "description", "job_description", "posting", "content"]:
        for col in reader.fieldnames:
            if col.strip().lower() == candidate:
                text_col = col
                break
        if text_col:
            break
    if not text_col:
        text_col = reader.fieldnames[0]

    model, vectorizer = get_model()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Row", "Text Preview", "Prediction", "Confidence (%)"])

    for i, row in enumerate(reader):
        if i >= MAX_ROWS:
            break
        job_text = row.get(text_col, "").strip()
        if not job_text or len(job_text) < 10:
            writer.writerow([i + 1, job_text[:100], "Skipped", "0"])
            continue

        clean_text = preprocess_text(job_text)
        if not clean_text.strip():
            writer.writerow([i + 1, job_text[:100], "Skipped", "0"])
            continue

        features = vectorizer.transform([clean_text])
        pred = model.predict(features)[0]
        if hasattr(model, 'predict_proba'):
            conf = float(max(model.predict_proba(features)[0]))
        else:
            conf = 0.85
        result = "Fake" if pred == 1 else "Real"
        writer.writerow([i + 1, job_text[:100], result, round(conf * 100, 2)])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=bulk_results.csv"},
    )
