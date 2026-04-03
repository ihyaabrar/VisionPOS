from __future__ import annotations

import os

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import require_admin
from app.detection.websocket_handler import get_detector
from app.models.user import User

router = APIRouter(prefix="/model", tags=["model"])


class ReloadRequest(BaseModel):
    path: str


@router.get("/info")
def model_info(
    _admin: User = Depends(require_admin),
):
    """Info model AI yang sedang aktif. Membutuhkan role Admin."""
    detector = get_detector()
    info = detector.model_info
    return {
        "filename": info.filename if info else None,
        "format": info.format if info else None,
        "loaded_at": info.loaded_at if info else None,
        "file_size_kb": info.file_size_kb if info else None,
        "is_loaded": detector.is_loaded,
    }


@router.post("/reload")
def reload_model(
    body: ReloadRequest,
    _admin: User = Depends(require_admin),
):
    """Hot-reload model YOLO dari path baru. Membutuhkan role Admin."""
    if not os.path.exists(body.path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File model tidak ditemukan: {body.path}",
        )

    detector = get_detector()
    success = detector.reload_model(body.path)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Gagal memuat model — format tidak valid atau file rusak. Model lama tetap aktif.",
        )

    return {"success": True, "message": f"Model berhasil dimuat: {body.path}"}
