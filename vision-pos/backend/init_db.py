"""Script untuk inisialisasi database SQLite tanpa alembic."""
import os
import sqlite3

os.makedirs("data", exist_ok=True)
conn = sqlite3.connect("data/visionpos.db")
conn.execute("PRAGMA foreign_keys=ON")

sql = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('kasir', 'admin')),
    is_active INTEGER NOT NULL DEFAULT 1,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    started_at DATETIME NOT NULL,
    ended_at DATETIME,
    device_info TEXT
);
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL CHECK(price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
    min_stock INTEGER NOT NULL DEFAULT 5,
    class_id INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS price_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT NOT NULL REFERENCES items(id),
    old_price REAL NOT NULL,
    new_price REAL NOT NULL,
    changed_by INTEGER NOT NULL REFERENCES users(id),
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    status TEXT NOT NULL CHECK(status IN ('active','completed','cancelled')),
    started_at DATETIME NOT NULL,
    completed_at DATETIME,
    total_amount REAL,
    payment_method TEXT,
    payment_received REAL,
    change_amount REAL,
    cancel_reason TEXT
);
CREATE TABLE IF NOT EXISTS transaction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT NOT NULL REFERENCES transactions(id),
    item_id TEXT NOT NULL REFERENCES items(id),
    item_name TEXT NOT NULL,
    unit_price REAL NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    subtotal REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS system_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL CHECK(level IN ('INFO','WARNING','ERROR')),
    event TEXT NOT NULL,
    detail TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""

conn.executescript(sql)

# Buat akun admin default jika belum ada
from passlib.context import CryptContext
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
existing = conn.execute("SELECT id FROM users WHERE username='admin'").fetchone()
if not existing:
    conn.execute(
        "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
        ("admin", pwd.hash("admin123"), "admin")
    )
    conn.execute(
        "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
        ("kasir", pwd.hash("kasir123"), "kasir")
    )
    conn.commit()
    print("Default users created: admin/admin123, kasir/kasir123")

conn.commit()
conn.close()
print("Database initialized OK -> data/visionpos.db")
