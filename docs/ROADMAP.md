# Roadmap Pockito 🐻

Dokumen ini memisahkan kemampuan yang sudah tersedia dari ide pengembangan. Roadmap dapat berubah berdasarkan kebutuhan penggunaan dan hasil pengujian.

## Sudah tersedia

### Akun
- [x] Daftar dan masuk menggunakan email/password
- [x] Alur verifikasi email dan kirim ulang verifikasi
- [x] Lupa password dan pemulihan password

### Pencatatan keuangan
- [x] Catat pemasukan dan pengeluaran
- [x] Pilih tanggal dan waktu transaksi
- [x] Kategori transaksi
- [x] Keterangan transaksi
- [x] Riwayat transaksi berdasarkan bulan
- [x] Ringkasan saldo, pemasukan, dan pengeluaran
- [x] Laporan bulanan dan rincian kategori

### Pengelolaan uang
- [x] Dompet opsional dengan identitas visual
- [x] Kategori pemasukan dan pengeluaran yang dapat dikelola
- [x] Target tabungan
- [x] Riwayat target selesai dan target yang dilepas
- [x] Preferensi tema terang/gelap

### Fondasi
- [x] Hosting statis melalui GitHub Pages
- [x] Supabase Auth dan PostgreSQL
- [x] RLS aktif pada lima tabel inti
- [x] Pemeriksaan awal akses lintas akun dan pembersihan data uji

### Cicilan & Kredit — tahap awal
- [x] Menambahkan wireframe UI empat halaman kredit
- [x] Menyiapkan migration database dan RLS untuk akun, jadwal, tagihan, dan pembayaran
- [x] Hubungkan daftar/formulir akun kredit ke database
- [x] Formulir cicilan baru dan cicilan yang sudah berjalan
- [x] Jadwal bulanan dengan pembagian pokok, bunga, dan biaya
- [x] RPC pembuatan jadwal dan pembayaran atomik
- [x] Integrasi saldo dompet: pokok bukan pengeluaran kedua; bunga/biaya menjadi pengeluaran
- [ ] Jalankan migration RPC terbaru di Supabase dan uji end-to-end

## Prioritas pengembangan berikutnya

### 1. Penyempurnaan UI/UX
- [ ] Menata ulang dashboard agar ringkasan utama lebih mudah dipindai
- [ ] Memperhalus formulir transaksi dan tata letak input
- [ ] Memeriksa konsistensi tema terang dan gelap
- [ ] Menguji ulang tampilan dan alur penggunaan di layar ponsel

### 2. Analitik dan riwayat
- [ ] Meninjau kejelasan visual laporan bulanan
- [ ] Memperbaiki navigasi periode dan keterbacaan rincian kategori
- [ ] Memastikan kondisi tanpa data dan pesan error mudah dipahami

### 3. Keandalan dan keamanan
- [ ] Meninjau alur Auth, verifikasi email, reset password, dan URL redirect
- [ ] Menambahkan checklist pengujian regresi untuk fitur inti
- [ ] Memperbarui dokumentasi saat skema database atau kebijakan akses berubah

## Cara mengusulkan fitur

Buka [GitHub Issues](https://github.com/Lannnmmmm/pockito-web/issues) dan sertakan:
- masalah atau kebutuhan yang ingin diselesaikan;
- contoh alur penggunaan;
- hasil yang diharapkan;
- jika melaporkan bug, langkah untuk mereproduksi masalah.

Jangan sertakan kredensial, token, atau data keuangan pribadi dalam issue publik.

> Item yang belum dicentang adalah rencana, bukan fitur yang sudah tersedia atau janji jadwal rilis.
