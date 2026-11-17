# Parent & Guardian Portal

Dokumen ini merinci poin 9 dari [Smart School Management Ecosystem](smart_school_management_ecosystem.md). Portal wali menyatukan informasi anak yang boleh diakses dan menyediakan jalur tindakan resmi antara rumah dan sekolah. Identitas serta hubungan wali bersumber dari [Administrasi Sekolah](school_administration_management.md); informasi akademik dari [Academic Management System](academic_management_system.md); kehadiran dari [Attendance Management System](attendance_management_system.md). Tampilan lokasi mengikuti kebijakan [Student Location & Campus Tracking](student_location_campus_tracking.md).

**Status:** rancangan awal. Hak setiap wali, terutama untuk pembayaran, penjemputan, lokasi, dan informasi keselamatan, perlu diputuskan sekolah sebelum implementasi.

## 1. Tujuan dan batas portal

Portal harus membantu wali mengetahui informasi yang sudah resmi diterbitkan, menindaklanjuti tugas administratif, dan berkomunikasi dengan sekolah tanpa perlu mencari di banyak kanal. Portal adalah antarmuka lintas modul; data nilai, absensi, tagihan, dan kasus tidak dibuat ulang sebagai master portal.

| Melalui portal wali | Pemilik proses |
| --- | --- |
| Profil anak, hubungan wali, permintaan koreksi | Administrasi sekolah |
| Jadwal, tugas, nilai, rapor, kalender | Akademik |
| Kehadiran, izin, koreksi | Absensi |
| Tagihan, pembayaran, bukti transaksi | Keuangan |
| Pengumuman, pesan, notifikasi | Komunikasi |
| Kegiatan dan persetujuan | Ekstrakurikuler/kegiatan |
| Izin keluar/penjemputan | Keamanan kampus |
| Lokasi terbatas, status insiden yang boleh dibagikan | Lokasi dan safeguarding sesuai kebijakan khusus |

Portal web responsif menjadi cakupan awal. Notifikasi email/push mengarahkan wali ke halaman yang tepat setelah login; konten pribadi tidak dikirim lengkap di kanal eksternal.

## 2. Identitas wali, hubungan anak, dan hak per anak

Satu wali dapat terkait dengan beberapa anak dan seorang anak dapat memiliki beberapa wali. `StudentGuardian` menyimpan jenis hubungan, status verifikasi, tanggal berlaku, serta hak per kategori: melihat akademik, menerima notifikasi absensi, mengajukan izin, membayar tagihan, menerima informasi lokasi, dan menjadi penjemput bila diizinkan. Hak tersebut tidak perlu selalu sama untuk semua wali.

Alur aktivasi: admin membuat hubungan → undangan dikirim ke kontak yang diverifikasi → wali mengaktifkan akun → sekolah memverifikasi hubungan/hak → anak muncul di portal. Sebelum verifikasi, portal tidak menampilkan nama atau data anak yang dapat mengungkap relasi. Perubahan hak atau berakhirnya hubungan berlaku segera pada API dan unduhan file. Pengajuan akses anak tambahan harus ditinjau, bukan dicocokkan hanya dari nama/NIS yang dimasukkan pengguna.

Pada portal beberapa anak, pemilih anak selalu menunjukkan nama dan rombel yang aman, dengan konteks anak aktif terlihat di semua halaman. Mutasi seperti izin atau pembayaran menampilkan nama anak sekali lagi sebelum dikirim agar tidak salah sasaran. URL menggunakan ID internal; backend tetap memeriksa hubungan wali aktif pada setiap permintaan.

## 3. Beranda dan navigasi wali

Beranda menunjukkan kartu per anak: jadwal atau kegiatan terdekat, tugas yang perlu perhatian, kehadiran terbaru, pengumuman belum dibaca, tagihan jatuh tempo, dan permintaan yang menunggu keputusan. Prioritas dan jumlah harus memiliki definisi serta waktu pembaruan. Jika modul sumber gagal, kartu terkait menampilkan error lokal sementara kartu lain tetap berfungsi.

Navigasi utama yang disarankan: Beranda, Anak, Akademik, Kehadiran, Kalender, Tagihan, Pesan, Pengumuman, Layanan, dan Pengaturan. Untuk lebih dari satu anak, setiap halaman detail menampilkan identitas anak aktif dan tautan cepat untuk beralih anak tanpa kehilangan jenis halaman jika data tersedia.

## 4. Profil dan perkembangan akademik anak

Wali melihat profil administratif minimum anak: nama resmi, rombel aktif, tahun ajaran, wali kelas, dan kontak sekolah. Data pribadi atau dokumen sensitif hanya tersedia bila haknya mengizinkan. Wali dapat mengajukan koreksi identitas atau kontak melalui alur administrasi; perubahan tidak langsung mengubah data resmi.

Halaman akademik menampilkan jadwal terbit, tugas dan tenggat, hasil yang sudah dipublikasikan, serta rapor digital terbit. Nilai draf, rapor dalam proses persetujuan, atau catatan internal guru tidak muncul. Untuk siswa yang pindah kelas, riwayat ditampilkan menurut periode dan rombel yang berlaku saat itu. Rapor yang pernah diterbitkan disajikan sebagai versi snapshot; revisi diberi label dan alasan yang layak dibagikan.

Wali dapat melihat ringkasan perkembangan dengan definisi metrik yang jelas, misalnya tugas belum dikumpulkan atau nilai yang sudah terbit. Grafik tidak boleh membuat diagnosis atau menyimpulkan penyebab kesulitan belajar. Pertanyaan tentang hasil belajar diarahkan ke kanal komunikasi resmi dengan guru/wali kelas.

## 5. Kehadiran dan pengajuan izin

Wali melihat kalender/ringkasan kehadiran anak sesuai periode dan status final. Catatan sementara, terlambat sinkron, atau sedang dikoreksi diberi label berbeda. Ringkasan menjelaskan cara menghitung hari/sesi serta tidak menyamakan belum diisi dengan alpa.

Jika sekolah mengizinkan, wali mengajukan izin/sakit dengan tanggal/sesi, kategori, alasan, dan lampiran yang diperlukan. Portal menampilkan batas waktu serta status: diajukan, perlu informasi, disetujui, ditolak, atau dibatalkan. Wali dapat meminta koreksi absensi, tetapi tidak mengubah catatan final sendiri. Lampiran kesehatan disimpan privat dan tidak muncul pada pesan atau dashboard umum.

Notifikasi ketidakhadiran dikirim setelah kondisi yang ditentukan sekolah terpenuhi. Jika status berubah, wali menerima koreksi sesuai kebijakan. Portal menampilkan waktu pencatatan dan waktu pembaruan agar keterlambatan perangkat tidak disalahartikan sebagai kejadian baru.

## 6. Jadwal, kalender, dan kegiatan

Jadwal mingguan anak menampilkan mapel, guru, waktu, ruang/gedung, serta perubahan atau pembatalan sesi. Kalender menggabungkan kegiatan akademik terbit, ujian, tenggat tugas, dan kegiatan ekstrakurikuler anak. Setiap agenda memiliki halaman detail yang dapat dibuka melalui URL langsung.

Untuk ekstrakurikuler, wali dapat melihat pendaftaran anak dan memberi persetujuan bila diwajibkan. Persetujuan menampilkan kegiatan, jadwal, biaya bila ada, risiko/persyaratan yang relevan, serta masa berlaku. Pembatalan persetujuan mengikuti aturan kegiatan dan tercatat. Pembayaran kegiatan dikelola modul keuangan, bukan formulir kegiatan.

## 7. Pengumuman dan pesan resmi

Pengumuman ditargetkan ke seluruh sekolah, tingkat, rombel, kegiatan, atau wali tertentu. Wali hanya melihat pengumuman yang audiensnya mencakup dirinya atau anak terkait. Pengumuman penting dapat meminta tanda baca, tetapi tanda baca tidak disamakan dengan persetujuan substantif.

Pesan resmi antara wali dan wali kelas/guru/staf memiliki topik, peserta, anak terkait, waktu, lampiran, serta status. Aturan siapa boleh memulai percakapan, jam respons, eskalasi, dan arsip ditetapkan sekolah. Pesan tidak dipakai untuk keadaan darurat; portal menampilkan jalur bantuan yang benar. Guru hanya melihat pesan untuk siswa/kelas yang menjadi penugasannya pada periode berlaku. Saat penugasan guru berakhir, akses percakapan historis mengikuti kebijakan dan kebutuhan kerja.

## 8. Tagihan dan pembayaran

Wali dengan hak pembayaran dapat melihat tagihan anak, komponen biaya, jatuh tempo, status belum dibayar/sebagian/lunas/dibatalkan, riwayat pembayaran, dan bukti transaksi. Untuk wali dengan beberapa anak, pembayaran harus jelas dialokasikan ke tagihan anak yang mana. Jika pembayaran diproses gateway, portal menampilkan status menunggu verifikasi sampai callback terkonfirmasi; tampilan sukses di browser saja bukan bukti final.

Hak melihat tagihan dan hak membayar dapat dipisah. Informasi beasiswa/keringanan hanya muncul sesuai kebijakan privasi. Ketidaksesuaian pembayaran menyediakan jalur laporan masalah dengan nomor transaksi, tanpa meminta wali mengirim data kartu atau rahasia pembayaran lewat pesan biasa.

## 9. Informasi keselamatan, insiden, lokasi, dan penjemputan

### 9.1 Keselamatan dan insiden

Portal hanya menampilkan informasi keselamatan anak yang telah diputuskan boleh dibagikan oleh petugas berwenang. Detail pelapor, korban lain, pihak terlapor, catatan konseling, dan investigasi tidak muncul pada ringkasan. Notifikasi eksternal cukup menyebut ada pembaruan penting dan meminta wali membuka aplikasi. Alur pelaporan dari wali menuju kanal safeguarding dengan penjelasan batas kerahasiaan serta bantuan darurat.

### 9.2 Lokasi

Hak lokasi terpisah dari hak profil anak. Jika diaktifkan, tampilkan zona terakhir terdeteksi, waktu deteksi, dan status kesegaran/akurasi. “Tidak tersedia”, “di luar jam cakupan”, dan “data usang” dibedakan. Jangan menampilkan lokasi real-time bila sistem hanya menerima event gerbang atau sinyal berkala. Riwayat detail tidak tersedia secara default. Semua pembacaan mengikuti kebijakan lokasi dan audit.

### 9.3 Izin keluar dan penjemputan

Wali yang berwenang dapat mengajukan izin keluar lebih awal dan memilih penjemput yang diizinkan. Hak portal atau hubungan wali tidak otomatis memberi hak menjemput. Portal menunjukkan status persetujuan dan status pelepasan, sedangkan verifikasi fisik tetap dilakukan petugas gerbang. Perubahan penjemput mendadak memerlukan alur verifikasi ulang dan tidak boleh cukup dengan mengubah teks di aplikasi.

## 10. Pusat notifikasi dan preferensi

Notifikasi dikelompokkan menurut anak dan jenis: akademik, absensi, administrasi, pembayaran, kegiatan, komunikasi, serta keselamatan. Setiap item menautkan ke halaman yang masih memeriksa izin saat dibuka. Wali dapat mengatur kanal untuk notifikasi biasa sesuai kebijakan; pemberitahuan keselamatan mendesak memiliki aturan terpisah. Status terkirim, gagal, dibaca, dan tindakan selesai adalah keadaan berbeda.

Jika satu keluarga memiliki beberapa wali, sekolah menentukan penerima per kategori. Jangan menganggap nomor telepon utama otomatis berhak menerima semua informasi. Notifikasi yang sudah terlanjur dikirim tidak dapat ditarik dari kanal eksternal; karena itu payload harus minim data pribadi.

## 11. Layanan dan permintaan wali

Katalog layanan awal dapat mencakup koreksi profil anak, izin absensi, surat administrasi, pertanyaan tagihan, perubahan kontak, persetujuan kegiatan, dan izin keluar. Setiap permintaan memiliki nomor, anak terkait, status, unit penanggung jawab, waktu, lampiran, serta riwayat keputusan. Permintaan yang diajukan untuk anak yang hak aksesnya telah dicabut tidak boleh tetap bisa dibuka hanya lewat tautan lama.

Portal memperlihatkan langkah berikutnya, misalnya “lengkapi dokumen”, “menunggu sekolah”, atau “selesai”. Pesan penolakan menjelaskan alasan yang aman untuk dibagikan dan cara mengajukan ulang bila relevan. Kasus keselamatan menggunakan kanal khusus, bukan tiket layanan umum.

## 12. Alur kerja utama

### 12.1 Aktivasi wali

1. Admin membuat hubungan wali-anak dan hak yang diperlukan.
2. Undangan dikirim ke kontak terverifikasi; wali mengaktifkan akun.
3. Admin menyelesaikan verifikasi hubungan dan batas hak.
4. Anak muncul di portal; setiap modul hanya membuka data sesuai hak kategori.
5. Perubahan atau pencabutan hak berlaku segera pada API dan file privat.

### 12.2 Wali menindaklanjuti ketidakhadiran

1. Wali menerima notifikasi ringkas setelah status memenuhi aturan sekolah.
2. Wali membuka detail kehadiran anak setelah login.
3. Jika perlu, wali mengajukan izin/koreksi dengan alasan dan bukti.
4. Petugas absensi meninjau dan memutuskan; portal menampilkan hasil final.

### 12.3 Membayar tagihan

1. Wali memilih anak dan tagihan, lalu meninjau komponen serta nominal.
2. Portal mengarahkan ke metode pembayaran yang disediakan.
3. Status menunggu ditampilkan sampai konfirmasi backend/gateway diterima.
4. Setelah rekonsiliasi, bukti dan alokasi pembayaran tersedia untuk wali berwenang.

## 13. Model data konseptual

Portal memakai data dari modul pemilik. Entitas lokal hanya untuk preferensi dan ringkasan baca yang memang diperlukan; jangan membuat salinan master nilai, absensi, dan tagihan.

| Entitas | Sumber | Kegunaan |
| --- | --- | --- |
| `Guardian`, `StudentGuardian`, `GuardianPermission` | Administrasi | Relasi terverifikasi dan hak per anak |
| `Student`, `Enrollment`, `ClassGroup` | Administrasi | Konteks anak dan rombel |
| `TimetableSlot`, `LearningActivity`, `GradeEntry`, `ReportCardVersion` | Akademik | Jadwal, tugas, hasil terbit |
| `StudentAttendanceRecord`, `AbsenceRequest` | Absensi | Kehadiran dan izin |
| `Invoice`, `Payment`, `PaymentAllocation` | Keuangan | Tagihan dan transaksi |
| `Announcement`, `MessageThread`, `Notification`, `ReadReceipt` | Komunikasi | Informasi serta percakapan |
| `ActivityRegistration`, `GuardianConsent` | Kegiatan | Persetujuan dan status |
| `StudentExitPermit`, `PickupAuthorization` | Keamanan | Izin keluar dan penjemput |
| `LastKnownZone`, `TrackingPolicyVersion` | Lokasi | Status terbatas sesuai hak |
| `GuardianPreference`, `GuardianServiceRequest` | Portal/layanan | Preferensi serta permintaan lintas modul |

Jika dashboard memakai cache/read model, setiap item menyimpan sumber dan waktu pembaruan. Kunci cache harus mencakup akun wali, anak, dan versi hak akses; pencabutan hak menginvalidasi cache. Field yang tidak boleh dibaca tidak dikirim lalu disembunyikan di frontend.

## 14. Rancangan halaman dan URL

| Halaman | URL contoh | Fungsi |
| --- | --- | --- |
| Beranda wali | `/guardian/dashboard` | Ringkasan semua anak dan tindakan |
| Profil anak | `/guardian/children/[studentId]` | Data resmi yang boleh dilihat |
| Akademik | `/guardian/children/[studentId]/academics?term=...` | Mapel dan hasil terbit |
| Jadwal | `/guardian/children/[studentId]/timetable?week=...` | Jadwal pribadi |
| Kehadiran | `/guardian/children/[studentId]/attendance?month=...` | Rekap dan izin |
| Rapor | `/guardian/children/[studentId]/report-cards/[reportCardId]` | Rapor terbit |
| Tagihan | `/guardian/children/[studentId]/invoices/[invoiceId]` | Detail dan pembayaran |
| Kegiatan | `/guardian/children/[studentId]/activities/[activityId]` | Persetujuan |
| Izin keluar | `/guardian/children/[studentId]/exit-permits/[permitId]` | Status izin |
| Lokasi | `/guardian/children/[studentId]/location` | Informasi terbatas |
| Pengumuman | `/guardian/announcements/[announcementId]` | Informasi resmi |
| Pesan | `/guardian/messages/[threadId]` | Percakapan resmi |
| Permintaan | `/guardian/requests/[requestId]` | Status layanan |
| Pengaturan | `/guardian/settings` | Kontak dan preferensi |

Next.js App Router memakai nested layout portal wali, Dynamic Routes untuk anak/detail, serta query string untuk periode, minggu, filter, dan pagination. Intercepting/Parallel Routes cocok untuk detail pengumuman atau tagihan dari daftar jika modal membantu; URL langsung/refresh menampilkan halaman penuh. Back menutup modal, Forward membukanya lagi. Alur pembayaran dan formulir izin yang panjang lebih aman sebagai halaman penuh. Setiap pergantian anak memicu pemeriksaan izin baru di NestJS.

UI memakai TypeScript, Tailwind CSS, shadcn/ui, serta TanStack Table untuk daftar tagihan/permintaan bila diperlukan. Mobile memprioritaskan pemilih anak yang selalu jelas dan aksi yang dekat tenggat. Agentation dipakai untuk inspeksi responsivitas, fokus modal, dan kemungkinan salah memilih anak.

## 15. Kontrak API awal

NestJS menyediakan endpoint berversi, DTO tervalidasi, pemeriksaan hak per anak, pagination, serta kesalahan konsisten (`code`, `message`, `fieldErrors`, `requestId`).

```text
GET    /api/v1/guardians/me/children
GET    /api/v1/guardians/me/dashboard
GET    /api/v1/guardians/me/children/:studentId/profile
GET    /api/v1/guardians/me/children/:studentId/timetable?week=
GET    /api/v1/guardians/me/children/:studentId/academics?termId=
GET    /api/v1/guardians/me/children/:studentId/attendance?month=
POST   /api/v1/guardians/me/children/:studentId/absence-requests
GET    /api/v1/guardians/me/children/:studentId/report-cards
GET    /api/v1/guardians/me/children/:studentId/invoices
GET    /api/v1/guardians/me/children/:studentId/location
POST   /api/v1/guardians/me/children/:studentId/exit-permits
GET    /api/v1/guardians/me/messages
POST   /api/v1/guardians/me/messages
GET    /api/v1/guardians/me/notifications
```

Setiap endpoint detail memeriksa hubungan wali aktif, izin kategori, status publikasi sumber, dan hak file. Respons 403/404 tidak boleh membuka keberadaan anak atau kasus kepada wali yang tidak berwenang. Mutasi izin, persetujuan, dan pembayaran memakai idempotency key/constraint unik; perubahan bersamaan menghasilkan `409` dengan keadaan terbaru.

## 16. Keamanan, privasi, dan aksesibilitas

- Terapkan hak per anak dan per kategori pada backend; menu tersembunyi bukan kontrol keamanan.
- Sesi aman dan MFA untuk tindakan berisiko sesuai kebijakan; perubahan kontak login memerlukan verifikasi ulang.
- Jangan menaruh nama anak, alasan sakit, lokasi, atau isi pesan sensitif di URL, log, dan notifikasi eksternal.
- File rapor, bukti pembayaran, serta lampiran izin memakai penyimpanan privat dan URL sementara.
- Catat perubahan hak wali, unduhan dokumen sensitif, akses lokasi, pembayaran, dan pengajuan penting.
- Tampilkan loading, belum ada data, data belum terbit, error sumber, akses ditolak, dan hak dicabut sebagai keadaan berbeda.
- Semua formulir memiliki label, pesan validasi dekat field, ringkasan anak yang sedang diproses, serta navigasi keyboard.
- Status dan tenggat tidak hanya memakai warna; modal mengembalikan fokus saat ditutup.

## 17. Kriteria penerimaan MVP

1. Wali hanya melihat anak yang hubungan dan haknya terverifikasi; ID atau URL anak lain ditolak oleh API.
2. Pencabutan hak segera menutup halaman, file, dan cache yang sebelumnya dapat diakses.
3. Pemilih anak terlihat jelas pada semua halaman detail dan mutasi menegaskan anak yang dipilih.
4. Nilai draf, rapor belum terbit, alasan kesehatan pribadi, dan catatan kasus internal tidak muncul.
5. Kehadiran membedakan catatan final, pending, dan koreksi yang sedang diproses.
6. Tagihan menampilkan status menunggu sampai pembayaran benar-benar terkonfirmasi di backend.
7. Lokasi hanya muncul jika hak khusus aktif dan selalu mencantumkan waktu/akurasi; data usang tidak disebut real-time.
8. Izin keluar tidak otomatis mengesahkan penjemput tanpa verifikasi terpisah.
9. Pengumuman dan pesan hanya tersedia untuk audiens serta penugasan yang sesuai.
10. Filter, periode, pemilih anak, dan modal yang memakai URL bertahan setelah refresh serta Back/Forward.
11. Alur mobile/keyboard, loading, kosong, error, dan akses ditolak diuji pada dua anak dengan hak berbeda.

## 18. Urutan implementasi

1. Finalkan verifikasi hubungan wali dan matriks hak per anak.
2. Bangun autentikasi, pemilih anak, shell portal, profil baca, jadwal, dan pengumuman.
3. Hubungkan akademik, absensi, izin, serta rapor terbit.
4. Tambahkan tagihan/pembayaran dan komunikasi resmi setelah modul sumber siap.
5. Tambahkan kegiatan, penjemputan, dan layanan sesuai SOP masing-masing.
6. Aktifkan lokasi serta informasi insiden hanya setelah kebijakan khusus dan pengujian akses selesai.

## 19. Keputusan terbuka

- Jenis wali dan hak default tiap jenis; bagaimana sengketa atau pembatasan hak ditangani.
- Metode verifikasi hubungan, perubahan kontak, serta penambahan anak ke akun yang sudah aktif.
- Informasi akademik/absensi yang boleh dilihat dan kapan data dianggap terbit.
- Siapa dapat mengajukan izin, menyetujui kegiatan, melihat tagihan, dan membayar.
- Apakah hak penjemput terpisah dari hak wali portal dan bagaimana verifikasinya.
- Kapan orang tua diberi informasi insiden dan siapa menyetujui isi pesan.
- Apakah lokasi ditampilkan, pada jam apa, dengan tingkat rincian apa, dan berapa lama riwayat disimpan.
- Kanal komunikasi, jam layanan guru/staf, dan kebijakan arsip pesan.
- Jenis notifikasi wajib vs opsional serta penerima ketika ada beberapa wali.
- Akses portal setelah siswa lulus, pindah, atau hubungan wali berakhir.

Keputusan ini menjadi dasar skema Prisma, aturan izin NestJS, halaman Next.js, dan pengujian lintas wali-anak.
