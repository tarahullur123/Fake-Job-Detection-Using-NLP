"""
Company verification endpoint — checks company names against a known database.
"""
import os
import json
from difflib import SequenceMatcher
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# Load known companies on startup
_companies = None
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")


def _load_companies():
    global _companies
    if _companies is None:
        path = os.path.join(DATA_DIR, "known_companies.json")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                _companies = json.load(f)
        else:
            _companies = []
    return _companies


class CompanyVerifyRequest(BaseModel):
    company_name: str


@router.post("/verify-company")
async def verify_company(request: CompanyVerifyRequest):
    """Check if a company name matches known legitimate companies."""
    name = request.company_name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Company name is required")

    companies = _load_companies()
    name_lower = name.lower()

    best_match = None
    best_score = 0

    for company in companies:
        company_lower = company["name"].lower()

        # Exact match
        if name_lower == company_lower:
            return {
                "verified": True,
                "match_type": "exact",
                "confidence": 100,
                "matched_company": company,
            }

        # Partial/fuzzy match
        score = SequenceMatcher(None, name_lower, company_lower).ratio()
        if score > best_score:
            best_score = score
            best_match = company

    if best_score >= 0.8:
        return {
            "verified": True,
            "match_type": "partial",
            "confidence": round(best_score * 100, 1),
            "matched_company": best_match,
        }
    elif best_score >= 0.6:
        return {
            "verified": False,
            "match_type": "similar",
            "confidence": round(best_score * 100, 1),
            "matched_company": best_match,
            "warning": "Company name is similar to a known company but not an exact match. Verify independently.",
        }
    else:
        return {
            "verified": False,
            "match_type": "none",
            "confidence": 0,
            "matched_company": None,
            "warning": "Company not found in our database. This doesn't necessarily mean it's fake — verify through official channels.",
        }
