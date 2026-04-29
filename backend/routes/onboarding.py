"""
SentinelAI Onboarding Wizard Routes
5-step guided setup: org details → admin account → scan settings → API key → live test.
"""

import re
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field

from database import get_db, User, OnboardingSession, UserRole
from auth_utils import hash_password, generate_api_key

router = APIRouter(prefix="/api/onboard", tags=["Onboarding"])

_PW_RE_NUM = re.compile(r"\d")
_PW_RE_UPPER = re.compile(r"[A-Z]")


def _validate_password(pw: str) -> Optional[str]:
    if len(pw) < 8:
        return "Password must be at least 8 characters"
    if not _PW_RE_NUM.search(pw):
        return "Password must contain at least one number"
    if not _PW_RE_UPPER.search(pw):
        return "Password must contain at least one uppercase letter"
    return None


def _get_session(session_id: str, db: Session) -> OnboardingSession:
    session = db.query(OnboardingSession).filter(OnboardingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Onboarding session not found")
    if session.completed:
        raise HTTPException(status_code=400, detail="Onboarding already completed")
    return session


# ─────────────────────────────────────────────────────────────────────────────
# STEP 0 — START SESSION
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/start", status_code=status.HTTP_201_CREATED)
async def start_onboarding(db: Session = Depends(get_db)):
    """Create a new onboarding session. No auth required."""
    session = OnboardingSession(step=1, completed=False)
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"session_id": session.id, "step": 1}


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — ORG DETAILS
# ─────────────────────────────────────────────────────────────────────────────

class Step1Request(BaseModel):
    session_id: str
    org_name: str = Field(..., min_length=2, max_length=255)
    org_type: str = Field(..., pattern="^(bank|fintech|telco|call_center)$")
    country: str = Field(..., min_length=2, max_length=100)


@router.post("/step/1")
async def onboard_step1(request: Step1Request, db: Session = Depends(get_db)):
    """Save organisation details, validate uniqueness."""
    session = _get_session(request.session_id, db)

    # Validate org name is not taken
    existing = db.query(User).filter(User.organisation == request.org_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Organisation name already registered")

    session.org_name = request.org_name
    session.org_type = request.org_type
    session.country = request.country
    session.step = 2
    db.commit()

    return {
        "session_id": session.id,
        "step": 2,
        "message": "Organisation details saved",
    }


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — ADMIN ACCOUNT
# ─────────────────────────────────────────────────────────────────────────────

class Step2Request(BaseModel):
    session_id: str
    admin_email: EmailStr
    admin_password: str
    admin_full_name: str = Field(..., min_length=2, max_length=255)


@router.post("/step/2")
async def onboard_step2(request: Step2Request, db: Session = Depends(get_db)):
    """Validate admin credentials. Does NOT create the user yet."""
    session = _get_session(request.session_id, db)
    if session.step < 2:
        raise HTTPException(status_code=400, detail="Complete step 1 first")

    # Validate email not taken
    existing = db.query(User).filter(User.email == request.admin_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Validate password strength
    pw_error = _validate_password(request.admin_password)
    if pw_error:
        raise HTTPException(status_code=400, detail=pw_error)

    session.admin_email = request.admin_email
    session.admin_name = request.admin_full_name
    session.admin_password_hash = hash_password(request.admin_password)
    session.step = 3
    db.commit()

    return {"session_id": session.id, "step": 3}


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — SCAN SETTINGS
# ─────────────────────────────────────────────────────────────────────────────

class Step3Request(BaseModel):
    session_id: str
    monitor_sms: bool = True
    monitor_whatsapp: bool = True
    monitor_voice: bool = False
    auto_block_threshold: int = Field(default=80, ge=60, le=95)
    alert_email: Optional[str] = None


@router.post("/step/3")
async def onboard_step3(request: Step3Request, db: Session = Depends(get_db)):
    """Save scan settings to session."""
    session = _get_session(request.session_id, db)
    if session.step < 3:
        raise HTTPException(status_code=400, detail="Complete step 2 first")

    session.scan_settings = {
        "monitor_sms": request.monitor_sms,
        "monitor_whatsapp": request.monitor_whatsapp,
        "monitor_voice": request.monitor_voice,
        "auto_block_threshold": request.auto_block_threshold,
        "alert_email": request.alert_email,
    }
    session.step = 4
    db.commit()

    return {"session_id": session.id, "step": 4}


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 — API KEY GENERATION
# ─────────────────────────────────────────────────────────────────────────────

class Step4Request(BaseModel):
    session_id: str


@router.post("/step/4")
async def onboard_step4(request: Step4Request, db: Session = Depends(get_db)):
    """Generate the API key and return integration guide."""
    session = _get_session(request.session_id, db)
    if session.step < 4:
        raise HTTPException(status_code=400, detail="Complete step 3 first")

    api_key = generate_api_key()
    session.api_key = api_key
    session.step = 5
    db.commit()

    return {
        "session_id": session.id,
        "step": 5,
        "api_key": api_key,
        "curl_example": (
            f"curl -X POST https://your-domain/api/scan/api "
            f"-H 'X-API-Key: {api_key}' "
            f"-H 'Content-Type: application/json' "
            f"-d '{{\"content\": \"test message\", \"message_type\": \"sms\"}}'"
        ),
        "integration_guide": {
            "sms": "Pipe all incoming SMS through the /api/scan/api endpoint with message_type=sms.",
            "whatsapp": "Forward WhatsApp messages via your webhook handler with message_type=whatsapp.",
            "voice": "Transcribe calls and submit transcripts with message_type=transcript.",
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# STEP 5 — LIVE TEST + ACCOUNT CREATION
# ─────────────────────────────────────────────────────────────────────────────

class Step5Request(BaseModel):
    session_id: str
    test_messages: List[str] = Field(..., min_items=1, max_items=10)


@router.post("/step/5")
async def onboard_step5(request: Step5Request, db: Session = Depends(get_db)):
    """Create the real User + Organisation, run test messages, complete onboarding."""
    session = _get_session(request.session_id, db)
    if session.step < 5:
        raise HTTPException(status_code=400, detail="Complete step 4 first")

    if not all([session.org_name, session.admin_email, session.admin_password_hash, session.api_key]):
        raise HTTPException(status_code=400, detail="Incomplete session — restart onboarding")

    # Create user
    existing = db.query(User).filter(User.email == session.admin_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered — please log in")

    new_user = User(
        email=session.admin_email,
        hashed_password=session.admin_password_hash,
        full_name=session.admin_name,
        organisation=session.org_name,
        role=UserRole.ADMIN,
        is_active=True,
        api_key=session.api_key,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Run test messages through AI (non-blocking even if AI fails)
    from ai.scanner import analyse_message
    test_results = []
    for msg in request.test_messages[:3]:
        try:
            result = await analyse_message(content=msg, message_type="sms")
            test_results.append({
                "message": msg[:100],
                "risk_score": result["risk_score"],
                "threat_level": result["threat_level"],
                "action": result["action"],
                "reasoning": result["reasoning"],
                "suggested_actions": result.get("suggested_actions", []),
            })
        except Exception:
            test_results.append({
                "message": msg[:100],
                "risk_score": 50,
                "threat_level": "MEDIUM",
                "action": "REVIEW",
                "reasoning": "Analysis unavailable during onboarding test.",
                "suggested_actions": [],
            })

    session.completed = True
    db.commit()

    return {
        "session_id": session.id,
        "completed": True,
        "user_created": {
            "email": new_user.email,
            "organisation": new_user.organisation,
            "api_key": session.api_key,
        },
        "test_results": test_results,
        "next_step": "Login at /sign-in with your email and password",
    }


# ─────────────────────────────────────────────────────────────────────────────
# RESUME SESSION
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/resume/{session_id}")
async def resume_onboarding(session_id: str, db: Session = Depends(get_db)):
    """Return current step and filled data so user can resume. Masks sensitive fields."""
    session = db.query(OnboardingSession).filter(OnboardingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Partial API key reveal: last 4 chars only
    masked_key = None
    if session.api_key:
        masked_key = "sk-sentinel-****" + session.api_key[-4:]

    return {
        "session_id": session.id,
        "step": session.step,
        "completed": session.completed,
        "org_name": session.org_name,
        "org_type": session.org_type,
        "country": session.country,
        "admin_email": session.admin_email,
        "admin_name": session.admin_name,
        "admin_password": "••••••••" if session.admin_password_hash else None,
        "scan_settings": session.scan_settings,
        "api_key": masked_key,
        "created_at": session.created_at,
    }
