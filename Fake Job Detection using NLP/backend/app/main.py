"""
FastAPI application entry point for JobCheck.
"""
import os
import sys
from contextlib import asynccontextmanager
from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from app.database import init_db
from app.routes import predict, stats, flag, retrain
from app.routes import url_scraper, bulk, feedback, company_verify
from app.routes import user_stats, trending, ocr
from app.routes.auth_routes import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and preload model on startup."""
    init_db()
    # Try to preload model
    try:
        from app.routes.predict import get_model
        get_model()
        print("[OK] Model loaded successfully")
    except Exception as e:
        print(f"[WARN] Model not loaded: {e}")
        print("  Run 'python ml/train.py' to train the model first.")
    yield


app = FastAPI(
    title="JobCheck - Fake Job Detection API",
    description="AI-powered fake job posting detection platform",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(predict.router, prefix="/api", tags=["Prediction"])
app.include_router(stats.router, prefix="/api", tags=["Stats"])
app.include_router(flag.router, prefix="/api", tags=["Flagging"])
app.include_router(retrain.router, prefix="/api", tags=["Retrain"])
app.include_router(url_scraper.router, prefix="/api", tags=["URL Scanner"])
app.include_router(bulk.router, prefix="/api", tags=["Bulk Analysis"])
app.include_router(feedback.router, prefix="/api", tags=["Feedback"])
app.include_router(company_verify.router, prefix="/api", tags=["Company Verification"])
app.include_router(user_stats.router, prefix="/api", tags=["User Stats"])
app.include_router(trending.router, prefix="/api", tags=["Trending"])
app.include_router(ocr.router, prefix="/api", tags=["OCR"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "name": "JobCheck API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}
