# Dokumen Desain Teknis — VisionPOS

## Ikhtisar

VisionPOS adalah sistem Point of Sale (POS) berbasis web yang mengintegrasikan Computer Vision (YOLOv8) untuk proses checkout otomatis. Sistem terdiri dari frontend React + TypeScript + Vite dan backend Python FastAPI, berkomunikasi melalui REST API dan WebSocket untuk streaming deteksi real-time.

Tujuan utama desain:
- Pemisahan tanggung jawab yang jelas antara frontend (UI/UX) dan backend (logika bisnis, inferensi AI)
- Performa real-time: ≥15 FPS, latensi deteksi <500ms
- Keandalan transaksi dengan atomisitas operasi database
- Hot-reload model YOLO tanpa restart server
- Graceful degradation ke pencarian manual saat kamera/AI bermasalah

---

## Arsitektur

### Gambaran Umum Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                     BROWSER (Client)                            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              React + TypeScript + Vite                   │   │
│  │                                                          │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │   │
│  │  │  Halaman    │  │  Komponen    │  │  State Mgmt    │  │   │
│  │  │  (Pages)    │  │  (UI)        │  │  (Zustand)     │  │   │
│  │  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘  │   │
│  │         └────────────────┴──────────────────┘           │   │
│  │                          │                               │   │
│  │              ┌───────────┴────────────┐                  │   │
│  │              │  API Client / WS Hook  │                  │   │
│  │              └───────────┬────────────┘                  │   │
│  └──────────────────────────┼──────────────────────────────┘   │
│                             │                                   │
│  ┌──────────────────────────┼──────────────────────────────┐   │
│  │         WebRTC           │  getUserMedia API             │   │
│  │         (Kamera)         │  → Canvas → Frame Capture     │   │
│  └──────────────────────────┼──────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │   HTTP REST  │   WebSocket     │
              │   (JWT Auth) │   (ws://)       │
              └───────────────┬───────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                     SERVER (FastAPI)                            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   FastAPI Application                    │   │
│  │                                                          │   │
│  │  ┌────────────┐  ┌─────────────┐  ┌──────────────────┐  │   │
│  │  │  Auth      │  │  Transaction│  │  Inventory       │  │   │
│  │  │  Router    │  │  Router     │  │  Router          │  │   │
│  │  └────────────┘  └─────────────┘  └──────────────────┘  │   │
│  │                                                          │   │
│  │  ┌────────────┐  ┌─────────────┐  ┌──────────────────┐  │   │
│  │  │  Dataset   │  │  Model AI   │  │  Report          │  │   │
│  │  │  Router    │  │  Router     │  │  Router          │  │   │
│  │  └────────────┘  └─────────────┘  └──────────────────┘  │   │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │              WebSocket Manager                   │   │   │
│  │  │  (DetectionWS — terima frame, kirim hasil)       │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  Detector    │  │  Services    │  │  SQLAlchemy ORM    │    │
│  │  (YOLOv8)    │  │  (Business   │  │  (SQLite/MySQL)    │    │
│  │  + Dedup     │  │   Logic)     │  │                    │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Alur Data Deteksi Real-Time

```
Browser                          FastAPI Backend
  │                                    │
  │── getUserMedia() ──────────────────│  (kamera aktif di browser)
  │                                    │
  │── WS Connect /ws/detection ───────>│
  │                                    │
  │  [Loop setiap ~66ms / 15 FPS]      │
  │── send: {frame: base64_jpeg} ─────>│
  │                                    │── YOLOv8.predict(frame)
  │                                    │── DeduplicationBuffer.check()
  │                                    │── map class_id → item DB
  │<── recv: {detections: [...]} ──────│
  │                                    │
  │  [Update UI / Keranjang]           │
```

---

## Struktur Direktori Proyek

```
vision-pos/
├── frontend/                        # React + TypeScript + Vite
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── CashierPage.tsx      # halaman utama kasir
│   │   │   ├── InventoryPage.tsx
│   │   │   ├── TransactionHistoryPage.tsx
│   │   │   ├── DatasetPage.tsx
│   │   │   ├── ModelManagementPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── components/
│   │   │   ├── camera/
│   │   │   │   ├── CameraFeed.tsx   # WebRTC video + canvas overlay
│   │   │   │   └── DetectionOverlay.tsx
│   │   │   ├── cart/
│   │   │   │   ├── CartPanel.tsx
│   │   │   │   ├── CartItem.tsx
│   │   │   │   └── PaymentModal.tsx
│   │   │   ├── inventory/
│   │   │   │   ├── ItemTable.tsx
│   │   │   │   └── ItemFormModal.tsx
│   │   │   ├── search/
│   │   │   │   └── ManualSearch.tsx
│   │   │   └── shared/
│   │   │       ├── Navbar.tsx
│   │   │       └── StatusBadge.tsx
│   │   ├── hooks/
│   │   │   ├── useDetectionWS.ts    # WebSocket hook untuk deteksi
│   │   │   ├── useCamera.ts         # getUserMedia hook
│   │   │   └── useTransaction.ts
│   │   ├── store/
│   │   │   ├── authStore.ts         # Zustand: auth state
│   │   │   ├── cartStore.ts         # Zustand: keranjang
│   │   │   └── cameraStore.ts       # Zustand: status kamera
│   │   ├── api/
│   │   │   ├── client.ts            # axios instance + interceptor JWT
│   │   │   ├── auth.ts
│   │   │   ├── inventory.ts
│   │   │   ├── transactions.ts
│   │   │   └── reports.ts
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript interfaces
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                         # Python FastAPI
│   ├── app/
│   │   ├── main.py                  # FastAPI app entry point
│   │   ├── config.py                # Pydantic Settings
│   │   ├── database.py              # SQLAlchemy engine + session
│   │   ├── models/                  # SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   ├── item.py
│   │   │   ├── transaction.py
│   │   │   └── system_log.py
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   │   ├── auth.py
│   │   │   ├── item.py
│   │   │   ├── transaction.py
│   │   │   └── detection.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── inventory.py
│   │   │   ├── transactions.py
│   │   │   ├── reports.py
│   │   │   ├── dataset.py
│   │   │   ├── model_management.py
│   │   │   └── config.py
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── transaction_service.py
│   │   │   ├── inventory_service.py
│   │   │   ├── report_service.py
│   │   │   └── dataset_service.py
│   │   ├── detection/
│   │   │   ├── detector.py          # YOLOv8 wrapper
│   │   │   ├── deduplication.py     # sliding window dedup
│   │   │   └── websocket_handler.py # WS endpoint handler
│   │   └── core/
│   │       ├── security.py          # JWT, bcrypt
│   │       └── dependencies.py      # FastAPI dependencies
│   ├── config.yaml                  # konfigurasi sistem
│   ├── requirements.txt
│   └── alembic/                     # migrasi database
│
└── dataset/                         # direktori dataset gambar
    └── images/
        └── {id_barang}/
```

---

## Komponen dan Antarmuka

### Frontend — Halaman Utama

#### CashierPage
Halaman utama kasir. Terdiri dari tiga panel:
- **Kiri**: `CameraFeed` + `DetectionOverlay` (bounding box hasil deteksi)
- **Tengah**: `ManualSearch` (pencarian fallback)
- **Kanan**: `CartPanel` (keranjang + tombol bayar)

#### InventoryPage
Tabel barang dengan fitur CRUD. Hanya dapat diakses oleh Admin.

#### TransactionHistoryPage
Tabel riwayat transaksi dengan filter tanggal/kasir/status dan tombol ekspor CSV.

#### DatasetPage
Live feed kamera dalam mode capture. Tombol tangkap gambar dan counter per barang.

#### ModelManagementPage
Informasi model aktif, tombol upload/reload model, log pemuatan.

---

### Frontend — Komponen Kunci

#### `CameraFeed.tsx`
```typescript
// Mengelola getUserMedia, menggambar frame ke <canvas>,
// dan mengirim frame ke backend via WebSocket setiap ~66ms
interface CameraFeedProps {
  onFrame?: (blob: Blob) => void;
  overlayDetections?: Detection[];
}
```

#### `useDetectionWS.ts`
```typescript
// Hook yang mengelola koneksi WebSocket ke /ws/detection
// Mengirim frame (base64 JPEG) dan menerima hasil deteksi
function useDetectionWS(sessionId: string): {
  detections: Detection[];
  isConnected: boolean;
  sendFrame: (imageData: string) => void;
}
```

#### `CartPanel.tsx`
```typescript
// Menampilkan isi keranjang, total, dan tombol Bayar
// Subscribe ke cartStore (Zustand)
interface CartPanelProps {
  onCheckout: () => void;
}
```

#### `ManualSearch.tsx`
```typescript
// Input pencarian dengan debounce 300ms
// Memanggil GET /api/items/search?q=...
interface ManualSearchProps {
  onItemSelect: (item: Item) => void;
}
```

---

### Backend — Struktur Service

#### `detector.py` — YOLOv8 Wrapper
```python
class Detector:
    def __init__(self, model_path: str, confidence: float = 0.70): ...
    def predict(self, frame: np.ndarray) -> list[DetectionResult]: ...
    def reload_model(self, new_path: str) -> bool: ...
    @property
    def model_info(self) -> ModelInfo: ...
```

#### `deduplication.py` — Sliding Window
```python
class DeduplicationBuffer:
    def __init__(self, window_seconds: float = 2.0): ...
    def should_add(self, class_id: int) -> bool: ...
    def reset(self): ...
```

#### `websocket_handler.py` — WS Endpoint
```python
async def detection_websocket(
    websocket: WebSocket,
    session_id: str,
    detector: Detector = Depends(get_detector),
    db: Session = Depends(get_db),
): ...
```

#### `transaction_service.py`
```python
class TransactionService:
    def create_transaction(self, session_id: str) -> Transaction: ...
    def add_item(self, tx_id: str, item_id: str, qty: int) -> CartItem: ...
    def remove_item(self, tx_id: str, item_id: str): ...
    def complete_transaction(self, tx_id: str, payment: PaymentIn) -> Receipt: ...
    def cancel_transaction(self, tx_id: str, reason: str): ...
```

---

## REST API Endpoints

### Autentikasi

| Method | Path | Deskripsi | Auth |
|--------|------|-----------|------|
| POST | `/api/auth/login` | Login, kembalikan JWT | — |
| POST | `/api/auth/logout` | Invalidate sesi | JWT |
| GET | `/api/auth/me` | Info user aktif | JWT |

**Request Login:**
```json
{ "username": "kasir01", "password": "secret" }
```
**Response Login:**
```json
{ "access_token": "eyJ...", "token_type": "bearer", "role": "kasir" }
```

---

### Inventaris

| Method | Path | Deskripsi | Auth |
|--------|------|-----------|------|
| GET | `/api/items` | List semua barang aktif | JWT |
| GET | `/api/items/search?q={query}` | Cari barang (nama/ID) | JWT |
| GET | `/api/items/{id}` | Detail satu barang | JWT |
| POST | `/api/items` | Tambah barang baru | JWT (Admin) |
| PUT | `/api/items/{id}` | Update barang | JWT (Admin) |
| DELETE | `/api/items/{id}` | Soft delete barang | JWT (Admin) |
| GET | `/api/items/export/csv` | Ekspor CSV inventaris | JWT (Admin) |

---

### Transaksi

| Method | Path | Deskripsi | Auth |
|--------|------|-----------|------|
| POST | `/api/transactions` | Buat transaksi baru | JWT |
| GET | `/api/transactions/{id}` | Detail transaksi | JWT |
| POST | `/api/transactions/{id}/items` | Tambah item ke keranjang | JWT |
| DELETE | `/api/transactions/{id}/items/{item_id}` | Hapus item dari keranjang | JWT |
| POST | `/api/transactions/{id}/complete` | Selesaikan transaksi | JWT |
| POST | `/api/transactions/{id}/cancel` | Batalkan transaksi | JWT |
| GET | `/api/transactions/{id}/receipt` | Ambil struk (JSON/PDF) | JWT |

---

### Riwayat & Laporan

| Method | Path | Deskripsi | Auth |
|--------|------|-----------|------|
| GET | `/api/reports/transactions` | Riwayat transaksi (filter) | JWT (Admin) |
| GET | `/api/reports/daily` | Laporan harian | JWT (Admin) |
| GET | `/api/reports/export/csv` | Ekspor CSV riwayat | JWT (Admin) |

Query params untuk filter: `?from=2024-01-01&to=2024-01-31&cashier_id=1&status=completed`

---

### Dataset & Model AI

| Method | Path | Deskripsi | Auth |
|--------|------|-----------|------|
| POST | `/api/dataset/capture` | Simpan frame ke dataset | JWT (Admin) |
| GET | `/api/dataset/{item_id}/count` | Jumlah gambar per barang | JWT (Admin) |
| GET | `/api/model/info` | Info model aktif | JWT (Admin) |
| POST | `/api/model/reload` | Hot-reload model baru | JWT (Admin) |

---

### Konfigurasi

| Method | Path | Deskripsi | Auth |
|--------|------|-----------|------|
| GET | `/api/config` | Baca konfigurasi sistem | JWT (Admin) |
| PUT | `/api/config` | Update konfigurasi | JWT (Admin) |

---

## Protokol WebSocket

### Endpoint

```
ws://{host}/ws/detection?token={jwt_token}
```

### Pesan dari Client → Server

```json
{
  "type": "frame",
  "session_id": "uuid-sesi-kasir",
  "transaction_id": "uuid-transaksi-aktif",
  "data": "base64_encoded_jpeg_string"
}
```

### Pesan dari Server → Client

**Hasil deteksi:**
```json
{
  "type": "detection_result",
  "detections": [
    {
      "class_id": 3,
      "item_id": "SKU-001",
      "item_name": "Indomie Goreng",
      "confidence": 0.92,
      "bbox": [120, 80, 340, 260],
      "added_to_cart": true
    }
  ],
  "frame_id": 1042,
  "processing_ms": 87
}
```

**Notifikasi item ditambahkan ke keranjang:**
```json
{
  "type": "cart_updated",
  "cart": {
    "items": [...],
    "total": 15000
  }
}
```

**Error:**
```json
{
  "type": "error",
  "code": "MODEL_NOT_LOADED",
  "message": "Model YOLO belum dimuat"
}
```

**Status kamera/model:**
```json
{
  "type": "status",
  "camera": "active",
  "model": "best_v2.pt",
  "fps": 18.3
}
```

### Kode Error WebSocket

| Kode | Deskripsi |
|------|-----------|
| `MODEL_NOT_LOADED` | Model YOLO belum tersedia |
| `FRAME_DECODE_ERROR` | Frame tidak dapat di-decode |
| `SESSION_EXPIRED` | Sesi JWT kadaluarsa |
| `TRANSACTION_NOT_FOUND` | ID transaksi tidak valid |

---

## Model Data

### TypeScript Interfaces (Frontend)

```typescript
// types/index.ts

export interface User {
  id: number;
  username: string;
  role: 'kasir' | 'admin';
}

export interface Item {
  id: string;
  name: string;
  price: number;
  stock: number;
  minStock: number;
  classId?: number;
  isActive: boolean;
}

export interface CartItem {
  item: Item;
  quantity: number;
  subtotal: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export interface Transaction {
  id: string;
  sessionId: string;
  status: 'active' | 'completed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  cart: Cart;
  payment?: PaymentInfo;
}

export interface PaymentInfo {
  method: 'cash' | 'transfer';
  received: number;
  change: number;
}

export interface Receipt {
  transactionId: string;
  cashierName: string;
  items: CartItem[];
  total: number;
  payment: PaymentInfo;
  timestamp: string;
}

export interface Detection {
  classId: number;
  itemId: string;
  itemName: string;
  confidence: number;
  bbox: [number, number, number, number]; // x1, y1, x2, y2
  addedToCart: boolean;
}

export interface ModelInfo {
  filename: string;
  format: 'pt' | 'onnx';
  loadedAt: string;
  fileSizeKb: number;
}
```

---

### Python Pydantic Schemas (Backend)

```python
# schemas/detection.py
from pydantic import BaseModel

class DetectionResult(BaseModel):
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
    detections: list[DetectionResult]
    frame_id: int
    processing_ms: int
```

```python
# schemas/item.py
from pydantic import BaseModel
from typing import Optional

class ItemBase(BaseModel):
    name: str
    price: float
    stock: int
    min_stock: int = 5
    class_id: Optional[int] = None

class ItemCreate(ItemBase):
    id: str

class ItemUpdate(ItemBase):
    pass

class ItemOut(ItemBase):
    id: str
    is_active: bool
    class Config:
        from_attributes = True
```

```python
# schemas/transaction.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PaymentIn(BaseModel):
    method: str
    received: float

class TransactionOut(BaseModel):
    id: str
    status: str
    started_at: datetime
    total_amount: Optional[float]
    items: list[dict]
    class Config:
        from_attributes = True
```

---

### Skema Database (SQL)

```sql
-- Tabel users
CREATE TABLE users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL CHECK(role IN ('kasir', 'admin')),
    is_active       INTEGER NOT NULL DEFAULT 1,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until    DATETIME,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabel sessions (sesi kasir)
CREATE TABLE sessions (
    id          TEXT PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    started_at  DATETIME NOT NULL,
    ended_at    DATETIME,
    device_info TEXT
);

-- Tabel items (inventaris)
CREATE TABLE items (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    price       REAL NOT NULL CHECK(price >= 0),
    stock       INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
    min_stock   INTEGER NOT NULL DEFAULT 5,
    class_id    INTEGER,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabel audit log harga
CREATE TABLE price_audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id     TEXT NOT NULL REFERENCES items(id),
    old_price   REAL NOT NULL,
    new_price   REAL NOT NULL,
    changed_by  INTEGER NOT NULL REFERENCES users(id),
    changed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabel transactions
CREATE TABLE transactions (
    id               TEXT PRIMARY KEY,
    session_id       TEXT NOT NULL REFERENCES sessions(id),
    status           TEXT NOT NULL CHECK(status IN ('active','completed','cancelled')),
    started_at       DATETIME NOT NULL,
    completed_at     DATETIME,
    total_amount     REAL,
    payment_method   TEXT,
    payment_received REAL,
    change_amount    REAL,
    cancel_reason    TEXT
);

-- Tabel transaction_items (snapshot harga saat transaksi)
CREATE TABLE transaction_items (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT NOT NULL REFERENCES transactions(id),
    item_id        TEXT NOT NULL REFERENCES items(id),
    item_name      TEXT NOT NULL,
    unit_price     REAL NOT NULL,
    quantity       INTEGER NOT NULL CHECK(quantity > 0),
    subtotal       REAL NOT NULL
);

-- Tabel system_log
CREATE TABLE system_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    level      TEXT NOT NULL CHECK(level IN ('INFO','WARNING','ERROR')),
    event      TEXT NOT NULL,
    detail     TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## Konfigurasi Sistem (`config.yaml`)

```yaml
model:
  path: "models/best.pt"
  confidence_threshold: 0.70
  format: "pt"

camera:
  # dikelola di sisi browser (WebRTC), tidak ada config server-side
  dedup_window_seconds: 2.0

database:
  type: "sqlite"          # "sqlite" atau "mysql"
  sqlite_path: "data/visionpos.db"
  mysql_host: null
  mysql_port: 3306
  mysql_name: null
  mysql_user: null
  mysql_password: null

transaction:
  idle_timeout_minutes: 30

inventory:
  default_min_stock: 5

dataset:
  base_dir: "dataset/images"
  burst_interval_seconds: 0.5

auth:
  jwt_secret: "ganti-dengan-secret-aman"
  jwt_expire_minutes: 480
  max_failed_attempts: 5
  lockout_minutes: 15

logging:
  level: "INFO"
  file: "logs/visionpos.log"
```

---

## Penanganan Kesalahan

### Strategi Umum

Backend FastAPI menggunakan exception handler terpusat. Semua error dikembalikan dalam format JSON standar:

```json
{
  "error": "ITEM_NOT_FOUND",
  "message": "Barang dengan ID SKU-999 tidak ditemukan",
  "detail": null
}
```

### Kode Error HTTP

| Kode HTTP | Kondisi |
|-----------|---------|
| 400 | Input tidak valid (validasi Pydantic gagal) |
| 401 | Token JWT tidak ada atau kadaluarsa |
| 403 | Akses ditolak (role tidak cukup) |
| 404 | Resource tidak ditemukan |
| 409 | Konflik (ID barang duplikat, transaksi sudah selesai) |
| 422 | Unprocessable entity (nilai di luar rentang valid) |
| 500 | Internal server error |

### Penanganan Kesalahan per Modul

**Autentikasi:**
- Login gagal: increment `failed_attempts`, jika ≥5 set `locked_until = now + 15 menit`
- Token kadaluarsa: kembalikan 401, frontend redirect ke halaman login

**Deteksi (WebSocket):**
- Frame tidak dapat di-decode: kirim `{"type": "error", "code": "FRAME_DECODE_ERROR"}`, lanjutkan ke frame berikutnya
- Model belum dimuat: kirim `{"type": "error", "code": "MODEL_NOT_LOADED"}`, jangan putus koneksi
- Kamera terputus di sisi browser: frontend mengirim `{"type": "camera_disconnected"}`, backend hentikan pemrosesan frame tapi pertahankan state transaksi

**Transaksi:**
- Complete dengan keranjang kosong: raise HTTP 400 `CART_EMPTY`
- Complete dengan pembayaran kurang: raise HTTP 400 `INSUFFICIENT_PAYMENT`
- Pemotongan stok gagal (stok tidak cukup): rollback seluruh transaksi, raise HTTP 409 `INSUFFICIENT_STOCK`

**Model AI:**
- File tidak ditemukan saat reload: pertahankan model lama, log error, kembalikan HTTP 404
- Format model tidak valid: pertahankan model lama, log error, kembalikan HTTP 422

**Database:**
- Koneksi gagal: log error ke `system_log`, kembalikan HTTP 500
- Korupsi data riwayat transaksi: set flag read-only, tolak penulisan baru, tampilkan error ke admin

---

## Properti Kebenaran (Correctness Properties)

*Sebuah properti adalah karakteristik atau perilaku yang harus berlaku di semua eksekusi valid sistem — pada dasarnya, pernyataan formal tentang apa yang seharusnya dilakukan sistem. Properti berfungsi sebagai jembatan antara spesifikasi yang dapat dibaca manusia dan jaminan kebenaran yang dapat diverifikasi mesin.*

---

### Properti 1: Konsistensi Total Keranjang

*Untuk setiap* kondisi keranjang dengan item apapun, total yang dihitung harus selalu sama dengan penjumlahan (harga_satuan × kuantitas) untuk setiap item dalam keranjang.

**Validates: Requirements 2.2, 2.4, 5.1**

---

### Properti 2: Atomisitas Pemotongan Stok

*Untuk setiap* transaksi yang diselesaikan, stok setiap item di inventaris harus berkurang tepat sebesar kuantitas yang dibeli — atau tidak ada yang berubah sama sekali jika terjadi error (all-or-nothing).

**Validates: Requirements 5.4**

---

### Properti 3: Round-Trip Serialisasi Transaksi

*Untuk setiap* transaksi yang disimpan ke database, membaca kembali data tersebut harus menghasilkan objek transaksi yang identik dengan yang disimpan.

**Validates: Requirements 5.5, 5.8**

---

### Properti 4: Idempoten Deduplikasi Deteksi

*Untuk setiap* hasil deteksi yang sudah melewati filter deduplikasi, menjalankan filter deduplikasi kembali pada output tersebut harus menghasilkan output yang sama persis.

**Validates: Requirements 3.8**

---

### Properti 5: Ambang Batas Confidence Score

*Untuk setiap* hasil deteksi dengan confidence_score ≤ 0.70, jumlah item yang ditambahkan ke keranjang harus nol — tidak ada item yang boleh masuk keranjang dari deteksi di bawah threshold.

**Validates: Requirements 3.6**

---

### Properti 6: Konsistensi Pencarian Inventaris

*Untuk setiap* query pencarian q dan hasil r = search(q), semua item dalam r harus merupakan subset dari seluruh inventaris aktif, dan setiap item dalam r harus mengandung teks q di nama atau ID-nya.

**Validates: Requirements 4.2, 4.3**

---

### Properti 7: Integritas Riwayat Transaksi

*Untuk setiap* operasi yang bukan penghapusan eksplisit oleh admin, jumlah total transaksi yang tersimpan di riwayat tidak boleh berkurang — riwayat hanya boleh bertambah.

**Validates: Requirements 10.1**

---

### Properti 8: Keamanan Hash Kata Sandi

*Untuk setiap* kata sandi plaintext p, nilai yang tersimpan di database harus berbeda dari p, dan tidak ada fungsi yang dapat memulihkan p dari hash tersebut (one-way property).

**Validates: Requirements 1.6**

---

### Properti 9: Keunikan ID Transaksi

*Untuk setiap* kumpulan transaksi yang dibuat, tidak boleh ada dua transaksi dengan ID yang sama — setiap pemanggilan `create_transaction` harus menghasilkan ID yang unik secara global.

**Validates: Requirements 2.1**

---

### Properti 10: Deduplikasi Item Keranjang

*Untuk setiap* keranjang dan item yang sudah ada di dalamnya, menambahkan item yang sama lagi harus menghasilkan satu entri dengan kuantitas bertambah — bukan dua entri terpisah untuk item yang sama.

**Validates: Requirements 2.3**

---

### Properti 11: Validasi Kembalian

*Untuk setiap* transaksi yang diselesaikan dengan pembayaran tunai, nilai kembalian harus selalu sama dengan (jumlah_diterima − total_transaksi), dan tidak boleh negatif.

**Validates: Requirements 5.2, 5.3**

---

### Properti 12: Pencegahan Penyelesaian Transaksi Tidak Valid

*Untuk setiap* percobaan menyelesaikan transaksi dengan keranjang kosong atau dengan jumlah pembayaran kurang dari total, sistem harus menolak operasi dan mengembalikan error — transaksi tidak boleh berubah status menjadi `completed`.

**Validates: Requirements 2.7, 5.3**

---

### Properti 13: Soft Delete Barang Beriwayat

*Untuk setiap* barang yang memiliki minimal satu entri di `transaction_items`, operasi hapus harus menghasilkan `is_active = false` (soft delete) — bukan penghapusan baris dari database.

**Validates: Requirements 6.5, 6.6**

---

### Properti 14: Audit Log Perubahan Harga

*Untuk setiap* operasi update harga barang, harus ada tepat satu entri baru di `price_audit_log` yang mencatat harga lama, harga baru, user yang mengubah, dan waktu perubahan.

**Validates: Requirements 6.4**

---

### Properti 15: Konsistensi Laporan Harian

*Untuk setiap* laporan harian pada tanggal tertentu, total pendapatan yang dilaporkan harus sama dengan jumlah `total_amount` dari semua transaksi berstatus `completed` pada tanggal tersebut.

**Validates: Requirements 10.4**

---

### Properti 16: Validasi Rentang Konfigurasi

*Untuk setiap* nilai konfigurasi yang berada di luar rentang valid (misalnya confidence_threshold > 1.0 atau < 0.0), sistem harus menolak perubahan dan mempertahankan nilai konfigurasi sebelumnya.

**Validates: Requirements 11.5**

---

### Properti 17: Hot-Reload Model dengan Fallback

*Untuk setiap* percobaan reload model dengan path file yang valid, model baru harus aktif setelah reload selesai. *Untuk setiap* percobaan reload dengan path tidak valid atau format tidak didukung, model sebelumnya harus tetap aktif dan tidak ada gangguan pada deteksi yang sedang berjalan.

**Validates: Requirements 8.2, 8.4**

---

### Properti 18: Isolasi State Keranjang dari Kamera

*Untuk setiap* kondisi kamera (aktif, terputus, error), isi keranjang transaksi yang sedang aktif tidak boleh berubah akibat perubahan status kamera — keranjang hanya boleh berubah melalui operasi add/remove item yang eksplisit.

**Validates: Requirements 9.3**

---

### Properti 19: Struktur Direktori Dataset

*Untuk setiap* gambar yang ditangkap untuk barang dengan id_barang tertentu, file gambar harus tersimpan di path `dataset/images/{id_barang}/` dan dapat dibaca kembali dari path tersebut.

**Validates: Requirements 7.2, 7.3**

---

### Properti 20: Kelengkapan Data Struk

*Untuk setiap* transaksi yang diselesaikan, struk yang dihasilkan harus mengandung semua field wajib: ID transaksi, waktu, nama kasir, daftar item dengan harga satuan dan kuantitas, total, metode pembayaran, dan jumlah kembalian.

**Validates: Requirements 5.6**

---

## Strategi Pengujian

### Pendekatan Dual Testing

Sistem menggunakan dua pendekatan pengujian yang saling melengkapi:

**Unit Tests** — untuk contoh spesifik, edge case, dan kondisi error:
- Contoh konkret yang mendemonstrasikan perilaku benar
- Titik integrasi antar komponen
- Edge case dan kondisi error

**Property-Based Tests** — untuk properti universal di semua input:
- Setiap properti di atas diimplementasikan sebagai satu property-based test
- Menggunakan input yang di-generate secara acak untuk menemukan bug yang tidak terduga

### Library Property-Based Testing

**Backend (Python):** `hypothesis` (https://hypothesis.readthedocs.io/)
**Frontend (TypeScript):** `fast-check` (https://fast-check.dev/)

### Konfigurasi Property Tests

- Minimum **100 iterasi** per property test
- Setiap test diberi tag referensi ke properti desain:
  - Format: `# Feature: vision-pos, Property {N}: {deskripsi_singkat}`
- Setiap properti kebenaran diimplementasikan oleh **tepat satu** property-based test

### Contoh Implementasi (Backend — Hypothesis)

```python
from hypothesis import given, settings
import hypothesis.strategies as st

# Feature: vision-pos, Property 1: Konsistensi Total Keranjang
@given(
    items=st.lists(
        st.tuples(st.floats(min_value=0, max_value=1_000_000), st.integers(min_value=1, max_value=100)),
        min_size=1, max_size=20
    )
)
@settings(max_examples=100)
def test_cart_total_consistency(items):
    cart = Cart()
    for price, qty in items:
        cart.add_item(Item(price=price), qty)
    expected = sum(price * qty for price, qty in items)
    assert abs(cart.total - expected) < 0.001
```

```python
# Feature: vision-pos, Property 5: Ambang Batas Confidence Score
@given(
    confidence=st.floats(min_value=0.0, max_value=0.70)
)
@settings(max_examples=100)
def test_low_confidence_not_added_to_cart(confidence):
    result = DetectionResult(class_id=1, confidence=confidence, bbox=(0,0,100,100), timestamp=time.time())
    items_added = process_detection(result, threshold=0.70)
    assert items_added == []
```

### Contoh Implementasi (Frontend — fast-check)

```typescript
// Feature: vision-pos, Property 10: Deduplikasi Item Keranjang
import fc from 'fast-check';

test('menambahkan item yang sama dua kali hanya menghasilkan satu entri', () => {
  fc.assert(
    fc.property(fc.record({ id: fc.string(), price: fc.float({ min: 0 }) }), (item) => {
      const cart = new Cart();
      cart.addItem(item);
      cart.addItem(item);
      const entries = cart.items.filter(i => i.item.id === item.id);
      expect(entries).toHaveLength(1);
      expect(entries[0].quantity).toBe(2);
    }),
    { numRuns: 100 }
  );
});
```

### Cakupan Unit Tests

| Modul | Fokus Unit Test |
|-------|----------------|
| `auth_service` | Login valid, login gagal, lockout setelah 5x gagal |
| `transaction_service` | Complete dengan keranjang kosong, pembayaran kurang |
| `detector` | Frame kosong/rusak, model tidak dimuat |
| `deduplication` | Window 2 detik, reset buffer |
| `inventory_service` | ID duplikat, soft delete, ekspor CSV |
| `config` | File tidak ditemukan (buat default), nilai di luar rentang |
| `CartPanel` (React) | Render item, update total, empty state |
| `ManualSearch` (React) | Debounce, empty result state |
| `useDetectionWS` (React) | Reconnect, error handling |

