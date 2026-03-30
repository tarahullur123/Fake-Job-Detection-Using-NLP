"""
ML Training Pipeline for Fake Job Detection.
Trains Logistic Regression and Random Forest with TF-IDF,
evaluates all models, and saves the best one.

Usage:
    python -m ml.train
    OR
    python ml/train.py
"""
import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline

# Add parent dir to path so we can import sibling modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.preprocess import preprocess_text, combine_text_features
from ml.evaluate import evaluate_train_test

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_PATH = os.path.join(BASE_DIR, '..', 'dataset', 'fake_job_postings.csv')
MODEL_DIR = os.path.join(BASE_DIR, 'ml', 'models')


def generate_synthetic_dataset(n_samples=2000, save_path=None):
    """Generate a synthetic dataset if the real Kaggle dataset is not available."""
    np.random.seed(42)
    
    real_titles = [
        "Software Engineer", "Data Analyst", "Marketing Manager",
        "Product Designer", "Sales Representative", "DevOps Engineer",
        "Project Manager", "Business Analyst", "UX Researcher",
        "Frontend Developer", "Backend Developer", "Full Stack Developer",
        "Machine Learning Engineer", "Cloud Architect", "QA Engineer",
        "Technical Writer", "Scrum Master", "Database Administrator",
        "System Administrator", "Security Analyst", "HR Manager",
        "Financial Analyst", "Content Writer", "Graphic Designer",
        "Customer Support Lead", "Operations Manager", "Supply Chain Analyst",
    ]
    
    real_companies = [
        "Google", "Microsoft", "Amazon", "Apple", "Meta",
        "Netflix", "Salesforce", "Adobe", "IBM", "Intel",
        "Oracle", "Cisco", "VMware", "Spotify", "Stripe",
        "Airbnb", "Uber", "Lyft", "Twitter", "LinkedIn",
        "Accenture", "Deloitte", "McKinsey", "Goldman Sachs",
    ]
    
    real_descriptions = [
        "We are looking for a talented {title} to join our engineering team. "
        "You will work on cutting-edge projects using modern technologies. "
        "Requirements include a BS in Computer Science and 3+ years experience. "
        "We offer competitive salary, health benefits, 401k, and remote work options.",
        
        "Join {company} as a {title}. In this role you will collaborate with "
        "cross-functional teams to deliver high-quality solutions. We value "
        "innovation and continuous learning. Must have strong communication skills "
        "and relevant industry experience. Full-time position with benefits.",
        
        "Exciting opportunity at {company} for an experienced {title}. "
        "Responsibilities include designing systems, mentoring juniors, and "
        "driving technical excellence. We provide stock options, unlimited PTO, "
        "and professional development budget. Apply now with your resume.",
        
        "{company} is hiring a {title} to help scale our platform. "
        "This is a hybrid role based in our San Francisco office. "
        "We're looking for someone with 5+ years of experience and a passion "
        "for building reliable, scalable systems. Competitive compensation package.",
    ]
    
    fake_descriptions = [
        "EARN $5000 WEEKLY from home!!! No experience needed. "
        "Just send us your personal details and bank account information to get started. "
        "This is a guaranteed income opportunity. Act now before positions fill up!!! "
        "Wire transfer fee of $200 required to secure your spot.",
        
        "Work from home and make thousands!!! Send your SSN and ID to apply. "
        "No interview needed, you're already hired! Just pay a small processing "
        "fee of $150 and start earning immediately. Limited spots available!!!",
        
        "URGENT HIRING - No qualifications needed. Salary $10000/month. "
        "Click the link below to submit your credit card details for background check. "
        "This is a confidential position and you must not share. Reply ASAP!!!",
        
        "Congratulations! You've been selected for a high-paying data entry job. "
        "Work only 2 hours a day and earn $8000 monthly. Send upfront fee of $300 "
        "for training materials. No experience required. Apply with personal info now!",
        
        "Make money fast! Easy online job, earn $500/day doing simple tasks. "
        "No resume needed. Pay $100 registration fee to start. "
        "Provide your banking details for direct deposit setup. Don't miss out!!!",
    ]
    
    rows = []
    n_fake = int(n_samples * 0.15)  # ~15% fake (realistic class imbalance)
    n_real = n_samples - n_fake
    
    for _ in range(n_real):
        title = np.random.choice(real_titles)
        company = np.random.choice(real_companies)
        desc_template = np.random.choice(real_descriptions)
        desc = desc_template.format(title=title, company=company)
        rows.append({
            'title': title,
            'company_profile': f"{company} is a leading technology company.",
            'description': desc,
            'requirements': "Bachelor's degree required. 2+ years experience preferred.",
            'benefits': "Health insurance, 401k match, remote work flexibility.",
            'fraudulent': 0
        })
    
    for _ in range(n_fake):
        title = np.random.choice(["Data Entry Clerk", "Mystery Shopper", 
                                   "Home Assistant", "Online Survey Taker",
                                   "Account Manager", "Administrative Assistant"])
        desc = np.random.choice(fake_descriptions)
        rows.append({
            'title': title,
            'company_profile': "",
            'description': desc,
            'requirements': "",
            'benefits': "",
            'fraudulent': 1
        })
    
    df = pd.DataFrame(rows)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        df.to_csv(save_path, index=False)
        print(f"  Synthetic dataset saved: {save_path} ({len(df)} samples)")
    
    return df


def load_dataset():
    """Load dataset from CSV, or generate synthetic data if not found."""
    if os.path.exists(DATASET_PATH):
        print(f"  Loading dataset from: {DATASET_PATH}")
        df = pd.read_csv(DATASET_PATH)
    else:
        print(f"  Dataset not found at {DATASET_PATH}")
        print(f"  Generating synthetic dataset for development...")
        df = generate_synthetic_dataset(n_samples=2000, save_path=DATASET_PATH)
    
    print(f"  Dataset shape: {df.shape}")
    print(f"  Class distribution:\n{df['fraudulent'].value_counts()}")
    return df


def train_pipeline():
    """Full training pipeline."""
    print("\n" + "="*60)
    print("  JobCheck ML Training Pipeline")
    print("="*60)
    
    # 1. Load data
    print("\n[1/5] Loading dataset...")
    df = load_dataset()
    
    # 2. Preprocess
    print("\n[2/5] Preprocessing text...")
    df['combined_text'] = df.apply(combine_text_features, axis=1)
    df['clean_text'] = df['combined_text'].apply(preprocess_text)
    
    X = df['clean_text']
    y = df['fraudulent']
    
    # 3. Split
    print("\n[3/6] Splitting data (80/20, stratified)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"  Train: {len(X_train)}, Test: {len(X_test)}")
    print(f"  Train class distribution:\n{y_train.value_counts(normalize=True).round(4)}")
    
    # 4. Build pipeline + tune
    print("\n[4/6] Building pipeline...")
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer()),
        ("clf", LogisticRegression(random_state=42, class_weight='balanced'))
    ])

    param_distributions = {
        "tfidf__max_features": [5000, 10000, 15000],
        "tfidf__ngram_range": [(1, 1), (1, 2), (1, 3)],
        "tfidf__min_df": [2, 5],
        "tfidf__max_df": [0.9, 0.95, 1.0],
        "tfidf__sublinear_tf": [True],
        "tfidf__strip_accents": ["unicode", None],
        "tfidf__lowercase": [True],
        "tfidf__stop_words": ["english", None],
        "clf__C": [0.1, 0.5, 1.0, 2.0, 5.0],
        "clf__solver": ["liblinear", "lbfgs"],
        "clf__max_iter": [1000, 2000, 3000]
    }

    print("\n[5/6] Running RandomizedSearchCV (cv=5)...")
    search = RandomizedSearchCV(
        estimator=pipeline,
        param_distributions=param_distributions,
        n_iter=30,
        scoring="f1_weighted",
        cv=5,
        n_jobs=-1,
        random_state=42,
        verbose=1
    )
    search.fit(X_train, y_train)

    best_pipeline = search.best_estimator_
    print(f"  Best CV weighted F1: {search.best_score_:.4f}")
    print(f"  Best params: {search.best_params_}")

    # 5. Evaluate tuned model
    print("\n[6/6] Evaluating tuned model...")
    y_train_pred = best_pipeline.predict(X_train)
    y_test_pred = best_pipeline.predict(X_test)
    best = evaluate_train_test(
        y_train,
        y_train_pred,
        y_test,
        y_test_pred,
        model_name="Logistic Regression (Tuned)"
    )

    # 6. Save model artifacts
    os.makedirs(MODEL_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    version = f"v2_{timestamp}"
    
    model_path = os.path.join(MODEL_DIR, 'best_model.pkl')
    tfidf_path = os.path.join(MODEL_DIR, 'tfidf_vectorizer.pkl')
    meta_path = os.path.join(MODEL_DIR, 'model_metadata.json')
    tfidf = best_pipeline.named_steps["tfidf"]
    best_model = best_pipeline.named_steps["clf"]

    joblib.dump(best_model, model_path)
    joblib.dump(tfidf, tfidf_path)
    
    from datetime import timezone
    metadata = {
        "version": version,
        "model_name": "Logistic Regression",
        "accuracy": best['accuracy'],
        "precision": best['precision'],
        "recall": best['recall'],
        "f1_score": best['f1_score'],
        "train_accuracy": best["train_accuracy"],
        "test_accuracy": best["test_accuracy"],
        "accuracy_gap": best["accuracy_gap"],
        "fit_diagnosis": best["fit_diagnosis"],
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "retrain_date": datetime.now(timezone.utc).isoformat(),
        "dataset_size": len(df),
        "features": "TF-IDF + LogisticRegression",
        "best_params": search.best_params_,
        "cv_f1_weighted": round(float(search.best_score_), 4),
        "confusion_matrix": best["confusion_matrix"]
    }
    
    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n{'='*60}")
    print(f"  Model artifacts saved to: {MODEL_DIR}")
    print(f"  Best model: {model_path}")
    print(f"  Vectorizer: {tfidf_path}")
    print(f"  Metadata: {meta_path}")
    print(f"{'='*60}")
    
    return best_model, tfidf, metadata


if __name__ == '__main__':
    train_pipeline()
