# Canteen & School Services

Rancangan poin 15 dari [dokumen utama](smart_school_management_ecosystem.md). Identitas dari [administrasi](school_administration_management.md); transaksi pembayaran dari [keuangan](finance_payment_management.md).

## Cakupan dan pengguna

Modul mencakup tenant kantin, menu/harga, ketersediaan, transaksi atau pesanan bila diperlukan, serta katalog layanan siswa nonakademik. Admin layanan menyetujui tenant/menu; tenant mengelola menu sendiri; kasir menangani transaksi; siswa/wali melihat informasi miliknya; petugas layanan menyelesaikan permintaan. Tenant tidak memiliki akses luas ke profil siswa.

## Aturan bisnis

- Tenant memiliki lokasi kios, kontak kerja, masa kerja sama, status, dan dokumen yang perlu.
- Menu memuat nama, kategori, deskripsi, harga berversi, ketersediaan, serta informasi bahan/alergen jika sekolah menetapkan. Transaksi menyimpan snapshot harga saat membeli.
- MVP dapat berupa katalog menu dan pengumuman. Pemesanan penuh memerlukan state keranjang → konfirmasi → bayar → siapkan → ambil/batal, stok yang dikelola nyata, refund, dan rekonsiliasi.
- Dompet siswa tidak dibuat tanpa keputusan saldo, top-up, refund, hak wali, dan pengelola dana. Data kartu tidak disimpan.
- Katalog layanan berisi jenis permintaan, pemilik unit, jam, formulir, target respons, status, dan riwayat. Laporan keselamatan/konseling tidak masuk antrean layanan umum.

## Alur utama

Tenant memperbarui menu → admin menerbitkan → siswa melihat menu yang tersedia. Bila pesanan aktif, server mengunci harga/ketersediaan dan mencegah duplikasi retry. Permintaan layanan: siswa mengajukan → petugas meninjau → meminta informasi/menyelesaikan → siswa melihat status dan hasil.

## Model data

| Entitas | Data penting | Constraint |
| --- | --- | --- |
| `CanteenTenant` | lokasi, kontak, periode, status | Akses berbatas waktu |
| `MenuItem`, `MenuPriceVersion` | nama, kategori, harga, tersedia | Harga historis |
| `CanteenOrder`, `OrderLine` | pelanggan, harga snapshot, status | Opsional, idempoten |
| `CanteenPaymentRef` | orderId, financeRef, status | Uang di modul keuangan |
| `ServiceType` | unit, jam, formulir, target | Versi |
| `ServiceRequest`, `ServiceEvent` | pemohon, status, petugas, waktu | Timeline |

UUID, UTC, indeks tenant/menu/status serta layanan/petugas. Data pembelian dibatasi retensi.

## UI, URL, dan API

Halaman: `/canteen/menu?tenant=&category=`, `/canteen/tenants/[tenantId]`, `/canteen/orders/[orderId]`, `/student/services`, `/student/services/requests/[requestId]`, `/operations/services?status=pending`. Filter di URL; detail ringan dapat memakai modal Intercepting/Parallel Routes dengan halaman penuh pada direct link/refresh dan Back/Forward benar.

Endpoint: `GET /api/v1/canteen/menu`, `POST /api/v1/canteen/menu-items`, `POST /api/v1/canteen/menu-items/:id/publish`, `POST /api/v1/canteen/orders` (opsional), `GET/POST /api/v1/service-requests`, `POST /api/v1/service-requests/:id/events`. NestJS memeriksa tenant ownership, DTO, idempotensi, dan scope.

Next.js App Router + TypeScript, Tailwind CSS + shadcn/ui, TanStack Table untuk pengelolaan, Agentation untuk inspeksi. Harga/status tersedia memakai teks; loading, kosong, error, mobile, dan keyboard diuji.

## Kriteria penerimaan dan keputusan terbuka

Tenant hanya mengubah menu sendiri; harga transaksi historis tetap; pesanan retry tidak ganda; siswa hanya membaca pesanan/permintaan sendiri; kanal sensitif terpisah; deep link benar. Putuskan apakah cukup katalog atau perlu order, metode bayar, stok, alergen, tenant eksternal, refund, dan jenis layanan.
