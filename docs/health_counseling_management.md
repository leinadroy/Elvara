# Health & Counseling Management

Rancangan poin 17 dari [dokumen utama](smart_school_management_ecosystem.md). Modul UKS dan konseling menyimpan informasi sangat sensitif dengan akses lebih ketat daripada profil siswa biasa. Identitas berasal dari [administrasi](school_administration_management.md); rujukan insiden dapat berasal dari [safeguarding](student_safety_safeguarding_system.md) tanpa menyalin seluruh kasus.

## Cakupan dan batas

UKS mencatat kunjungan, keluhan yang diperlukan untuk layanan, tindakan, rujukan, dan tindak lanjut. Konseling mengelola jadwal, sesi, rencana tindak lanjut, dan komunikasi aman. Modul ini tidak memberi diagnosis otomatis atau menggantikan tenaga kesehatan/profesional. Data klinis rinci hanya dikumpulkan bila benar-benar diperlukan dan sesuai mandat petugas.

## Peran dan akses

Petugas UKS melihat catatan kesehatan yang ditugaskan; konselor melihat kasus/sesi konseling sendiri; koordinator dapat mengatur rujukan dan kapasitas tanpa otomatis membaca catatan sesi; wali/siswa melihat janji/status dan ringkasan yang disetujui; admin sistem tidak otomatis membaca isi. Izin contoh: `health.visit.record`, `health.record.read-assigned`, `counseling.appointment.manage`, `counseling.note.read-assigned`, `health.export-restricted`. Pembukaan akses darurat memerlukan alasan, durasi singkat, dan audit.

## UKS

Kunjungan mencatat siswa, waktu, petugas, alasan kategori, observasi yang perlu, tindakan, hasil, dan rujukan. Informasi alergi/kondisi penting, jika dipakai, memiliki sumber, tanggal verifikasi, serta cakupan petugas yang boleh melihat. Kontak wali/pihak luar mengikuti SOP; pengiriman notifikasi tidak memuat detail kesehatan. Obat dan stok, bila dikelola, memerlukan aturan terpisah untuk pencatatan pemberian, persetujuan, kedaluwarsa, dan pemeriksaan stok.

## Konseling

Permintaan sesi dapat datang dari siswa, wali, guru, atau rujukan petugas. Status permintaan tidak mengungkap alasan sensitif kepada pengaju yang tidak berhak. Jadwal mempertimbangkan ketersediaan konselor/ruang privat. Catatan sesi memisahkan fakta, observasi, dan rencana; hanya konselor berwenang membacanya. Rujukan ke safeguarding dibuat dengan informasi minimum dan alasan. Pengungkapan ke wali ditentukan petugas menurut SOP, bukan otomatis.

## Keadaan darurat dan retensi

Jika kondisi memerlukan respons segera, petugas memakai jalur darurat sekolah dan mencatat tindak lanjut; aplikasi tidak menjadi satu-satunya kanal. Retensi, koreksi, unduhan, serta pemusnahan catatan ditetapkan khusus. Log teknis, dashboard umum, dan pencarian global tidak memuat isi kesehatan/konseling. Ringkasan manajemen memakai agregat aman.

## Model data

| Entitas | Data penting | Constraint |
| --- | --- | --- |
| `HealthVisit` | studentId, petugas, waktu, hasil | Akses penugasan |
| `HealthObservation` | visitId, kategori, catatan | Klasifikasi sensitif |
| `HealthReferral` | visitId, target, status | Data minimum |
| `CounselingRequest` | requester, studentId, status | Alasan terlindungi |
| `CounselingAppointment` | counselorId, waktu, ruang, status | Benturan jadwal |
| `CounselingSessionNote` | appointmentId, note, version | Revisi berjejak |
| `CareAccessAudit` | actor, resource, action, reason | Termasuk break glass |

UUID, UTC, indeks siswa/waktu serta petugas/jadwal. File privat memakai URL sementara. Pertimbangkan pemisahan penyimpanan/kolom setelah threat model.

## UI, URL, dan API

Halaman: `/health/visits?date=`, `/health/visits/[visitId]`, `/counseling/appointments?week=`, `/counseling/appointments/[appointmentId]`, `/student/support/appointments`. Detail sensitif halaman penuh, tanpa pratinjau modal di daftar umum. URL langsung/refresh dan Back/Forward tetap aman; query string tidak memuat alasan kesehatan.

Endpoint: `GET/POST /api/v1/health/visits`, `POST /api/v1/health/visits/:id/events`, `GET/POST /api/v1/counseling/requests`, `POST /api/v1/counseling/appointments`, `POST /api/v1/counseling/appointments/:id/session-notes`. NestJS memeriksa izin per record, DTO, audit pembacaan, dan konflik jadwal.

Next.js App Router + TypeScript, Tailwind CSS + shadcn/ui, TanStack Table hanya pada daftar yang aman, Agentation untuk inspeksi privasi UI. Loading, kosong, error, akses ditolak, serta status belum dibagikan jelas; keyboard/mobile diuji.

## Kriteria penerimaan dan keputusan terbuka

Petugas tanpa penugasan tidak bisa membuka catatan lewat URL/API/file; admin teknis tidak otomatis berhak; pembacaan sensitif diaudit; rujukan hanya mengirim data minimum; janji tidak bentrok; catatan final tidak ditimpa. Sekolah perlu menetapkan SOP UKS/konseling, informasi yang boleh dibagikan, petugas siaga, retensi, persetujuan wali, dan aturan obat/rujukan.
