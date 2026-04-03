from __future__ import annotations

import base64
import logging
import os
import time

logger = logging.getLogger(__name__)


def save_frame(item_id: str, base64_data: str, base_dir: str) -> dict:
    """
    Decode base64 JPEG dan simpan ke {base_dir}/{item_id}/{timestamp_ms}.jpg.

    Returns:
        {"saved": True, "path": str, "count": int}
    """
    # Buat direktori jika belum ada
    target_dir = os.path.join(base_dir, item_id)
    os.makedirs(target_dir, exist_ok=True)

    # Decode base64 → bytes
    # Hapus prefix data URI jika ada (misal "data:image/jpeg;base64,...")
    if "," in base64_data:
        base64_data = base64_data.split(",", 1)[1]

    img_bytes = base64.b64decode(base64_data)

    # Nama file berdasarkan timestamp millisecond
    timestamp_ms = int(time.time() * 1000)
    filename = f"{timestamp_ms}.jpg"
    file_path = os.path.join(target_dir, filename)

    with open(file_path, "wb") as f:
        f.write(img_bytes)

    logger.info("Frame disimpan: %s", file_path)

    count = get_image_count(item_id, base_dir)
    return {"saved": True, "path": file_path, "count": count}


def get_image_count(item_id: str, base_dir: str) -> int:
    """Hitung jumlah file .jpg/.png di direktori {base_dir}/{item_id}/."""
    target_dir = os.path.join(base_dir, item_id)
    if not os.path.isdir(target_dir):
        return 0
    return sum(
        1
        for f in os.listdir(target_dir)
        if f.lower().endswith((".jpg", ".jpeg", ".png"))
    )
