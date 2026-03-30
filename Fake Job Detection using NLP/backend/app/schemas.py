"""
Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


# ── Auth Schemas ──────────────────────────────────
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Prediction Schemas ────────────────────────────
class PredictRequest(BaseModel):
    job_text: str = Field(..., min_length=10, max_length=50000)

class PredictResponse(BaseModel):
    prediction: str
    confidence: float
    prediction_id: int
    analyzed_at: str

class PredictionLog(BaseModel):
    id: int
    job_text: str
    prediction: str
    confidence: float
    created_at: datetime
    is_flagged: bool = False
    
    class Config:
        from_attributes = True


# ── Flag Schemas ──────────────────────────────────
class FlagRequest(BaseModel):
    prediction_id: int
    reason: str = ""

class FlagResponse(BaseModel):
    id: int
    prediction_id: int
    reason: str
    flagged_at: datetime
    
    class Config:
        from_attributes = True


# ── Stats Schemas ─────────────────────────────────
class StatsResponse(BaseModel):
    total_predictions: int
    total_fake: int
    total_real: int
    fake_percentage: float
    total_flagged: int
    daily_stats: List[dict]
    model_info: Optional[dict] = None
    model_config = ConfigDict(protected_namespaces=())


# ── Retrain Schemas ───────────────────────────────
class RetrainResponse(BaseModel):
    message: str
    model_name: str
    version: str
    accuracy: float
    f1_score: float
    model_config = ConfigDict(protected_namespaces=())
