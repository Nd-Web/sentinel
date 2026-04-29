"""
SentinelAI Database Configuration and Models
SQLite database with SQLAlchemy ORM for telecom fraud detection SaaS
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    create_engine, Column, String, Integer, Float, Boolean, DateTime,
    ForeignKey, Text, JSON, Enum as SQLEnum, Index
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from sqlalchemy.dialects.sqlite import CHAR
import enum

# Database setup
DATABASE_URL = "sqlite:///./sentinelai.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Enums
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    ANALYST = "analyst"
    VIEWER = "viewer"


class MessageType(str, enum.Enum):
    SMS = "sms"
    WHATSAPP = "whatsapp"
    TRANSCRIPT = "transcript"


class ThreatLevel(str, enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    CLEAN = "CLEAN"


class ScanAction(str, enum.Enum):
    BLOCK = "BLOCK"
    REVIEW = "REVIEW"
    ALLOW = "ALLOW"


class ThreatStatus(str, enum.Enum):
    NEW = "new"
    REVIEWING = "reviewing"
    ESCALATED = "escalated"
    RESOLVED = "resolved"
    CLOSED = "closed"


# Valid status transitions — closed is terminal
VALID_STATUS_TRANSITIONS = {
    "new": {"reviewing", "escalated"},
    "reviewing": {"escalated", "resolved", "closed"},
    "escalated": {"reviewing", "resolved", "closed"},
    "resolved": {"closed"},
    "closed": set(),
}


# Models
class User(Base):
    """User model for authentication and authorization"""
    __tablename__ = "users"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    organisation = Column(String(255), nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.VIEWER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    api_key = Column(String(255), unique=True, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)

    # Relationships
    scan_results = relationship("ScanResult", back_populates="user", cascade="all, delete-orphan")
    voice_analyses = relationship("VoiceAnalysis", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_user_email", "email"),
        Index("idx_user_api_key", "api_key"),
    )


class ScanResult(Base):
    """Scan results for SMS, WhatsApp, and transcript analysis"""
    __tablename__ = "scan_results"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey("users.id"), nullable=False, index=True)
    message_type = Column(SQLEnum(MessageType), nullable=False)
    content = Column(Text, nullable=False)
    sender = Column(String(255), nullable=True, index=True)
    risk_score = Column(Float, nullable=False)
    threat_level = Column(SQLEnum(ThreatLevel), nullable=False)
    flags = Column(JSON, nullable=True)
    action = Column(SQLEnum(ScanAction), nullable=False)
    ai_reasoning = Column(Text, nullable=True)
    confirmed = Column(Boolean, default=False, nullable=False)
    # Feature 3: suggested actions from AI
    suggested_actions = Column(JSON, nullable=True)
    # Feature 2: threat lifecycle status
    threat_status = Column(String(20), default="new", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="scan_results")
    corrections = relationship("Correction", back_populates="scan", cascade="all, delete-orphan")
    status_history = relationship("ScanStatusHistory", back_populates="scan", cascade="all, delete-orphan")
    escalations = relationship("Escalation", back_populates="scan", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_scan_threat_level", "threat_level"),
        Index("idx_scan_created_at", "created_at"),
        Index("idx_scan_sender", "sender"),
        Index("idx_scan_threat_status", "threat_status"),
    )


class VoiceAnalysis(Base):
    """Voice analysis results for deepfake and fraud detection"""
    __tablename__ = "voice_analyses"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey("users.id"), nullable=False, index=True)
    transcript = Column(Text, nullable=False)
    deepfake_probability = Column(Float, nullable=False)
    risk_score = Column(Float, nullable=False)
    threat_level = Column(SQLEnum(ThreatLevel), nullable=False)
    flags = Column(JSON, nullable=True)
    ai_reasoning = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="voice_analyses")

    __table_args__ = (
        Index("idx_voice_threat_level", "threat_level"),
        Index("idx_voice_created_at", "created_at"),
    )


class AuditLog(Base):
    """Audit log for tracking all system actions"""
    __tablename__ = "audit_logs"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False)
    resource = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="audit_logs")

    __table_args__ = (
        Index("idx_audit_action", "action"),
        Index("idx_audit_created_at", "created_at"),
        Index("idx_audit_user", "user_id"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Feature 1: Corrections
# ─────────────────────────────────────────────────────────────────────────────

class Correction(Base):
    """Analyst corrections to AI scan verdicts"""
    __tablename__ = "corrections"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(CHAR(36), ForeignKey("scan_results.id"), nullable=False, index=True)
    user_id = Column(CHAR(36), ForeignKey("users.id"), nullable=False, index=True)
    original_risk_score = Column(Float, nullable=False)
    original_threat_level = Column(String(20), nullable=False)
    original_action = Column(String(20), nullable=False)
    original_flags = Column(JSON, nullable=True)
    corrected_verdict = Column(String(10), nullable=False)   # SAFE | SCAM
    corrected_action = Column(String(10), nullable=False)    # BLOCK | REVIEW | ALLOW
    correction_reason = Column(Text, nullable=True)
    message_content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    scan = relationship("ScanResult", back_populates="corrections")
    user = relationship("User")

    __table_args__ = (
        Index("idx_correction_scan", "scan_id"),
        Index("idx_correction_created", "created_at"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Feature 2: Threat Lifecycle — status history
# ─────────────────────────────────────────────────────────────────────────────

class ScanStatusHistory(Base):
    """Audit trail of every threat status transition"""
    __tablename__ = "scan_status_history"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(CHAR(36), ForeignKey("scan_results.id"), nullable=False, index=True)
    from_status = Column(String(20), nullable=True)
    to_status = Column(String(20), nullable=False)
    changed_by = Column(CHAR(36), ForeignKey("users.id"), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    scan = relationship("ScanResult", back_populates="status_history")
    user = relationship("User")


# ─────────────────────────────────────────────────────────────────────────────
# Feature 4: Escalations
# ─────────────────────────────────────────────────────────────────────────────

class Escalation(Base):
    """Escalation records for high-priority threats"""
    __tablename__ = "escalations"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(CHAR(36), ForeignKey("scan_results.id"), nullable=False, index=True)
    escalated_by = Column(CHAR(36), ForeignKey("users.id"), nullable=False)
    escalated_to = Column(CHAR(36), ForeignKey("users.id"), nullable=True)
    reason = Column(Text, nullable=False)
    original_threat_level = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    scan = relationship("ScanResult", back_populates="escalations")
    escalated_by_user = relationship("User", foreign_keys=[escalated_by])
    escalated_to_user = relationship("User", foreign_keys=[escalated_to])

    __table_args__ = (
        Index("idx_escalation_scan", "scan_id"),
        Index("idx_escalation_created", "created_at"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Feature 5: Per-Org Fraud Memory
# ─────────────────────────────────────────────────────────────────────────────

class FraudMemory(Base):
    """Per-organisation learned fraud patterns"""
    __tablename__ = "fraud_memory"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(255), nullable=False, index=True)
    pattern_type = Column(String(50), nullable=False)   # sender_blacklist | keyword_pattern | domain_blacklist
    pattern_value = Column(String(500), nullable=False)
    hit_count = Column(Integer, default=1, nullable=False)
    first_seen_scan_id = Column(CHAR(36), ForeignKey("scan_results.id"), nullable=True)
    last_seen_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    confidence = Column(Float, nullable=False, default=0.5)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_fraud_memory_org", "org_id"),
        Index("idx_fraud_memory_type", "pattern_type"),
        Index("idx_fraud_memory_active", "is_active"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Feature 8: Onboarding Wizard Sessions
# ─────────────────────────────────────────────────────────────────────────────

class OnboardingSession(Base):
    """Multi-step onboarding session state"""
    __tablename__ = "onboarding_sessions"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    step = Column(Integer, default=1, nullable=False)
    org_name = Column(String(255), nullable=True)
    org_type = Column(String(50), nullable=True)   # bank | fintech | telco | call_center
    country = Column(String(100), nullable=True)
    admin_email = Column(String(255), nullable=True)
    admin_name = Column(String(255), nullable=True)
    admin_password_hash = Column(String(255), nullable=True)
    scan_settings = Column(JSON, nullable=True)
    api_key = Column(String(255), nullable=True)
    completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


def get_db():
    """Dependency for database session management"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _column_exists(conn, table: str, column: str) -> bool:
    """Check whether a column exists in a SQLite table via PRAGMA."""
    result = conn.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in result)


def init_db():
    """Initialize database tables and run lightweight column migrations."""
    Base.metadata.create_all(bind=engine)

    # Add new columns to existing tables that may predate this schema version.
    with engine.connect() as conn:
        migrations = [
            ("scan_results", "suggested_actions", "TEXT DEFAULT NULL"),
            ("scan_results", "threat_status", "VARCHAR(20) NOT NULL DEFAULT 'new'"),
        ]
        for table, col, definition in migrations:
            if not _column_exists(conn, table, col):
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {definition}")
        conn.commit()
