"""Unit tests for auth_service: login, failed attempts, and lockout."""
from __future__ import annotations

from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.security import hash_password
from app.database import Base
from app.models.user import Session as UserSession, User
from app.services import auth_service


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def db():
    """In-memory SQLite session for each test."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(engine)


@pytest.fixture()
def kasir_user(db):
    """Create a default kasir user with known credentials."""
    user = User(
        username="kasir01",
        password_hash=hash_password("password123"),
        role="kasir",
        is_active=1,
        failed_attempts=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestLoginValid:
    def test_returns_access_token(self, db, kasir_user):
        result = auth_service.login(db, "kasir01", "password123")
        assert "access_token" in result
        assert result["access_token"] != ""

    def test_returns_correct_role(self, db, kasir_user):
        result = auth_service.login(db, "kasir01", "password123")
        assert result["role"] == "kasir"

    def test_returns_session_id(self, db, kasir_user):
        result = auth_service.login(db, "kasir01", "password123")
        assert "session_id" in result
        assert result["session_id"] != ""

    def test_session_persisted_in_db(self, db, kasir_user):
        result = auth_service.login(db, "kasir01", "password123")
        session = db.query(UserSession).filter(
            UserSession.id == result["session_id"]
        ).first()
        assert session is not None
        assert session.user_id == kasir_user.id

    def test_resets_failed_attempts_on_success(self, db, kasir_user):
        # Simulate prior failures
        kasir_user.failed_attempts = 3
        db.commit()
        auth_service.login(db, "kasir01", "password123")
        db.refresh(kasir_user)
        assert kasir_user.failed_attempts == 0


class TestLoginFailed:
    def test_wrong_password_raises_401(self, db, kasir_user):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            auth_service.login(db, "kasir01", "salah")
        assert exc_info.value.status_code == 401

    def test_wrong_password_increments_failed_attempts(self, db, kasir_user):
        from fastapi import HTTPException
        with pytest.raises(HTTPException):
            auth_service.login(db, "kasir01", "salah")
        db.refresh(kasir_user)
        assert kasir_user.failed_attempts == 1

    def test_unknown_username_raises_401(self, db, kasir_user):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            auth_service.login(db, "tidakada", "apapun")
        assert exc_info.value.status_code == 401

    def test_multiple_failures_accumulate(self, db, kasir_user):
        from fastapi import HTTPException
        for _ in range(3):
            with pytest.raises(HTTPException):
                auth_service.login(db, "kasir01", "salah")
        db.refresh(kasir_user)
        assert kasir_user.failed_attempts == 3


class TestLockout:
    def test_locked_after_5_failures(self, db, kasir_user):
        from fastapi import HTTPException
        for _ in range(5):
            with pytest.raises(HTTPException):
                auth_service.login(db, "kasir01", "salah")
        db.refresh(kasir_user)
        assert kasir_user.locked_until is not None
        assert kasir_user.locked_until > datetime.utcnow()

    def test_locked_account_rejects_correct_password(self, db, kasir_user):
        from fastapi import HTTPException
        # Trigger lockout
        for _ in range(5):
            with pytest.raises(HTTPException):
                auth_service.login(db, "kasir01", "salah")
        # Now try with correct password — should still be rejected
        with pytest.raises(HTTPException) as exc_info:
            auth_service.login(db, "kasir01", "password123")
        assert exc_info.value.status_code == 403

    def test_lockout_duration_is_15_minutes(self, db, kasir_user):
        from fastapi import HTTPException
        for _ in range(5):
            with pytest.raises(HTTPException):
                auth_service.login(db, "kasir01", "salah")
        db.refresh(kasir_user)
        expected_min = datetime.utcnow() + timedelta(minutes=14)
        expected_max = datetime.utcnow() + timedelta(minutes=16)
        assert expected_min < kasir_user.locked_until < expected_max

    def test_expired_lockout_allows_login(self, db, kasir_user):
        # Set locked_until in the past
        kasir_user.failed_attempts = 5
        kasir_user.locked_until = datetime.utcnow() - timedelta(minutes=1)
        db.commit()
        result = auth_service.login(db, "kasir01", "password123")
        assert "access_token" in result


class TestLogout:
    def test_logout_sets_ended_at(self, db, kasir_user):
        result = auth_service.login(db, "kasir01", "password123")
        auth_service.logout(db, result["session_id"])
        session = db.query(UserSession).filter(
            UserSession.id == result["session_id"]
        ).first()
        assert session.ended_at is not None

    def test_logout_invalid_session_raises_404(self, db):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            auth_service.logout(db, "tidak-ada-session-id")
        assert exc_info.value.status_code == 404
