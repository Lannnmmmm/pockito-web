# Cicilan & Kredit Pockito

Status: **UI jadwal cicilan dan pembayaran sudah diimplementasikan; RPC baru aktif setelah migration terbaru dijalankan**.

Akun kredit disimpan melalui UI. Jadwal baru bisa dibuat dari tab **Cicilan**, termasuk cicilan lama dengan jumlah angsuran terdahulu yang sudah dibayar. Migration tambahan membuat jadwal dan pembayaran melalui fungsi PostgreSQL atomik.

## Berkas migration

- [Migration fondasi](../supabase/migrations/20261026_credit_and_installments.sql)
- [Migration jadwal dan pembayaran atomik](../supabase/migrations/20261027_credit_plans_and_atomic_payments.sql)

## Cara menerapkan

1. Buka dashboard project Supabase Pockito.
2. Pilih **SQL Editor** dan buat query baru.
3. Buka berkas migration SQL di repository, salin seluruh isinya ke SQL Editor.
4. Tinjau dan jalankan migration fondasi terlebih dahulu jika belum pernah dijalankan.
5. Jalankan migration jadwal dan pembayaran atomik di project yang sama.
6. Verifikasi keenam tabel baru tersedia, RLS aktif, dan dua fungsi RPC tersedia sebelum mencoba membuat jadwal atau mencatat pembayaran.

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

## Perilaku UI saat ini

- Form cicilan menerima akun, nama pembelian, pokok, tenor, total bunga/biaya, tanggal pembelian, dan jatuh tempo pertama.
- Pembelian dapat dicatat sebagai transaksi pengeluaran baru, ditautkan ke transaksi pengeluaran yang sudah ada dengan nominal sama, atau tidak dicatat ulang.
- Untuk cicilan lama, isi jumlah angsuran yang telah dibayar. Angsuran tersebut ditandai lunas sebagai saldo awal; aplikasi tidak membuat ulang transaksi pembayaran historis.
- Jadwal dibuat per bulan dengan pembagian pokok, bunga, dan biaya dalam satuan sen; selisih pembulatan dibagikan ke angsuran awal.
- Pembayaran aktual dapat parsial: masukkan pemecahan pokok, bunga, dan biaya. RPC memvalidasi sisa tiap komponen, lalu membuat pembayaran, alokasi, pembaruan status, dan transaksi bunga/biaya dalam satu transaksi database.
- Saldo dompet dikurangi sebesar pokok dari ledger pembayaran kredit dan sebesar bunga/biaya dari transaksi pengeluaran. Pokok tidak menjadi pengeluaran kedua.

## Batasan dan pengujian

- Angsuran historis yang ditandai lunas tidak menghasilkan catatan pembayaran atau perubahan saldo dompet baru. Jika pembayaran lama belum pernah dicatat di Pockito, saldo historis tersebut tidak otomatis direkonstruksi.
- Bunga dan biaya total dibagi rata sebagai jadwal estimasi; tagihan aktual yang berbeda harus dikoreksi sesuai bukti dari penyedia kredit sebelum pembayaran dicatat.
- Migration baru harus dijalankan di Supabase sebelum tombol pembuatan jadwal/pembayaran berfungsi.
- Uji akses lintas akun, pembayaran sebagian, saldo dompet, dan laporan pengeluaran sebelum mengandalkan angka untuk rekonsiliasi.

## Batasan

Migration ini menyiapkan struktur data. Ia belum membuat jadwal cicilan otomatis, belum mengubah saldo dompet, belum mencatat transaksi pembayaran secara otomatis, dan belum mengaktifkan operasi CRUD dari UI. Jangan anggap fitur kredit siap digunakan hanya karena tabel berhasil dibuat.
