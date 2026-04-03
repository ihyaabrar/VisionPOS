# Dokumen Kebutuhan — VisionPOS

## Pendahuluan

VisionPOS adalah modul Point of Sale (POS) berbasis desktop yang mengintegrasikan teknologi Deep Learning (Computer Vision/YOLO) untuk menciptakan pengalaman smart checkout. Sistem memungkinkan kasir mendeteksi barang belanjaan secara real-time melalui kamera, mengidentifikasi barang secara otomatis, dan menambahkannya ke keranjang transaksi yang terintegrasi dengan master data inventaris.

Sistem ini terdiri dari empat modul utama:
1. **Modul Deteksi & Transaksi** — antarmuka kasir dengan live feed kamera dan keranjang belanja
2. **Modul Manajemen Inventaris** — pengelolaan master data barang dan stok
3. **Modul Dataset & AI Pipeline** — pengambilan dataset, pelatihan, dan pemuatan model
4. **Modul Autentikasi & Sesi** — manajemen pengguna, sesi kasir, dan riwayat transaksi

---

## Glosarium

- **VisionPOS**: Nama sistem POS berbasis computer vision yang dikembangkan
- **Kasir**: Pengguna yang mengoperasikan antarmuka transaksi sehari-hari
- **Admin**: Pengguna dengan hak akses penuh termasuk manajemen inventaris dan model AI
- **Detektor**: Komponen sistem yang menjalankan inferensi model YOLO terhadap frame kamera
- **Keranjang**: Daftar item yang terdeteksi atau ditambahkan secara manual dalam satu sesi transaksi
- **Transaksi**: Satu sesi checkout lengkap dari penambahan item pertama hingga pembayaran selesai
- **Sesi_Kasir**: Periode aktif seorang kasir dari login hingga logout
- **Model_YOLO**: File bobot model deep learning (format `.pt` atau `.onnx`) yang digunakan untuk deteksi objek
- **Confidence_Score**: Nilai kepercayaan (0.0–1.0) yang dihasilkan Detektor untuk setiap objek yang terdeteksi
- **Class_ID**: Identifikasi numerik kelas objek dalam Model_YOLO yang dipetakan ke ID barang di database
- **Inventaris**: Master data barang yang menyimpan ID, nama, harga, dan stok
- **Dataset**: Kumpulan gambar berlabel yang digunakan untuk melatih Model_YOLO
- **mAP**: Mean Average Precision, metrik akurasi standar untuk model deteksi objek
- **FPS**: Frames Per Second, satuan kecepatan pemrosesan video
- **GUI**: Graphical User Interface, antarmuka grafis pengguna
- **DB**: Database lokal SQLite atau MySQL yang menyimpan seluruh data sistem
- **Riwayat_Transaksi**: Catatan permanen seluruh transaksi yang telah diselesaikan
- **Struk**: Ringkasan transaksi yang dapat dicetak atau disimpan sebagai file

---

## Kebutuhan

### Kebutuhan 1: Autentikasi Pengguna

**User Story:** Sebagai admin, saya ingin mengelola akun pengguna dengan peran berbeda, agar hanya pengguna yang berwenang yang dapat mengakses fitur tertentu.

#### Kriteria Penerimaan

1. THE VisionPOS SHALL menyediakan dua peran pengguna: Kasir dan Admin
2. WHEN pengguna memasukkan kredensial yang valid, THE VisionPOS SHALL membuka sesi dan mengarahkan pengguna ke antarmuka sesuai perannya
3. IF pengguna memasukkan kredensial yang tidak valid, THEN THE VisionPOS SHALL menampilkan pesan kesalahan dan menolak akses
4. IF percobaan login gagal sebanyak 5 kali berturut-turut, THEN THE VisionPOS SHALL mengunci akun selama 15 menit
5. WHEN pengguna melakukan logout, THE VisionPOS SHALL mengakhiri Sesi_Kasir dan menyimpan waktu logout ke DB
6. THE VisionPOS SHALL menyimpan kata sandi pengguna dalam bentuk hash (bcrypt atau argon2) di DB
7. WHERE fitur multi-kasir diaktifkan, THE VisionPOS SHALL memungkinkan lebih dari satu Sesi_Kasir aktif secara bersamaan pada perangkat berbeda

---

### Kebutuhan 2: Manajemen Sesi Transaksi

**User Story:** Sebagai kasir, saya ingin mengelola sesi transaksi dengan jelas, agar setiap transaksi tercatat dengan benar dan dapat dibatalkan jika diperlukan.

#### Kriteria Penerimaan

1. WHEN kasir memulai transaksi baru, THE VisionPOS SHALL membuat ID transaksi unik dan mencatat waktu mulai
2. THE Keranjang SHALL menampilkan daftar item, kuantitas, harga satuan, dan subtotal secara real-time
3. WHEN kasir menambahkan item yang sudah ada di Keranjang, THE VisionPOS SHALL menambah kuantitas item tersebut, bukan membuat entri duplikat
4. WHEN kasir menghapus satu item dari Keranjang, THE VisionPOS SHALL memperbarui total transaksi secara langsung
5. WHEN kasir membatalkan seluruh transaksi, THE VisionPOS SHALL mengosongkan Keranjang dan mencatat transaksi sebagai dibatalkan di Riwayat_Transaksi
6. IF transaksi dibiarkan tidak aktif selama lebih dari 30 menit, THEN THE VisionPOS SHALL menampilkan peringatan dan menawarkan opsi untuk melanjutkan atau membatalkan transaksi
7. THE VisionPOS SHALL mencegah penyelesaian transaksi jika Keranjang kosong

---

### Kebutuhan 3: Deteksi Barang Real-Time

**User Story:** Sebagai kasir, saya ingin sistem mendeteksi barang secara otomatis melalui kamera, agar proses checkout lebih cepat dan akurat.

#### Kriteria Penerimaan

1. WHEN kamera aktif, THE VisionPOS SHALL menampilkan live feed video pada antarmuka kasir dengan latensi tidak lebih dari 100ms
2. WHEN Detektor memproses frame, THE VisionPOS SHALL menjalankan inferensi Model_YOLO dan menghasilkan hasil deteksi dalam waktu kurang dari 500ms per frame
3. THE Detektor SHALL memproses video pada kecepatan minimal 15 FPS pada perangkat dengan spesifikasi minimum yang didukung
4. WHEN Detektor mendeteksi objek dengan Confidence_Score di atas 0.70, THE VisionPOS SHALL memetakan Class_ID ke data barang di Inventaris
5. WHEN pemetaan Class_ID berhasil, THE VisionPOS SHALL menambahkan barang ke Keranjang secara otomatis dan menampilkan notifikasi visual
6. IF Confidence_Score di bawah 0.70, THEN THE Detektor SHALL mengabaikan deteksi tersebut dan tidak menambahkan item ke Keranjang
7. THE Detektor SHALL mampu mendeteksi hingga 10 objek berbeda secara simultan dalam satu frame
8. WHEN beberapa frame berturut-turut mendeteksi objek yang sama, THE VisionPOS SHALL menambahkan item ke Keranjang hanya sekali (deduplikasi berbasis jendela waktu 2 detik)

---

### Kebutuhan 4: Fallback Pencarian Manual

**User Story:** Sebagai kasir, saya ingin mencari dan menambahkan barang secara manual, agar transaksi tetap dapat berjalan meskipun deteksi AI gagal.

#### Kriteria Penerimaan

1. THE VisionPOS SHALL menyediakan kolom pencarian manual yang dapat diakses kapan saja selama transaksi berlangsung
2. WHEN kasir memasukkan teks pencarian minimal 2 karakter, THE VisionPOS SHALL menampilkan hasil pencarian dari Inventaris dalam waktu kurang dari 300ms
3. THE VisionPOS SHALL mendukung pencarian berdasarkan nama barang dan ID barang
4. WHEN kasir memilih barang dari hasil pencarian, THE VisionPOS SHALL menambahkan barang tersebut ke Keranjang
5. IF teks pencarian tidak menghasilkan hasil yang cocok, THEN THE VisionPOS SHALL menampilkan pesan "Barang tidak ditemukan"
6. WHERE pemindai barcode tersedia, THE VisionPOS SHALL mendukung input barcode sebagai metode pencarian manual tambahan

---

### Kebutuhan 5: Penyelesaian Transaksi & Pembayaran

**User Story:** Sebagai kasir, saya ingin menyelesaikan transaksi dan memproses pembayaran, agar stok terupdate dan struk dapat diberikan kepada pelanggan.

#### Kriteria Penerimaan

1. THE VisionPOS SHALL menampilkan total akhir transaksi yang mencakup seluruh item di Keranjang
2. WHEN kasir memilih metode pembayaran tunai dan memasukkan jumlah uang diterima, THE VisionPOS SHALL menghitung dan menampilkan jumlah kembalian
3. IF jumlah uang diterima kurang dari total transaksi, THEN THE VisionPOS SHALL menampilkan peringatan dan mencegah penyelesaian transaksi
4. WHEN transaksi diselesaikan, THE VisionPOS SHALL memotong stok setiap item di Inventaris sesuai kuantitas yang dibeli secara atomik
5. WHEN transaksi diselesaikan, THE VisionPOS SHALL menyimpan seluruh detail transaksi ke Riwayat_Transaksi secara permanen
6. WHEN transaksi diselesaikan, THE VisionPOS SHALL menghasilkan Struk yang memuat ID transaksi, waktu, daftar item, total, metode pembayaran, dan nama kasir
7. WHERE printer struk tersedia, THE VisionPOS SHALL mengirimkan Struk ke printer secara otomatis
8. THE VisionPOS SHALL mendukung penyimpanan Struk sebagai file PDF atau teks

---

### Kebutuhan 6: Manajemen Inventaris

**User Story:** Sebagai admin, saya ingin mengelola master data barang, agar informasi produk selalu akurat dan terkini.

#### Kriteria Penerimaan

1. THE VisionPOS SHALL menyediakan antarmuka CRUD (Create, Read, Update, Delete) untuk data barang di Inventaris
2. WHEN admin menambahkan barang baru, THE VisionPOS SHALL memvalidasi bahwa ID barang bersifat unik sebelum menyimpan ke DB
3. IF admin mencoba menyimpan barang dengan ID yang sudah ada, THEN THE VisionPOS SHALL menampilkan pesan kesalahan dan membatalkan operasi simpan
4. WHEN admin memperbarui harga barang, THE VisionPOS SHALL mencatat perubahan harga beserta waktu perubahan di log audit
5. WHEN admin menghapus barang, THE VisionPOS SHALL meminta konfirmasi dan memeriksa apakah barang tersebut memiliki riwayat transaksi
6. IF barang yang akan dihapus memiliki riwayat transaksi, THEN THE VisionPOS SHALL menonaktifkan barang (soft delete) alih-alih menghapus permanen
7. THE VisionPOS SHALL menampilkan peringatan ketika stok barang mencapai batas minimum yang dikonfigurasi
8. THE VisionPOS SHALL mendukung ekspor data Inventaris ke format CSV

---

### Kebutuhan 7: Pengambilan Dataset

**User Story:** Sebagai admin, saya ingin mengambil gambar barang baru melalui kamera, agar dataset untuk pelatihan model dapat dikumpulkan dengan mudah.

#### Kriteria Penerimaan

1. WHEN admin memulai sesi pengambilan dataset untuk barang tertentu, THE VisionPOS SHALL menampilkan live feed kamera dalam mode pengambilan dataset
2. WHEN admin menekan tombol tangkap, THE VisionPOS SHALL menyimpan frame saat itu sebagai file gambar (JPEG/PNG) ke direktori dataset yang sesuai
3. THE VisionPOS SHALL mengorganisasi gambar yang ditangkap ke dalam struktur direktori `dataset/images/{id_barang}/` secara otomatis
4. THE VisionPOS SHALL menampilkan jumlah gambar yang telah ditangkap untuk barang yang sedang didaftarkan secara real-time
5. WHEN sesi pengambilan dataset selesai, THE VisionPOS SHALL menampilkan ringkasan jumlah gambar yang berhasil disimpan
6. IF direktori tujuan tidak dapat ditulis, THEN THE VisionPOS SHALL menampilkan pesan kesalahan dan menghentikan sesi pengambilan dataset
7. THE VisionPOS SHALL mendukung pengambilan gambar secara otomatis (burst mode) dengan interval yang dapat dikonfigurasi (minimal 0.5 detik antar frame)

---

### Kebutuhan 8: Manajemen Model AI

**User Story:** Sebagai admin, saya ingin memuat dan mengganti model YOLO tanpa menghentikan sistem, agar model terbaru dapat digunakan segera setelah pelatihan selesai.

#### Kriteria Penerimaan

1. THE VisionPOS SHALL memuat Model_YOLO dari path file yang dikonfigurasi saat aplikasi pertama kali dijalankan
2. WHEN admin memicu pemuatan ulang model, THE VisionPOS SHALL memuat bobot model baru dari path yang ditentukan tanpa mematikan aplikasi
3. WHILE model baru sedang dimuat, THE VisionPOS SHALL menampilkan indikator loading dan menonaktifkan sementara fitur deteksi otomatis
4. IF file model tidak ditemukan atau format tidak valid, THEN THE VisionPOS SHALL mempertahankan model sebelumnya dan menampilkan pesan kesalahan
5. THE VisionPOS SHALL mendukung format model `.pt` (PyTorch) dan `.onnx`
6. WHEN model berhasil dimuat, THE VisionPOS SHALL mencatat nama file model, ukuran, dan waktu pemuatan ke log sistem
7. THE VisionPOS SHALL menampilkan informasi model yang sedang aktif (nama file, tanggal modifikasi) pada antarmuka admin

---

### Kebutuhan 9: Penanganan Kesalahan Kamera

**User Story:** Sebagai kasir, saya ingin sistem menangani gangguan kamera dengan baik, agar operasional tidak terhenti total saat kamera bermasalah.

#### Kriteria Penerimaan

1. WHEN kamera berhasil terhubung, THE VisionPOS SHALL menampilkan status kamera sebagai "Aktif" pada antarmuka kasir
2. IF kamera tidak terdeteksi saat aplikasi dijalankan, THEN THE VisionPOS SHALL menampilkan pesan kesalahan yang jelas dan tetap mengizinkan penggunaan fitur pencarian manual
3. IF koneksi kamera terputus saat transaksi berlangsung, THEN THE VisionPOS SHALL menampilkan peringatan, menghentikan deteksi otomatis, dan mempertahankan isi Keranjang yang sudah ada
4. WHEN kamera kembali terhubung setelah terputus, THE VisionPOS SHALL secara otomatis melanjutkan live feed dan deteksi tanpa perlu restart aplikasi
5. THE VisionPOS SHALL mendukung pemilihan sumber kamera (indeks kamera atau URL IP Camera) melalui pengaturan konfigurasi
6. IF frame yang diterima dari kamera rusak atau kosong, THEN THE Detektor SHALL melewati frame tersebut dan melanjutkan ke frame berikutnya

---

### Kebutuhan 10: Riwayat Transaksi & Pelaporan

**User Story:** Sebagai admin, saya ingin melihat riwayat dan laporan transaksi, agar saya dapat memantau kinerja penjualan dan mengaudit data.

#### Kriteria Penerimaan

1. THE VisionPOS SHALL menyimpan seluruh transaksi yang diselesaikan maupun dibatalkan ke Riwayat_Transaksi secara permanen
2. THE VisionPOS SHALL menyediakan antarmuka untuk menelusuri Riwayat_Transaksi dengan filter berdasarkan tanggal, kasir, dan status transaksi
3. WHEN admin memilih satu transaksi dari riwayat, THE VisionPOS SHALL menampilkan detail lengkap transaksi tersebut termasuk seluruh item dan metode pembayaran
4. THE VisionPOS SHALL menghasilkan laporan ringkasan harian yang mencakup total pendapatan, jumlah transaksi, dan item terlaris
5. THE VisionPOS SHALL mendukung ekspor Riwayat_Transaksi ke format CSV untuk periode yang dipilih
6. IF data Riwayat_Transaksi mengalami korupsi, THEN THE VisionPOS SHALL menampilkan pesan kesalahan dan mencegah penulisan data baru yang dapat memperparah kerusakan

---

### Kebutuhan 11: Konfigurasi Sistem

**User Story:** Sebagai admin, saya ingin mengonfigurasi parameter sistem, agar VisionPOS dapat disesuaikan dengan kebutuhan lingkungan operasional yang berbeda.

#### Kriteria Penerimaan

1. THE VisionPOS SHALL menyimpan seluruh konfigurasi sistem dalam file konfigurasi yang dapat diedit (format JSON atau YAML)
2. THE VisionPOS SHALL mendukung konfigurasi parameter berikut: path model YOLO, ambang batas Confidence_Score, indeks/URL kamera, jenis DB, dan batas stok minimum
3. WHEN konfigurasi diubah melalui antarmuka admin, THE VisionPOS SHALL menerapkan perubahan tanpa perlu restart aplikasi untuk parameter yang mendukungnya
4. IF file konfigurasi tidak ditemukan saat startup, THEN THE VisionPOS SHALL membuat file konfigurasi dengan nilai default dan menampilkan notifikasi kepada pengguna
5. IF nilai konfigurasi berada di luar rentang yang valid, THEN THE VisionPOS SHALL menolak perubahan dan menampilkan pesan kesalahan beserta rentang nilai yang diizinkan

---

### Kebutuhan 12: Modularitas & Arsitektur Sistem

**User Story:** Sebagai developer, saya ingin sistem dibangun secara modular, agar setiap komponen dapat dikembangkan, diuji, dan diganti secara independen.

#### Kriteria Penerimaan

1. THE VisionPOS SHALL memisahkan modul Computer Vision (Detektor) dari modul GUI dan DB melalui antarmuka yang terdefinisi dengan jelas
2. THE VisionPOS SHALL menggunakan pola arsitektur yang memungkinkan penggantian backend DB (SQLite ke MySQL) tanpa mengubah logika bisnis
3. THE Detektor SHALL berkomunikasi dengan modul lain hanya melalui antrian pesan (queue) atau callback yang terdefinisi, bukan akses langsung ke objek GUI
4. THE VisionPOS SHALL menyediakan log sistem yang mencatat event penting (startup, shutdown, error, pemuatan model, penyelesaian transaksi) ke file log

---

## Properti Kebenaran (Correctness Properties)

Bagian ini mendefinisikan properti yang harus diverifikasi melalui pengujian berbasis properti (property-based testing).

### P-01: Konsistensi Total Keranjang (Invariant)

Untuk setiap kondisi Keranjang, total yang ditampilkan harus selalu sama dengan penjumlahan (harga_satuan × kuantitas) untuk setiap item.

```
UNTUK SEMUA state Keranjang:
  keranjang.total == SUM(item.harga_satuan * item.kuantitas untuk setiap item di keranjang.items)
```

### P-02: Atomisitas Pemotongan Stok (Invariant)

Setelah transaksi diselesaikan, stok setiap item di Inventaris harus berkurang tepat sebesar kuantitas yang dibeli. Tidak boleh ada pemotongan parsial.

```
UNTUK SEMUA transaksi yang diselesaikan:
  stok_setelah[item] == stok_sebelum[item] - kuantitas_dibeli[item]
  (berlaku untuk SEMUA item dalam transaksi, atau TIDAK ADA yang berubah jika terjadi error)
```

### P-03: Round-Trip Serialisasi Struk (Round-Trip)

Data transaksi yang disimpan ke DB harus dapat dibaca kembali dan menghasilkan Struk yang identik.

```
UNTUK SEMUA transaksi t:
  baca_dari_db(simpan_ke_db(t)) == t
```

### P-04: Idempoten Deduplikasi Deteksi (Idempotence)

Menjalankan filter deduplikasi pada hasil deteksi yang sudah dideduplikasi harus menghasilkan output yang sama.

```
UNTUK SEMUA hasil_deteksi d:
  deduplikasi(deduplikasi(d)) == deduplikasi(d)
```

### P-05: Ambang Batas Confidence Score (Metamorphic)

Untuk setiap deteksi dengan Confidence_Score ≤ 0.70, jumlah item yang ditambahkan ke Keranjang harus nol.

```
UNTUK SEMUA deteksi d dengan d.confidence_score <= 0.70:
  items_ditambahkan(d) == []
```

### P-06: Konsistensi Pencarian Inventaris (Invariant)

Hasil pencarian harus selalu merupakan subset dari seluruh data Inventaris, dan setiap item dalam hasil harus mengandung teks pencarian.

```
UNTUK SEMUA query q dan hasil r = cari(q):
  r ⊆ inventaris.semua_barang
  DAN UNTUK SEMUA item i di r: mengandung(i.nama, q) ATAU mengandung(i.id, q)
```

### P-07: Integritas Riwayat Transaksi (Invariant)

Jumlah total transaksi yang tersimpan di Riwayat_Transaksi tidak boleh berkurang setelah operasi apapun (kecuali operasi hapus eksplisit oleh admin).

```
UNTUK SEMUA operasi o yang bukan operasi hapus eksplisit:
  len(riwayat_setelah_o) >= len(riwayat_sebelum_o)
```

### P-08: Keamanan Hash Kata Sandi (Round-Trip Negatif)

Kata sandi plaintext tidak boleh dapat dipulihkan dari hash yang tersimpan di DB.

```
UNTUK SEMUA kata_sandi p:
  hash(p) != p
  DAN tidak ada fungsi f sehingga f(hash(p)) == p
```
