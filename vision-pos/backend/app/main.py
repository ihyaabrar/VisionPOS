import os

import yaml
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Default config values
# ---------------------------------------------------------------------------
_DEFAULT_CONFIG = {
    "model": {
        "path": "models/best.pt",
        "confidence_threshold": 0.70,
        "format": "pt",
    },
    "camera": {
        "dedup_window_seconds": 2.0,
    },
    "database": {
        "type": "sqlite",
        "sqlite_path": "data/visionpos.db",
        "mysql_host": None,
        "mysql_port": 3306,
        "mysql_name": None,
        "mysql_user": None,
        "mysql_password": None,
    },
    "transaction": {
        "idle_timeout_minutes": 30,
    },
    "inventory": {
        "default_min_stock": 5,
    },
    "dataset": {
        "base_dir": "dataset/images",
        "burst_interval_seconds": 0.5,
    },
    "auth": {
        "jwt_secret": "change-this-secret",
        "jwt_expire_minutes": 480,
        "max_failed_attempts": 5,
        "lockout_minutes": 15,
    },
    "logging": {
        "level": "INFO",
        "file": "logs/visionpos.log",
    },
}


def _ensure_config_yaml() -> None:
    """Buat config.yaml dengan nilai default jika belum ada."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    config_path = os.path.join(base_dir, "config.yaml")
    if not os.path.exists(config_path):
        with open(config_path, "w") as f:
            yaml.dump(_DEFAULT_CONFIG, f, default_flow_style=False, allow_unicode=True)


app = FastAPI(
    title="VisionPOS API",
    description="Backend API untuk sistem POS berbasis Computer Vision",
    version="1.0.0",
    on_startup=[_ensure_config_yaml],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "VisionPOS"}


# Auth router
from app.routers import auth  # noqa: E402
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])

# Inventory router
from app.routers import inventory  # noqa: E402
app.include_router(inventory.router, prefix="/api", tags=["inventory"])

# Transactions router
from app.routers import transactions  # noqa: E402
app.include_router(transactions.router, prefix="/api", tags=["transactions"])

# WebSocket: real-time detection
from app.detection.websocket_handler import detection_websocket  # noqa: E402
app.add_api_websocket_route("/ws/detection", detection_websocket)

# Reports router
from app.routers import reports  # noqa: E402
app.include_router(reports.router, prefix="/api", tags=["reports"])

# Dataset router
from app.routers import dataset  # noqa: E402
app.include_router(dataset.router, prefix="/api", tags=["dataset"])

# Model management router
from app.routers import model_management  # noqa: E402
app.include_router(model_management.router, prefix="/api", tags=["model"])

# Config router
from app.routers import config  # noqa: E402
app.include_router(config.router, prefix="/api", tags=["config"])
