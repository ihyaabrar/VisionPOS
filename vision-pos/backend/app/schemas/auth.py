from __future__ import annotations

from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    session_id: str


class UserOut(BaseModel):
    id: int
    username: str
    role: str

    model_config = {"from_attributes": True}
