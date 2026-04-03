from __future__ import annotations

import base64
import logging
import time
from typing import Optional

import numpy as np
from fastapi import Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import decode_access_token
from app.database import get_db
from app.detection.deduplication import DeduplicationBuffer
from app.detection.detector import Detector
from app.models.item import Item
from app.services import transaction_service

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Singleton Detector
# ---------------------------------------------------------------------------

_detector: Optional[Detector] = None


def get_detector() -> Detector:
    """Return singleton Detector instance (shared across all WS connections)."""
    global _detector
    if _detector is None:
        _detector = Detector(
            model_path=settings.model.path,
            confidence=settings.model.confidence_threshold,
        )
    return _detector


# ---------------------------------------------------------------------------
# Helper: send JSON message
# ---------------------------------------------------------------------------

async def _send(websocket: WebSocket, payload: dict) -> None:
    await websocket.send_json(payload)


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

async def detection_websocket(
    websocket: WebSocket,
    token: str,
    db: Session = Depends(get_db),
) -> None:
    """
    WebSocket endpoint: ws://{host}/ws/detection?token={jwt_token}

    Flow:
    1. Validate JWT from query param `token`
    2. Accept connection
    3. Create per-connection DeduplicationBuffer
    4. Loop: receive frame → decode → predict → dedup → add to cart → send result
    """
    # 1. Validate JWT before accepting the connection
    payload = decode_access_token(token)
    if payload is None:
        await websocket.accept()
        await _send(websocket, {"type": "error", "code": "SESSION_EXPIRED"})
        await websocket.close()
        return

    # 2. Accept connection
    await websocket.accept()

    # 3. Per-connection state
    dedup = DeduplicationBuffer(window_seconds=settings.camera.dedup_window_seconds)
    detector = get_detector()
    frame_id = 0

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type != "frame":
                # Ignore unknown message types silently
                continue

            frame_id += 1
            t_start = time.monotonic()

            # Check model availability
            if not detector.is_loaded:
                await _send(websocket, {"type": "error", "code": "MODEL_NOT_LOADED"})
                continue

            # Decode base64 → numpy array
            raw_b64: str = data.get("data", "")
            try:
                img_bytes = base64.b64decode(raw_b64)
                img_array = np.frombuffer(img_bytes, dtype=np.uint8)
                import cv2  # type: ignore
                frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
                if frame is None:
                    raise ValueError("cv2.imdecode returned None")
            except Exception as exc:
                logger.warning("Frame decode error: %s", exc)
                await _send(websocket, {"type": "error", "code": "FRAME_DECODE_ERROR"})
                continue

            # Run detection
            raw_detections = detector.predict(frame)

            # Resolve transaction
            transaction_id: str = data.get("transaction_id", "")
            tx = transaction_service.get_transaction(db, transaction_id)
            if tx is None:
                await _send(websocket, {"type": "error", "code": "TRANSACTION_NOT_FOUND"})
                continue

            # Process each detection through dedup + DB lookup + cart
            detections_out = []
            for det in raw_detections:
                if not dedup.should_add(det.class_id):
                    # Duplicate within window — still report but not added to cart
                    item = db.query(Item).filter(
                        Item.class_id == det.class_id,
                        Item.is_active == 1,
                    ).first()
                    detections_out.append({
                        "class_id": det.class_id,
                        "item_id": item.id if item else "",
                        "item_name": item.name if item else "",
                        "confidence": det.confidence,
                        "bbox": list(det.bbox),
                        "added_to_cart": False,
                    })
                    continue

                # Map class_id → item in DB
                item = db.query(Item).filter(
                    Item.class_id == det.class_id,
                    Item.is_active == 1,
                ).first()

                added = False
                if item is not None:
                    try:
                        transaction_service.add_item(db, transaction_id, item.id, qty=1)
                        added = True
                    except Exception as exc:
                        logger.warning("add_item failed for item %s: %s", item.id, exc)

                detections_out.append({
                    "class_id": det.class_id,
                    "item_id": item.id if item else "",
                    "item_name": item.name if item else "",
                    "confidence": det.confidence,
                    "bbox": list(det.bbox),
                    "added_to_cart": added,
                })

            processing_ms = int((time.monotonic() - t_start) * 1000)

            await _send(websocket, {
                "type": "detection_result",
                "detections": detections_out,
                "frame_id": frame_id,
                "processing_ms": processing_ms,
            })

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected (frame_id=%d)", frame_id)
    except Exception as exc:
        logger.error("Unexpected WebSocket error: %s", exc)
