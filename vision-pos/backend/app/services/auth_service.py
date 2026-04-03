from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import create_access_token, verify_password
from app.models.user import Session as UserSession, User


def login(db: Session, username: str, password: str) -> dict:
    """
    Authenticate a user and return a JWT + session info.

    Raises HTTPException on invalid credentials or locked account.
    """
    user: User | None = db.query(User).filter(User.username == username).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah",
        )

    # Check lockout
    if user.locked_until is not None and datetime.utcnow() < user.locked_until:
        remaining = int((user.locked_until - datetime.utcnow()).total_seconds() / 60) + 1
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Akun terkunci. Coba lagi dalam {remaining} menit.",
        )

    if not verify_password(password, user.password_hash):
        user.failed_attempts += 1
        if user.failed_attempts >= settings.auth.max_failed_attempts:
            user.locked_until = datetime.utcnow() + timedelta(
                minutes=settings.auth.lockout_minutes
            )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah",
        )

    # Successful login — reset counters
    user.failed_attempts = 0
    user.locked_until = None

    # Create session record
    session_id = str(uuid.uuid4())
    session = UserSession(
        id=session_id,
        user_id=user.id,
        started_at=datetime.utcnow(),
    )
    db.add(session)
    db.commit()

    token = create_access_token(
        data={"sub": str(user.id), "session_id": session_id, "role": user.role},
        expires_delta=timedelta(minutes=settings.auth.jwt_expire_minutes),
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "session_id": session_id,
    }


def logout(db: Session, session_id: str) -> None:
    """Invalidate a session by setting its ended_at timestamp."""
    session: UserSession | None = (
        db.query(UserSession).filter(UserSession.id == session_id).first()
    )
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesi tidak ditemukan",
        )
    session.ended_at = datetime.utcnow()
    db.commit()


def get_current_user_from_token(db: Session, token: str) -> User:
    """
    Decode a JWT token and return the corresponding User.

    Raises HTTPException if the token is invalid or the user does not exist.
    """
    from app.core.security import decode_access_token

    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid atau sudah kadaluarsa",
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User tidak ditemukan atau tidak aktif",
        )
    return user
