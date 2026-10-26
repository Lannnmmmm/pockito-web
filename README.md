# Pockito 🐻

**Catatan kecil, keuangan terkendali.**

Pockito adalah aplikasi pencatatan keuangan pribadi berbasis web untuk membantu pengguna mencatat pemasukan dan pengeluaran, memantau saldo, memahami pola keuangan bulanan, serta mengelola target tabungan.

- **Aplikasi:** https://lannnmmmm.github.io/pockito-web/
- **Repository:** https://github.com/Lannnmmmm/pockito-web
- **Bahasa antarmuka:** Bahasa Indonesia
- **Status:** Aktif dikembangkan

> Pockito masih terus dikembangkan. Susunan fitur dan antarmuka dapat berubah seiring pembaruan.

## Fitur

### Akun dan akses
- Daftar dan masuk menggunakan email dan password.
- Verifikasi email serta fitur kirim ulang email verifikasi.
- Pemulihan dan penggantian password.
- Data keuangan dibatasi berdasarkan akun pengguna melalui Row Level Security (RLS) di Supabase.

### Ringkasan keuangan
- Melihat saldo saat ini.
- Melihat total pemasukan dan pengeluaran bulan berjalan.
- Melihat transaksi terbaru.
- Melihat saldo per dompet jika dompet digunakan.

### Transaksi
- Mencatat pemasukan dan pengeluaran.
- Menentukan tanggal dan waktu transaksi.
- Memilih kategori serta dompet (opsional).
- Menambahkan keterangan transaksi.
- Melihat riwayat berdasarkan bulan dan ringkasan periode.

### Laporan
- Ringkasan pemasukan, pengeluaran, dan selisih per bulan.
- Persentase pemasukan yang telah digunakan.
- Rincian pemasukan dan pengeluaran berdasarkan kategori.

### Target tabungan
- Membuat target dengan nama, nominal opsional, dan ikon.
- Memisahkan dana target dari saldo yang tersedia sesuai mekanisme aplikasi.
- Melihat target aktif dan riwayat target selesai.
- Menyimpan riwayat pergerakan serta biaya aktual pada target selesai.
- Mengarsipkan target yang dilepas melalui bagian **Mimpi yang Terkubur**.

### Dompet dan kategori
- Membuat dompet opsional, misalnya rekening bank atau uang tunai.
- Menyesuaikan ikon dan warna identitas dompet.
- Membuat kategori pemasukan maupun pengeluaran sesuai kebutuhan.
- Tetap dapat mencatat transaksi tanpa membuat dompet.

### Preferensi tampilan
- Mode terang dan gelap.
- Tata letak responsif untuk layar desktop dan ponsel.

## Teknologi

- HTML, CSS, dan JavaScript ES modules.
- [Supabase](https://supabase.com/) untuk autentikasi dan database PostgreSQL.
- Supabase JavaScript client v2 yang dimuat melalui `esm.sh`.
- [GitHub Pages](https://pages.github.com/) untuk hosting statis.

Pockito saat ini tidak memerlukan proses bundling atau build frontend: halaman memuat `app.js` sebagai modul JavaScript dan `style.css` secara langsung.

## Struktur utama

```text
pockito-web/
├── index.html       # Struktur halaman dan komponen UI
├── style.css        # Gaya, tema, dan layout responsif
├── app.js           # Logika aplikasi dan integrasi Supabase
├── config.js        # URL project dan publishable key Supabase
├── README.md        # Dokumentasi utama repository
└── docs/
    ├── SECURITY.md  # Ringkasan audit keamanan awal
    └── ROADMAP.md   # Arah pengembangan
```

## Menjalankan secara lokal

1. Clone repository:
   ```bash
   git clone https://github.com/Lannnmmmm/pockito-web.git
   cd pockito-web
   ```
2. Buka project menggunakan local static server, atau gunakan editor yang menyediakan preview lokal. Karena aplikasi menggunakan JavaScript modules dan impor Supabase, hindari membuka `index.html` melalui skema `file://`.
3. Pastikan `config.js` berisi URL project Supabase dan **publishable key** yang sesuai.
4. Atur URL situs dan redirect yang diizinkan pada konfigurasi Supabase Auth agar sesuai dengan alamat lokal dan alamat GitHub Pages yang digunakan.
5. Buka aplikasi melalui alamat local server.

### Konfigurasi Supabase

Aplikasi menggunakan nilai berikut dari `config.js`:

- `SUPABASE_URL`: URL project Supabase.
- `SUPABASE_PUBLISHABLE_KEY`: publishable key untuk client-side application.

**Jangan pernah memasukkan `service_role` key, secret key, password database, access token, atau kredensial privat ke dalam kode frontend atau repository.** Publishable key memang digunakan di browser; keamanan data harus ditegakkan melalui kebijakan database dan konfigurasi Supabase yang benar.

## Database dan keamanan

Aplikasi menggunakan tabel berikut pada schema `public`:

- `categories`
- `transactions`
- `wallets`
- `savings_targets`
- `savings_target_movements`

RLS diaktifkan pada kelima tabel tersebut. Kebijakan yang diperiksa membatasi baris berdasarkan `auth.uid()`. Relasi transaksi–kategori juga menggunakan composite foreign key untuk menjaga konsistensi pemilik.

Audit awal yang dilakukan pada Oktober 2026 mencakup pemeriksaan kebijakan RLS, hak akses tabel, pembacaan lintas akun, beberapa percobaan INSERT lintas akun, percobaan mengubah kepemilikan transaksi, dan pemeriksaan metadata view/function pada schema `public`. Pengujian yang dilakukan menunjukkan operasi lintas akun yang diuji ditolak sesuai harapan. Data uji audit kemudian dibersihkan dan diverifikasi.

**Catatan:** ini bukan audit keamanan menyeluruh atau sertifikasi keamanan. Lihat [ringkasan audit keamanan](docs/SECURITY.md) untuk cakupan dan batasan pengujian.

## Dokumentasi

- [Ringkasan audit keamanan](docs/SECURITY.md)
- [Roadmap pengembangan](docs/ROADMAP.md)

## Pengembangan berikutnya

Pockito akan terus disempurnakan berdasarkan penggunaan nyata, terutama pada:
- perbaikan UI/UX dashboard dan formulir transaksi;
- peningkatan pengalaman penggunaan di ponsel;
- penyempurnaan laporan dan analitik;
- pengembangan fitur berdasarkan kebutuhan pengguna.

Daftar rencana bukan janji bahwa seluruh fitur tersebut sudah tersedia. Lihat [roadmap](docs/ROADMAP.md) untuk pemisahan antara fitur yang sudah ada dan rencana berikutnya.

## Kontribusi dan masukan

Masukan, laporan bug, dan usulan fitur sangat membantu. Silakan buka [GitHub Issues](https://github.com/Lannnmmmm/pockito-web/issues) dengan menjelaskan masalah, langkah untuk mereproduksi, serta hasil yang diharapkan. Jangan sertakan password, token, data keuangan pribadi, atau informasi sensitif.

---

Dibuat dan dikembangkan sebagai proyek aplikasi keuangan pribadi.
