# Student Information & Portal

Dokumen ini merinci poin 3 dari [Smart School Management Ecosystem](smart_school_management_ecosystem.md). Portal siswa menjadi satu tempat untuk melihat informasi pribadi, kegiatan belajar, layanan, dan pengumuman yang relevan. Data resmi tetap dimiliki modul sumbernya: [Administrasi Sekolah](school_administration_management.md) dan [Akademik](academic_management_system.md).

**Status:** rancangan awal. Detail informasi perilaku, prestasi, dan layanan siswa perlu mengikuti kebijakan akses sekolah sebelum implementasi.

## 1. Tujuan dan batas modul

Portal harus membantu siswa menjawab pertanyaan harian: jadwal hari ini, tugas yang perlu dikerjakan, status kehadiran, hasil belajar yang sudah terbit, pengumuman, kegiatan, serta cara meminta bantuan atau koreksi data. Portal menyatukan tampilan dan alur pengajuan; ia tidak membuat salinan master data baru.

| Ditampilkan atau diajukan melalui portal | Pemilik data/proses |
| --- | --- |
| Profil diri dan permintaan koreksi | Administrasi sekolah |
| Rombel, jadwal, tugas, nilai, rapor | Administrasi dan akademik |
| Kehadiran dan pengajuan koreksi/izin | Absensi |
| Pengumuman dan notifikasi | Komunikasi |
| Ekstrakurikuler dan kegiatan | Kegiatan sekolah |
| Prestasi dan catatan perilaku yang boleh dilihat | Kesiswaan sesuai kebijakan |
| Permintaan bantuan, layanan, dan status tiket | Modul layanan terkait |

Informasi yang belum diterbitkan oleh modul pemilik tidak boleh muncul hanya karena record sudah ada di database. Portal web responsif adalah cakupan awal; aplikasi native dan mode offline diputuskan setelah kebutuhan nyata teruji.

## 2. Pengguna, akses, dan konteks

Siswa yang login hanya dapat membaca data dirinya. Guru atau admin membuka data siswa dari portal kerja masing-masing, bukan dengan menyamar sebagai siswa. Bila akun siswa belum aktif, sekolah dapat menyediakan proses aktivasi yang memverifikasi identitas tanpa memperlihatkan data sebelum verifikasi selesai.

Backend memeriksa `studentId` yang terhubung ke sesi pada setiap permintaan. URL yang memuat ID siswa lain tetap ditolak. Perubahan rombel, status sekolah, atau penutupan akun langsung memengaruhi akses ke fitur baru; akses ke dokumen historis mengikuti kebijakan retensi dan status siswa. Untuk pengguna di bawah umur, kontak, lokasi, kesehatan, dan catatan kasus memakai aturan akses tersendiri.

## 3. Beranda siswa

Beranda memprioritaskan hal yang membutuhkan tindakan dan informasi yang waktunya dekat:

1. Jadwal hari ini dan perubahan sesi.
2. Tugas mendekati tenggat, terlambat, atau belum dikumpulkan.
3. Pengumuman penting yang belum dibaca.
4. Status kehadiran terbaru dan pengajuan yang menunggu keputusan.
5. Kegiatan terdaftar berikutnya.
6. Jalan cepat ke rapor terbit dan layanan bantuan.

Setiap kartu menjelaskan sumber dan waktu pembaruan. Jika satu modul sumber sedang gagal, bagian lain tetap dapat digunakan; kartu bermasalah menampilkan pesan yang jelas dan opsi coba lagi. Angka ringkasan tidak boleh menyamakan data belum tersedia dengan nilai nol.

## 4. Profil siswa

Tampilan profil memuat nama resmi, nama panggilan bila ada, nomor induk, foto jika disetujui, rombel aktif, tahun ajaran, serta kontak sekolah yang relevan. Data kontak pribadi dan wali ditampilkan seperlunya. Detail dokumen identitas, kesehatan, kasus keselamatan, dan informasi keluarga sensitif tidak masuk profil umum.

Siswa dapat mengajukan perubahan data yang diperbolehkan, misalnya nama panggilan atau kontak, dengan bukti bila dibutuhkan. Perubahan data resmi seperti nama legal dan tanggal lahir masuk antrean verifikasi admin. Formulir menampilkan status diajukan, perlu perbaikan, disetujui, atau ditolak beserta alasan yang aman untuk ditampilkan. Data lama tetap berlaku sampai perubahan disetujui.

## 5. Riwayat akademik dan kehadiran

### 5.1 Akademik

Siswa melihat mapel dan guru pada semester aktif, tugas, umpan balik, nilai yang telah dipublikasikan, serta rapor yang telah terbit. Nilai draf guru dan rapor dalam proses persetujuan tidak muncul. Untuk setiap hasil, tampilkan periode, komponen, tanggal publikasi, dan status revisi bila ada. Riwayat semester lama tetap dapat diakses sesuai kebijakan sekolah tanpa mengubah catatan historis.

### 5.2 Kehadiran

Tampilkan kalender dan ringkasan hadir, izin, sakit, alpa, serta terlambat per periode. Setiap catatan menunjukkan tanggal, sesi, status, dan waktu pembaruan. Jika koreksi diajukan, status awal dan status pengajuan dibedakan sampai keputusan final. Pengajuan izin atau koreksi memakai alasan, lampiran opsional, dan batas waktu sesuai aturan absensi. Siswa tidak dapat mengubah catatan absensi secara langsung.

Data kehadiran yang masih menunggu sinkronisasi perangkat diberi label belum final. Ringkasan tidak menghitung ganda koreksi maupun sesi yang dibatalkan.

## 6. Jadwal pribadi dan kalender

Jadwal pribadi berasal dari penempatan rombel, mapel pilihan, dan pengecualian jadwal yang telah terbit. Tampilan hari/minggu menunjukkan waktu, mapel, guru, ruang/gedung, serta perubahan atau pembatalan. Kalender menggabungkan agenda akademik, tenggat tugas, ujian, dan kegiatan siswa yang relevan. Setiap item menautkan ke detail dengan URL yang dapat dibuka langsung.

Zona waktu sekolah dipakai konsisten. Perubahan jadwal mendadak menampilkan waktu pembaruan; notifikasi dikirim melalui modul komunikasi sesuai kebijakan. Jika penempatan siswa berubah di tengah semester, jadwal baru berlaku sejak tanggal efektif, sedangkan riwayat lama tetap dapat dilihat.

## 7. Pengumuman dan notifikasi

Pengumuman resmi mempunyai judul, isi, penerbit, audiens, waktu terbit, dan masa tampil. Siswa hanya melihat pengumuman untuk dirinya, rombel, tingkat, atau seluruh sekolah sesuai audiens. Pengumuman penting dapat memerlukan tanda sudah dibaca, tetapi status baca tidak boleh dipakai sebagai bukti persetujuan kebijakan tanpa alur khusus.

Pusat notifikasi membedakan tugas, jadwal, nilai/rapor, kehadiran, kegiatan, dan pesan layanan. Notifikasi berisi ringkasan aman dan tautan ke halaman detail; konten sensitif tidak dikirim lengkap melalui kanal eksternal. Preferensi kanal dan jam pengiriman mengikuti kebijakan sekolah, sementara pemberitahuan darurat memiliki aturan terpisah.

## 8. Kegiatan dan ekstrakurikuler

Siswa dapat melihat katalog kegiatan yang dibuka untuk tingkat/rombelnya, persyaratan, pembina, jadwal, lokasi, kapasitas, dan tenggat pendaftaran. Status pendaftaran: diajukan, diterima, daftar tunggu, ditolak, atau dibatalkan. Jika kegiatan membutuhkan persetujuan wali, pendaftaran tetap menunggu sampai persetujuan diterima. Benturan jadwal ditampilkan sebelum pengajuan; sekolah menetapkan apakah benturan boleh dikecualikan.

Portal menampilkan agenda, kehadiran kegiatan yang sudah final, dan prestasi yang telah dipublikasikan. Detail pembayaran kegiatan, bila ada, ditautkan ke modul keuangan; portal tidak menyimpan transaksi sendiri.

## 9. Prestasi, pelanggaran, dan informasi sensitif

Prestasi yang telah diverifikasi dapat tampil dengan kategori, tanggal, penyelenggara, dan bukti publikasi sesuai izin. Catatan pelanggaran atau pembinaan tidak otomatis ditampilkan seluruhnya. Sekolah perlu menetapkan kategori yang dapat dilihat siswa, waktu publikasi, proses koreksi, hak jawab, dan peran yang boleh melihat. Hindari label permanen atau peringkat yang menstigma siswa.

Kasus bullying, konseling, kesehatan, identitas pelapor, dan catatan investigasi tidak masuk riwayat umum. Jika siswa perlu melihat status laporannya, tampilkan status layanan dan pesan aman pada kanal khusus dengan pemeriksaan akses yang lebih ketat. Informasi orang lain dalam kasus harus disembunyikan.

## 10. Portal layanan siswa

Katalog layanan awal dapat mencakup permintaan surat, koreksi data, izin/absensi, bantuan teknis akun, pertanyaan perpustakaan, dan laporan fasilitas. Setiap jenis permintaan memiliki formulir, persyaratan, unit penanggung jawab, status, dan target respons yang disepakati. Status umum: draf, diajukan, ditinjau, perlu informasi, selesai, ditolak, dibatalkan. Setiap perubahan status mencatat waktu, petugas, dan pesan yang aman untuk siswa.

Siswa dapat melihat daftar permintaan sendiri, melengkapi informasi, dan mengunduh hasil jika berwenang. Permintaan darurat atau keselamatan tidak dicampur dengan tiket layanan biasa; tampilkan jalur bantuan resmi yang jelas. Nomor tiket dan `requestId` memudahkan dukungan tanpa menampilkan data sensitif di URL publik.

## 11. Alur kerja utama

### 11.1 Hari belajar

1. Siswa membuka beranda dan melihat jadwal serta perubahan hari itu.
2. Siswa membuka tugas dari kartu tenggat, membaca instruksi, lalu mengirim pekerjaan.
3. Portal menampilkan bukti waktu pengumpulan dan status yang berasal dari akademik.
4. Siswa membaca pengumuman relevan dan melihat notifikasi baru.

### 11.2 Koreksi profil atau kehadiran

1. Siswa membuka data yang dianggap keliru.
2. Portal menjelaskan data resmi saat ini, batas pengajuan, dan bukti yang diperlukan.
3. Siswa mengirim permintaan; sistem memberikan nomor dan status.
4. Petugas modul pemilik memutuskan; portal memperlihatkan hasil serta alasan yang layak ditampilkan.
5. Riwayat permintaan tersimpan tanpa memberi siswa akses mengedit record resmi langsung.

### 11.3 Pendaftaran kegiatan

Siswa melihat syarat dan kapasitas, mengajukan pendaftaran, memperoleh status sementara, melengkapi persetujuan wali bila wajib, lalu menerima hasil. Pembatalan mengikuti tenggat dan aturan kegiatan. Sistem mencegah pendaftaran ganda.

## 12. Model data konseptual

Portal sebaiknya memakai layanan baca yang menyusun data dari modul pemilik. Entitas khusus portal hanya untuk preferensi tampilan atau status baca, bukan salinan permanen profil/nilai/absensi.

| Entitas | Sumber | Kegunaan |
| --- | --- | --- |
| `Student`, `Person`, `Enrollment` | Administrasi | Identitas dan rombel aktif |
| `TeachingAssignment`, `TimetableSlot`, `ScheduleException` | Akademik | Jadwal pribadi |
| `LearningActivity`, `Submission`, `GradeEntry`, `ReportCardVersion` | Akademik | Tugas dan hasil terbit |
| `AttendanceRecord`, `AttendanceCorrection` | Absensi | Riwayat dan pengajuan koreksi |
| `Announcement`, `Notification`, `ReadReceipt` | Komunikasi | Informasi dan status baca |
| `Activity`, `ActivityRegistration` | Kegiatan | Katalog dan pendaftaran |
| `Achievement`, `ConductRecord` | Kesiswaan | Catatan yang boleh ditampilkan |
| `ServiceRequest`, `ServiceRequestEvent` | Layanan terkait | Pelacakan permintaan |
| `StudentPreference` | Portal | Preferensi UI yang tidak sensitif |

Jika dashboard memakai read model atau cache untuk performa, data harus memiliki sumber, waktu pembaruan, dan strategi invalidasi. Keputusan akses tetap dievaluasi saat membaca; cache tidak boleh membocorkan data antar siswa.

## 13. Rancangan halaman dan navigasi

| Halaman | URL contoh | Isi |
| --- | --- | --- |
| Beranda | `/student/dashboard` | Jadwal, tugas, pengumuman, tindakan |
| Profil | `/student/profile` | Identitas dan permintaan koreksi |
| Riwayat akademik | `/student/academics?term=...` | Mapel dan hasil yang terbit |
| Jadwal | `/student/timetable?week=...` | Sesi dan perubahan |
| Tugas | `/student/assignments?status=open&page=1` | Daftar tugas |
| Detail tugas | `/student/assignments/[activityId]` | Instruksi dan pengumpulan |
| Kehadiran | `/student/attendance?term=...` | Kalender, ringkasan, koreksi |
| Rapor | `/student/report-cards/[reportCardId]` | Rapor terbit |
| Pengumuman | `/student/announcements/[announcementId]` | Isi resmi |
| Kegiatan | `/student/activities/[activityId]` | Detail dan pendaftaran |
| Layanan | `/student/services/requests/[requestId]` | Status permintaan |
| Notifikasi | `/student/notifications` | Kotak masuk pribadi |

Next.js App Router memakai nested layout untuk navigasi siswa dan Dynamic Routes untuk detail. Query string menyimpan filter, semester, minggu, dan pagination yang perlu dibagikan. Intercepting dan Parallel Routes dapat membuka detail pengumuman atau kegiatan sebagai modal dari daftar; akses URL langsung atau refresh menampilkan halaman penuh. Browser Back menutup modal dan Forward membukanya kembali. Detail tugas dengan formulir pengumpulan dan rapor lebih sesuai sebagai halaman penuh.

UI dibuat dengan TypeScript, Tailwind CSS, dan shadcn/ui. TanStack Table digunakan untuk daftar yang membutuhkan sort/filter, dengan pagination server jika data besar. Pada mobile, kartu jadwal/tugas harus mudah dipindai dan aksi utama tetap terlihat. Agentation dipakai untuk inspeksi responsivitas, fokus keyboard, dan perilaku modal.

## 14. Kontrak API awal

NestJS menyediakan endpoint berversi. Untuk data siswa sendiri, gunakan konteks sesi seperti `/me` agar klien tidak bebas memilih ID; backend tetap memeriksa identitas dan scope.

```text
GET    /api/v1/students/me/dashboard
GET    /api/v1/students/me/profile
POST   /api/v1/students/me/profile-correction-requests
GET    /api/v1/students/me/timetable?week=
GET    /api/v1/students/me/assignments?status=&page=
GET    /api/v1/students/me/attendance?termId=
POST   /api/v1/students/me/attendance-correction-requests
GET    /api/v1/students/me/report-cards
GET    /api/v1/students/me/announcements
GET    /api/v1/students/me/activities
POST   /api/v1/students/me/activity-registrations
GET    /api/v1/students/me/service-requests
POST   /api/v1/students/me/service-requests
GET    /api/v1/students/me/notifications
```

Endpoint detail memeriksa hubungan record dengan siswa dalam sesi dan status publikasi. Respons daftar memakai pagination serta filter tervalidasi. Kesalahan konsisten memuat `code`, `message`, `fieldErrors` bila ada, dan `requestId`. Mutasi pengajuan/pendaftaran memakai idempotency key atau constraint unik agar klik ulang tidak menggandakan permintaan.

## 15. Keamanan, privasi, dan aksesibilitas

- Jangan menaruh data pribadi lengkap di URL, query string, log, atau notifikasi eksternal.
- Backend menyaring field dan memeriksa kepemilikan record untuk setiap detail, file, serta ekspor.
- File tugas, rapor, dan lampiran layanan memakai penyimpanan privat serta URL unduh sementara.
- Perubahan data resmi dan akses informasi sensitif dicatat sesuai kebijakan audit.
- Data belum terbit, kasus keselamatan, kesehatan, dan konseling tidak masuk hasil pencarian umum portal.
- Status ditulis dengan teks, tidak hanya warna. Formulir memiliki label dan pesan kesalahan dekat field.
- Loading, data kosong, error, akses ditolak, dan data belum dipublikasikan dibedakan dengan jelas.
- Fokus kembali ke pemicu setelah modal ditutup; semua aksi utama dapat dipakai dengan keyboard dan target sentuh yang memadai.

## 16. Kriteria penerimaan MVP

1. Siswa hanya melihat profil, jadwal, tugas, kehadiran, serta hasil terbit miliknya; URL/API siswa lain ditolak.
2. Beranda memuat informasi dari modul sumber dengan waktu pembaruan dan tetap berguna bila satu sumber gagal.
3. Jadwal berubah sesuai tanggal efektif penempatan rombel dan pengecualian jadwal terbit.
4. Tugas yang belum dibuka atau bukan untuk siswa tersebut tidak dapat diakses melalui deep link.
5. Pengumpulan tugas berhasil hanya setelah file/isi tersimpan dan siswa menerima bukti waktu.
6. Nilai draf dan rapor belum terbit tidak muncul di portal atau respons API.
7. Kehadiran membedakan status final dan koreksi yang masih menunggu.
8. Siswa dapat mengajukan koreksi profil tanpa mengubah data resmi sebelum disetujui.
9. Pengumuman mengikuti audiens; perubahan audiens segera memengaruhi akses.
10. Filter, minggu jadwal, dan halaman daftar bertahan setelah refresh serta Back/Forward.
11. Modal yang dipakai mengikuti URL dan dapat dibuka sebagai halaman penuh melalui direct link.
12. Tampilan mobile, keyboard, loading, kosong, dan error diuji pada alur utama.

## 17. Urutan implementasi

1. Siapkan autentikasi siswa, relasi akun ke profil, dan pemeriksaan scope `/me`.
2. Bangun shell portal, beranda, profil baca, jadwal, serta pengumuman.
3. Hubungkan tugas/pengumpulan dan riwayat akademik dari modul akademik.
4. Tambahkan kehadiran, rapor, serta pengajuan koreksi.
5. Tambahkan kegiatan dan katalog layanan berdasarkan kesiapan modul pemilik.
6. Lakukan pengujian lintas peran, deep link, mobile, dan aksesibilitas.

## 18. Keputusan terbuka

- Usia/jenjang siswa dan kebutuhan pembatasan fitur menurut kelompok umur.
- Data profil apa yang boleh dilihat atau diajukan perubahannya oleh siswa.
- Kapan nilai, umpan balik, kehadiran, dan rapor dianggap resmi untuk ditampilkan.
- Kebijakan akses riwayat setelah siswa lulus atau keluar.
- Kategori prestasi dan catatan perilaku yang boleh tampil, beserta proses keberatan/koreksi.
- Jenis layanan awal, penanggung jawab, target respons, serta lampiran yang diperlukan.
- Apakah kegiatan membutuhkan persetujuan wali, pembatasan kapasitas, atau pembayaran.
- Kanal notifikasi dan informasi apa yang boleh keluar dari aplikasi.

Keputusan ini perlu disepakati bersama pemilik proses sebelum desain database dan layar portal difinalkan.
