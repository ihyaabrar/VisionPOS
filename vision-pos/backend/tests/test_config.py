"""Unit tests untuk config router: validasi, GET, dan PUT /api/config."""
from __future__ import annotations

import os
import tempfile

import pytest
import yaml

from app.routers.config import (
    AuthConfigUpdate,
    CameraConfigUpdate,
    ConfigUpdateRequest,
    DatasetConfigUpdate,
    InventoryConfigUpdate,
    ModelConfigUpdate,
    TransactionConfigUpdate,
    _deep_merge,
    _validate_config,
)


# ---------------------------------------------------------------------------
# Tests: _validate_config
# ---------------------------------------------------------------------------

class TestValidateConfig:
    def test_valid_confidence_threshold(self):
        req = ConfigUpdateRequest(model=ModelConfigUpdate(confidence_threshold=0.75))
        assert _validate_config(req) == []

    def test_confidence_threshold_zero_is_valid(self):
        req = ConfigUpdateRequest(model=ModelConfigUpdate(confidence_threshold=0.0))
        assert _validate_config(req) == []

    def test_confidence_threshold_one_is_valid(self):
        req = ConfigUpdateRequest(model=ModelConfigUpdate(confidence_threshold=1.0))
        assert _validate_config(req) == []

    def test_confidence_threshold_above_one_invalid(self):
        req = ConfigUpdateRequest(model=ModelConfigUpdate(confidence_threshold=1.1))
        errors = _validate_config(req)
        assert len(errors) == 1
        assert "confidence_threshold" in errors[0]
        assert "0.0" in errors[0] and "1.0" in errors[0]

    def test_confidence_threshold_negative_invalid(self):
        req = ConfigUpdateRequest(model=ModelConfigUpdate(confidence_threshold=-0.1))
        errors = _validate_config(req)
        assert len(errors) == 1
        assert "confidence_threshold" in errors[0]

    def test_dedup_window_zero_invalid(self):
        req = ConfigUpdateRequest(camera=CameraConfigUpdate(dedup_window_seconds=0.0))
        errors = _validate_config(req)
        assert len(errors) == 1
        assert "dedup_window_seconds" in errors[0]

    def test_dedup_window_negative_invalid(self):
        req = ConfigUpdateRequest(camera=CameraConfigUpdate(dedup_window_seconds=-1.0))
        errors = _validate_config(req)
        assert len(errors) == 1

    def test_dedup_window_positive_valid(self):
        req = ConfigUpdateRequest(camera=CameraConfigUpdate(dedup_window_seconds=0.1))
        assert _validate_config(req) == []

    def test_idle_timeout_zero_invalid(self):
        req = ConfigUpdateRequest(transaction=TransactionConfigUpdate(idle_timeout_minutes=0))
        errors = _validate_config(req)
        assert len(errors) == 1
        assert "idle_timeout_minutes" in errors[0]

    def test_idle_timeout_positive_valid(self):
        req = ConfigUpdateRequest(transaction=TransactionConfigUpdate(idle_timeout_minutes=1))
        assert _validate_config(req) == []

    def test_default_min_stock_zero_valid(self):
        req = ConfigUpdateRequest(inventory=InventoryConfigUpdate(default_min_stock=0))
        assert _validate_config(req) == []

    def test_default_min_stock_negative_invalid(self):
        req = ConfigUpdateRequest(inventory=InventoryConfigUpdate(default_min_stock=-1))
        errors = _validate_config(req)
        assert len(errors) == 1
        assert "default_min_stock" in errors[0]

    def test_burst_interval_half_valid(self):
        req = ConfigUpdateRequest(dataset=DatasetConfigUpdate(burst_interval_seconds=0.5))
        assert _validate_config(req) == []

    def test_burst_interval_below_half_invalid(self):
        req = ConfigUpdateRequest(dataset=DatasetConfigUpdate(burst_interval_seconds=0.4))
        errors = _validate_config(req)
        assert len(errors) == 1
        assert "burst_interval_seconds" in errors[0]

    def test_max_failed_attempts_one_valid(self):
        req = ConfigUpdateRequest(auth=AuthConfigUpdate(max_failed_attempts=1))
        assert _validate_config(req) == []

    def test_max_failed_attempts_zero_invalid(self):
        req = ConfigUpdateRequest(auth=AuthConfigUpdate(max_failed_attempts=0))
        errors = _validate_config(req)
        assert len(errors) == 1
        assert "max_failed_attempts" in errors[0]

    def test_lockout_minutes_one_valid(self):
        req = ConfigUpdateRequest(auth=AuthConfigUpdate(lockout_minutes=1))
        assert _validate_config(req) == []

    def test_lockout_minutes_zero_invalid(self):
        req = ConfigUpdateRequest(auth=AuthConfigUpdate(lockout_minutes=0))
        errors = _validate_config(req)
        assert len(errors) == 1
        assert "lockout_minutes" in errors[0]

    def test_multiple_errors_returned(self):
        req = ConfigUpdateRequest(
            model=ModelConfigUpdate(confidence_threshold=2.0),
            camera=CameraConfigUpdate(dedup_window_seconds=0.0),
            auth=AuthConfigUpdate(max_failed_attempts=0, lockout_minutes=0),
        )
        errors = _validate_config(req)
        assert len(errors) == 4

    def test_none_values_not_validated(self):
        req = ConfigUpdateRequest(model=ModelConfigUpdate(confidence_threshold=None))
        assert _validate_config(req) == []

    def test_empty_request_no_errors(self):
        req = ConfigUpdateRequest()
        assert _validate_config(req) == []


# ---------------------------------------------------------------------------
# Tests: _deep_merge
# ---------------------------------------------------------------------------

class TestDeepMerge:
    def test_merge_flat(self):
        base = {"a": 1, "b": 2}
        updates = {"b": 99, "c": 3}
        result = _deep_merge(base, updates)
        assert result == {"a": 1, "b": 99, "c": 3}

    def test_merge_nested(self):
        base = {"model": {"path": "old.pt", "confidence_threshold": 0.7}}
        updates = {"model": {"confidence_threshold": 0.9}}
        result = _deep_merge(base, updates)
        assert result["model"]["path"] == "old.pt"
        assert result["model"]["confidence_threshold"] == 0.9

    def test_merge_does_not_mutate_base(self):
        base = {"a": {"x": 1}}
        updates = {"a": {"x": 2}}
        _deep_merge(base, updates)
        assert base["a"]["x"] == 1

    def test_none_values_not_overwrite(self):
        base = {"a": 5}
        updates = {"a": None}
        result = _deep_merge(base, updates)
        # None tidak menimpa nilai yang ada
        assert result["a"] == 5
