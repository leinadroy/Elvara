# Academic Management System

Dokumen ini merinci poin 2 dari [Smart School Management Ecosystem](smart_school_management_ecosystem.md). Modul akademik mengelola kurikulum, kegiatan belajar, penilaian, dan rapor. Data identitas, tahun ajaran, rombel, serta penempatan siswa bersumber dari [School Administration & Management](school_administration_management.md).

**Status:** rancangan awal. Detail format kurikulum dan rapor perlu disesuaikan dengan jenjang serta kebijakan sekolah sebelum skema Prisma difinalkan.

## 1. Tujuan dan batas modul

Sistem harus membantu sekolah menyusun rencana pembelajaran, menerbitkan jadwal bebas benturan, mengelola tugas dan ujian, mencatat nilai secara terlacak, serta menerbitkan rapor yang konsisten dengan data pada periode tersebut.

| Dalam modul akademik | Sumber atau modul lain |
| --- | --- |
| Kurikulum, mapel, target pembelajaran, alokasi jam | Tahun ajaran, tingkat, program dari administrasi |
| Penugasan mengajar dan jadwal pelajaran | Data guru, rombel, ruang dari administrasi |
| Tugas, ujian, rubrik, pengumpulan, nilai | Identitas siswa dan penempatan rombel dari administrasi |
| Rekap capaian dan rapor digital | Kehadiran dari modul absensi; arsip resmi dari administrasi |
| Kalender kegiatan akademik | Pengumuman dan notifikasi dari modul komunikasi |

Perubahan master data akademik tidak boleh mengubah rapor yang sudah diterbitkan. Setiap tampilan memakai konteks sekolah, tahun ajaran, semester, dan hak akses pengguna yang jelas.

## 2. Peran dan hak akses

| Peran | Kegiatan | Batas akses |
| --- | --- | --- |
| Wakil kepala sekolah bidang kurikulum | Kelola struktur kurikulum, validasi jadwal, konfigurasi penilaian | Hanya sekolah dan periode yang ditugaskan |
| Admin akademik | Input mapel, penugasan guru, kalender, dan jadwal | Tidak mengubah nilai siswa tanpa kewenangan khusus |
| Kepala sekolah | Meninjau dan menyetujui publikasi rapor/laporan | Perubahan setelah terbit mengikuti proses revisi |
| Guru mapel | Kelola tugas, ujian, nilai pada penugasan mengajar aktif | Tidak mengakses nilai kelas/mapel lain |
| Wali kelas | Memantau capaian rombel, menyusun catatan wali kelas, memeriksa kelengkapan rapor | Tidak mengubah nilai mapel tanpa penugasan |
| Siswa | Lihat jadwal, tugas, umpan balik, nilai yang sudah dibuka | Hanya data sendiri |
| Orang tua/wali | Lihat jadwal, tugas, dan rapor anak sesuai kebijakan publikasi | Hanya anak dengan hubungan terverifikasi |

Izin granular contoh: `curriculum.manage`, `timetable.edit`, `timetable.publish`, `assignment.manage`, `submission.review`, `grade.edit`, `grade.publish`, `reportcard.review`, `reportcard.publish`, `academic.export`. Backend harus memeriksa izin sekaligus relasi guru ke rombel/mapel dan relasi wali ke anak pada setiap endpoint.

## 3. Konteks dan struktur akademik

### 3.1 Tahun ajaran dan semester

Modul memakai `AcademicYear` dan `Term` dari administrasi sebagai sumber tunggal. Semester memiliki status draf, aktif, penguncian input nilai, dan ditutup. Tanggal berlaku dijaga agar tugas, jadwal, dan nilai selalu terkait periode yang tepat. Perpindahan tahun ajaran tidak menyalin nilai lama.

### 3.2 Kurikulum dan mata pelajaran

`Curriculum` menyimpan nama, versi, jenjang, rentang berlaku, dan status draf/terbit/arsip. `Subject` menyimpan kode, nama, kelompok, dan status. Hubungan `CurriculumSubject` menentukan mapel yang berlaku per tingkat/program, alokasi jam, serta sifat wajib atau pilihan. Jika dibutuhkan, tambahkan `LearningOutcome` atau capaian pembelajaran dengan versi agar rubrik penilaian dapat ditautkan ke target yang tepat.

Perubahan kurikulum yang telah digunakan harus membuat versi baru. Mapel boleh dinonaktifkan untuk penugasan baru tanpa menghapus nilai dan rapor lama. Format detail mengikuti keputusan sekolah mengenai jenjang dan kurikulum yang dipakai.

### 3.3 Kelas dan penugasan mengajar

`ClassGroup` serta `Enrollment` dimiliki modul administrasi. Modul akademik membuat `TeachingAssignment`: guru, mapel, rombel atau kelompok belajar, semester, tanggal berlaku, dan status. Satu mapel dapat diajar lebih dari satu guru jika kebijakan mendukung tim pengajar; harus jelas siapa yang berwenang memberi dan menerbitkan nilai. Wali kelas diambil dari penugasan wali kelas pada administrasi.

## 4. Jadwal pelajaran

Jadwal dibangun dari slot hari/jam, semester, penugasan mengajar, rombel, dan ruang. Draf jadwal dapat disusun bertahap; hanya jadwal terbit yang muncul di portal siswa dan wali. Validasi publikasi memeriksa:

1. Guru tidak memiliki dua sesi pada waktu yang bertumpang tindih.
2. Rombel atau kelompok belajar tidak memiliki dua sesi wajib pada waktu yang sama.
3. Ruang tidak dipesan oleh dua sesi pada waktu yang sama dan kapasitasnya cukup.
4. Alokasi jam mapel memenuhi atau menjelaskan selisih terhadap kurikulum.
5. Tanggal sesi berada dalam semester dan memperhitungkan hari libur/acara akademik.

Perubahan jadwal terbit menghasilkan versi serta tanggal efektif. Pembatalan atau penggantian satu pertemuan menggunakan `ScheduleException`, sehingga jadwal mingguan dasar tetap utuh. Siswa dan wali melihat penanda perubahan, waktu pembaruan, dan notifikasi jika perubahan mendekati hari pelaksanaan. Jadwal guru dan ruang dapat dilihat sebagai tampilan alternatif dari data yang sama.

## 5. Tugas dan ujian

### 5.1 Pembuatan kegiatan

Guru membuat `LearningActivity` dengan jenis tugas, kuis, ujian, atau praktik; judul, instruksi, penugasan mengajar, tanggal buka/tenggat, bobot atau komponen penilaian, lampiran, dan status. Status minimal: draf, dijadwalkan, terbuka, ditutup, dibatalkan. Kegiatan dapat ditautkan ke capaian pembelajaran dan rubrik.

### 5.2 Pengumpulan

Siswa mengirim teks atau file sesuai tipe tugas. Simpan waktu pengumpulan, versi kiriman, status tepat waktu/terlambat, dan bukti penerimaan. Guru dapat mengatur apakah pengiriman ulang diperbolehkan dan sampai kapan. File disimpan privat dengan batas ukuran/jenis dan pemeriksaan keamanan. Kegagalan unggah tidak boleh dianggap sebagai pengumpulan berhasil.

### 5.3 Ujian

MVP dapat memakai ujian sebagai kegiatan dengan jadwal, instruksi, dan pencatatan hasil. Bank soal, ujian online bertimer, pengacakan soal, pengawasan, dan analisis butir adalah tahap lanjut karena memerlukan aturan keamanan dan operasional tersendiri. Akomodasi siswa dan ujian susulan dicatat sebagai pengecualian resmi, bukan perubahan tenggat umum.

## 6. Penilaian dan nilai

### 6.1 Skema penilaian

Setiap mapel/semester memiliki `GradeScheme` berisi komponen, bobot, rentang nilai, aturan pembulatan, nilai minimum, dan kebijakan data kosong. Skema harus berversi serta divalidasi sebelum dipakai; jumlah bobot sesuai aturan yang ditetapkan sekolah. `Assessment` mengacu ke komponen, tanggal, penugasan mengajar, dan rubrik bila ada.

### 6.2 Pencatatan nilai

Nilai per siswa disimpan sebagai draf dengan aktor, waktu, dan sumber penilaian. Nilai `0`, belum dinilai, tidak mengumpulkan, dan tidak berlaku adalah keadaan yang berbeda. Masukan di luar rentang ditolak. Guru dapat memberi umpan balik yang terlihat setelah publikasi. Perubahan massal melalui tabel atau impor menampilkan pratinjau, jumlah perubahan, serta kesalahan per baris.

### 6.3 Publikasi dan koreksi

Nilai draf → diperiksa → diterbitkan. Hanya nilai terbit yang muncul di portal siswa/wali. Setelah rapor diterbitkan, koreksi nilai wajib memiliki alasan, aktor, waktu, persetujuan jika diperlukan, dan menghasilkan revisi rapor. Audit menyimpan nilai sebelum dan sesudah; pembaruan bersamaan memakai pemeriksaan versi agar satu guru tidak menimpa pekerjaan guru lain.

### 6.4 Perhitungan

Perhitungan nilai akhir dilakukan backend dengan aturan versi `GradeScheme`. Sistem menampilkan rincian komponen agar hasil dapat diaudit. Pembulatan hanya pada titik yang disepakati, bukan berulang di setiap langkah. Apabila nilai belum lengkap, tampilkan status belum lengkap dan daftar penyebab; jangan otomatis menganggap kosong sebagai nol. Perhitungan ulang setelah skema berubah tidak boleh diam-diam mengubah hasil terbit.

## 7. Rapor digital

Rapor adalah snapshot resmi per siswa, semester, dan versi publikasi. Isinya dapat meliputi identitas siswa dan kelas pada waktu terbit, nilai dan predikat mapel, deskripsi capaian, kehadiran dari modul absensi, kegiatan tertentu, catatan wali kelas, serta keputusan kenaikan kelas bila digunakan. Isi final bergantung pada format rapor sekolah.

Alur: guru menuntaskan nilai → wali kelas memeriksa kelengkapan → kurikulum memvalidasi → pejabat berwenang menyetujui → rapor diterbitkan. Setiap tahap menampilkan pekerjaan yang masih tertunda. Dokumen yang diterbitkan memiliki nomor/versi, waktu, aktor, dan salinan yang tidak berubah. Revisi menghasilkan versi baru dan alasan; versi lama tetap tersimpan sesuai retensi. Siswa dan wali hanya dapat melihat rapor yang sudah terbit.

Ekspor PDF/print memakai template berversi, identitas sekolah yang berlaku saat terbit, dan data snapshot. Unduhan mengikuti hak akses serta dicatat bila kebijakan mengharuskan. Opsi tanda tangan digital atau verifikasi publik dibahas terpisah.

## 8. Kalender akademik

Kalender memuat awal/akhir semester, masa ujian, libur, pembagian rapor, tenggat administrasi akademik, serta acara belajar lintas kelas. Setiap entri punya kategori, pemilik, audiens, tanggal/waktu, lokasi opsional, status draf/terbit, dan versi perubahan. Benturan penting dengan ujian atau jadwal ditandai untuk peninjauan. Kalender akademik yang terbit dapat menjadi sumber notifikasi, tetapi modul komunikasi mengelola pengiriman dan preferensi penerima.

## 9. Evaluasi perkembangan akademik

Dashboard guru menampilkan tugas belum dinilai, nilai belum lengkap, dan siswa yang perlu tindak lanjut dalam kelas yang diajar. Wali kelas melihat tren capaian per siswa dan rombel; manajemen melihat agregat per tingkat/mapel. Grafik harus menyertakan periode, ukuran sampel, dan definisi metrik. Data siswa tidak ditampilkan di dashboard agregat untuk pengguna tanpa izin.

Indikator awal yang berguna: kelengkapan nilai, rerata per komponen, perubahan hasil antarperiode, tugas terlambat, dan siswa dengan capaian di bawah ambang yang ditetapkan. Indikator hanya membantu peninjauan; keputusan intervensi dicatat oleh guru/wali kelas. Jangan menyimpulkan penyebab atau memberi label permanen kepada siswa dari satu angka.

## 10. Alur kerja utama

### 10.1 Persiapan semester

1. Admin memastikan tahun ajaran, semester, rombel, dan penempatan siswa siap.
2. Kurikulum memilih versi kurikulum serta mapel per tingkat/program.
3. Admin akademik menautkan guru ke mapel dan rombel.
4. Jadwal disusun, benturan diperbaiki, lalu diterbitkan.
5. Portal guru/siswa/wali menampilkan jadwal sesuai scope masing-masing.

### 10.2 Penilaian sampai rapor

1. Guru membuat skema dan kegiatan penilaian.
2. Siswa mengumpulkan tugas; guru menilai dan memberi umpan balik.
3. Guru memeriksa kelengkapan lalu menerbitkan nilai.
4. Wali kelas dan kurikulum memeriksa rapor pratinjau serta daftar masalah.
5. Pejabat berwenang menyetujui publikasi; sistem membuat snapshot rapor.
6. Koreksi sesudah terbit dilakukan lewat alur revisi yang terlacak.

## 11. Model data konseptual

| Entitas | Field kunci | Aturan/relasi |
| --- | --- | --- |
| `Curriculum`, `CurriculumVersion` | nama, jenjang, berlaku, status | Versi terbit tidak diubah langsung |
| `Subject`, `CurriculumSubject` | kode, nama, tingkat, program, alokasi jam | Mapel terhubung ke versi kurikulum |
| `LearningOutcome` | kode, deskripsi, urutan | Opsional, berversi mengikuti kurikulum |
| `TeachingAssignment` | teacherId, subjectId, classGroupId, termId, role | Guru/rombel dari administrasi |
| `TimetableVersion`, `TimetableSlot` | hari, jam, ruang, penugasan, status | Tidak ada benturan pada versi terbit |
| `ScheduleException` | slotId, tanggal, pengganti, alasan | Satu perubahan per kejadian |
| `LearningActivity` | jenis, judul, buka, tenggat, status | Terkait penugasan mengajar |
| `Submission`, `SubmissionVersion` | studentId, waktu, fileRef, status | Hanya siswa peserta penugasan |
| `GradeScheme`, `GradeComponent` | bobot, rentang, aturan pembulatan | Berversi per mapel/semester |
| `Assessment`, `GradeEntry`, `GradeChange` | komponen, skor, status, alasan | Satu nilai aktif per siswa/assessment; riwayat perubahan |
| `ReportCard`, `ReportCardVersion` | studentId, termId, snapshot, status | Versi terbit immutable |
| `AcademicCalendarEvent` | kategori, waktu, audiens, status | Hanya event terbit tampil di portal |

Gunakan UUID internal, waktu UTC, serta indeks pada `termId`, `classGroupId`, `teacherId`, `studentId`, dan status. Data sumber administrasi direferensikan melalui ID; jangan menduplikasi profil siswa/guru sebagai master baru. Snapshot pada rapor adalah pengecualian yang disengaja untuk menjaga dokumen historis.

## 12. Rancangan halaman dan navigasi

| Halaman | URL contoh | Kegunaan |
| --- | --- | --- |
| Dashboard akademik | `/academics/dashboard?term=...` | Pekerjaan dan status semester |
| Kurikulum | `/academics/curricula/[curriculumId]` | Versi, mapel, capaian |
| Penugasan mengajar | `/academics/teaching-assignments?term=...` | Guru-mapel-rombel |
| Jadwal rombel | `/academics/timetable/classes/[classGroupId]?week=...` | Jadwal dan perubahan |
| Jadwal guru | `/teacher/timetable?week=...` | Agenda mengajar pribadi |
| Tugas kelas | `/teacher/classes/[classGroupId]/assignments` | Daftar kegiatan |
| Detail tugas | `/teacher/assignments/[activityId]` | Instruksi, kiriman, penilaian |
| Buku nilai | `/teacher/classes/[classGroupId]/grades?subject=...` | Nilai per komponen |
| Tugas siswa | `/student/assignments/[activityId]` | Detail dan pengumpulan |
| Rapor siswa | `/student/report-cards/[reportCardId]` | Rapor terbit |
| Rapor anak | `/guardian/children/[studentId]/report-cards/[reportCardId]` | Rapor sesuai hak wali |
| Kalender | `/academics/calendar?month=...` | Agenda akademik |

Dynamic Routes dipakai untuk detail. Nested layouts memisahkan konteks admin, guru, siswa, dan wali. Filter, tab yang bisa dibagikan, semester, dan pagination disimpan di URL. Detail tugas atau nilai dapat memakai Intercepting dan Parallel Routes sebagai modal dari daftar bila konteksnya membantu; URL langsung dan refresh harus membuka halaman penuh. Back/Forward mengembalikan daftar, filter, dan modal secara benar.

Gunakan Next.js App Router + TypeScript, Tailwind CSS + shadcn/ui, dan TanStack Table untuk buku nilai serta daftar tugas. Tabel besar memakai pagination/filter/sort server. Mobile menampilkan informasi pokok dan jalur jelas ke detail; buku nilai lebar dapat memakai scroll horizontal dengan header dan kolom identitas yang tetap terbaca. Agentation dipakai saat inspeksi UI untuk menemukan masalah layout/interaksi.

## 13. Kontrak API awal

NestJS menyediakan endpoint berversi dengan DTO tervalidasi, pemeriksaan izin dan scope, pagination, serta kesalahan konsisten (`code`, `message`, `fieldErrors`, `requestId`). Contoh:

```text
GET    /api/v1/curricula?gradeLevelId=&status=
POST   /api/v1/curricula
POST   /api/v1/curricula/:id/versions/:versionId/publish
GET    /api/v1/teaching-assignments?termId=&teacherId=
POST   /api/v1/teaching-assignments
GET    /api/v1/timetable?termId=&classGroupId=&week=
POST   /api/v1/timetable/versions
POST   /api/v1/timetable/versions/:id/publish
GET    /api/v1/learning-activities?assignmentId=&status=
POST   /api/v1/learning-activities
POST   /api/v1/learning-activities/:id/submissions
GET    /api/v1/gradebooks?teachingAssignmentId=
PUT    /api/v1/assessments/:id/grades/:studentId
POST   /api/v1/assessments/:id/publish
GET    /api/v1/report-cards?termId=&classGroupId=
POST   /api/v1/report-cards/:id/publish
POST   /api/v1/report-cards/:id/revisions
GET    /api/v1/academic-calendar?termId=&from=&to=
```

Publikasi jadwal, nilai, dan rapor memakai transaksi serta pemeriksaan versi. Konflik jadwal atau perubahan serentak menghasilkan `409` dengan detail yang dapat ditindaklanjuti. Pembuatan kiriman/tugas yang berpotensi diulang memakai idempotency key. Lampiran diakses melalui URL sementara setelah otorisasi.

## 14. Keadaan UI dan aksesibilitas

Setiap halaman memiliki loading, kosong, error, akses ditolak, dan konflik perubahan. Empty state menjelaskan apakah belum ada data, filter tidak menemukan hasil, atau data belum terbit. Formulir menjaga isi saat validasi gagal. Status draf/terbit dan tenggat disampaikan dengan teks selain warna. Modal mengelola fokus dan dapat ditutup lewat keyboard; tabel memiliki label kolom, navigasi keyboard, dan ringkasan hasil. Pengumuman setelah menyimpan atau menerbitkan memakai pesan yang terbaca teknologi bantu.

## 15. Pengujian dan kriteria penerimaan MVP

1. Hanya guru yang ditugaskan dapat membuat tugas dan mengubah nilai pada mapel/rombel aktif; percobaan melalui API langsung ditolak.
2. Publikasi jadwal ditolak saat guru, rombel, atau ruang bentrok, dengan rincian konflik.
3. Perubahan satu pertemuan tidak mengubah seluruh jadwal mingguan dan terlihat pada portal terkait.
4. Siswa hanya dapat mengirim tugas yang dibuka untuk kelasnya; kegagalan unggah tidak membuat status terkumpul.
5. Nilai kosong, nol, dan belum dinilai menghasilkan hasil perhitungan yang berbeda sesuai aturan skema.
6. Nilai draf tidak terlihat oleh siswa/wali. Publikasi dan koreksi mencatat aktor, waktu, alasan, dan nilai lama/baru.
7. Rapor tidak dapat terbit jika komponen wajib belum lengkap; rapor terbit tetap sama setelah data sumber berubah.
8. Wali hanya dapat membuka rapor anak terverifikasi, termasuk melalui deep link langsung.
9. Filter buku nilai dan kalender bertahan setelah refresh serta Back/Forward.
10. Modal detail dari daftar mengikuti URL; Back menutupnya dan URL langsung membuka halaman penuh.
11. Alur utama dapat digunakan pada layar kecil dan dengan keyboard; loading, kosong, dan error memiliki pesan yang jelas.

## 16. Urutan implementasi

1. Selesaikan entitas administrasi yang diperlukan: tahun ajaran, semester, rombel, penempatan, guru, ruang, dan hubungan wali.
2. Tetapkan versi kurikulum, mapel, serta penugasan mengajar.
3. Bangun jadwal draf, pemeriksaan benturan, publikasi, dan tampilan portal.
4. Bangun tugas, pengumpulan, serta buku nilai dengan skema penilaian berversi.
5. Tambahkan publikasi nilai dan rapor snapshot dengan alur persetujuan.
6. Tambahkan kalender, indikator perkembangan, ekspor, dan inspeksi lintas peran.

## 17. Keputusan terbuka

- Jenjang, kurikulum, struktur mapel, serta cara memodelkan mata pelajaran pilihan.
- Jumlah semester/periode, alokasi jam, durasi sesi, dan aturan benturan yang boleh dikecualikan.
- Apakah pembelajaran lintas rombel, tim pengajar, atau guru pengganti digunakan.
- Komponen nilai, bobot, skala, pembulatan, remedial, susulan, dan nilai minimum.
- Batas waktu pengumpulan, kebijakan keterlambatan, unggah ulang, dan ukuran file.
- Format rapor, deskripsi capaian, catatan wali kelas, penandatangan, serta alur persetujuan.
- Kapan nilai dan rapor boleh dilihat siswa/orang tua, termasuk koreksi pascapublikasi.
- Data absensi dan kegiatan lain yang masuk rapor serta sumber resminya.
- Kebutuhan ujian online, bank soal, atau integrasi LMS pada tahap berikutnya.

Keputusan tersebut menjadi dasar skema Prisma, validasi NestJS, desain halaman Next.js, dan backlog implementasi terukur.
