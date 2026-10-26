# Cicilan & Kredit Pockito

Status: **fondasi database dirancang; belum aktif digunakan aplikasi**.

UI awal sudah tersedia pada menu **Kredit**, tetapi penyimpanan dan pembayaran sengaja belum diaktifkan. Migration ini menambahkan struktur database dan kebijakan RLS saja; migration ini tidak mengubah saldo, transaksi, atau dompet yang sudah ada.

## Berkas migration

- [Migration SQL](../supabase/migrations/20261026_credit_and_installments.sql)

## Cara menerapkan

1. Buka dashboard project Supabase Pockito.
2. Pilih **SQL Editor** dan buat query baru.
3. Buka berkas migration SQL di repository, salin seluruh isinya ke SQL Editor.
4. Tinjau SQL dan jalankan pada project yang benar.
5. Verifikasi keenam tabel baru tersedia dan RLS aktif sebelum mengaktifkan fitur di frontend.

Jangan menaruh service-role key atau kredensial database di frontend atau repository. Jangan menjalankan migration pada project produksi yang salah.

## Struktur tabel

| Tabel | Fungsi |
| --- | --- |
| `credit_accounts` | Fasilitas kartu kredit, PayLater, dan pinjaman |
| `credit_plans` | Pembelian/pinjaman yang mempunyai jadwal cicilan |
| `credit_installments` | Nominal pokok, bunga, biaya, dan status per periode |
| `credit_bills` | Tagihan per periode, termasuk tagihan kartu kredit gabungan |
| `credit_payments` | Pembayaran aktual, dompet sumber, dan pemecahan pokok/bunga/biaya |
| `credit_payment_allocations` | Alokasi satu pembayaran ke tagihan atau cicilan |

Setiap tabel mempunyai `user_id`, RLS owner-only, dan foreign key komposit untuk mencegah relasi silang pemilik pada akun, dompet, transaksi, tagihan, dan cicilan.

## Aturan anti-pengeluaran-ganda

1. Pembelian kredit dicatat satu kali sebagai pengeluaran pada transaksi pembelian.
2. Pokok yang dibayar tidak menjadi pengeluaran kedua. Pokok pembayaran harus mengurangi saldo dompet melalui ledger pembayaran kredit, dan mengurangi kewajiban.
3. Bunga dan biaya yang dibayar dicatat sebagai pengeluaran pada transaksi Pockito yang terhubung dengan pembayaran. Agar saldo dompet tidak berkurang dua kali, integrasi harus mengurangi saldo dari pembayaran kredit sebesar **pokok saja**, sedangkan bunga/biaya mengurangi saldo melalui transaksi pengeluaran.
4. Pembayaran dan alokasinya harus dibuat atomik melalui PostgreSQL function/RPC sebelum tombol pembayaran diaktifkan.
5. Jangan menampilkan saldo/limit sebagai nilai pasti sampai definisi saldo berjalan dan tagihan diterbitkan disepakati; limit kredit tidak selalu tersedia.

## Tahap berikutnya

- Terapkan migration dan verifikasi schema/RLS.
- Tambahkan pembacaan dan pembuatan akun kredit pada UI.
- Tambahkan pencatatan pembelian/cicilan dan pembentukan jadwal.
- Buat RPC transaksional untuk pembayaran dan alokasi; jangan membuat pembayaran dengan beberapa request browser yang dapat gagal di tengah.
- Integrasikan saldo dompet dengan pembayaran pokok tanpa memasukkan pokok sebagai pengeluaran.
- Uji akses lintas akun dan skenario bunga, pembayaran sebagian, refund, dan tagihan gabungan.

## Batasan

Migration ini menyiapkan struktur data. Ia belum membuat jadwal cicilan otomatis, belum mengubah saldo dompet, belum mencatat transaksi pembayaran secara otomatis, dan belum mengaktifkan operasi CRUD dari UI. Jangan anggap fitur kredit siap digunakan hanya karena tabel berhasil dibuat.
