"""
OCR endpoint — extract text from uploaded images of job postings.
Uses Pillow for image processing with a simple fallback when Tesseract is unavailable.
"""
import io
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException

from app.database import get_db
from app.auth import get_current_user

router = APIRouter()


def _extract_text_from_image(image_bytes: bytes) -> str:
    """
    Try OCR via pytesseract -> Pillow.
    Falls back to a basic image-info stub if tesseract binary isn't found.
    """
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes))

        # Attempt pytesseract
        try:
            import pytesseract
            text = pytesseract.image_to_string(img)
            return text.strip()
        except Exception:
            # Tesseract not installed — return image metadata as fallback
            w, h = img.size
            return f"[Image {w}x{h} — Tesseract OCR not available. Install Tesseract to enable text extraction from images.]"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not process image: {str(e)}")


@router.post("/predict-image")
async def predict_from_image(
    file: UploadFile = File(...),
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Extract text from an uploaded image and run prediction."""
    # Validate file type
    allowed = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/bmp", "image/tiff"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported image type: {file.content_type}. Use PNG, JPEG, WebP, BMP, or TIFF.")

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large. Max 10 MB.")

    extracted_text = _extract_text_from_image(image_bytes)
    if not extracted_text or len(extracted_text.strip()) < 20:
        raise HTTPException(
            status_code=422,
            detail="Could not extract enough text from the image. Please try a clearer screenshot or paste the text manually."
        )

    # Run through the prediction pipeline
    from app.routes.predict import get_model, _extract_risk_factors
    from ml.preprocess import preprocess_text
    from app.models import Prediction
    from sqlalchemy.orm import Session

    model, vectorizer = get_model()
    clean_text = preprocess_text(extracted_text)
    features = vectorizer.transform([clean_text])
    proba = model.predict_proba(features)[0]
    pred_idx = proba.argmax()
    label = model.classes_[pred_idx]
    if hasattr(label, "item"):
        label = label.item()
    result = "Fake" if label == 1 else "Real"
    confidence = round(float(proba[pred_idx]) * 100, 2)

    # Risk factors
    risk_factors = _extract_risk_factors(model, vectorizer, features, clean_text)

    # Save prediction
    user_id = current_user.id if current_user else None
    record = Prediction(
        user_id=user_id,
        job_text=extracted_text[:2000],
        prediction=result,
        confidence=confidence,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "prediction": result,
        "confidence": confidence,
        "prediction_id": record.id,
        "analyzed_at": record.created_at.isoformat(),
        "extracted_text_preview": extracted_text[:500],
        "extracted_text_length": len(extracted_text),
        "risk_factors": risk_factors,
    }
