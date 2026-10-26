# Ringkasan Audit Keamanan Pockito

**Tanggal pemeriksaan:** Oktober 2026  
**Cakupan:** pemeriksaan awal terhadap database Supabase dan beberapa skenario akses lintas akun.  
**Status:** pengujian yang tercantum di bawah menunjukkan hasil sesuai harapan; pemeriksaan ini bukan audit menyeluruh.

## Ringkasan

Pockito menggunakan Supabase Auth dan PostgreSQL Row Level Security (RLS) untuk membatasi akses data berdasarkan pengguna yang sedang login.

Pada saat pemeriksaan, lima tabel berikut ditemukan di schema `public`:

- `categories`
- `transactions`
- `wallets`
- `savings_targets`
- `savings_target_movements`

RLS aktif pada kelima tabel. Kebijakan yang diperiksa menggunakan identitas pengguna dari `auth.uid()` pada ekspresi `USING` dan `WITH CHECK`.

## Pemeriksaan yang dilakukan

| Pemeriksaan | Hasil yang diamati |
| --- | --- |
| RLS pada lima tabel | Aktif pada seluruh tabel yang diperiksa |
| Kebijakan pemilik data | Kelima tabel memiliki kebijakan berbasis pengguna login |
| SELECT lintas akun | Baris milik akun lain tidak dikembalikan pada tabel yang diuji |
| INSERT transaksi dengan ID pemilik lain | Ditolak dengan HTTP 403 / PostgreSQL `42501` |
| INSERT pergerakan target dengan ID pemilik lain | Ditolak dengan HTTP 403 / PostgreSQL `42501` |
| UPDATE transaksi milik akun lain | Tidak ada baris yang terubah pada skenario yang diuji |
| Mengubah `user_id` transaksi sendiri menjadi ID akun lain | Ditolak dengan HTTP 403 / PostgreSQL `42501` |
| Relasi transaksi–kategori | Diperkuat dengan composite foreign key untuk konsistensi ID kategori dan pemilik |
| Hak akses tabel langsung | `authenticated` memiliki CRUD yang diperlukan; `anon` tidak tercantum memiliki hak CRUD langsung pada lima tabel |
| View dan function/procedure pada schema `public` | Tidak ditemukan pada query metadata yang dijalankan |
| Pembersihan data uji | Tujuh baris uji yang diinventarisasi telah dihapus dan diverifikasi tidak tersisa |

HTTP 200 dengan nol baris pada permintaan UPDATE/DELETE tidak berarti operasi mengubah data; untuk tes tersebut, hasil yang diamati adalah tidak ada baris yang cocok atau terpengaruh. Penolakan eksplisit RLS dibedakan dari hasil foreign key.

## Batasan pemeriksaan

Hasil ini hanya berlaku untuk skenario dan konfigurasi yang diperiksa pada saat audit. Pemeriksaan ini **tidak** mencakup seluruh hal berikut:

- audit kode aplikasi secara menyeluruh;
- seluruh kemungkinan manipulasi API, kolom, dan relasi pada semua operasi;
- konfigurasi lengkap Supabase Auth, email, redirect, dan pemulihan akun;
- Supabase Storage, bucket, atau kebijakan file;
- semua role istimewa, secret, konfigurasi project, dan endpoint eksternal;
- pengujian penetrasi independen atau sertifikasi keamanan.

`FORCE ROW LEVEL SECURITY = false` ditemukan pada kelima tabel. Ini tidak otomatis merupakan kerentanan: pemilik tabel dan role istimewa memiliki perilaku khusus terhadap RLS. Akses administratif dan kredensial dengan hak istimewa tetap harus dijaga dengan baik.

## Prinsip keamanan yang perlu dipertahankan

1. Jangan pernah menaruh Supabase `service_role` key atau secret key di frontend, GitHub Pages, atau repository publik.
2. Gunakan publishable key hanya untuk aplikasi client-side; jangan mengandalkannya sebagai pengganti RLS.
3. Setiap tabel yang menyimpan data pengguna harus memiliki kebijakan akses yang sesuai.
4. Saat menambah tabel, view, function, Storage bucket, atau endpoint baru, audit konfigurasi aksesnya sebelum digunakan.
5. Uji perubahan kebijakan dengan akun terpisah dan data uji yang dapat dikenali; jangan gunakan data keuangan nyata untuk tes destruktif.
6. Setelah pengujian, verifikasi pembersihan data uji dan catat hasilnya.
7. Jangan membagikan password, access token, refresh token, secret key, atau data keuangan pribadi dalam issue maupun log publik.

## Kesimpulan

Pengujian awal mendukung kesimpulan bahwa kebijakan RLS pada lima tabel inti menolak beberapa upaya akses dan perubahan lintas akun yang diuji. Pockito tetap memerlukan pemeriksaan lanjutan saat fitur dan konfigurasi bertambah. Dokumen ini adalah catatan audit internal proyek, bukan jaminan bahwa aplikasi bebas dari seluruh kerentanan.
