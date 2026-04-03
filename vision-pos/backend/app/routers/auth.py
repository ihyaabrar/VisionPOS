from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.security import decode_access_token
from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, UserOut
from app.services import auth_service

router = APIRouter()

_bearer = HTTPBearer()


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT access token."""
    return auth_service.login(db, payload.username, payload.password)


@router.post("/logout", status_code=204)
def logout(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
):
    """Invalidate the current session using the JWT session_id claim."""
    payload = decode_access_token(credentials.credentials)
    session_id = payload.get("session_id") if payload else None
    if session_id:
        auth_service.logout(db, session_id)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    """Return info about the currently authenticated user."""
    return current_user
