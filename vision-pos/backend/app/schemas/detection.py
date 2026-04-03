from __future__ import annotations

from pydantic import BaseModel


class DetectionResultSchema(BaseModel):
    class_id: int
    item_id: str
    item_name: str
    confidence: float
    bbox: tuple[int, int, int, int]
    added_to_cart: bool


class WSFrameMessage(BaseModel):
    type: str = "frame"
    session_id: str
    transaction_id: str
    data: str  # base64 JPEG


class WSDetectionResponse(BaseModel):
    type: str = "detection_result"
    detections: list[DetectionResultSchema]
    frame_id: int
    processing_ms: int
