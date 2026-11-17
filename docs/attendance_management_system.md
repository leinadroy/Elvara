# Attendance Management System

Dokumen ini merinci poin 5 dari [Smart School Management Ecosystem](smart_school_management_ecosystem.md). Modul absensi mencatat kehadiran siswa dan pegawai, memproses koreksi, menyediakan rekap, serta mengirim peristiwa untuk notifikasi. Identitas, rombel, dan tahun ajaran berasal dari [Administrasi Sekolah](school_administration_management.md); jadwal pelajaran dari [Akademik](academic_management_system.md); jadwal kerja dan cuti pegawai dari [Teacher & Staff Management](teacher_staff_management.md).

**Status:** rancangan awal. Kebijakan jam, status, batas koreksi, serta perangkat absensi harus diputuskan sekolah sebelum implementasi.

## 1. Tujuan dan batas modul

Sistem harus menghasilkan catatan kehadiran yang akurat, dapat dikoreksi secara terlacak, dan mudah dipahami oleh siswa, wali, guru, pegawai, serta manajemen sesuai hak akses. Event dari perangkat adalah bukti input; status absensi final dihasilkan oleh aturan sekolah dan verifikasi petugas.

| Dalam modul absensi | Pemilik data/proses terkait |
| --- | --- |
| Sesi absensi siswa, catatan per siswa, koreksi, rekap | Jadwal, rombel, penempatan siswa dari administrasi/akademik |
| Event check-in/out pegawai, hasil harian, anomali | Jadwal kerja dan cuti dari modul pegawai |
| Pemetaan identitas perangkat dan hasil sinkronisasi | Konfigurasi perangkat dari integrasi/IT |
| Peristiwa ketidakhadiran yang perlu notifikasi | Pengiriman pesan dan preferensi kanal dari komunikasi |
| Laporan kehadiran | Rapor memakai ringkasan yang sudah final |

Modul ini tidak menentukan hukuman disiplin atau diagnosis kesehatan. Alasan sensitif dan lampiran izin disimpan dengan akses terbatas.

## 2. Jenis absensi dan definisi

### 2.1 Siswa

Sekolah perlu memilih apakah absensi resmi dihitung **per hari**, **per sesi pelajaran**, atau keduanya. Rancangan mendukung keduanya: `StudentAttendanceSession` mewakili sesi kelas atau pemeriksaan harian; `StudentAttendanceRecord` adalah satu hasil per siswa per sesi. Bila ada rekap harian dari beberapa sesi, aturan agregasinya harus eksplisit dan berversi.

Status awal: `present` (hadir), `late` (terlambat), `excused` (izin), `sick` (sakit), `absent` (alpa), `pending` (belum final), dan `not_applicable` (tidak berlaku). Nilai belum diisi berbeda dari alpa. Sesi yang dibatalkan tidak dihitung dalam denominator rekap.

### 2.2 Pegawai

Absensi kerja harian dibedakan dari kehadiran mengajar pada sesi kelas. Event masuk/keluar dapat berasal dari perangkat, input petugas, atau kanal lain yang disetujui. Hasil harian mempertimbangkan jadwal kerja, cuti, dinas luar, hari libur, dan toleransi keterlambatan. Satu hari dapat memiliki beberapa event mentah, tetapi rekap final harus memiliki aturan yang konsisten. Kehadiran mengajar tidak otomatis menyatakan pegawai hadir sepanjang hari kerja.

## 3. Peran dan hak akses

| Peran | Kewenangan | Batas akses |
| --- | --- | --- |
| Guru pengajar | Membuka dan mengisi sesi siswa pada kelas yang diajar | Tidak mengubah kelas lain |
| Wali kelas | Memantau dan meninjau absensi rombel | Koreksi hanya sesuai kebijakan |
| Petugas absensi/admin | Meninjau anomali, memproses koreksi, menutup periode | Akses sesuai unit dan mandat |
| Pegawai | Melihat absensi sendiri, mengajukan koreksi | Tidak mengubah catatan final langsung |
| Siswa | Melihat catatan sendiri, mengajukan izin/koreksi bila diizinkan | Tidak melihat siswa lain |
| Orang tua/wali | Melihat anak terverifikasi, mengajukan izin bila diizinkan | Tidak melihat anak lain |
| Kepala sekolah/manajemen | Ringkasan dan laporan agregat | Detail individual hanya bila diperlukan |
| Petugas integrasi | Memantau kesehatan perangkat dan sinkronisasi | Tidak membaca alasan izin pribadi |

Contoh izin: `student-attendance.record`, `student-attendance.review`, `attendance-correction.approve`, `staff-attendance.review`, `attendance-report.export`, `device-event.reconcile`. Backend memeriksa izin dan relasi kelas/anak/pegawai untuk setiap endpoint, termasuk unduhan laporan.

## 4. Sesi absensi siswa

Sesi dapat dibuat otomatis dari jadwal terbit atau secara manual dengan alasan (misalnya kegiatan khusus). Sesi menyimpan rombel/kelompok, tanggal, waktu, jenis, penanggung jawab, lokasi opsional, status `planned/open/closed/cancelled`, dan versi jadwal yang dipakai. Saat sesi dibuka, daftar peserta dihitung dari penempatan yang berlaku pada tanggal tersebut; perubahan kelas setelahnya tidak mengubah daftar historis diam-diam.

Guru mengisi status siswa, dapat menyimpan draf, lalu mengonfirmasi sesi. Sistem menampilkan siswa belum terisi dan mencegah penutupan jika aturan mewajibkan kelengkapan. Batas waktu input serta masa koreksi ditetapkan sekolah. Sesi ditutup dengan waktu dan aktor; perubahan setelahnya melalui alur koreksi, bukan edit langsung.

Untuk siswa pindah kelas di tengah hari atau kegiatan lintas rombel, petugas dapat menandai pengecualian peserta dengan alasan dan audit. Keunikan `sessionId + studentId` mencegah record ganda.

## 5. Check-in, check-out, dan keterlambatan

Event mentah menyimpan identitas perangkat/kartu yang dipetakan, timestamp perangkat, timestamp diterima server, sumber, lokasi jika relevan, dan ID event eksternal. Simpan kedua waktu tersebut agar keterlambatan sinkronisasi terlihat. Jam perangkat yang melenceng ditandai anomali; sistem tidak mengubahnya diam-diam.

Aturan keterlambatan memakai jadwal yang berlaku, zona waktu sekolah, toleransi, serta pengecualian resmi. Contoh: `checkIn > startAt + graceMinutes` menghasilkan kandidat terlambat, lalu diverifikasi terhadap izin/dinas luar. Check-out hilang, dua tap berdekatan, kartu tidak dikenal, dan event di luar jam kerja masuk antrean anomali. Event perangkat tidak boleh otomatis mengubah absensi siswa per mapel jika kebijakan hanya menggunakannya untuk akses gerbang.

## 6. Izin, sakit, dan koreksi

Pengajuan izin/sakit memuat subjek, tanggal/rentang, alasan sesuai kategori, lampiran bila wajib, pemohon, serta status. Wali yang terverifikasi dapat mengajukan untuk anak jika sekolah mengizinkan. Untuk pegawai, permintaan cuti/izin berasal dari modul pegawai dan diterjemahkan ke absensi setelah disetujui. Lampiran kesehatan tidak boleh terlihat oleh guru/atasan yang hanya membutuhkan status kehadiran.

Koreksi absensi menyimpan catatan awal, status usulan, alasan, bukti, pemohon, reviewer, keputusan, dan waktu. Status: diajukan, perlu informasi, disetujui, ditolak, dibatalkan. Keputusan yang disetujui membuat revisi record dengan nilai lama/baru dan audit. Petugas tidak menyetujui pengajuan sendiri jika sekolah mensyaratkan pemisahan tugas. Batas pengajuan dan siapa yang dapat membuka kembali periode tertutup harus eksplisit.

## 7. Notifikasi ketidakhadiran

Notifikasi kepada wali dikirim hanya setelah status memenuhi kondisi yang disetujui sekolah, misalnya siswa belum hadir setelah batas waktu verifikasi. Alur: record final atau kandidat yang telah diverifikasi → event internal → modul komunikasi memilih penerima dan kanal → hasil pengiriman dicatat. Satu kejadian tidak boleh mengirim pesan berulang karena retry; gunakan ID event dan idempotency key.

Pesan menyebut tanggal, konteks, status, dan tindakan yang dapat dilakukan tanpa memuat alasan kesehatan atau data siswa lain. Bila status kemudian dikoreksi, kirim pemberitahuan koreksi sesuai kebijakan. Kegagalan pengiriman tidak mengubah status absensi dan harus terlihat di antrean operasional. Sekolah menetapkan siapa yang menerima ketika ada beberapa wali dan apakah siswa juga diberi notifikasi.

## 8. Integrasi QR, NFC, kartu, dan perangkat

Mulai dengan adaptor terpisah per jenis perangkat. `Device` menyimpan jenis, lokasi, status, kunci autentikasi, waktu sinkron terakhir, dan versi konfigurasi. `DeviceIdentityMap` menghubungkan token kartu/QR ke orang dengan masa berlaku; token tidak boleh menjadi ID siswa yang mudah ditebak. QR statis untuk absensi berisiko dipinjamkan, sehingga tingkat kepercayaan dan metode verifikasi harus ditetapkan.

Ingest event memverifikasi sumber, skema, timestamp, dan ID unik, lalu menyimpan event secara idempoten. Proses pencocokan menghasilkan status dipetakan, duplikat, terlambat sinkron, tidak dikenal, atau perlu tinjauan. Jika perangkat offline, event disimpan lokal oleh perangkat sesuai kemampuannya dan disinkronkan kemudian; UI menampilkan bahwa data terbaru belum lengkap. Kegagalan perangkat memiliki jalur input manual yang terlacak.

Integrasi akses gerbang, CCTV, dan lokasi siswa tetap menjadi domain berbeda. Kehadiran gerbang tidak otomatis membuktikan siswa mengikuti pelajaran.

## 9. Rekap dan laporan

Rekap siswa tersedia per hari, sesi, rombel, semester, dan siswa. Rekap pegawai tersedia per hari, unit, bulan, dan jenis jadwal. Semua laporan menjelaskan definisi denominator, status yang dihitung, jumlah sesi dibatalkan, record pending, serta waktu pembaruan. Tren keterlambatan dan ketidakhadiran adalah indikator peninjauan, bukan diagnosis atau keputusan disiplin otomatis.

Rapor memakai snapshot/rekap final sesuai aturan periode. Jika koreksi disetujui setelah rapor terbit, sistem menandai rapor terdampak untuk alur revisi akademik; tidak mengubah dokumen terbit diam-diam. Ekspor CSV/PDF mengikuti izin, scope, dan audit.

## 10. Alur kerja prioritas

### 10.1 Absensi kelas harian

1. Jadwal terbit menghasilkan sesi dan daftar siswa berdasarkan penempatan efektif.
2. Guru membuka sesi, mengisi status, dan meninjau siswa yang belum tercatat.
3. Guru mengonfirmasi dan menutup sesi.
4. Sistem menghitung rekap serta memicu notifikasi yang memenuhi kebijakan.
5. Koreksi setelah penutupan diajukan dan diputuskan melalui alur terpisah.

### 10.2 Absensi pegawai dari perangkat

1. Perangkat mengirim event dengan ID unik dan waktu kejadian.
2. Sistem memverifikasi serta memetakan identitas pegawai.
3. Aturan jadwal/izin menghasilkan hasil sementara dan daftar anomali.
4. Petugas meninjau anomali; hasil final disimpan dengan sumber yang dapat ditelusuri.
5. Pegawai melihat rekap dan dapat mengajukan koreksi.

### 10.3 Pengajuan izin siswa

Siswa atau wali terverifikasi mengajukan izin untuk tanggal/sesi tertentu. Petugas meninjau bukti, menyetujui atau menolak, lalu record yang relevan diperbarui sesuai tanggal efektif. Portal memperlihatkan status permintaan dan hasil final secara terpisah.

## 11. Model data konseptual

| Entitas | Field penting | Aturan/relasi |
| --- | --- | --- |
| `StudentAttendanceSession` | jadwalRef, tanggal, rombel, status, owner | Sesi historis memakai peserta saat tanggal berlaku |
| `SessionParticipant` | sessionId, studentId, sumber penempatan | Unik per sesi-siswa |
| `StudentAttendanceRecord` | sessionId, studentId, status, waktu, versi | Satu hasil aktif per peserta |
| `AttendanceCorrection` | target, nilai lama/usulan, alasan, keputusan | Semua perubahan setelah final terlacak |
| `AbsenceRequest` | subjek, rentang, jenis, bukti, status | Pemohon bisa siswa, wali, atau pegawai sesuai aturan |
| `StaffAttendanceEvent` | externalEventId, deviceId, eventAt, receivedAt | Event mentah immutable dan idempoten |
| `StaffAttendanceRecord` | employeeId, tanggal, jadwalRef, status | Rekap harian final |
| `Device`, `DeviceIdentityMap` | jenis, lokasi, tokenRef, masa berlaku | Token privat, pemetaan historis |
| `AttendanceRuleVersion` | jenis, periode berlaku, toleransi | Perhitungan dapat direproduksi |
| `AttendanceNotificationEvent` | recordRef, recipientRef, eventType | Mencegah notifikasi ganda |

Gunakan UUID internal dan timestamp UTC. Index utama: siswa/pegawai + tanggal, sesi + siswa, perangkat + externalEventId, status pending, dan tanggal sinkron. Prisma transaction menjaga perubahan record, koreksi, serta audit tetap atomik. Data sumber dari modul lain direferensikan; jangan membuat master siswa/pegawai kedua.

## 12. Rancangan halaman dan URL

| Halaman | URL contoh | Fungsi |
| --- | --- | --- |
| Dashboard absensi | `/attendance/dashboard?date=...` | Sesi, anomali, status hari ini |
| Daftar sesi kelas | `/teacher/attendance?week=...` | Sesi guru |
| Isi sesi | `/teacher/attendance/sessions/[sessionId]` | Status per siswa |
| Absensi siswa | `/student/attendance?term=...` | Kalender dan rekap pribadi |
| Absensi anak | `/guardian/children/[studentId]/attendance?month=...` | Kehadiran dan pengajuan izin |
| Kehadiran pegawai | `/staff/attendance?month=...` | Event dan hasil pribadi |
| Koreksi | `/attendance/corrections/[correctionId]` | Detail serta keputusan |
| Anomali perangkat | `/operations/attendance/device-events?status=pending` | Rekonsiliasi |
| Laporan | `/attendance/reports?term=...&classGroupId=...` | Ringkasan dan ekspor |

Next.js App Router memakai nested layout per portal dan Dynamic Routes untuk detail. Filter, periode, tanggal, sort, dan pagination ada di query string. Detail koreksi dapat dibuka sebagai modal melalui Intercepting/Parallel Routes dari antrean; URL langsung dan refresh menampilkan halaman penuh. Back menutup modal dan Forward membukanya lagi. Formulir pengisian sesi lebih aman sebagai halaman penuh dengan peringatan perubahan belum tersimpan.

UI menggunakan TypeScript, Tailwind CSS, shadcn/ui, dan TanStack Table untuk daftar sesi, koreksi, anomali, serta laporan. Tabel besar memakai filter/sort/pagination server. Pada layar kecil, guru tetap dapat memberi status per siswa dengan target sentuh cukup besar dan ringkasan jumlah yang selalu terlihat. Agentation digunakan untuk inspeksi UI, terutama alur mobile dan modal.

## 13. Kontrak API awal

NestJS menyediakan endpoint berversi dengan DTO tervalidasi, otorisasi peran/scope, pagination, dan kesalahan konsisten (`code`, `message`, `fieldErrors`, `requestId`).

```text
GET    /api/v1/attendance/student-sessions?date=&classGroupId=
POST   /api/v1/attendance/student-sessions
GET    /api/v1/attendance/student-sessions/:id
PUT    /api/v1/attendance/student-sessions/:id/records/:studentId
POST   /api/v1/attendance/student-sessions/:id/close
GET    /api/v1/attendance/students/me?termId=
GET    /api/v1/attendance/guardians/children/:studentId?month=
POST   /api/v1/attendance/absence-requests
POST   /api/v1/attendance/corrections
POST   /api/v1/attendance/corrections/:id/decisions
GET    /api/v1/attendance/staff/me?month=
POST   /api/v1/attendance/device-events
GET    /api/v1/attendance/device-events?status=
GET    /api/v1/attendance/reports?termId=&classGroupId=
```

`PUT` record memakai version check untuk mencegah dua guru saling menimpa. Penutupan sesi, keputusan koreksi, dan rekonsiliasi event dilakukan atomik. Event perangkat dan pengajuan memakai idempotency key atau constraint unik. Konflik perubahan menghasilkan `409` dan mengembalikan versi terbaru yang dapat ditinjau.

## 14. Keamanan, privasi, dan aksesibilitas

- Backend memeriksa kepemilikan data siswa/pegawai serta hubungan wali aktif pada tiap baca dan mutasi.
- Alasan sakit dan lampiran kesehatan disaring dari tampilan kelas, laporan umum, serta notifikasi eksternal.
- Token kartu/QR, secret perangkat, dan file bukti disimpan privat; komunikasi perangkat diautentikasi dan dienkripsi.
- Catat perubahan status, penutupan sesi, koreksi, keputusan izin, ekspor, serta pemetaan identitas perangkat.
- Tetapkan retensi event mentah dan data lokasi perangkat; jangan menyimpan lokasi lebih rinci dari kebutuhan operasional.
- Status tidak ditandai dengan warna saja. Formulir dan tabel mendukung keyboard, label yang jelas, serta pesan validasi dekat field.
- Loading, belum ada sesi, belum diisi, sinkronisasi tertunda, error, dan akses ditolak harus terlihat sebagai keadaan berbeda.

## 15. Kriteria penerimaan MVP

1. Guru hanya dapat mengisi sesi pada kelas/penugasan yang berlaku; akses URL dan API kelas lain ditolak.
2. Daftar peserta sesi mencerminkan penempatan pada tanggal sesi dan tidak berubah diam-diam ketika siswa pindah kelas.
3. Satu sesi hanya mempunyai satu record aktif per siswa; pengiriman ulang tidak menggandakan data.
4. Status belum diisi tidak dihitung sebagai alpa; sesi batal tidak masuk denominator.
5. Guru dapat menyimpan draf dan menutup sesi setelah pemeriksaan kelengkapan sesuai aturan.
6. Koreksi record final menyimpan nilai awal, nilai baru, alasan, aktor, dan waktu.
7. Wali hanya melihat anak yang hubungan walinya terverifikasi; alasan sensitif tidak bocor.
8. Event perangkat duplikat dan terlambat sinkron tidak menggandakan kehadiran atau notifikasi.
9. Check-in tanpa check-out, identitas tidak dikenal, dan jam perangkat menyimpang masuk antrean anomali.
10. Notifikasi ketidakhadiran terkirim setelah kondisi final/terverifikasi dan retry tidak mengirim ganda.
11. Filter dan periode laporan bertahan setelah refresh serta Back/Forward; modal koreksi mengikuti URL.
12. Pengisian absensi pada mobile dan keyboard dapat diselesaikan dengan keadaan loading/error yang jelas.

## 16. Urutan implementasi

1. Sepakati definisi absensi siswa/pegawai, status, tenggat, dan koreksi.
2. Bangun sesi siswa dari jadwal dan penempatan efektif, pengisian, penutupan, serta rekap.
3. Tambahkan izin/koreksi dan portal siswa/wali.
4. Bangun event dan rekap pegawai dari jadwal kerja/cuti.
5. Integrasikan notifikasi serta laporan dengan idempotensi.
6. Tambahkan adaptor QR/NFC/perangkat setelah uji lapangan dan SOP fallback manual.

## 17. Keputusan terbuka

- Absensi siswa resmi per hari, per sesi, atau keduanya; cara menghitung rekap harian.
- Jam mulai, toleransi terlambat, batas pengisian, serta kapan status dianggap final.
- Siapa yang dapat mengajukan dan menyetujui izin/koreksi, termasuk batas waktunya.
- Kapan wali diberi notifikasi dan apa yang terjadi bila status kemudian berubah.
- Aturan kehadiran pegawai shift, dinas luar, hari libur, dan kerja lintas gedung.
- Perangkat yang tersedia, ketahanan offline, akurasi jam, dan siapa yang merawatnya.
- Apakah data kartu gerbang dipakai sebagai bukti absensi atau hanya data akses.
- Retensi event perangkat, lampiran sakit, dan laporan ekspor.
- Definisi angka kehadiran yang masuk rapor serta kapan snapshot diambil.

Keputusan ini menjadi dasar skema Prisma, aturan NestJS, halaman Next.js, dan rencana pengujian integrasi perangkat.
