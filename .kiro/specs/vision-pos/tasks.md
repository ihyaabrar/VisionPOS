# Rencana Implementasi: VisionPOS

## Ikhtisar

Implementasi sistem POS berbasis computer vision menggunakan React + TypeScript (frontend), Python FastAPI (backend), YOLOv8 (deteksi), SQLite via SQLAlchemy (database), dan WebSocket untuk streaming real-time.

## Tugas

- [x] 1. Setup struktur proyek dan konfigurasi dasar
  - Buat struktur direktori `frontend/` dan `backend/` sesuai desain
  - Inisialisasi proyek React + TypeScript + Vite di `frontend/`
  - Inisialisasi proyek FastAPI di `backend/` dengan `requirements.txt`
  - Buat file `backend/config.yaml` dengan nilai default dari desain
  - Buat file `backend/app/config.py` menggunakan Pydantic Settings untuk membaca `config.yaml`
  - Buat file `backend/app/main.py` sebagai entry point FastAPI
  - Buat file `frontend/src/types/index.ts` dengan semua TypeScript interfaces dari desain
  - _Requirements: 12.1, 12.2, 11.1, 11.2_


- [x] 2. Database: model ORM dan migrasi Alembic
  - Buat `backend/app/database.py` dengan SQLAlchemy engine dan session factory
  - Buat ORM model `backend/app/models/user.py` (tabel `users` dan `sessions`)
  - Buat ORM model `backend/app/models/item.py` (tabel `items` dan `price_audit_log`)
  - Buat ORM model `backend/app/models/transaction.py` (tabel `transactions` dan `transaction_items`)
  - Buat ORM model `backend/app/models/system_log.py` (tabel `system_log`)
  - Inisialisasi Alembic dan buat migrasi awal untuk semua tabel
  - _Requirements: 12.2, 5.4, 5.5, 6.4_

- [x] 3. Autentikasi: keamanan, JWT, dan lockout
  - Buat `backend/app/core/security.py` dengan fungsi hash bcrypt dan verifikasi password
  - Implementasikan pembuatan dan validasi JWT di `security.py`
  - Buat `backend/app/core/dependencies.py` dengan dependency `get_current_user` dan `require_admin`
  - Buat `backend/app/services/auth_service.py` dengan logika login, logout, dan lockout (5x gagal → kunci 15 menit)
  - Buat Pydantic schemas di `backend/app/schemas/auth.py`
  - Buat `backend/app/routers/auth.py` dengan endpoint POST `/api/auth/login`, POST `/api/auth/logout`, GET `/api/auth/me`
  - [ ]* 3.1 Tulis property test untuk keamanan hash kata sandi
    - **Properti 8: Keamanan Hash Kata Sandi**
    - **Validates: Requirements 1.6**
  - [ ]* 3.2 Tulis unit test untuk auth_service
    - Test login valid, login gagal, lockout setelah 5x gagal
    - _Requirements: 1.2, 1.3, 1.4_
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_


- [x] 4. Inventaris: CRUD, soft delete, audit log, ekspor CSV
  - Buat Pydantic schemas di `backend/app/schemas/item.py` (`ItemCreate`, `ItemUpdate`, `ItemOut`)
  - Buat `backend/app/services/inventory_service.py` dengan logika CRUD, soft delete, dan ekspor CSV
  - Implementasikan pencatatan `price_audit_log` di `inventory_service` setiap kali harga diubah
  - Buat `backend/app/routers/inventory.py` dengan semua endpoint inventaris dari desain
  - [x] 4.1 Implementasikan endpoint pencarian barang `GET /api/items/search?q=`
    - Dukung pencarian berdasarkan nama dan ID barang
    - _Requirements: 4.2, 4.3_
  - [ ]* 4.2 Tulis property test untuk konsistensi pencarian inventaris
    - **Properti 6: Konsistensi Pencarian Inventaris**
    - **Validates: Requirements 4.2, 4.3**
  - [ ]* 4.3 Tulis property test untuk soft delete barang beriwayat
    - **Properti 13: Soft Delete Barang Beriwayat**
    - **Validates: Requirements 6.5, 6.6**
  - [ ]* 4.4 Tulis property test untuk audit log perubahan harga
    - **Properti 14: Audit Log Perubahan Harga**
    - **Validates: Requirements 6.4**
  - [ ]* 4.5 Tulis unit test untuk inventory_service
    - Test ID duplikat, soft delete, ekspor CSV
    - _Requirements: 6.2, 6.3, 6.5, 6.8_
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [x] 5. Transaksi: keranjang, penyelesaian, struk
  - Buat Pydantic schemas di `backend/app/schemas/transaction.py`
  - Buat `backend/app/services/transaction_service.py` dengan semua method dari desain
  - Implementasikan pemotongan stok atomik di `complete_transaction` menggunakan transaksi database
  - Buat `backend/app/routers/transactions.py` dengan semua endpoint transaksi dari desain
  - [x] 5.1 Implementasikan logika pembuatan struk di `transaction_service`
    - Struk harus memuat semua field wajib: ID, waktu, kasir, item, total, pembayaran, kembalian
    - _Requirements: 5.6_
  - [ ]* 5.2 Tulis property test untuk konsistensi total keranjang
    - **Properti 1: Konsistensi Total Keranjang**
    - **Validates: Requirements 2.2, 2.4, 5.1**
  - [ ]* 5.3 Tulis property test untuk atomisitas pemotongan stok
    - **Properti 2: Atomisitas Pemotongan Stok**
    - **Validates: Requirements 5.4**
  - [ ]* 5.4 Tulis property test untuk round-trip serialisasi transaksi
    - **Properti 3: Round-Trip Serialisasi Transaksi**
    - **Validates: Requirements 5.5, 5.8**
  - [ ]* 5.5 Tulis property test untuk keunikan ID transaksi
    - **Properti 9: Keunikan ID Transaksi**
    - **Validates: Requirements 2.1**
  - [ ]* 5.6 Tulis property test untuk deduplikasi item keranjang
    - **Properti 10: Deduplikasi Item Keranjang**
    - **Validates: Requirements 2.3**
  - [ ]* 5.7 Tulis property test untuk validasi kembalian
    - **Properti 11: Validasi Kembalian**
    - **Validates: Requirements 5.2, 5.3**
  - [ ]* 5.8 Tulis property test untuk pencegahan penyelesaian transaksi tidak valid
    - **Properti 12: Pencegahan Penyelesaian Transaksi Tidak Valid**
    - **Validates: Requirements 2.7, 5.3**
  - [ ]* 5.9 Tulis property test untuk kelengkapan data struk
    - **Properti 20: Kelengkapan Data Struk**
    - **Validates: Requirements 5.6**
  - [ ]* 5.10 Tulis unit test untuk transaction_service
    - Test complete dengan keranjang kosong, pembayaran kurang
    - _Requirements: 2.7, 5.3_
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.8_


- [x] 6. Checkpoint — Pastikan semua test backend lulus
  - Pastikan semua test lulus, tanyakan kepada pengguna jika ada pertanyaan.

- [x] 7. Deteksi: YOLOv8 wrapper dan deduplikasi
  - Buat `backend/app/detection/detector.py` dengan class `Detector` (predict, reload_model, model_info)
  - Buat `backend/app/detection/deduplication.py` dengan class `DeduplicationBuffer` (sliding window 2 detik)
  - Buat Pydantic schemas di `backend/app/schemas/detection.py`
  - [ ]* 7.1 Tulis property test untuk idempoten deduplikasi deteksi
    - **Properti 4: Idempoten Deduplikasi Deteksi**
    - **Validates: Requirements 3.8**
  - [ ]* 7.2 Tulis property test untuk ambang batas confidence score
    - **Properti 5: Ambang Batas Confidence Score**
    - **Validates: Requirements 3.6**
  - [ ]* 7.3 Tulis unit test untuk detector dan deduplication
    - Test frame kosong/rusak, model tidak dimuat, window 2 detik, reset buffer
    - _Requirements: 3.2, 3.6, 3.8, 9.6_
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 8. WebSocket: handler deteksi real-time
  - Buat `backend/app/detection/websocket_handler.py` dengan fungsi `detection_websocket`
  - Implementasikan autentikasi JWT via query param `?token=` pada endpoint WebSocket
  - Implementasikan loop penerimaan frame, inferensi YOLO, deduplikasi, dan pengiriman hasil
  - Daftarkan endpoint `ws://{host}/ws/detection` di `main.py`
  - Implementasikan penanganan error WebSocket sesuai kode error di desain (`MODEL_NOT_LOADED`, `FRAME_DECODE_ERROR`, dll.)
  - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.8, 9.3, 9.6_

- [x] 9. Riwayat transaksi dan laporan
  - Buat `backend/app/services/report_service.py` dengan logika filter riwayat dan laporan harian
  - Buat `backend/app/routers/reports.py` dengan endpoint riwayat dan ekspor CSV
  - [ ]* 9.1 Tulis property test untuk integritas riwayat transaksi
    - **Properti 7: Integritas Riwayat Transaksi**
    - **Validates: Requirements 10.1**
  - [ ]* 9.2 Tulis property test untuk konsistensi laporan harian
    - **Properti 15: Konsistensi Laporan Harian**
    - **Validates: Requirements 10.4**
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 10. Dataset dan manajemen model AI
  - Buat `backend/app/services/dataset_service.py` untuk menyimpan frame ke `dataset/images/{id_barang}/`
  - Buat `backend/app/routers/dataset.py` dengan endpoint capture dan count
  - Buat `backend/app/routers/model_management.py` dengan endpoint info dan hot-reload model
  - Implementasikan hot-reload di `Detector.reload_model()` dengan fallback ke model lama jika gagal
  - [ ]* 10.1 Tulis property test untuk hot-reload model dengan fallback
    - **Properti 17: Hot-Reload Model dengan Fallback**
    - **Validates: Requirements 8.2, 8.4**
  - [ ]* 10.2 Tulis property test untuk struktur direktori dataset
    - **Properti 19: Struktur Direktori Dataset**
    - **Validates: Requirements 7.2, 7.3**
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_


- [x] 11. Konfigurasi sistem
  - Buat `backend/app/routers/config.py` dengan endpoint GET dan PUT `/api/config`
  - Implementasikan validasi rentang nilai konfigurasi di service sebelum menyimpan
  - Implementasikan pembuatan file konfigurasi default jika tidak ditemukan saat startup
  - [ ]* 11.1 Tulis property test untuk validasi rentang konfigurasi
    - **Properti 16: Validasi Rentang Konfigurasi**
    - **Validates: Requirements 11.5**
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 12. Checkpoint — Pastikan semua test backend lulus
  - Pastikan semua test lulus, tanyakan kepada pengguna jika ada pertanyaan.

- [x] 13. Frontend: setup API client dan state management
  - Buat `frontend/src/api/client.ts` dengan axios instance dan interceptor JWT (attach token + handle 401)
  - Buat `frontend/src/api/auth.ts`, `inventory.ts`, `transactions.ts`, `reports.ts`
  - Buat `frontend/src/store/authStore.ts` dengan Zustand (state login, token, user)
  - Buat `frontend/src/store/cartStore.ts` dengan Zustand (state keranjang, total)
  - Buat `frontend/src/store/cameraStore.ts` dengan Zustand (status kamera, deteksi aktif)
  - _Requirements: 12.1, 12.3_

- [x] 14. Frontend: autentikasi dan routing
  - Buat `frontend/src/pages/LoginPage.tsx` dengan form login
  - Implementasikan routing dengan React Router (protected routes berdasarkan role)
  - Buat komponen `frontend/src/components/shared/Navbar.tsx`
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 15. Frontend: modul kamera (WebRTC)
  - Buat `frontend/src/hooks/useCamera.ts` dengan `getUserMedia`, start/stop stream
  - Buat `frontend/src/components/camera/CameraFeed.tsx` yang menggambar frame ke `<canvas>` setiap ~66ms
  - Buat `frontend/src/components/camera/DetectionOverlay.tsx` untuk menggambar bounding box
  - Implementasikan penanganan error kamera (tidak terdeteksi, terputus, frame rusak)
  - _Requirements: 3.1, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 16. Frontend: WebSocket hook deteksi
  - Buat `frontend/src/hooks/useDetectionWS.ts` yang mengelola koneksi ke `ws://{host}/ws/detection`
  - Implementasikan pengiriman frame base64 JPEG setiap ~66ms
  - Implementasikan penerimaan hasil deteksi dan update `cartStore` secara otomatis
  - Implementasikan reconnect otomatis dan penanganan error WebSocket
  - [ ]* 16.1 Tulis property test untuk isolasi state keranjang dari kamera
    - **Properti 18: Isolasi State Keranjang dari Kamera**
    - **Validates: Requirements 9.3**
  - [ ]* 16.2 Tulis unit test untuk useDetectionWS
    - Test reconnect, error handling
    - _Requirements: 3.1, 9.3_
  - _Requirements: 3.1, 3.2, 3.4, 3.5, 9.3_


- [x] 17. Frontend: halaman kasir (CashierPage)
  - Buat `frontend/src/hooks/useTransaction.ts` untuk mengelola siklus hidup transaksi
  - Buat `frontend/src/components/cart/CartItem.tsx` dan `CartPanel.tsx`
  - Buat `frontend/src/components/cart/PaymentModal.tsx` untuk input pembayaran dan tampilan kembalian
  - Buat `frontend/src/components/search/ManualSearch.tsx` dengan debounce 300ms
  - Buat `frontend/src/pages/CashierPage.tsx` yang menyatukan semua komponen (kamera, keranjang, pencarian)
  - [ ]* 17.1 Tulis property test untuk konsistensi total keranjang (frontend)
    - **Properti 1: Konsistensi Total Keranjang**
    - **Validates: Requirements 2.2, 2.4, 5.1**
  - [ ]* 17.2 Tulis property test untuk deduplikasi item keranjang (frontend)
    - **Properti 10: Deduplikasi Item Keranjang**
    - **Validates: Requirements 2.3**
  - [ ]* 17.3 Tulis unit test untuk CartPanel dan ManualSearch
    - Test render item, update total, empty state, debounce, empty result state
    - _Requirements: 2.2, 2.3, 2.4, 4.2, 4.5_
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3_

- [x] 18. Frontend: halaman inventaris
  - Buat `frontend/src/components/inventory/ItemTable.tsx` dengan tabel barang dan indikator stok minimum
  - Buat `frontend/src/components/inventory/ItemFormModal.tsx` untuk form tambah/edit barang
  - Buat `frontend/src/pages/InventoryPage.tsx` (hanya dapat diakses Admin)
  - _Requirements: 6.1, 6.2, 6.3, 6.7, 6.8_

- [x] 19. Frontend: halaman riwayat transaksi, dataset, manajemen model, dan pengaturan
  - Buat `frontend/src/pages/TransactionHistoryPage.tsx` dengan filter dan tombol ekspor CSV
  - Buat `frontend/src/pages/DatasetPage.tsx` dengan live feed kamera mode capture dan counter gambar
  - Buat `frontend/src/pages/ModelManagementPage.tsx` dengan info model aktif dan tombol reload
  - Buat `frontend/src/pages/SettingsPage.tsx` untuk konfigurasi sistem
  - _Requirements: 7.1, 7.4, 7.5, 8.3, 8.6, 8.7, 10.2, 10.3, 10.5, 11.1, 11.2, 11.3_

- [x] 20. Integrasi: sambungkan frontend dan backend
  - Konfigurasi Vite proxy untuk meneruskan request `/api` dan `/ws` ke backend FastAPI
  - Pastikan semua halaman frontend terhubung ke endpoint backend yang sesuai
  - Implementasikan penanganan error global di frontend (toast notifikasi untuk error API)
  - Implementasikan idle timeout transaksi 30 menit dengan peringatan di frontend
  - _Requirements: 2.6, 9.4, 12.1_

- [x] 21. Checkpoint akhir — Pastikan semua test lulus
  - Pastikan semua test (unit, property-based) lulus di backend dan frontend, tanyakan kepada pengguna jika ada pertanyaan.

## Catatan

- Tugas bertanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap tugas mereferensikan requirements spesifik untuk keterlacakan
- Property-based tests menggunakan `hypothesis` (backend) dan `fast-check` (frontend)
- Setiap property test harus diberi tag: `# Feature: vision-pos, Property {N}: {deskripsi_singkat}`
- Minimum 100 iterasi per property test
- Checkpoint memastikan validasi inkremental sebelum melanjutkan ke fase berikutnya
