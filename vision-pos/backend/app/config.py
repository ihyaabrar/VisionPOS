from __future__ import annotations

import os
from typing import Optional

import yaml
from pydantic import field_validator
from pydantic_settings import BaseSettings


def _load_yaml(path: str = "config.yaml") -> dict:
    """Load config.yaml relative to the backend directory."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    full_path = os.path.join(base_dir, path)
    if not os.path.exists(full_path):
        return {}
    with open(full_path, "r") as f:
        return yaml.safe_load(f) or {}


_yaml = _load_yaml()


class ModelConfig(BaseSettings):
    path: str = _yaml.get("model", {}).get("path", "models/best.pt")
    confidence_threshold: float = _yaml.get("model", {}).get("confidence_threshold", 0.70)
    format: str = _yaml.get("model", {}).get("format", "pt")

    @field_validator("confidence_threshold")
    @classmethod
    def validate_confidence(cls, v: float) -> float:
        if not (0.0 <= v <= 1.0):
            raise ValueError("confidence_threshold must be between 0.0 and 1.0")
        return v


class CameraConfig(BaseSettings):
    dedup_window_seconds: float = _yaml.get("camera", {}).get("dedup_window_seconds", 2.0)


class DatabaseConfig(BaseSettings):
    type: str = _yaml.get("database", {}).get("type", "sqlite")
    sqlite_path: str = _yaml.get("database", {}).get("sqlite_path", "data/visionpos.db")
    mysql_host: Optional[str] = _yaml.get("database", {}).get("mysql_host", None)
    mysql_port: int = _yaml.get("database", {}).get("mysql_port", 3306)
    mysql_name: Optional[str] = _yaml.get("database", {}).get("mysql_name", None)
    mysql_user: Optional[str] = _yaml.get("database", {}).get("mysql_user", None)
    mysql_password: Optional[str] = _yaml.get("database", {}).get("mysql_password", None)


class TransactionConfig(BaseSettings):
    idle_timeout_minutes: int = _yaml.get("transaction", {}).get("idle_timeout_minutes", 30)


class InventoryConfig(BaseSettings):
    default_min_stock: int = _yaml.get("inventory", {}).get("default_min_stock", 5)


class DatasetConfig(BaseSettings):
    base_dir: str = _yaml.get("dataset", {}).get("base_dir", "dataset/images")
    burst_interval_seconds: float = _yaml.get("dataset", {}).get("burst_interval_seconds", 0.5)


class AuthConfig(BaseSettings):
    jwt_secret: str = _yaml.get("auth", {}).get("jwt_secret", "change-this-secret")
    jwt_expire_minutes: int = _yaml.get("auth", {}).get("jwt_expire_minutes", 480)
    max_failed_attempts: int = _yaml.get("auth", {}).get("max_failed_attempts", 5)
    lockout_minutes: int = _yaml.get("auth", {}).get("lockout_minutes", 15)


class LoggingConfig(BaseSettings):
    level: str = _yaml.get("logging", {}).get("level", "INFO")
    file: str = _yaml.get("logging", {}).get("file", "logs/visionpos.log")


class Settings(BaseSettings):
    model: ModelConfig = ModelConfig()
    camera: CameraConfig = CameraConfig()
    database: DatabaseConfig = DatabaseConfig()
    transaction: TransactionConfig = TransactionConfig()
    inventory: InventoryConfig = InventoryConfig()
    dataset: DatasetConfig = DatasetConfig()
    auth: AuthConfig = AuthConfig()
    logging: LoggingConfig = LoggingConfig()


settings = Settings()
