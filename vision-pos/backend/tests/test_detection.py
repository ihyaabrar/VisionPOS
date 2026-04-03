"""Unit tests untuk Detector dan DeduplicationBuffer."""
from __future__ import annotations

import time
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from app.detection.deduplication import DeduplicationBuffer
from app.detection.detector import Detector, DetectionResult


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_detector_no_model() -> Detector:
    """Buat Detector tanpa model (path tidak ada)."""
    return Detector(model_path="nonexistent_model.pt")


# ---------------------------------------------------------------------------
# Detector — perilaku saat model tidak dimuat
# ---------------------------------------------------------------------------

class TestDetectorWithoutModel:
    def test_is_loaded_false_when_file_missing(self):
        d = _make_detector_no_model()
        assert d.is_loaded is False

    def test_predict_returns_empty_list_when_not_loaded(self):
        """predict() harus return [] bukan raise exception saat model belum dimuat."""
        d = _make_detector_no_model()
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        result = d.predict(frame)
        assert result == []

    def test_predict_returns_empty_list_for_none_frame(self):
        """predict() dengan frame None harus return [] tanpa crash."""
        d = _make_detector_no_model()
        result = d.predict(None)  # type: ignore[arg-type]
        assert result == []

    def test_predict_returns_empty_list_for_empty_array(self):
        """predict() dengan array kosong harus return [] tanpa crash."""
        d = _make_detector_no_model()
        result = d.predict(np.array([]))
        assert result == []

    def test_model_info_is_none_when_not_loaded(self):
        d = _make_detector_no_model()
        assert d.model_info is None


# ---------------------------------------------------------------------------
# Detector — reload_model dengan path tidak valid
# ---------------------------------------------------------------------------

class TestDetectorReload:
    def test_reload_invalid_path_returns_false(self):
        """reload_model() dengan path tidak valid harus return False."""
        d = _make_detector_no_model()
        result = d.reload_model("totally_invalid_path.pt")
        assert result is False

    def test_reload_invalid_path_keeps_old_model(self):
        """Setelah reload gagal, model lama (None) tetap dipertahankan."""
        d = _make_detector_no_model()
        # Simulasikan model sudah dimuat dengan mock
        mock_model = MagicMock()
        d._model = mock_model
        d._model_path = "old_model.pt"

        result = d.reload_model("nonexistent_new_model.pt")

        assert result is False
        # Model lama harus tetap ada
        assert d._model is mock_model
        assert d._model_path == "old_model.pt"
        assert d.is_loaded is True

    def test_reload_success_updates_model(self):
        """reload_model() berhasil harus update model dan return True."""
        d = _make_detector_no_model()

        with patch.object(d, "load_model", return_value=True) as mock_load:
            result = d.reload_model("new_model.pt")
            mock_load.assert_called_once_with("new_model.pt")
            assert result is True


# ---------------------------------------------------------------------------
# DeduplicationBuffer
# ---------------------------------------------------------------------------

class TestDeduplicationBuffer:
    def test_new_class_id_returns_true(self):
        """class_id baru harus return True (boleh ditambahkan)."""
        buf = DeduplicationBuffer(window_seconds=2.0)
        assert buf.should_add(1) is True

    def test_same_class_id_immediately_returns_false(self):
        """class_id yang sama langsung setelah pertama harus return False (duplikat)."""
        buf = DeduplicationBuffer(window_seconds=2.0)
        buf.should_add(1)  # pertama kali — True
        assert buf.should_add(1) is False

    def test_different_class_ids_are_independent(self):
        """class_id berbeda tidak saling mempengaruhi."""
        buf = DeduplicationBuffer(window_seconds=2.0)
        assert buf.should_add(1) is True
        assert buf.should_add(2) is True
        assert buf.should_add(3) is True

    def test_reset_clears_buffer(self):
        """Setelah reset(), class_id yang sama harus return True lagi."""
        buf = DeduplicationBuffer(window_seconds=2.0)
        buf.should_add(1)
        assert buf.should_add(1) is False  # duplikat sebelum reset

        buf.reset()
        assert buf.should_add(1) is True  # setelah reset, boleh lagi

    def test_window_expired_allows_readd(self):
        """Setelah window_seconds berlalu, class_id yang sama harus return True lagi."""
        buf = DeduplicationBuffer(window_seconds=0.05)  # 50ms window
        assert buf.should_add(42) is True
        assert buf.should_add(42) is False  # masih dalam window

        time.sleep(0.1)  # tunggu window expired
        assert buf.should_add(42) is True  # window sudah lewat

    def test_idempotency_property(self):
        """
        Properti idempoten: should_add(x) setelah should_add(x) == False.

        Validates: Requirements 3.8 (Properti 4 — Idempoten Deduplikasi)
        """
        buf = DeduplicationBuffer(window_seconds=2.0)

        # Pertama kali: True (ditambahkan)
        first = buf.should_add(10)
        assert first is True

        # Kedua kali: False (duplikat)
        second = buf.should_add(10)
        assert second is False

        # Ketiga kali: masih False (idempoten — tidak berubah)
        third = buf.should_add(10)
        assert third is False

    def test_reset_multiple_class_ids(self):
        """reset() harus membersihkan semua class_id, bukan hanya satu."""
        buf = DeduplicationBuffer(window_seconds=2.0)
        for cid in [1, 2, 3, 4, 5]:
            buf.should_add(cid)

        buf.reset()

        for cid in [1, 2, 3, 4, 5]:
            assert buf.should_add(cid) is True
