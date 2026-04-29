"""
SentinelAI Org Routes
Per-organisation fraud memory stats and pattern management.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db, User, FraudMemory, UserRole
from auth_utils import require_role

router = APIRouter(prefix="/api/org", tags=["Organisation"])


@router.get("/memory")
async def get_org_memory(
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Return the organisation's fraud memory stats and full pattern list."""
    try:
        if not current_user.organisation:
            return {
                "org_id": None,
                "stats": {"total_patterns": 0, "top_senders": [], "top_keywords": [], "patterns_added_this_week": 0},
                "patterns": [],
            }

        from ai.memory import get_org_memory_stats

        org_id = current_user.organisation
        stats = get_org_memory_stats(org_id, db)

        patterns = db.query(FraudMemory).filter(
            FraudMemory.org_id == org_id,
            FraudMemory.is_active == True,
        ).order_by(FraudMemory.hit_count.desc()).all()

        return {
            "org_id": org_id,
            "stats": stats,
            "patterns": [
                {
                    "id": p.id,
                    "pattern_type": p.pattern_type,
                    "pattern_value": p.pattern_value,
                    "hit_count": p.hit_count,
                    "confidence": p.confidence,
                    "last_seen_at": p.last_seen_at,
                    "created_at": p.created_at,
                }
                for p in patterns
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get org memory: {str(e)}")
