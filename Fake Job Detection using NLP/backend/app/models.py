"""
SQLAlchemy ORM models for JobCheck.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="user")  # "user" or "admin"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    predictions = relationship("Prediction", back_populates="user")


class Prediction(Base):
    __tablename__ = "predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    job_text = Column(Text, nullable=False)
    prediction = Column(String(10), nullable=False)  # "Real" or "Fake"
    confidence = Column(Float, nullable=False)
    model_used = Column(String(50), default="model_a")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="predictions")
    flagged_post = relationship("FlaggedPost", back_populates="prediction", uselist=False)


class FlaggedPost(Base):
    __tablename__ = "flagged_posts"
    
    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), unique=True, nullable=False)
    reason = Column(Text, default="")
    flagged_by = Column(String(50), default="anonymous")
    flagged_at = Column(DateTime, default=datetime.utcnow)
    
    prediction = relationship("Prediction", back_populates="flagged_post")


class ModelVersion(Base):
    __tablename__ = "model_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    version = Column(String(50), nullable=False)
    model_name = Column(String(100), nullable=False)
    accuracy = Column(Float)
    f1_score = Column(Float)
    precision = Column(Float)
    recall = Column(Float)
    file_path = Column(String(255))
    is_active = Column(Boolean, default=True)
    trained_by = Column(String(50), default="system")
    created_at = Column(DateTime, default=datetime.utcnow)


class UserFeedback(Base):
    __tablename__ = "user_feedback"

    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    feedback = Column(String(20), nullable=False)  # "agree" or "disagree"
    correct_label = Column(String(20), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    prediction = relationship("Prediction")
    user = relationship("User")
