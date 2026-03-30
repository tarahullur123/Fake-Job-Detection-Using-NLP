# JobCheck — Fake Job Detection Platform

An AI-powered full-stack web application that detects fraudulent job postings using Natural Language Processing (NLP). Paste any job description and get an instant verdict on whether it's **legitimate** or a **scam**.

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)
![scikit-learn](https://img.shields.io/badge/scikit--learn-ML-orange?logo=scikit-learn)

---

## Features

- **Instant Job Analysis** — Paste a job posting and get a Fake/Real verdict with confidence score
- **No Login Required** — Anyone can analyze jobs; sign in to save your history
- **User Analysis History** — Logged-in users can view their recent analyses
- **Admin Dashboard** — Charts (trend, classification split, model comparison, confidence distribution), prediction logs, CSV & PDF export
- **Model Retraining** — Admins can retrain the ML model from the dashboard
- **Flagging System** — Users can flag suspicious predictions for review
- **JWT Authentication** — Secure login/register with role-based access (user/admin)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React, Tailwind CSS, Recharts, Framer Motion |
| **Backend** | FastAPI, SQLAlchemy, Uvicorn |
| **ML/NLP** | scikit-learn, TF-IDF Vectorizer, NLTK |
| **Database** | SQLite |
| **Auth** | JWT (python-jose), bcrypt (passlib) |
| **PDF Export** | jsPDF, html2canvas |

---

## Project Structure

```
Fake Job detection using NLP/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI entry point
│   │   ├── auth.py            # JWT auth utilities
│   │   ├── models.py          # SQLAlchemy ORM models
│   │   ├── schemas.py         # Pydantic request/response schemas
│   │   ├── database.py        # DB connection & session
│   │   └── routes/
│   │       ├── auth_routes.py # Login, Register, /me
│   │       ├── predict.py     # /api/predict
│   │       ├── stats.py       # /api/stats, /api/predictions, /api/my-predictions
│   │       ├── flag.py        # /api/flag, /api/flagged
│   │       └── retrain.py     # /api/retrain (admin)
│   ├── ml/
│   │   ├── train.py           # Training pipeline
│   │   ├── preprocess.py      # Text preprocessing (NLP)
│   │   ├── evaluate.py        # Model evaluation metrics
│   │   └── models/            # Saved model artifacts (.pkl)
│   ├── seed_data.py           # Seed DB with sample data
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.js        # Landing page
│   │   │   ├── login/page.js  # Login page
│   │   │   ├── register/page.js
│   │   │   ├── analyze/page.js # Job analysis + user history
│   │   │   ├── admin/page.js  # Admin dashboard + charts
│   │   │   ├── layout.js
│   │   │   └── globals.css    # Brutalist design system
│   │   ├── components/
│   │   │   ├── Navbar.js
│   │   │   └── ClientLayout.js
│   │   └── context/
│   │       └── AuthContext.js
│   └── package.json
└── dataset/                   # Training dataset (CSV)
```

---

## Prerequisites

- **Python 3.10+**
- **Node.js 18+** and **npm**
- **Git**

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Kumaran18v/Fake-Job-Detection.git
cd Fake-Job-Detection
cd "Fake Job Detection using NLP"
```

### 2. Backend Setup

Open a terminal and navigate to the backend folder:

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Download NLTK data (required for text preprocessing)
python -c "import nltk; nltk.download('stopwords'); nltk.download('wordnet'); nltk.download('punkt_tab')"
```

### 3. Train the ML Model & Seed Database

Ensure your virtual environment is active inside the `backend` directory:

```bash
# Train the Multi-Model NLP Pipeline (generates .pkl files)
python -m ml.train

# Seed the Database with sample users and predictions (Optional)
python seed_data.py
```
*(Default test account: `testuser` / `test123`. Default Admin: `admin` / `admin123`)*

### 4. Start the Backend Server

```bash
# Ensure you are still in the backend directory with the venv active
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Backend will be running at `http://localhost:8000`  
API docs available at `http://localhost:8000/docs`

### 5. Frontend Setup

Open a **new, separate terminal** and navigate to the frontend folder:

```bash
# From the root of the repository
cd "Fake Job Detection using NLP/frontend"

# Install Node.js dependencies
npm install

# Start development server
npm run dev
```

Frontend will be running at `http://localhost:3000`

---

## Usage

1. **Open** `http://localhost:3000` in your browser
2. **Analyze a job** — Go to the Analyze page, paste any job description, and click "RUN ANALYSIS"
3. **Register / Login** — Create an account to save your analysis history
4. **Admin Dashboard** — Login as `admin` / `admin123` to access charts, logs, and model management

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | — | Register new user |
| `POST` | `/auth/login` | — | Login, returns JWT |
| `GET` | `/auth/me` | ✅ | Get current user info |
| `POST` | `/api/predict` | Optional | Analyze a job posting |
| `GET` | `/api/stats` | — | Dashboard statistics |
| `GET` | `/api/predictions` | — | All prediction logs |
| `GET` | `/api/my-predictions` | ✅ | Current user's predictions |
| `POST` | `/api/flag` | Optional | Flag a prediction |
| `GET` | `/api/flagged` | — | Get flagged posts |
| `POST` | `/api/retrain` | Admin | Retrain the ML model |

---

## ML Pipeline

The model pipeline uses **TF-IDF vectorization** with **n-grams (1,2)** and trains three classifiers:

1. **Logistic Regression** (with balanced class weights)
2. **Random Forest** (200 estimators, balanced)
3. **Gradient Boosting** (150 estimators)

The best model is selected based on **F1 score** and saved for inference.

---

## Design

The frontend uses a **"Brutalist-Refined Security"** aesthetic:

- **Colors:** Charcoal, Off-white, Signal Red (`#e63946`), Muted Teal (`#5f9ea0`)
- **Typography:** Bebas Neue (display), Barlow (body), JetBrains Mono (code)
- **Theme:** Dark mode with warm undertones and subtle grain texture
- **Verdict Animation:** Dramatic stamp-in effect for analysis results

---

## License

This project is for educational and demonstration purposes.
