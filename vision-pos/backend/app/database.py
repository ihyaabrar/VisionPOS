from __future__ import annotations

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings


def _build_database_url() -> str:
    db = settings.database
    if db.type == "sqlite":
        return f"sqlite:///{db.sqlite_path}"
    # MySQL
    return (
        f"mysql+pymysql://{db.mysql_user}:{db.mysql_password}"
        f"@{db.mysql_host}:{db.mysql_port}/{db.mysql_name}"
    )


DATABASE_URL = _build_database_url()

# SQLite needs check_same_thread=False; other DBs ignore connect_args
_connect_args = {"check_same_thread": False} if settings.database.type == "sqlite" else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args)

# Enable WAL mode and foreign keys for SQLite
if settings.database.type == "sqlite":
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_conn, _connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


def get_db():
    """FastAPI dependency — yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
