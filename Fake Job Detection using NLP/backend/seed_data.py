"""
Database seeder - creates an admin user and sample data.

Usage:
    cd backend
    python seed_data.py
"""
import os
import sys
import random
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import init_db, SessionLocal
from app.models import User, Prediction, FlaggedPost, ModelVersion
from app.auth import hash_password


def seed():
    init_db()
    db = SessionLocal()
    
    # 1. Create admin user
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = User(
            username="admin",
            email="admin@jobcheck.com",
            password_hash=hash_password("admin123"),
            role="admin",
            created_at=datetime.now(timezone.utc)
        )
        db.add(admin)
        db.commit()
        print("✓ Admin user created (admin / admin123)")
    else:
        print("  Admin user already exists")
    
    # 2. Create demo user
    demo = db.query(User).filter(User.username == "demo").first()
    if not demo:
        demo = User(
            username="demo",
            email="demo@jobcheck.com",
            password_hash=hash_password("demo123"),
            role="user",
            created_at=datetime.now(timezone.utc)
        )
        db.add(demo)
        db.commit()
        print("✓ Demo user created (demo / demo123)")
    
    # 3. Seed sample predictions if empty
    count = db.query(Prediction).count()
    if count == 0:
        sample_jobs = [
            ("Software Engineer at Google - Build scalable systems...", "Real", 0.95),
            ("EARN $5000 WEEKLY NO EXPERIENCE NEEDED!!!", "Fake", 0.98),
            ("Data Analyst at Microsoft - Work with big data...", "Real", 0.92),
            ("Make money fast from home! Send SSN to apply!", "Fake", 0.97),
            ("Product Manager at Stripe - Lead product strategy...", "Real", 0.89),
            ("URGENT: Wire $200 to secure your dream job!", "Fake", 0.99),
            ("UX Designer at Airbnb - Design user experiences...", "Real", 0.91),
            ("No interview needed! You're already hired! Pay $150", "Fake", 0.96),
            ("Backend Developer at Netflix - Microservices...", "Real", 0.93),
            ("Work 2hrs/day earn $8000/month! Send bank details", "Fake", 0.94),
            ("Machine Learning Engineer at Meta - AI research...", "Real", 0.90),
            ("FREE laptop + $3000 signing bonus! Just pay shipping", "Fake", 0.88),
            ("DevOps Engineer at Amazon - Cloud infrastructure...", "Real", 0.94),
            ("Congratulations! Selected for secret high-pay role!", "Fake", 0.91),
            ("Frontend Developer at Spotify - React + TypeScript...", "Real", 0.96),
        ]
        
        for i, (text, pred, conf) in enumerate(sample_jobs):
            days_ago = random.randint(0, 29)
            p = Prediction(
                user_id=admin.id,
                job_text=text,
                prediction=pred,
                confidence=conf,
                created_at=datetime.utcnow() - timedelta(days=days_ago)
            )
            db.add(p)
        db.commit()
        print(f"✓ {len(sample_jobs)} sample predictions seeded")
        
        # Flag some fake ones
        fake_preds = db.query(Prediction).filter(Prediction.prediction == "Fake").limit(3).all()
        for fp in fake_preds:
            flag = FlaggedPost(
                prediction_id=fp.id,
                reason="Suspicious job posting - likely scam",
                flagged_by="admin",
                flagged_at=fp.created_at + timedelta(hours=1)
            )
            db.add(flag)
        db.commit()
        print(f"✓ {len(fake_preds)} posts flagged")
    else:
        print(f"  {count} predictions already exist, skipping seed")
    
    db.close()
    print("\n✓ Database seeding complete!")


if __name__ == '__main__':
    seed()
