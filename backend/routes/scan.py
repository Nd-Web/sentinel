"""
SentinelAI Scan Routes
Message scanning, batch processing, scan history, corrections,
threat lifecycle, escalations, and batch-judge.

v2 fix: ScanResponse now includes content, sender, message_type, source,
        calibration_log so history shows the full message + AI reasoning.
v3 add: suggested_actions, threat_status, corrections, escalations, batch-judge
"""

import json
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field

from database import (
    get_db, User, ScanResult, MessageType, ThreatLevel, ScanAction,
    AuditLog, UserRole, Correction, ScanStatusHistory, Escalation,
    VALID_STATUS_TRANSITIONS,
)
from auth_utils import get_current_user, require_role, log_audit, get_current_user_from_api_key
from ai.scanner import analyse_message, batch_analyse
from ai.risk_scorer import calculate_contextual_risk, get_threat_level
from ai.kernel import run_fraud_analysis_pipeline

router = APIRouter(prefix="/api/scan", tags=["Scanning"])


# ─────────────────────────────────────────────────────────────────────────────
# PYDANTIC MODELS
# ─────────────────────────────────────────────────────────────────────────────

class ScanRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
    message_type: str = Field(default="sms", description="sms | whatsapp | transcript")
    sender: Optional[str] = Field(None, max_length=255)


class ScanResponse(BaseModel):
    id: str
    content: str
    sender: Optional[str]
    message_type: str
    risk_score: float
    threat_level: str
    flags: list
    action: str
    reasoning: str
    is_scam: bool
    source: str
    calibration_log: list
    suggested_actions: list
    threat_status: str
    created_at: datetime


class BatchScanRequest(BaseModel):
    messages: List[ScanRequest] = Field(..., max_items=50)


class BatchScanResponse(BaseModel):
    total_scanned: int
    threats_found: int
    breakdown: dict
    results: List[ScanResponse]


class ScanHistoryResponse(BaseModel):
    items: List[ScanResponse]
    total: int
    page: int
    page_size: int
    pages: int


# Feature 1 — Correction models
class CorrectionRequest(BaseModel):
    corrected_verdict: str = Field(..., pattern="^(SAFE|SCAM)$")
    corrected_action: str = Field(..., pattern="^(BLOCK|REVIEW|ALLOW)$")
    correction_reason: Optional[str] = None


class CorrectionResponse(BaseModel):
    id: str
    scan_id: str
    user_id: str
    original_risk_score: float
    original_threat_level: str
    original_action: str
    original_flags: list
    corrected_verdict: str
    corrected_action: str
    correction_reason: Optional[str]
    message_content: Optional[str]
    created_at: datetime


# Feature 2 — Lifecycle models
class StatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(new|reviewing|escalated|resolved|closed)$")
    note: Optional[str] = None


# Feature 4 — Escalation models
class EscalationRequest(BaseModel):
    reason: str = Field(..., min_length=5)
    escalate_to_user_id: Optional[str] = None


class EscalationResponse(BaseModel):
    id: str
    scan_id: str
    escalated_by: str
    escalated_to: Optional[str]
    reason: str
    original_threat_level: str
    created_at: datetime


# Feature 7 — Batch-judge models
class BatchJudgeRequest(BaseModel):
    limit: int = Field(default=20, ge=1, le=100)
    threat_level: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class BatchJudgeResponse(BaseModel):
    processed: int
    updated: int
    skipped: int
    results: List[ScanResponse]


def _build_scan_response(
    scan: ScanResult,
    is_scam: bool = None,
    source: str = "gpt+calibration",
    calibration_log: list = None,
) -> ScanResponse:
    """Build a ScanResponse from a ScanResult DB row, including message content."""
    if is_scam is None:
        is_scam = scan.threat_level in [ThreatLevel.HIGH, ThreatLevel.MEDIUM]
    return ScanResponse(
        id=scan.id,
        content=scan.content or "",
        sender=scan.sender,
        message_type=scan.message_type.value if scan.message_type else "sms",
        risk_score=scan.risk_score,
        threat_level=scan.threat_level.value,
        flags=scan.flags or [],
        action=scan.action.value,
        reasoning=scan.ai_reasoning or "",
        is_scam=is_scam,
        source=source,
        calibration_log=calibration_log or [],
        suggested_actions=scan.suggested_actions or [],
        threat_status=scan.threat_status or "new",
        created_at=scan.created_at,
    )


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE 1 — CORRECTION STATS (static route, must be before /{scan_id})
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/corrections/stats")
async def get_correction_stats(
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.ANALYST)),
    db: Session = Depends(get_db),
):
    """Correction analytics: totals, false-positive/negative rates this week."""
    try:
        week_ago = datetime.utcnow() - timedelta(days=7)
        corrections = db.query(Correction).filter(
            Correction.created_at >= week_ago
        ).all()

        total_this_week = len(corrections)

        # False positive: AI said HIGH but analyst said SAFE
        false_positives = sum(
            1 for c in corrections
            if c.original_threat_level == "HIGH" and c.corrected_verdict == "SAFE"
        )

        # False negative: AI said CLEAN but analyst said SCAM
        false_negatives = sum(
            1 for c in corrections
            if c.original_threat_level == "CLEAN" and c.corrected_verdict == "SCAM"
        )

        # Most corrected original action
        from collections import Counter
        action_counts = Counter(c.original_action for c in corrections)
        most_corrected = action_counts.most_common(1)[0][0] if action_counts else None

        # Total scans this week for rate calculation
        total_scans_week = db.query(ScanResult).filter(
            ScanResult.created_at >= week_ago
        ).count()

        fp_rate = round(false_positives / total_scans_week * 100, 2) if total_scans_week else 0.0
        fn_rate = round(false_negatives / total_scans_week * 100, 2) if total_scans_week else 0.0

        return {
            "total_corrections_this_week": total_this_week,
            "most_corrected_category": most_corrected,
            "false_positive_rate": fp_rate,
            "false_negative_rate": fn_rate,
            "total_scans_this_week": total_scans_week,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get correction stats: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE 2 — PIPELINE VIEW (static route)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/pipeline")
async def get_pipeline(
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.ANALYST)),
    db: Session = Depends(get_db),
):
    """Counts grouped by threat_status × threat_level for the pipeline widget."""
    try:
        rows = db.query(
            ScanResult.threat_status,
            ScanResult.threat_level,
            func.count(ScanResult.id).label("count"),
        ).group_by(ScanResult.threat_status, ScanResult.threat_level).all()

        pipeline: dict = {}
        for status_val, level, count in rows:
            s = status_val or "new"
            if s not in pipeline:
                pipeline[s] = {}
            pipeline[s][level.value if hasattr(level, "value") else level] = count

        return pipeline
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get pipeline: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE 7 — BATCH JUDGE (static route)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/batch-judge", response_model=BatchJudgeResponse)
async def batch_judge(
    request: BatchJudgeRequest,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Re-run unreviewed scans through AI to populate suggested_actions."""
    try:
        query = db.query(ScanResult).filter(ScanResult.threat_status == "new")

        if request.threat_level and request.threat_level.upper() in ["HIGH", "MEDIUM", "LOW", "CLEAN"]:
            query = query.filter(ScanResult.threat_level == ThreatLevel(request.threat_level.upper()))

        if request.start_date:
            try:
                query = query.filter(ScanResult.created_at >= datetime.fromisoformat(request.start_date))
            except ValueError:
                pass

        if request.end_date:
            try:
                query = query.filter(ScanResult.created_at <= datetime.fromisoformat(request.end_date))
            except ValueError:
                pass

        scans = query.order_by(ScanResult.created_at.desc()).limit(request.limit).all()

        # Only re-analyse scans that have no suggested_actions yet
        to_analyse = [s for s in scans if not s.suggested_actions]
        to_skip = [s for s in scans if s.suggested_actions]

        async def _re_analyse(scan: ScanResult):
            try:
                result = await analyse_message(
                    content=scan.content,
                    message_type=scan.message_type.value if scan.message_type else "sms",
                    sender=scan.sender,
                )
                return scan.id, result.get("suggested_actions", [])
            except Exception:
                return scan.id, []

        tasks = [_re_analyse(s) for s in to_analyse]
        outcomes = await asyncio.gather(*tasks)

        updated_count = 0
        results_out = []

        for scan_id, actions in outcomes:
            scan = next((s for s in to_analyse if s.id == scan_id), None)
            if scan and actions:
                scan.suggested_actions = actions
                updated_count += 1

        db.commit()

        for scan_id, _ in outcomes:
            scan = next((s for s in to_analyse if s.id == scan_id), None)
            if scan:
                results_out.append(_build_scan_response(scan))

        for scan in to_skip:
            results_out.append(_build_scan_response(scan))

        log_audit(
            db=db, user_id=current_user.id, action="BATCH_JUDGE",
            resource="scan_results",
            details=f"Processed {len(scans)}, updated {updated_count}, skipped {len(to_skip)}",
        )

        return BatchJudgeResponse(
            processed=len(scans),
            updated=updated_count,
            skipped=len(to_skip),
            results=results_out,
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Batch judge failed: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE 4 — ACTIVE ESCALATIONS LIST (static route)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/escalations")
async def get_escalations(
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """All active escalations (threat_status = escalated) for the org."""
    try:
        escalations = (
            db.query(Escalation)
            .join(ScanResult, Escalation.scan_id == ScanResult.id)
            .filter(ScanResult.threat_status == "escalated")
            .order_by(Escalation.created_at.desc())
            .all()
        )

        result = []
        for esc in escalations:
            scan = db.query(ScanResult).filter(ScanResult.id == esc.scan_id).first()
            by_user = db.query(User).filter(User.id == esc.escalated_by).first()
            to_user = db.query(User).filter(User.id == esc.escalated_to).first() if esc.escalated_to else None

            result.append({
                "escalation_id": esc.id,
                "scan_id": esc.scan_id,
                "reason": esc.reason,
                "original_threat_level": esc.original_threat_level,
                "created_at": esc.created_at,
                "escalated_by": {
                    "id": by_user.id if by_user else esc.escalated_by,
                    "email": by_user.email if by_user else None,
                    "full_name": by_user.full_name if by_user else None,
                },
                "escalated_to": {
                    "id": to_user.id if to_user else None,
                    "email": to_user.email if to_user else None,
                    "full_name": to_user.full_name if to_user else None,
                } if to_user else None,
                "scan": _build_scan_response(scan) if scan else None,
            })

        return {"escalations": result, "total": len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get escalations: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# SCAN A SINGLE MESSAGE
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/message", response_model=ScanResponse, status_code=status.HTTP_201_CREATED)
async def scan_message(
    request: ScanRequest,
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.ANALYST)),
    db: Session = Depends(get_db)
):
    """Scan a single message through the full 5-layer fraud analysis pipeline."""
    try:
        if request.message_type not in ["sms", "whatsapp", "transcript"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid message_type. Must be: sms, whatsapp, or transcript"
            )

        result = await run_fraud_analysis_pipeline(
            content=request.content,
            sender=request.sender,
            message_type=request.message_type,
            db=db
        )

        ai = result["ai_analysis"]

        scan_result = ScanResult(
            user_id=current_user.id,
            message_type=MessageType(request.message_type),
            content=request.content,
            sender=request.sender,
            risk_score=result["final_risk_score"],
            threat_level=ThreatLevel(result["final_threat_level"]),
            flags=ai.get("flags", []),
            action=ScanAction(ai.get("action", "REVIEW")),
            ai_reasoning=ai.get("reasoning", ""),
            suggested_actions=ai.get("suggested_actions", []),
            threat_status="new",
            confirmed=False,
        )

        db.add(scan_result)
        db.commit()
        db.refresh(scan_result)

        # Store fraud patterns in org memory for HIGH verdicts
        if result["final_threat_level"] == "HIGH" and current_user.organisation:
            try:
                from ai.memory import extract_and_store_patterns
                extract_and_store_patterns(
                    org_id=current_user.organisation,
                    scan_id=scan_result.id,
                    content=request.content,
                    sender=request.sender or "",
                    threat_level="HIGH",
                    db=db,
                )
            except Exception:
                pass

        log_audit(
            db=db, user_id=current_user.id, action="MESSAGE_SCANNED",
            resource="scan_results",
            details=f"Scanned {request.message_type} from {request.sender or 'unknown'}",
        )

        return ScanResponse(
            id=scan_result.id,
            content=request.content,
            sender=request.sender,
            message_type=request.message_type,
            risk_score=scan_result.risk_score,
            threat_level=scan_result.threat_level.value,
            flags=scan_result.flags or [],
            action=scan_result.action.value,
            reasoning=scan_result.ai_reasoning or "",
            is_scam=ai.get("is_scam", False),
            source=ai.get("source", "gpt+calibration"),
            calibration_log=ai.get("calibration_log", []),
            suggested_actions=scan_result.suggested_actions or [],
            threat_status=scan_result.threat_status or "new",
            created_at=scan_result.created_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# BATCH SCAN
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/batch", response_model=BatchScanResponse)
async def scan_batch(
    request: BatchScanRequest,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """Scan up to 50 messages concurrently."""
    try:
        messages = [
            {"content": m.content, "message_type": m.message_type, "sender": m.sender}
            for m in request.messages
        ]
        results = await batch_analyse(messages)

        saved = []
        breakdown = {"HIGH": 0, "MEDIUM": 0, "LOW": 0, "CLEAN": 0}
        threats_found = 0

        for i, ai_result in enumerate(results):
            msg = request.messages[i]
            risk_context = calculate_contextual_risk(
                base_score=ai_result["risk_score"],
                sender=msg.sender or "",
                db=db,
            )
            threat_level = get_threat_level(risk_context["final_score"])

            scan_result = ScanResult(
                user_id=current_user.id,
                message_type=MessageType(msg.message_type),
                content=msg.content,
                sender=msg.sender,
                risk_score=risk_context["final_score"],
                threat_level=ThreatLevel(threat_level),
                flags=ai_result.get("flags", []),
                action=ScanAction(ai_result.get("action", "REVIEW")),
                ai_reasoning=ai_result.get("reasoning", ""),
                suggested_actions=ai_result.get("suggested_actions", []),
                threat_status="new",
                confirmed=False,
            )
            db.add(scan_result)
            saved.append((scan_result, ai_result))
            breakdown[threat_level] += 1
            if threat_level in ["HIGH", "MEDIUM"]:
                threats_found += 1

        db.commit()

        log_audit(
            db=db, user_id=current_user.id, action="BATCH_SCAN",
            resource="scan_results",
            details=f"Batch: {len(request.messages)} messages, {threats_found} threats",
        )

        return BatchScanResponse(
            total_scanned=len(request.messages),
            threats_found=threats_found,
            breakdown=breakdown,
            results=[
                ScanResponse(
                    id=r.id,
                    content=r.content or "",
                    sender=r.sender,
                    message_type=r.message_type.value,
                    risk_score=r.risk_score,
                    threat_level=r.threat_level.value,
                    flags=r.flags or [],
                    action=r.action.value,
                    reasoning=r.ai_reasoning or "",
                    is_scam=r.threat_level in [ThreatLevel.HIGH, ThreatLevel.MEDIUM],
                    source=ai.get("source", "gpt+calibration"),
                    calibration_log=ai.get("calibration_log", []),
                    suggested_actions=r.suggested_actions or [],
                    threat_status=r.threat_status or "new",
                    created_at=r.created_at,
                )
                for r, ai in saved
            ],
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Batch scan failed: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# SCAN HISTORY
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/history", response_model=ScanHistoryResponse)
async def get_scan_history(
    threat_level: Optional[str] = Query(None),
    message_type: Optional[str] = Query(None),
    threat_status: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.ANALYST)),
    db: Session = Depends(get_db)
):
    """Get paginated scan history with optional threat_status filter."""
    try:
        query = db.query(ScanResult).filter(ScanResult.user_id == current_user.id)

        if threat_level and threat_level.upper() in ["HIGH", "MEDIUM", "LOW", "CLEAN"]:
            query = query.filter(ScanResult.threat_level == ThreatLevel(threat_level.upper()))

        if message_type and message_type.lower() in ["sms", "whatsapp", "transcript"]:
            query = query.filter(ScanResult.message_type == MessageType(message_type.lower()))

        if threat_status and threat_status.lower() in ["new", "reviewing", "escalated", "resolved", "closed"]:
            query = query.filter(ScanResult.threat_status == threat_status.lower())

        if start_date:
            try:
                query = query.filter(ScanResult.created_at >= datetime.fromisoformat(start_date))
            except ValueError:
                pass

        if end_date:
            try:
                query = query.filter(ScanResult.created_at <= datetime.fromisoformat(end_date))
            except ValueError:
                pass

        total = query.count()
        offset = (page - 1) * page_size
        items = query.order_by(ScanResult.created_at.desc()).offset(offset).limit(page_size).all()

        return ScanHistoryResponse(
            items=[_build_scan_response(item) for item in items],
            total=total,
            page=page,
            page_size=page_size,
            pages=(total + page_size - 1) // page_size,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve history: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# MODEL EVALUATION
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/evaluate", summary="Run model evaluation")
async def evaluate_model(
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    from ai.scanner import evaluate_model_performance
    try:
        results = await evaluate_model_performance()
        return {
            "status": "evaluation_complete",
            "accuracy_percent": results["accuracy"],
            "precision_percent": results.get("precision"),
            "recall_percent": results.get("recall"),
            "f1_percent": results.get("f1"),
            "correct": results["correct"],
            "total": results["total"],
            "confusion": results.get("confusion"),
            "results": results["results"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# GET SINGLE SCAN
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{scan_id}", response_model=ScanResponse)
async def get_scan_result(
    scan_id: str,
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.ANALYST)),
    db: Session = Depends(get_db)
):
    """Get a single scan result by ID — includes full message and AI reasoning."""
    try:
        scan = db.query(ScanResult).filter(
            ScanResult.id == scan_id,
            ScanResult.user_id == current_user.id
        ).first()

        if not scan:
            raise HTTPException(status_code=404, detail="Scan result not found")

        return _build_scan_response(scan)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve scan: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# CONFIRM SCAN
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{scan_id}/confirm", response_model=ScanResponse)
async def confirm_scan(
    scan_id: str,
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.ANALYST)),
    db: Session = Depends(get_db)
):
    """Mark a scan result as a confirmed threat."""
    try:
        scan = db.query(ScanResult).filter(
            ScanResult.id == scan_id,
            ScanResult.user_id == current_user.id
        ).first()

        if not scan:
            raise HTTPException(status_code=404, detail="Scan result not found")

        scan.confirmed = True
        db.commit()
        db.refresh(scan)

        log_audit(db=db, user_id=current_user.id, action="SCAN_CONFIRMED",
                  resource="scan_results", details=f"Confirmed: {scan_id}")

        return _build_scan_response(scan)

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to confirm scan: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE 1 — POST CORRECTION
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{scan_id}/correct", response_model=CorrectionResponse, status_code=status.HTTP_201_CREATED)
async def correct_scan(
    scan_id: str,
    request: CorrectionRequest,
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.ANALYST)),
    db: Session = Depends(get_db),
):
    """Submit an analyst correction for an AI verdict."""
    try:
        scan = db.query(ScanResult).filter(ScanResult.id == scan_id).first()
        if not scan:
            raise HTTPException(status_code=404, detail="Scan result not found")

        correction = Correction(
            scan_id=scan_id,
            user_id=current_user.id,
            original_risk_score=scan.risk_score,
            original_threat_level=scan.threat_level.value,
            original_action=scan.action.value,
            original_flags=scan.flags or [],
            corrected_verdict=request.corrected_verdict,
            corrected_action=request.corrected_action,
            correction_reason=request.correction_reason,
            message_content=scan.content,
        )
        db.add(correction)

        # Mark the scan as confirmed by analyst
        scan.confirmed = True
        db.commit()
        db.refresh(correction)

        log_audit(
            db=db, user_id=current_user.id, action="SCAN_CORRECTED",
            resource="corrections",
            details=f"Scan {scan_id}: verdict corrected to {request.corrected_verdict}",
        )

        return CorrectionResponse(
            id=correction.id,
            scan_id=correction.scan_id,
            user_id=correction.user_id,
            original_risk_score=correction.original_risk_score,
            original_threat_level=correction.original_threat_level,
            original_action=correction.original_action,
            original_flags=correction.original_flags or [],
            corrected_verdict=correction.corrected_verdict,
            corrected_action=correction.corrected_action,
            correction_reason=correction.correction_reason,
            message_content=correction.message_content,
            created_at=correction.created_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save correction: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE 2 — PATCH STATUS
# ─────────────────────────────────────────────────────────────────────────────

@router.patch("/{scan_id}/status", response_model=ScanResponse)
async def update_scan_status(
    scan_id: str,
    request: StatusUpdateRequest,
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.ANALYST)),
    db: Session = Depends(get_db),
):
    """Transition the threat status with validation and audit history."""
    try:
        scan = db.query(ScanResult).filter(ScanResult.id == scan_id).first()
        if not scan:
            raise HTTPException(status_code=404, detail="Scan result not found")

        current_status = scan.threat_status or "new"
        new_status = request.status.lower()

        valid_next = VALID_STATUS_TRANSITIONS.get(current_status, set())
        if new_status not in valid_next:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid transition: {current_status} → {new_status}. "
                       f"Allowed: {sorted(valid_next) or 'none (terminal state)'}",
            )

        # Record history entry
        history = ScanStatusHistory(
            scan_id=scan_id,
            from_status=current_status,
            to_status=new_status,
            changed_by=current_user.id,
            note=request.note,
        )
        db.add(history)

        scan.threat_status = new_status
        db.commit()
        db.refresh(scan)

        log_audit(
            db=db, user_id=current_user.id, action="SCAN_STATUS_CHANGED",
            resource="scan_results",
            details=f"Scan {scan_id}: {current_status} → {new_status}",
        )

        return _build_scan_response(scan)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update status: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE 4 — ESCALATE
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{scan_id}/escalate", response_model=EscalationResponse, status_code=status.HTTP_201_CREATED)
async def escalate_scan(
    scan_id: str,
    request: EscalationRequest,
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.ANALYST)),
    db: Session = Depends(get_db),
):
    """Escalate a threat: raise to HIGH, set status to escalated, create escalation record."""
    try:
        scan = db.query(ScanResult).filter(ScanResult.id == scan_id).first()
        if not scan:
            raise HTTPException(status_code=404, detail="Scan result not found")

        # Validate escalate_to is an ADMIN if provided
        escalate_to_id = None
        if request.escalate_to_user_id:
            target = db.query(User).filter(User.id == request.escalate_to_user_id).first()
            if not target:
                raise HTTPException(status_code=404, detail="Target user not found")
            if target.role != UserRole.ADMIN:
                raise HTTPException(status_code=400, detail="Can only escalate to ADMIN users")
            escalate_to_id = target.id

        original_level = scan.threat_level.value

        # Raise threat level to HIGH if not already
        if scan.threat_level != ThreatLevel.HIGH:
            scan.threat_level = ThreatLevel.HIGH
            scan.action = ScanAction.BLOCK

        # Set status to escalated
        old_status = scan.threat_status or "new"
        scan.threat_status = "escalated"

        # Create status history entry
        history = ScanStatusHistory(
            scan_id=scan_id,
            from_status=old_status,
            to_status="escalated",
            changed_by=current_user.id,
            note=request.reason,
        )
        db.add(history)

        # Create escalation record
        escalation = Escalation(
            scan_id=scan_id,
            escalated_by=current_user.id,
            escalated_to=escalate_to_id,
            reason=request.reason,
            original_threat_level=original_level,
        )
        db.add(escalation)
        db.commit()
        db.refresh(escalation)

        log_audit(
            db=db, user_id=current_user.id, action="SCAN_ESCALATED",
            resource="escalations",
            details=f"Scan {scan_id} escalated. Reason: {request.reason}",
        )

        return EscalationResponse(
            id=escalation.id,
            scan_id=escalation.scan_id,
            escalated_by=escalation.escalated_by,
            escalated_to=escalation.escalated_to,
            reason=escalation.reason,
            original_threat_level=escalation.original_threat_level,
            created_at=escalation.created_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to escalate scan: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# EXTERNAL API KEY ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/api", response_model=dict)
async def scan_via_api_key(
    request: ScanRequest,
    current_user: User = Depends(get_current_user_from_api_key),
    db: Session = Depends(get_db)
):
    """External API key endpoint for enterprise integrations (GTBank, MTN, etc.)."""
    try:
        if request.message_type not in ["sms", "whatsapp", "transcript"]:
            raise HTTPException(status_code=400, detail="Invalid message_type")

        ai_result = await analyse_message(
            content=request.content,
            message_type=request.message_type,
            sender=request.sender,
            org_id=current_user.organisation,
        )

        risk_context = calculate_contextual_risk(
            base_score=ai_result["risk_score"],
            sender=request.sender or "",
            db=db,
        )
        threat_level = get_threat_level(risk_context["final_score"])

        scan_result = ScanResult(
            user_id=current_user.id,
            message_type=MessageType(request.message_type),
            content=request.content,
            sender=request.sender,
            risk_score=risk_context["final_score"],
            threat_level=ThreatLevel(threat_level),
            flags=ai_result.get("flags", []),
            action=ScanAction(ai_result.get("action", "REVIEW")),
            ai_reasoning=ai_result.get("reasoning", ""),
            suggested_actions=ai_result.get("suggested_actions", []),
            threat_status="new",
            confirmed=False,
        )
        db.add(scan_result)
        db.commit()

        log_audit(db=db, user_id=current_user.id, action="API_SCAN",
                  resource="scan_results",
                  details=f"API scan from {current_user.organisation or current_user.email}")

        return {
            "risk_score": risk_context["final_score"],
            "threat_level": threat_level,
            "action": ai_result.get("action", "REVIEW"),
            "flags": ai_result.get("flags", []),
            "reasoning": ai_result.get("reasoning", ""),
            "source": ai_result.get("source", "gpt+calibration"),
            "suggested_actions": ai_result.get("suggested_actions", []),
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"API scan failed: {str(e)}")
