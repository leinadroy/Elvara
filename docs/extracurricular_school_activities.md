# Extracurricular & School Activities

Rancangan poin 14 dari [dokumen utama](smart_school_management_ecosystem.md). Identitas dan hubungan wali berasal dari [administrasi](school_administration_management.md); jadwal akademik dari [akademik](academic_management_system.md); biaya kegiatan dari [keuangan](finance_payment_management.md).

## Cakupan dan pengguna

Modul mengelola ekstrakurikuler/klub, pembina/pelatih, pendaftaran, kapasitas, jadwal latihan, kehadiran kegiatan, acara sekolah, kompetisi, dan prestasi. Koordinator menerbitkan program; pembina mengelola peserta/sesi; siswa mendaftar; wali menyetujui bila diwajibkan; manajemen melihat agregat. Pelatih luar hanya mendapat akses minimum berbatas waktu.

## Aturan bisnis

- Kegiatan memuat kategori, tingkat sasaran, syarat, kapasitas, lokasi, jadwal, pembina, periode, biaya referensi, dan status draf/terbit/selesai.
- Pendaftaran berstatus diajukan, menunggu wali, diterima, daftar tunggu, ditolak, dibatalkan. Satu siswa tidak memiliki dua pendaftaran aktif untuk kegiatan sama. Kapasitas dijaga dalam transaksi.
- Benturan dengan jadwal kelas/kegiatan lain ditandai; pengecualian memerlukan aturan. Perubahan jadwal/kapasitas terbit menandai peserta terdampak.
- Persetujuan wali terhubung ke kegiatan, versi syarat, dan hak wali yang terverifikasi. Pencabutan tercatat.
- Kehadiran latihan terpisah dari absensi sekolah. Prestasi menyimpan acara, hasil, bukti, verifikator, dan status terbit; data siswa lain tidak bocor.
- Acara sekolah yang terbit masuk kalender dan notifikasi sesuai audiens.

## Alur utama

Koordinator membuat dan menerbitkan kegiatan → siswa mendaftar → wali menyetujui jika perlu → pembina memutuskan peserta/daftar tunggu → sesi dan kehadiran dicatat → prestasi diverifikasi sebelum ditampilkan. Pembayaran, bila ada, ditautkan ke tagihan keuangan.

## Model data

| Entitas | Data penting | Constraint |
| --- | --- | --- |
| `Activity` | kategori, periode, kapasitas, status | Versi perubahan terbit |
| `ActivityStaffAssignment` | employeeId, role, validFrom/To | Akses berbatas waktu |
| `ActivityRegistration` | studentId, status, appliedAt | Unik aktif per siswa |
| `GuardianConsent` | wali, kegiatan, versi, keputusan | Hak wali diperiksa |
| `ActivitySession`, `ActivityAttendance` | waktu, ruang, peserta, status | Satu hasil per peserta/sesi |
| `Achievement` | siswa, kompetisi, hasil, bukti | Verifikasi sebelum terbit |

UUID, UTC, indeks kegiatan/periode/status dan siswa. Promosi daftar tunggu idempoten.

## UI, URL, dan API

Halaman: `/activities?category=&term=`, `/activities/[activityId]`, `/student/activities/[activityId]`, `/guardian/children/[studentId]/activities/[activityId]`, `/activities/sessions/[sessionId]`. Filter di URL; detail ringan boleh memakai modal Intercepting/Parallel Routes dengan halaman penuh saat direct link/refresh dan Back/Forward benar.

Endpoint: `GET/POST /api/v1/activities`, `POST /api/v1/activities/:id/publish`, `POST /api/v1/activities/:id/registrations`, `POST /api/v1/activity-registrations/:id/decisions`, `POST /api/v1/activity-registrations/:id/guardian-consent`, `PUT /api/v1/activity-sessions/:id/attendance/:studentId`. NestJS memeriksa DTO, scope, kapasitas, dan konflik.

Next.js App Router + TypeScript, Tailwind CSS + shadcn/ui, TanStack Table untuk peserta, Agentation untuk inspeksi. Tampilkan status penuh/daftar tunggu, loading, kosong, error, keyboard, dan mobile.

## Kriteria penerimaan dan keputusan terbuka

Pendaftaran tidak ganda atau melampaui kapasitas; persetujuan wali sah; pembina hanya melihat peserta yang ditugaskan; absensi kegiatan tidak mengubah absensi kelas; prestasi draf tidak terbit. Putuskan prioritas peserta, biaya, persetujuan, benturan, daftar tunggu, dan hak publikasi.
