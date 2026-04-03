from __future__ import annotations

import os
from typing import Any, Optional

import yaml
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.dependencies import require_admin
from app.models.user import User

router = APIRouter()

# Path ke config.yaml (relatif terhadap direktori backend)
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_CONFIG_PATH = os.path.join(_BASE_DIR, "config.yaml")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ModelConfigUpdate(BaseModel):
    path: Optional[str] = None
    confidence_threshold: Optional[float] = None
    format: Optional[str] = None


class CameraConfigUpdate(BaseModel):
    dedup_window_seconds: Optional[float] = None


class TransactionConfigUpdate(BaseModel):
    idle_timeout_minutes: Optional[int] = None


class InventoryConfigUpdate(BaseModel):
    default_min_stock: Optional[int] = None


class DatasetConfigUpdate(BaseModel):
    base_dir: Optional[str] = None
    burst_interval_seconds: Optional[float] = None


class AuthConfigUpdate(BaseModel):
    jwt_secret: Optional[str] = None
    jwt_expire_minutes: Optional[int] = None
    max_failed_attempts: Optional[int] = None
    lockout_minutes: Optional[int] = None


class LoggingConfigUpdate(BaseModel):
    level: Optional[str] = None
    file: Optional[str] = None


class ConfigUpdateRequest(BaseModel):
    model: Optional[ModelConfigUpdate] = None
    camera: Optional[CameraConfigUpdate] = None
    transaction: Optional[TransactionConfigUpdate] = None
    inventory: Optional[InventoryConfigUpdate] = None
    dataset: Optional[DatasetConfigUpdate] = None
    auth: Optional[AuthConfigUpdate] = None
    logging: Optional[LoggingConfigUpdate] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _read_config() -> dict:
    if not os.path.exists(_CONFIG_PATH):
        return {}
    with open(_CONFIG_PATH, "r") as f:
        return yaml.safe_load(f) or {}


def _write_config(data: dict) -> None:
    with open(_CONFIG_PATH, "w") as f:
        yaml.dump(data, f, default_flow_style=False, allow_unicode=True)


def _reload_settings() -> None:
    """Reload settings singleton dari config.yaml yang sudah diperbarui."""
    import importlib
    import app.config as config_module

    # Reload YAML cache
    config_module._yaml = config_module._load_yaml()

    # Rebuild settings
    config_module.settings = config_module.Settings(
        model=config_module.ModelConfig(),
        camera=config_module.CameraConfig(),
        database=config_module.DatabaseConfig(),
        transaction=config_module.TransactionConfig(),
        inventory=config_module.InventoryConfig(),
        dataset=config_module.DatasetConfig(),
        auth=config_module.AuthConfig(),
        logging=config_module.LoggingConfig(),
    )


def _validate_config(updates: ConfigUpdateRequest) -> list[str]:
    """Validasi nilai konfigurasi. Kembalikan list pesan error jika ada."""
    errors: list[str] = []

    if updates.model is not None:
        ct = updates.model.confidence_threshold
        if ct is not None and not (0.0 <= ct <= 1.0):
            errors.append(
                f"model.confidence_threshold harus antara 0.0 dan 1.0, diterima: {ct}"
            )

    if updates.camera is not None:
        dw = updates.camera.dedup_window_seconds
        if dw is not None and dw <= 0:
            errors.append(
                f"camera.dedup_window_seconds harus > 0, diterima: {dw}"
            )

    if updates.transaction is not None:
        it = updates.transaction.idle_timeout_minutes
        if it is not None and it <= 0:
            errors.append(
                f"transaction.idle_timeout_minutes harus > 0, diterima: {it}"
            )

    if updates.inventory is not None:
        ms = updates.inventory.default_min_stock
        if ms is not None and ms < 0:
            errors.append(
                f"inventory.default_min_stock harus >= 0, diterima: {ms}"
            )

    if updates.dataset is not None:
        bi = updates.dataset.burst_interval_seconds
        if bi is not None and bi < 0.5:
            errors.append(
                f"dataset.burst_interval_seconds harus >= 0.5, diterima: {bi}"
            )

    if updates.auth is not None:
        mfa = updates.auth.max_failed_attempts
        if mfa is not None and mfa < 1:
            errors.append(
                f"auth.max_failed_attempts harus >= 1, diterima: {mfa}"
            )
        lm = updates.auth.lockout_minutes
        if lm is not None and lm < 1:
            errors.append(
                f"auth.lockout_minutes harus >= 1, diterima: {lm}"
            )

    return errors


def _deep_merge(base: dict, updates: dict) -> dict:
    """Merge updates ke dalam base secara rekursif."""
    result = dict(base)
    for key, value in updates.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = _deep_merge(result[key], value)
        elif value is not None:
            result[key] = value
    return result


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/config", summary="Baca konfigurasi sistem")
def get_config(
    _: User = Depends(require_admin),
) -> dict[str, Any]:
    """Kembalikan konfigurasi sistem saat ini dari config.yaml."""
    return _read_config()


@router.put("/config", summary="Update konfigurasi sistem")
def update_config(
    updates: ConfigUpdateRequest,
    _: User = Depends(require_admin),
) -> dict[str, Any]:
    """
    Update konfigurasi sistem.

    Validasi rentang nilai sebelum menyimpan. Jika ada nilai di luar rentang
    valid, kembalikan HTTP 422 dengan pesan error yang jelas.
    """
    # Validasi
    errors = _validate_config(updates)
    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"errors": errors},
        )

    # Baca konfigurasi saat ini
    current = _read_config()

    # Bangun dict update (hanya field yang tidak None)
    update_dict: dict[str, Any] = {}
    if updates.model is not None:
        model_upd = {k: v for k, v in updates.model.model_dump().items() if v is not None}
        if model_upd:
            update_dict["model"] = model_upd
    if updates.camera is not None:
        cam_upd = {k: v for k, v in updates.camera.model_dump().items() if v is not None}
        if cam_upd:
            update_dict["camera"] = cam_upd
    if updates.transaction is not None:
        tx_upd = {k: v for k, v in updates.transaction.model_dump().items() if v is not None}
        if tx_upd:
            update_dict["transaction"] = tx_upd
    if updates.inventory is not None:
        inv_upd = {k: v for k, v in updates.inventory.model_dump().items() if v is not None}
        if inv_upd:
            update_dict["inventory"] = inv_upd
    if updates.dataset is not None:
        ds_upd = {k: v for k, v in updates.dataset.model_dump().items() if v is not None}
        if ds_upd:
            update_dict["dataset"] = ds_upd
    if updates.auth is not None:
        auth_upd = {k: v for k, v in updates.auth.model_dump().items() if v is not None}
        if auth_upd:
            update_dict["auth"] = auth_upd
    if updates.logging is not None:
        log_upd = {k: v for k, v in updates.logging.model_dump().items() if v is not None}
        if log_upd:
            update_dict["logging"] = log_upd

    # Merge dan simpan
    merged = _deep_merge(current, update_dict)
    _write_config(merged)

    # Reload settings singleton
    _reload_settings()

    return merged
