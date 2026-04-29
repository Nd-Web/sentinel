"""
SentinelAI — Per-Org Fraud Memory
===================================
Learns and retains fraud patterns per organisation so that repeat
attackers are caught faster and scored higher on subsequent attempts.

Pattern types:
  sender_blacklist  — known bad phone numbers / shortcodes
  keyword_pattern   — known bad keywords extracted from HIGH scans
  domain_blacklist  — known phishing domains seen in HIGH scans
"""

import re
import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from database import FraudMemory, SessionLocal

logger = logging.getLogger(__name__)

# After this many hits, a pattern is auto-promoted to blacklisted (is_active stays True but confidence maxes out)
AUTO_BLACKLIST_THRESHOLD = 3

# Max memory boost that can be added to base risk score
MAX_MEMORY_BOOST = 20.0

# Simple domain extractor
_DOMAIN_RE = re.compile(r"https?://([^\s/]+)", re.I)
# Rough suspicious keyword extractor — flags that end up in HIGH scan results
_SCAM_KEYWORDS = re.compile(
    r"\b(otp|bvn|nin|cvv|arrest|bond|transfer|unlock fee|processing fee"
    r"|guaranteed return|invest|withdraw|claim prize|won|verify account"
    r"|suspended|reactivate|urgent)\b",
    re.I,
)


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def store_fraud_pattern(
    org_id: str,
    pattern_type: str,
    value: str,
    scan_id: str,
    confidence: float,
    db: Optional[Session] = None,
) -> None:
    """
    Upsert a fraud pattern for an org.
    If it already exists, increment hit_count and update last_seen_at.
    If hit_count reaches AUTO_BLACKLIST_THRESHOLD, set confidence to 1.0.
    """
    if not org_id or not value:
        return

    own_db = False
    if db is None:
        db = SessionLocal()
        own_db = True

    try:
        existing = db.query(FraudMemory).filter(
            FraudMemory.org_id == org_id,
            FraudMemory.pattern_type == pattern_type,
            FraudMemory.pattern_value == value,
        ).first()

        if existing:
            existing.hit_count += 1
            existing.last_seen_at = datetime.utcnow()
            if existing.hit_count >= AUTO_BLACKLIST_THRESHOLD:
                existing.confidence = 1.0
            else:
                existing.confidence = max(existing.confidence, confidence)
        else:
            entry = FraudMemory(
                org_id=org_id,
                pattern_type=pattern_type,
                pattern_value=value,
                hit_count=1,
                first_seen_scan_id=scan_id,
                last_seen_at=datetime.utcnow(),
                confidence=confidence,
                is_active=True,
            )
            db.add(entry)

        db.commit()
    except Exception as e:
        logger.error(f"store_fraud_pattern failed: {e}")
        db.rollback()
    finally:
        if own_db:
            db.close()


def check_fraud_memory(
    org_id: str,
    content: str,
    sender: str,
    db: Optional[Session] = None,
) -> dict:
    """
    Check if content or sender matches any of the org's active fraud patterns.

    Returns:
      {matched: bool, patterns: [...], memory_boost: float}
    memory_boost is added to the base risk score (max MAX_MEMORY_BOOST points).
    """
    if not org_id:
        return {"matched": False, "patterns": [], "memory_boost": 0.0}

    own_db = False
    if db is None:
        db = SessionLocal()
        own_db = True

    try:
        patterns = db.query(FraudMemory).filter(
            FraudMemory.org_id == org_id,
            FraudMemory.is_active == True,
        ).all()

        if not patterns:
            return {"matched": False, "patterns": [], "memory_boost": 0.0}

        matched_patterns = []
        total_boost = 0.0
        content_lower = content.lower()
        sender_lower = sender.lower()

        for p in patterns:
            hit = False
            pv = p.pattern_value.lower()

            if p.pattern_type == "sender_blacklist":
                hit = sender_lower and sender_lower == pv
            elif p.pattern_type == "keyword_pattern":
                hit = pv in content_lower
            elif p.pattern_type == "domain_blacklist":
                domains = _DOMAIN_RE.findall(content_lower)
                hit = any(pv in d for d in domains)

            if hit:
                matched_patterns.append({
                    "type": p.pattern_type,
                    "value": p.pattern_value,
                    "hit_count": p.hit_count,
                    "confidence": p.confidence,
                })
                # Boost proportional to confidence and hit_count, capped
                boost = min(10.0, p.confidence * 10 * min(p.hit_count / AUTO_BLACKLIST_THRESHOLD, 1.0))
                total_boost += boost

        total_boost = min(MAX_MEMORY_BOOST, total_boost)

        return {
            "matched": bool(matched_patterns),
            "patterns": matched_patterns,
            "memory_boost": round(total_boost, 2),
        }
    except Exception as e:
        logger.error(f"check_fraud_memory failed: {e}")
        return {"matched": False, "patterns": [], "memory_boost": 0.0}
    finally:
        if own_db:
            db.close()


def get_org_memory_stats(org_id: str, db: Optional[Session] = None) -> dict:
    """
    Return stats about an org's fraud memory:
      total_patterns, top_senders, top_keywords, patterns_added_this_week
    """
    if not org_id:
        return {"total_patterns": 0, "top_senders": [], "top_keywords": [], "patterns_added_this_week": 0}

    own_db = False
    if db is None:
        db = SessionLocal()
        own_db = True

    try:
        patterns = db.query(FraudMemory).filter(
            FraudMemory.org_id == org_id,
            FraudMemory.is_active == True,
        ).all()

        week_ago = datetime.utcnow() - timedelta(days=7)
        new_this_week = sum(1 for p in patterns if p.created_at >= week_ago)

        senders = sorted(
            [p for p in patterns if p.pattern_type == "sender_blacklist"],
            key=lambda p: p.hit_count, reverse=True
        )[:5]

        keywords = sorted(
            [p for p in patterns if p.pattern_type == "keyword_pattern"],
            key=lambda p: p.hit_count, reverse=True
        )[:5]

        return {
            "total_patterns": len(patterns),
            "top_senders": [{"value": p.pattern_value, "hit_count": p.hit_count} for p in senders],
            "top_keywords": [{"value": p.pattern_value, "hit_count": p.hit_count} for p in keywords],
            "patterns_added_this_week": new_this_week,
        }
    except Exception as e:
        logger.error(f"get_org_memory_stats failed: {e}")
        return {"total_patterns": 0, "top_senders": [], "top_keywords": [], "patterns_added_this_week": 0}
    finally:
        if own_db:
            db.close()


def extract_and_store_patterns(
    org_id: str,
    scan_id: str,
    content: str,
    sender: str,
    threat_level: str,
    db: Optional[Session] = None,
) -> None:
    """
    Called after a HIGH verdict scan to extract and store patterns.
    - Stores sender as sender_blacklist candidate
    - Extracts suspicious keywords and domains
    """
    if threat_level != "HIGH" or not org_id:
        return

    try:
        # Store sender
        if sender:
            store_fraud_pattern(org_id, "sender_blacklist", sender.lower(), scan_id, 0.6, db)

        # Extract and store scam keywords
        kw_hits = _SCAM_KEYWORDS.findall(content)
        for kw in set(kw_hits):
            store_fraud_pattern(org_id, "keyword_pattern", kw.lower(), scan_id, 0.5, db)

        # Extract and store domains
        domains = _DOMAIN_RE.findall(content)
        for domain in set(domains):
            store_fraud_pattern(org_id, "domain_blacklist", domain.lower(), scan_id, 0.7, db)
    except Exception as e:
        logger.error(f"extract_and_store_patterns failed (non-fatal): {e}")
