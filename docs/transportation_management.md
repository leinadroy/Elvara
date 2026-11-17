# Transportation Management

Rancangan poin 16 dari [dokumen utama](smart_school_management_ecosystem.md). Identitas siswa/wali dan hak akses berasal dari [administrasi](school_administration_management.md); pembayaran layanan dari [keuangan](finance_payment_management.md). Lokasi kendaraan, jika diaktifkan, berbeda dari [lokasi siswa di kampus](student_location_campus_tracking.md).

## Cakupan dan peran

Modul mengelola kendaraan, pengemudi, rute, halte, jadwal, pendaftaran siswa, daftar penjemputan/pengantaran, perubahan perjalanan, dan notifikasi. Koordinator transportasi menyusun rute; pengemudi hanya melihat manifest perjalanan yang ditugaskan; petugas pendamping mencatat naik/turun; wali melihat perjalanan anak dan pemberitahuan; manajemen melihat agregat. Izin dibatasi rute, perjalanan, waktu, dan hubungan wali.

## Aturan bisnis

- Kendaraan memuat identitas, kapasitas, status layak pakai, dokumen operasional yang diperlukan, dan riwayat perawatan. Kendaraan tidak boleh ditugaskan saat ditutup untuk perbaikan.
- Pengemudi/pendamping memiliki penugasan dengan tanggal berlaku. Jadwal kerja pegawai dan benturan tugas diperiksa.
- Rute berversi berisi urutan halte, waktu perkiraan, wilayah, dan kapasitas. Perubahan rute terbit tidak menimpa perjalanan historis.
- Pendaftaran siswa mencatat halte naik/turun, hari berlaku, kontak wali, kebutuhan yang relevan, persetujuan, dan status. Jumlah peserta tidak boleh melebihi kapasitas.
- `Trip` adalah kejadian tanggal tertentu. Manifest disnapshot sebelum berangkat; perubahan mendadak dicatat dengan alasan.
- Naik/turun siswa memerlukan waktu, halte/lokasi, petugas, dan sumber verifikasi. “Dijadwalkan” tidak sama dengan “sudah naik”. Ketidakhadiran/penjemput tidak cocok memicu SOP manusia.
- Pelacakan GPS kendaraan hanya ditampilkan jika perangkat, akurasi, jam aktif, dan retensi disetujui. Posisi kendaraan tidak membuktikan posisi siswa tanpa event naik/turun.

## Alur utama

Koordinator membuat rute/jadwal → wali mendaftar anak → petugas menyetujui dan menempatkan kursi → perjalanan harian dibuat → pendamping mencatat naik/turun → perubahan/penundaan dikirim ke wali → perjalanan ditutup dan anomali ditinjau. Kegagalan perangkat memiliki manifest manual yang direkonsiliasi.

## Model data

| Entitas | Data penting | Constraint |
| --- | --- | --- |
| `SchoolVehicle` | nomor, kapasitas, status | Kendaraan aktif/layak |
| `DriverAssignment` | driverId, vehicleId, period | Benturan penugasan |
| `RouteVersion`, `RouteStop` | urutan, halte, perkiraan waktu | Versi terbit |
| `TransportEnrollment` | studentId, rute, halte, hari | Kapasitas dan hak wali |
| `Trip`, `TripManifest` | tanggal, rute, petugas, peserta | Snapshot perjalanan |
| `BoardingEvent` | studentId, stopId, type, time | Naik/turun terlacak |
| `VehicleLocationEvent` | vehicleId, eventAt, receivedAt | Opsional, retensi terbatas |

UUID, UTC, indeks rute/tanggal, siswa, kendaraan, dan status. Event naik/turun idempoten; koreksi beralasan dan diaudit.

## UI, URL, dan API

Halaman: `/transport/routes/[routeId]`, `/transport/trips?date=`, `/transport/trips/[tripId]`, `/driver/trips/[tripId]/manifest`, `/guardian/children/[studentId]/transport`. Filter/tanggal di URL. Detail perjalanan bisa memakai modal Intercepting/Parallel Routes dari daftar, direct link/refresh menjadi halaman penuh; Back/Forward benar.

Endpoint: `GET/POST /api/v1/transport/routes`, `POST /api/v1/transport/routes/:id/publish`, `POST /api/v1/transport/enrollments`, `GET /api/v1/transport/trips`, `POST /api/v1/transport/trips/:id/boarding-events`, `POST /api/v1/transport/trips/:id/close`. NestJS memeriksa DTO, kapasitas, scope, idempotensi, serta konflik.

Next.js App Router + TypeScript, Tailwind CSS + shadcn/ui, TanStack Table untuk manifest/rute, Agentation untuk inspeksi mobile pengemudi/pendamping. Status dijadwalkan/naik/turun/terlambat dibedakan dengan teks; loading/offline/error jelas.

## Kriteria penerimaan dan keputusan terbuka

Manifest hanya untuk petugas yang ditugaskan; kursi tidak melebihi kapasitas; event retry tidak ganda; wali hanya melihat anak sendiri; posisi kendaraan tidak disebut posisi anak; perubahan jadwal terbit tercatat; deep link/mobile bekerja. Putuskan kebutuhan layanan, halte, verifikasi naik/turun, GPS, biaya, prosedur darurat, dan offline.
