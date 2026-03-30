"""
Retrain endpoint for admin model retraining.
"""
import os
import sys
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ModelVersion, User
from app.auth import require_admin

# __file__ is in backend/app/routes/ → go up 3 levels to backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

router = APIRouter()


@router.post("/retrain")
async def retrain_model(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Retrain the ML model. Admin only."""
    try:
        from ml.train import train_pipeline
        from app.routes.predict import reload_model
        
        # Run training
        best_model, tfidf, metadata = train_pipeline()
        
        # Reload the model in memory
        reload_model()
        
        # Log model version to DB
        model_version = ModelVersion(
            version=metadata['version'],
            model_name=metadata['model_name'],
            accuracy=metadata['accuracy'],
            f1_score=metadata['f1_score'],
            precision=metadata['precision'],
            recall=metadata['recall'],
            file_path="ml/models/best_model.pkl",
            is_active=True,
            trained_by=admin.username,
            created_at=datetime.now(timezone.utc)
        )
        
        # Deactivate previous versions
        db.query(ModelVersion).update({"is_active": False})
        db.add(model_version)
        db.commit()
        
        return {
            "message": "Model retrained successfully",
            "model_name": metadata['model_name'],
            "version": metadata['version'],
            "accuracy": metadata['accuracy'],
            "f1_score": metadata['f1_score']
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retraining failed: {str(e)}")
