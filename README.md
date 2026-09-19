# VisionPOS

**Kasir berbasis computer vision.** Kamera mengenali produk dengan model YOLO (Ultralytics), lalu item masuk ke transaksi
secara otomatis. Backend FastAPI, frontend React.

![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![YOLO](https://img.shields.io/badge/Ultralytics-YOLO-111F68)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)

## Fitur

- Deteksi produk dari kamera dengan YOLO; ambang keyakinan dan jendela anti-duplikat bisa diatur
- Transaksi kasir dengan batas waktu idle
- Inventori dengan stok minimum
- Autentikasi (JWT, password ber-hash bcrypt)
- Pengumpulan dataset gambar untuk melatih ulang model
- Basis data SQLite bawaan, opsional MySQL; migrasi dengan Alembic

## Struktur

```
vision-pos/
  backend/    FastAPI + SQLAlchemy + Alembic + Ultralytics/OpenCV
    app/        main.py, routers, services, detection, models, schemas
    config.yaml pengaturan model, kamera, database, transaksi, inventori, dataset
    tests/      pytest + hypothesis
  frontend/   React + Vite + TypeScript + Zustand + React Router
```

## Menjalankan

Backend (Python 3.10+):

```bash
cd vision-pos/backend
pip install -r requirements.txt
python init_db.py
uvicorn app.main:app --reload
```

Letakkan bobot model YOLO hasil training di `vision-pos/backend/models/best.pt` (lihat `config.yaml`).

Frontend (Node.js 18+):

```bash
cd vision-pos/frontend
npm install
npm run dev
```

## Pengaturan utama (`config.yaml`)

| Kunci | Bawaan | Arti |
|---|---|---|
| `model.path` | `models/best.pt` | bobot YOLO |
| `model.confidence_threshold` | `0.70` | ambang deteksi |
| `camera.dedup_window_seconds` | `2.0` | produk yang sama tidak dihitung dua kali dalam jendela ini |
| `database.type` | `sqlite` | `sqlite` atau `mysql` |
| `transaction.idle_timeout_minutes` | `30` | transaksi ditutup bila tidak aktif |
| `inventory.default_min_stock` | `5` | batas peringatan stok |

## Tes

```bash
cd vision-pos/backend
pytest
```
