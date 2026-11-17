# Maintenance & Asset Management

Rancangan poin 13 dari [dokumen utama](smart_school_management_ecosystem.md). Lokasi gedung/ruang berasal dari [administrasi](school_administration_management.md). Ruang yang ditutup karena kerusakan harus tersambung ke [fasilitas](facility_campus_management.md).

## Cakupan dan pengguna

Modul mengelola inventaris aset, perpindahan, laporan kerusakan, tiket, penugasan teknisi, pekerjaan, pemeliharaan preventif, dan laporan kondisi. Pelapor mengirim tiket; koordinator melakukan triase; teknisi menangani pekerjaan; admin aset mengelola inventaris; manajemen melihat agregat. Akses dibatasi gedung, unit, atau penugasan.

## Aturan bisnis

- Aset memiliki tag unik, kategori, merek/serial bila ada, lokasi, penanggung jawab, kondisi, status, garansi, dan dokumen. Pindah lokasi/penanggung jawab membuat riwayat.
- Tiket boleh dibuat tanpa nomor aset, tetapi wajib lokasi dan deskripsi. Foto opsional. Duplikat potensial ditampilkan untuk ditautkan.
- Status tiket: diajukan, ditriase, ditugaskan, dikerjakan, menunggu material, selesai, diverifikasi, dibuka kembali. Prioritas ditentukan petugas menurut dampak/risiko.
- Work order menyimpan teknisi, jadwal, diagnosis, tindakan, checklist, material, biaya referensi, dan hasil. Penggantian teknisi tercatat.
- Perbaikan yang membahayakan penggunaan ruang membuat blok fasilitas. Pembukaan kembali memerlukan verifikasi.
- Rencana preventif berversi menghasilkan tugas berkala; penundaan memiliki alasan. Aset yang dilepas/hilang tetap memiliki riwayat.

## Alur utama

Pengguna melapor → koordinator menilai/mengaitkan aset → teknisi mencatat pekerjaan → koordinator atau pelapor memverifikasi → tiket selesai atau dibuka kembali. Dashboard menampilkan tiket menurut prioritas/umur, pekerjaan terlambat, ruang ditutup, aset tak terlacak, dan kerusakan berulang.

## Model data

| Entitas | Data penting | Constraint |
| --- | --- | --- |
| `Asset` | tag, kategori, lokasi, kondisi, status | Tag unik |
| `AssetMovement` | from/to, tanggal, persetujuan | Riwayat immutable |
| `MaintenanceTicket`, `TicketEvent` | pelapor, lokasi, prioritas, status | Nomor unik; timeline |
| `WorkOrder` | assignee, jadwal, diagnosis, hasil | Penugasan terlacak |
| `MaintenancePlanVersion` | interval, checklist | Aturan berversi |
| `MaterialUsage` | item, jumlah, costRef | Biaya sumber terpisah |

UUID, UTC, indeks tag, lokasi, prioritas/status, teknisi, dan tenggat. Perubahan blok ruang memakai transaksi atau outbox idempoten.

## UI, URL, dan API

Halaman: `/maintenance/dashboard`, `/maintenance/assets?buildingId=&status=`, `/maintenance/assets/[assetId]`, `/maintenance/tickets?status=open`, `/maintenance/tickets/[ticketId]`, `/technician/work-orders/[orderId]`. Filter/pagination di URL; detail tiket dapat memakai modal Intercepting/Parallel Routes dan halaman penuh saat direct link/refresh.

Endpoint: `GET/POST /api/v1/assets`, `POST /api/v1/assets/:id/movements`, `GET/POST /api/v1/maintenance/tickets`, `POST /api/v1/maintenance/tickets/:id/assignments`, `POST /api/v1/maintenance/work-orders/:id/events`. NestJS memvalidasi DTO, scope, versi, audit, dan memberi `requestId`.

Next.js App Router + TypeScript, Tailwind CSS + shadcn/ui, TanStack Table, Agentation. Alur foto/lokasi pada mobile, loading, kosong, error, serta keyboard perlu diuji.

## Kriteria penerimaan dan keputusan terbuka

Tag unik dan perpindahan historis; tiket tanpa aset tetap bisa dibuat; teknisi hanya mengubah pekerjaan yang ditugaskan; ruang berisiko tidak bisa dipesan; detail URL dan Back/Forward benar. Putuskan granularitas aset, kategori prioritas, SLA, verifikasi hasil, material/biaya, dan integrasi pengadaan.
