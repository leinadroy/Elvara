# Windows Utility & School IT Management

Rancangan poin 19 dari [dokumen utama](smart_school_management_ecosystem.md). Modul ini membantu tim IT memantau dan merawat PC Windows, perangkat lab, jaringan, penyimpanan, serta transfer file lokal. Modul ini berbeda dari portal sekolah yang berjalan di browser: fungsi perangkat memerlukan **agen Windows yang dipasang secara sadar** dan izin sistem operasi yang sesuai.

## Tujuan, batas, dan tahapan

Mulai dari inventaris serta telemetri baca saja: nama perangkat, pemilik/lokasi, CPU/memori/disk, kesehatan jaringan, status agen, dan kejadian error yang relevan. Tindakan seperti menghentikan proses, restart, instalasi, atau transfer file adalah tahap lanjut setelah kebijakan otorisasi, uji keamanan, dan persetujuan operator. Sistem tidak memantau aktivitas pribadi siswa/guru di luar tujuan operasional yang dinyatakan.

## Peran dan akses

Teknisi melihat perangkat yang ditugaskan dan membuat diagnosis; admin IT mengatur kebijakan agen serta tugas remote; kepala lab melihat status perangkat lab tanpa akses tindakan berisiko; manajemen melihat agregat; pengguna perangkat melihat pemberitahuan perawatan yang relevan. Izin dipisah: `device.read`, `telemetry.read`, `process.inspect`, `device.action.request`, `device.action.approve`, `file-transfer.manage`, `it.audit.read`. Tindakan berisiko memerlukan alasan, scope perangkat, masa berlaku, dan sering kali persetujuan kedua.

## Inventaris dan monitoring

`ManagedDevice` menyimpan ID unik, jenis, serial/assetRef, OS, lokasi gedung/lab, penanggung jawab, status, serta tanggal agen terakhir terlihat. Agen mengirim ringkasan resource dengan frekuensi dan retensi yang ditetapkan. Monitoring jaringan memeriksa konektivitas/latensi ke endpoint sekolah tanpa merekam isi komunikasi. Dashboard membedakan perangkat offline, agen gagal, disk hampir penuh, dan masalah jaringan. Data yang terlambat diberi timestamp; jangan menyebut perangkat sehat dari telemetri usang.

Proses background ditampilkan hanya jika diperlukan untuk diagnosis, dengan nama, resource, dan waktu. Perintah remote tidak dijalankan langsung dari klik tabel; operator melihat target, dampak, alasan, persetujuan, dan hasil. Tiap perintah memiliki ID, timeout, status, output terbatas, serta audit. Daftar perintah yang diperbolehkan disusun eksplisit, bukan shell bebas.

## File transfer dan lab komputer

Transfer lokal memakai sumber/tujuan yang terdaftar, batas ukuran/jenis, pemindaian keamanan, hash integritas, masa berlaku, dan log pengiriman. Folder pribadi pengguna tidak dipindai atau disalin tanpa mandat. Untuk lab, kelompok perangkat dapat menerima kebijakan, jadwal pemeliharaan, atau paket file yang sama; kegagalan sebagian ditampilkan per perangkat. Aset fisik dan tiket kerusakan ditautkan ke [Maintenance & Asset Management](maintenance_asset_management.md).

## Alur utama

1. IT mendaftarkan perangkat dan memasang agen yang terautentikasi.
2. Agen mengirim heartbeat dan telemetri minimum; server menandai data usang.
3. Alert membuat tiket perawatan bila ambang terpenuhi, dengan deduplikasi.
4. Teknisi meninjau perangkat/tiket, meminta tindakan yang diizinkan, memperoleh persetujuan bila wajib.
5. Agen mengeksekusi tugas ber-ID unik; hasil, kegagalan, dan audit disimpan.

## Model data

| Entitas | Data penting | Constraint |
| --- | --- | --- |
| `ManagedDevice` | deviceId, assetRef, lokasi, owner, status | Identitas unik |
| `AgentEnrollment` | deviceId, credentialRef, version, lastSeen | Rotasi/pencabutan |
| `TelemetrySample` | deviceId, eventAt, receivedAt, metrics | Retensi terbatas |
| `DeviceAlert` | type, severity, openedAt, status | Deduplikasi |
| `RemoteAction` | target, commandType, reason, approver, status | Allowlist dan audit |
| `FileTransferJob` | sourceRef, targetGroup, hash, status | Integritas dan hasil per target |
| `DeviceGroup` | labId, policyId, members | Scope lab |

UUID, UTC, indeks deviceId/waktu, lokasi, alert aktif, dan action status. Event agen idempoten; hasil action tidak boleh dipalsukan oleh browser.

## UI, URL, dan API

Halaman: `/it/dashboard`, `/it/devices?labId=&status=`, `/it/devices/[deviceId]`, `/it/alerts?status=open`, `/it/actions/[actionId]`, `/it/file-transfers/[jobId]`. Filter/pagination di URL; detail perangkat dapat memakai modal Intercepting/Parallel Routes untuk ringkasan, tindakan remote halaman penuh. Direct link/refresh dan Back/Forward benar.

Endpoint NestJS: `GET /api/v1/it/devices`, `GET /api/v1/it/devices/:id/telemetry`, `GET /api/v1/it/alerts`, `POST /api/v1/it/actions`, `POST /api/v1/it/actions/:id/approve`, `POST /api/v1/it/file-transfers`; endpoint agen dipisah dan diautentikasi perangkat. DTO, scope, idempotensi, serta audit wajib.

Next.js App Router + TypeScript, Tailwind CSS + shadcn/ui, TanStack Table untuk perangkat/alert, Agentation untuk inspeksi. Agen Windows memerlukan rancangan dan deployment terpisah dari frontend/backend web. UI membedakan online, offline, telemetri usang, action menunggu, gagal; keyboard/mobile tetap tersedia untuk peninjauan.

## Kriteria penerimaan dan keputusan terbuka

Perangkat tak terdaftar tidak mengirim data; token agen dicabut menghentikan akses; telemetri usang tidak disebut mutakhir; action remote butuh izin/alasan dan hasil diaudit; transfer memverifikasi hash serta target. Putuskan perangkat/OS, hak admin agen, metrik yang boleh diambil, retensi, allowlist tindakan, transfer file, dan proses persetujuan.
