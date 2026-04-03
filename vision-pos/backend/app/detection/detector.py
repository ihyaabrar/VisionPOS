from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class DetectionResult:
    class_id: int
    confidence: float
    bbox: tuple[int, int, int, int]  # x1, y1, x2, y2


@dataclass
class ModelInfo:
    filename: str
    format: str  # 'pt' atau 'onnx'
    loaded_at: str
    file_size_kb: float


class Detector:
    """YOLOv8 wrapper dengan graceful degradation saat model tidak tersedia."""

    def __init__(self, model_path: str, confidence: float = 0.70) -> None:
        self._confidence = confidence
        self._model = None
        self._model_path: Optional[str] = None
        self._model_info: Optional[ModelInfo] = None

        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
        else:
            if model_path:
                logger.warning("Model file tidak ditemukan: %s — is_loaded=False", model_path)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def load_model(self, path: str) -> bool:
        """Muat model dari path. Return True jika berhasil."""
        try:
            from ultralytics import YOLO  # type: ignore

            model = YOLO(path)
            file_size_kb = os.path.getsize(path) / 1024.0
            ext = os.path.splitext(path)[1].lstrip(".").lower()
            fmt = ext if ext in ("pt", "onnx") else "pt"

            self._model = model
            self._model_path = path
            self._model_info = ModelInfo(
                filename=os.path.basename(path),
                format=fmt,
                loaded_at=datetime.now(timezone.utc).isoformat(),
                file_size_kb=round(file_size_kb, 2),
            )
            logger.info("Model dimuat: %s", path)
            return True
        except Exception as exc:
            logger.error("Gagal memuat model '%s': %s", path, exc)
            return False

    def predict(self, frame: np.ndarray) -> list[DetectionResult]:
        """Jalankan inferensi. Return list kosong jika model belum dimuat atau frame tidak valid."""
        if not self.is_loaded:
            return []

        if frame is None or not isinstance(frame, np.ndarray) or frame.size == 0:
            return []

        try:
            results = self._model(frame, verbose=False)  # type: ignore
            detections: list[DetectionResult] = []
            for result in results:
                if result.boxes is None:
                    continue
                for box in result.boxes:
                    conf = float(box.conf[0])
                    if conf < self._confidence:
                        continue
                    cls_id = int(box.cls[0])
                    x1, y1, x2, y2 = (int(v) for v in box.xyxy[0])
                    detections.append(
                        DetectionResult(
                            class_id=cls_id,
                            confidence=conf,
                            bbox=(x1, y1, x2, y2),
                        )
                    )
            return detections
        except Exception as exc:
            logger.error("Error saat prediksi: %s", exc)
            return []

    def reload_model(self, new_path: str) -> bool:
        """Hot-reload model. Jika gagal, pertahankan model lama dan return False."""
        old_model = self._model
        old_path = self._model_path
        old_info = self._model_info

        success = self.load_model(new_path)
        if not success:
            # Rollback ke model lama
            self._model = old_model
            self._model_path = old_path
            self._model_info = old_info
            logger.warning("Reload gagal — model lama dipertahankan: %s", old_path)
            return False
        return True

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def model_info(self) -> Optional[ModelInfo]:
        return self._model_info

    @property
    def is_loaded(self) -> bool:
        return self._model is not None
