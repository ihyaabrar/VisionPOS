from __future__ import annotations

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status

from app.config import settings
from app.core.dependencies import require_admin
from app.models.user import User
from app.services import dataset_service

router = APIRouter(prefix="/dataset", tags=["dataset"])


class CaptureRequest(BaseModel):
    item_id: str
    data: str  # base64 JPEG


@router.post("/capture")
def capture_frame(
    body: CaptureRequest,
    _admin: User = Depends(require_admin),
):
    """Simpan frame ke dataset. Membutuhkan role Admin."""
    try:
        result = dataset_service.save_frame(
            item_id=body.item_id,
            base64_data=body.data,
            base_dir=settings.dataset.base_dir,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal menyimpan frame: {exc}",
        )
    return result


@router.get("/{item_id}/count")
def image_count(
    item_id: str,
    _admin: User = Depends(require_admin),
):
    """Jumlah gambar yang tersimpan untuk suatu barang. Membutuhkan role Admin."""
    count = dataset_service.get_image_count(
        item_id=item_id,
        base_dir=settings.dataset.base_dir,
    )
    return {"item_id": item_id, "count": count}
