# Library & Learning Resource Management

Rancangan poin 11 dari [dokumen utama](smart_school_management_ecosystem.md). Identitas peminjam berasal dari [administrasi](school_administration_management.md); pembayaran denda, jika berlaku, melalui [keuangan](finance_payment_management.md).

## Cakupan dan pengguna

Perpustakaan mengelola katalog buku/materi digital, eksemplar fisik, peminjaman, pengembalian, perpanjangan, reservasi, denda, dan laporan. Pustakawan mengelola koleksi serta transaksi; siswa/pegawai mencari dan melihat pinjaman sendiri; guru dapat menautkan sumber ke kelas; admin keuangan menangani penerimaan denda. Semua akses dibatasi sekolah/perpustakaan, identitas peminjam, dan penugasan.

## Aturan bisnis

- Satu judul dapat memiliki banyak eksemplar dengan barcode unik, lokasi rak/gedung, kondisi, dan status masing-masing. Judul dan eksemplar tidak dihapus ketika pernah dipinjam.
- Kebijakan pinjam berversi mengatur kuota, lama pinjam, perpanjangan, denda, dan pengecualian hari libur. Aturan yang berlaku saat transaksi disimpan agar hasil historis dapat dijelaskan.
- Checkout memeriksa status peminjam, kuota, reservasi, dan ketersediaan eksemplar dalam satu transaksi. Satu eksemplar tidak boleh memiliki dua pinjaman aktif.
- Pengembalian mencatat waktu dan kondisi. Kerusakan/hilang ditangani sebagai kejadian terpisah. Perpanjangan ditolak jika ada antrean reservasi sesuai kebijakan.
- Reservasi mempunyai urutan, batas waktu pengambilan, pembatalan, dan kedaluwarsa. Retry notifikasi tidak mengubah antrean.
- Materi digital memiliki hak distribusi, audiens, versi, dan file privat/tautan berizin. Unduhan diperiksa backend.

## Alur utama

Pustakawan membuat judul dan eksemplar → peminjam mencari ketersediaan → petugas memindai kartu/eksemplar → sistem mencatat jatuh tempo → pengembalian memperbarui kondisi, denda, dan reservasi. Koreksi transaksi mencatat alasan/aktor tanpa menghapus event lama.

## Model data

| Entitas | Data penting | Constraint |
| --- | --- | --- |
| `CatalogItem` | judul, penulis, ISBN, kategori, status | ISBN diperiksa duplikat |
| `BookCopy` | itemId, barcode, rak, kondisi | Barcode unik |
| `Loan`, `LoanEvent` | copyId, borrowerId, dueAt, returnedAt | Satu pinjaman aktif/copy |
| `Reservation` | itemId, patronId, queueAt, expiresAt | Antrean konsisten |
| `LoanPolicyVersion` | kuota, durasi, denda | Versi terbit immutable |
| `Fine` | loanId, nominal, status, financeRef | Koreksi terlacak |
| `DigitalResource` | fileRef, rights, audience | Akses privat |

UUID, waktu UTC, dan indeks barcode, judul, status, peminjam, jatuh tempo. Transaksi checkout/return memakai version check.

## UI, URL, dan API

Halaman: `/library/catalog?q=&category=&page=`, `/library/items/[itemId]`, `/library/loans?status=overdue`, `/library/reservations`, `/student/library/loans`, `/library/reports`. Dynamic Routes untuk detail; filter/pagination di URL. Detail dari daftar dapat memakai Intercepting/Parallel Routes sebagai modal; URL langsung/refresh menjadi halaman penuh dan Back/Forward memulihkan modal.

Endpoint NestJS: `GET/POST /api/v1/library/items`, `POST /api/v1/library/copies`, `POST /api/v1/library/loans`, `POST /api/v1/library/loans/:id/returns`, `POST /api/v1/library/reservations`, `GET /api/v1/library/me/loans`. DTO, izin/scope, pagination, idempotensi, dan format kesalahan konsisten wajib.

Next.js App Router + TypeScript, Tailwind CSS + shadcn/ui, TanStack Table untuk katalog/sirkulasi, Agentation untuk inspeksi. Tampilkan loading, kosong, error, status pinjam, dan akses keyboard/mobile.

## Kriteria penerimaan dan keputusan terbuka

Eksemplar tidak dapat dipinjam ganda; kuota/reservasi/perpanjangan mengikuti aturan; pengguna hanya melihat transaksi sendiri; denda dapat diaudit; deep link/refresh/Back/Forward benar. Sekolah perlu memutuskan jenis koleksi, kuota, denda, hak materi digital, lokasi rak, dan integrasi pembayaran.
