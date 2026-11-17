# Teacher & Staff Management

Dokumen ini merinci poin 4 dari [Smart School Management Ecosystem](smart_school_management_ecosystem.md). Modul ini mengelola siklus kerja guru dan staf: penugasan, jadwal kerja, kehadiran pegawai, cuti/izin, beban kerja, dan evaluasi kinerja. Identitas resmi pegawai, akun, unit organisasi, dan jabatan bersumber dari [School Administration & Management](school_administration_management.md). Penugasan mengajar dan jadwal pelajaran terhubung dengan [Academic Management System](academic_management_system.md).

**Status:** rancangan awal. Aturan ketenagakerjaan, jadwal kerja, cuti, dan evaluasi harus disepakati sekolah sebelum implementasi.

## 1. Tujuan dan batas modul

Modul harus menjawab siapa bertugas pada periode tertentu, kapan ia dijadwalkan bekerja atau mengajar, bagaimana kehadiran dan izin dicatat, serta apakah beban kerja dan tindak lanjut kinerja dapat ditelusuri. Riwayat tidak boleh hilang ketika pegawai pindah unit, berganti jabatan, atau berhenti bekerja.

| Dalam modul ini | Sumber atau modul lain |
| --- | --- |
| Profil kerja tambahan, status penugasan, jadwal kerja nonakademik | Identitas, status pegawai, unit dan jabatan resmi dari administrasi |
| Penugasan tugas tambahan dan tanggung jawab | Penugasan mapel/rombel dan jadwal mengajar dari akademik |
| Kehadiran, koreksi, cuti, izin, dan pengganti sementara | Perangkat check-in dari modul absensi/integrasi |
| Perhitungan beban kerja dan evaluasi kinerja | Penggajian atau kompensasi, jika kelak ada, merupakan domain terpisah |

Data gaji, kontrak, catatan kesehatan, dan kasus disiplin tidak otomatis masuk modul ini. Bila diperlukan, masing-masing harus memiliki akses dan retensi khusus.

## 2. Peran dan kewenangan

| Peran | Kewenangan utama | Batasan |
| --- | --- | --- |
| Admin SDM/kepegawaian | Mengelola aturan kerja, penugasan, koreksi administratif, laporan | Akses data sensitif sesuai mandat |
| Kepala sekolah | Menyetujui penugasan dan izin tertentu, melihat agregat | Tidak otomatis melihat seluruh catatan evaluasi pribadi |
| Kepala unit/atasan | Menyetujui izin, memantau tim, melakukan evaluasi yang ditugaskan | Hanya pegawai dalam struktur dan periode berlaku |
| Koordinator kurikulum | Meninjau penugasan dan beban mengajar | Tidak mengubah catatan kehadiran tanpa izin |
| Guru/staf | Melihat jadwal, kehadiran, tugas, mengajukan izin/cuti dan koreksi | Hanya data pribadi dan tugas sendiri |
| Petugas absensi | Meninjau anomali dan koreksi kehadiran | Tidak melihat evaluasi kinerja |
| Auditor internal | Membaca catatan sesuai mandat berbatas waktu | Tanpa mutasi |

Contoh izin: `employee.work.read`, `assignment.manage`, `work-schedule.publish`, `staff-attendance.review`, `leave.approve`, `workload.read`, `performance.evaluate`, `staff-report.export`. Semua izin tetap dibatasi scope pegawai, unit, sekolah, dan tanggal penugasan. Atasan lama kehilangan akses evaluasi aktif ketika hubungan pelaporan berakhir, kecuali ada mandat audit.

## 3. Profil kerja dan siklus pegawai

Profil kerja menampilkan jenis pegawai, unit aktif, jabatan, atasan, lokasi kerja utama, tanggal mulai, status kerja, dan kontak kerja. `Employee` dan `Person` tetap dimiliki administrasi. Modul ini menyimpan preferensi kerja serta aturan yang terkait operasional, misalnya pola jadwal, kelayakan cuti, dan keterampilan/sertifikasi jika dibutuhkan.

Status administratif contoh: aktif, cuti panjang, nonaktif sementara, dan berhenti. Tanggal efektif mengendalikan akses tugas baru. Perubahan status tidak menghapus kehadiran atau evaluasi lama. Saat pegawai berhenti, sistem menutup penugasan aktif, menandai cuti terbuka untuk penyelesaian, dan meminta peninjauan akun melalui modul administrasi.

## 4. Penugasan dan tanggung jawab

### 4.1 Jenis penugasan

- **Mengajar:** guru, mapel, rombel/kelompok, semester, peran guru utama atau pendamping; sumber resmi modul akademik.
- **Wali kelas:** penugasan pada rombel dengan tanggal mulai/akhir; sumber resmi administrasi.
- **Tugas tambahan:** koordinator, pembina ekstrakurikuler, piket, pengawas ujian, pengelola laboratorium/perpustakaan, atau proyek sekolah.
- **Tugas operasional:** shift keamanan, layanan administrasi, UKS, teknisi, dan tugas berbasis unit.

Setiap penugasan memuat pemberi tugas, penerima, unit, cakupan, tanggal berlaku, estimasi beban, status draf/aktif/selesai/dibatalkan, serta dokumen persetujuan bila diperlukan. Hindari satu kolom teks bebas yang menimpa tugas lama. Penugasan dapat memiliki pengganti sementara; pengganti memperoleh akses terbatas selama periode tersebut, lalu akses dicabut otomatis.

### 4.2 Aturan benturan

Sistem menandai benturan waktu antar jadwal mengajar, shift, piket, cuti yang disetujui, dan penugasan lain yang wajib hadir. Benturan tidak selalu berarti larangan: beberapa tugas asinkron boleh tumpang tindih. Aturan jenis penugasan menentukan apakah benturan diblokir atau memerlukan alasan pengecualian. Perubahan jadwal terbit memicu pemeriksaan ulang dan pemberitahuan pihak terkait.

## 5. Jadwal kerja dan tugas

`WorkSchedule` memuat pola hari kerja atau shift per pegawai/unit, jam mulai/akhir, lokasi, periode berlaku, dan aturan toleransi. `WorkShift` adalah kejadian terjadwal; libur dan pengecualian dicatat terpisah. Jadwal mengajar dari akademik ditampilkan dalam kalender pegawai yang sama, tetapi tidak disalin sebagai master baru.

Tampilan pegawai menunjukkan jadwal hari/minggu, lokasi dan tugas, perubahan mendadak, serta siapa yang harus dihubungi bila berhalangan. Admin/atasan melihat cakupan tim dan celah penugasan. Kalender lintas modul perlu menandai sumber setiap item agar perubahan dilakukan di modul pemilik.

## 6. Kehadiran guru dan staf

### 6.1 Pencatatan

Kehadiran dapat berasal dari input petugas, web check-in, QR/NFC, atau perangkat lain setelah integrasi dinilai layak. Catatan mentah `AttendanceEvent` menyimpan sumber, waktu, lokasi/perangkat jika relevan, dan identitas yang dipetakan. Hasil harian `StaffAttendanceRecord` mengolah event terhadap jadwal, libur, serta izin yang disetujui. Kehadiran mengajar per sesi, bila diperlukan, dibedakan dari kehadiran kerja harian.

Status contoh: hadir, terlambat, pulang awal, izin, sakit, cuti, dinas luar, alpa, dan belum diverifikasi. Satu hari bisa memiliki beberapa event check-in/out tetapi satu hasil rekap final per aturan. Sistem tidak menyamakan event perangkat yang hilang dengan alpa sebelum proses verifikasi. Pegawai dapat melihat sumber dan status, lalu mengajukan koreksi dengan alasan/bukti.

### 6.2 Koreksi dan persetujuan

Koreksi membuat permintaan terpisah berisi catatan awal, nilai usulan, alasan, lampiran, pemohon, dan batas pengajuan. Atasan atau petugas berwenang menyetujui/menolak; petugas yang mengajukan tidak menyetujui permintaannya sendiri jika kebijakan memerlukan pemisahan tugas. Hasil final menyimpan nilai lama, nilai baru, waktu, serta aktor. Data perangkat mentah tidak dihapus untuk menutupi koreksi.

## 7. Cuti dan izin

Jenis cuti/izin dikonfigurasi sesuai kebijakan sekolah: cuti tahunan, sakit, izin pribadi, dinas luar, dan jenis lain. `LeavePolicy` berisi kelayakan, kuota bila ada, satuan hari/jam, aturan hari libur, bukti, tenggat, dan jalur persetujuan. Saldo cuti dihitung dari hak, penyesuaian, serta cuti yang disetujui; setiap penyesuaian memiliki alasan dan audit.

Alur: pegawai memilih jenis dan rentang waktu → sistem menampilkan dampak pada jadwal/tugas serta saldo → atasan/SDM meninjau → disetujui, ditolak, atau diminta perbaikan → jadwal dan kehadiran diperbarui sesuai tanggal efektif. Permintaan tidak boleh disetujui bila melampaui hak tanpa pengecualian resmi. Pembatalan setelah persetujuan membutuhkan alur dan jejak perubahan.

Untuk guru, cuti yang menyentuh sesi mengajar harus masuk antrean penetapan guru pengganti atau penjadwalan ulang. Persetujuan cuti dan penetapan pengganti adalah dua keputusan yang dapat memiliki penanggung jawab berbeda; UI harus memperlihatkan status keduanya.

## 8. Beban kerja

Beban kerja menggabungkan jam mengajar terjadwal, wali kelas, piket, pembinaan, tugas organisasi, dan tugas operasional menurut bobot kebijakan sekolah. Definisi `WorkloadRule` berversi per periode; laporan memperlihatkan sumber jam/bobot, bukan hanya angka total. Perbandingan dengan target minimum/maksimum menandai kekurangan atau kelebihan, tetapi tidak otomatis menilai kinerja pegawai.

Perhitungan harus menangani penugasan parsial, tanggal efektif, pengganti sementara, kelas yang dibatalkan, dan tugas yang tidak dihitung sebagai jam tatap muka. Data beban kerja historis dipertahankan berdasarkan aturan yang berlaku saat periode ditutup. Koordinator dapat memodelkan perubahan penugasan sebelum menerbitkannya.

## 9. Evaluasi kinerja

Evaluasi menggunakan siklus yang jelas: periode, kriteria/rubrik berversi, evaluator, pegawai yang dinilai, bukti, skor atau narasi, umpan balik, dan status. Status contoh: draf evaluator, diajukan, ditinjau, dibagikan ke pegawai, ditanggapi, final. Pegawai dapat melihat hasil yang telah dibagikan dan mengajukan tanggapan menurut kebijakan. Perubahan setelah final membuat revisi beralasan, bukan menimpa hasil lama.

Kriteria dapat mencakup pelaksanaan tugas, ketepatan administrasi, pengembangan profesional, dan kontribusi sekolah; detailnya ditetapkan sekolah. Kehadiran atau nilai siswa tidak boleh otomatis menjadi satu-satunya ukuran kinerja. Akses bukti dan komentar dibatasi evaluator, pegawai, atasan, dan SDM yang berwenang. Laporan manajemen memakai agregat yang sesuai, tanpa membuka catatan pribadi secara luas.

## 10. Dashboard dan laporan

Dashboard pegawai: agenda hari ini, tugas yang perlu tindakan, status kehadiran, saldo cuti bila relevan, permintaan yang menunggu, serta pemberitahuan pengganti. Dashboard atasan: celah jadwal, permintaan izin menunggu, anomali kehadiran, dan penugasan yang akan berakhir. Dashboard SDM: kelengkapan data, beban kerja, status persetujuan, serta tren agregat.

Laporan awal: daftar penugasan per periode/unit, jadwal kerja, rekap kehadiran, keterlambatan, cuti/izin, saldo cuti, beban kerja, dan status siklus evaluasi. Filter mencakup periode, unit, jenis pegawai, status, serta lokasi. Ekspor mengikuti izin dan tercatat dalam audit; data evaluasi pribadi tidak tercampur ke ekspor umum.

## 11. Alur kerja prioritas

### 11.1 Persiapan semester

1. Administrasi menetapkan pegawai, unit, jabatan, rombel, dan tahun ajaran aktif.
2. Akademik membuat penugasan mengajar dan jadwal pelajaran.
3. SDM/atasan membuat shift, piket, dan tugas tambahan.
4. Sistem memeriksa benturan dan beban kerja; pihak berwenang meninjau pengecualian.
5. Jadwal dan penugasan diterbitkan, lalu tampil di kalender pegawai.

### 11.2 Izin mendadak guru

1. Guru mengajukan izin atau admin mencatat ketidakhadiran dengan alasan.
2. Sistem mengidentifikasi sesi mengajar serta tugas yang terdampak.
3. Atasan memutuskan izin; koordinator akademik menetapkan pengganti atau perubahan jadwal.
4. Pegawai, pengganti, dan kelas terkait menerima informasi yang telah disetujui.
5. Kehadiran dan riwayat penugasan mencerminkan keputusan final.

### 11.3 Koreksi kehadiran

Pegawai memilih tanggal dan menjelaskan perbedaan, melampirkan bukti bila wajib. Petugas membandingkan jadwal, event mentah, dan izin. Keputusan memperbarui rekap final dan audit, sedangkan event mentah tetap tersimpan.

## 12. Model data konseptual

| Entitas | Field penting | Aturan/relasi |
| --- | --- | --- |
| `Employee` | personId, status, unit | Master dari administrasi |
| `StaffAssignment` | employeeId, jenis, unit, mulai/akhir, status | Tugas tambahan/operasional; berversi waktu |
| `AssignmentSubstitute` | assignmentId, substituteId, periode | Akses sementara mengikuti periode |
| `WorkSchedule`, `WorkShift` | pola, tanggal, jam, lokasi | Tidak menyalin jadwal akademik |
| `StaffAttendanceEvent` | employeeId, timestamp, sumber, deviceRef | Event mentah immutable |
| `StaffAttendanceRecord` | employeeId, tanggal, status, waktu efektif | Satu hasil final per aturan harian |
| `StaffAttendanceCorrection` | recordId, usulan, alasan, keputusan | Riwayat nilai lama/baru |
| `LeavePolicy`, `LeaveEntitlement`, `LeaveRequest` | jenis, kuota, periode, status | Saldo dihitung dari transaksi hak/cuti |
| `WorkloadRule`, `WorkloadSnapshot` | bobot, sumber, total, periode | Aturan dan hasil historis berversi |
| `PerformanceCycle`, `PerformanceCriterion` | periode, rubrik, evaluator | Rubrik tidak berubah setelah digunakan |
| `PerformanceReview`, `ReviewEvidence`, `ReviewResponse` | skor/narasi, bukti, status | Akses ketat dan revisi terlacak |

Gunakan UUID internal dan timestamp UTC. Index utama: `employeeId`, `unitId`, tanggal, status, periode, serta evaluator. Constraint mencegah permintaan cuti duplikat yang tumpang tindih pada jenis/status tertentu, tetapi aturan pengecualian harus eksplisit. Perhitungan lintas modul mengambil ID dan kejadian dari sumber, bukan membuat profil pegawai kedua.

## 13. Rancangan halaman dan URL

| Halaman | URL contoh | Fungsi |
| --- | --- | --- |
| Beranda pegawai | `/staff/dashboard` | Agenda dan tindakan pribadi |
| Profil kerja | `/staff/profile` | Unit, jabatan, tugas, status |
| Kalender kerja | `/staff/schedule?week=...` | Shift, mengajar, tugas |
| Kehadiran pribadi | `/staff/attendance?month=...` | Rekap dan koreksi |
| Permintaan cuti | `/staff/leave/requests/[requestId]` | Detail dan status |
| Tugas pribadi | `/staff/assignments/[assignmentId]` | Tanggung jawab dan periode |
| Tim unit | `/management/teams/[unitId]?term=...` | Penugasan, kehadiran agregat |
| Persetujuan | `/management/approvals?type=leave&status=pending` | Antrean keputusan |
| Beban kerja | `/management/workload?term=...` | Rincian per pegawai |
| Evaluasi | `/management/performance/reviews/[reviewId]` | Formulir dan riwayat |
| Administrasi SDM | `/admin/staff/assignments?unit=...` | Pengelolaan penugasan |

Next.js App Router memakai nested layout per peran, Dynamic Routes untuk detail, serta query string untuk periode, filter, sort, dan pagination. Detail permintaan dari daftar dapat memakai Intercepting/Parallel Routes sebagai modal; URL langsung dan refresh membuka halaman penuh. Back menutup modal dan Forward membukanya kembali. Formulir evaluasi yang panjang tetap halaman penuh.

Gunakan TypeScript, Tailwind CSS, shadcn/ui, dan TanStack Table untuk daftar pegawai, persetujuan, serta laporan. Filter/sort/pagination besar dikerjakan server dan tercermin di URL. Pada mobile, agenda dan tindakan pribadi diprioritaskan. Agentation digunakan untuk inspeksi layout, fokus, dan interaksi.

## 14. Kontrak API awal

NestJS menyediakan endpoint berversi dengan validasi DTO, otorisasi peran dan scope, pagination, serta format kesalahan `code`, `message`, `fieldErrors`, `requestId`.

```text
GET    /api/v1/staff/me/dashboard
GET    /api/v1/staff/me/schedule?week=
GET    /api/v1/staff/me/attendance?month=
POST   /api/v1/staff/me/attendance-corrections
GET    /api/v1/staff/me/leave-requests
POST   /api/v1/staff/me/leave-requests
POST   /api/v1/staff/me/leave-requests/:id/cancel
GET    /api/v1/staff-assignments?unitId=&termId=
POST   /api/v1/staff-assignments
POST   /api/v1/staff-assignments/:id/publish
GET    /api/v1/leave-requests?status=&unitId=
POST   /api/v1/leave-requests/:id/decisions
GET    /api/v1/workloads?termId=&unitId=
GET    /api/v1/performance-cycles/:id/reviews
POST   /api/v1/performance-reviews/:id/submit
POST   /api/v1/performance-reviews/:id/responses
```

Keputusan izin, koreksi kehadiran, serta publikasi penugasan memakai transaksi dan pemeriksaan versi. Benturan atau perubahan serentak menghasilkan `409` dengan rincian yang dapat diperbaiki. Permintaan yang dapat terkirim ulang memakai idempotency key. File bukti diakses melalui URL sementara setelah pemeriksaan izin.

## 15. Keamanan, privasi, dan aksesibilitas

- Backend memilih field sesuai peran; guru lain tidak boleh membaca evaluasi, cuti pribadi, atau bukti sakit pegawai.
- Detail alasan sakit dan lampiran kesehatan tidak masuk kalender umum atau notifikasi ke siswa.
- Catat penetapan/pencabutan tugas, keputusan izin, koreksi kehadiran, akses evaluasi, serta ekspor sensitif.
- Batasi retensi event perangkat dan bukti cuti sesuai kebijakan; akses perangkat tidak otomatis menjadi bukti tunggal kehadiran.
- Semua daftar dan formulir memiliki loading, kosong, error, akses ditolak, serta konflik perubahan yang jelas.
- Status ditulis dengan teks selain warna; formulir memiliki label, pesan kesalahan dekat field, dan alur keyboard.
- Modal mengelola fokus; tampilan mobile memberi akses cepat pada check-in, agenda, dan pengajuan izin bila fitur tersebut digunakan.

## 16. Kriteria penerimaan MVP

1. Pegawai hanya melihat jadwal, kehadiran, cuti, dan evaluasi miliknya; atasan hanya melihat anggota tim dalam periode kewenangannya.
2. Perubahan unit atau jabatan mempertahankan riwayat dan memperbarui scope akses sejak tanggal efektif.
3. Jadwal kerja menampilkan sesi mengajar dari modul akademik tanpa membuat master jadwal kedua.
4. Penugasan atau shift yang berbenturan ditandai dan diblokir sesuai aturan jenisnya.
5. Event check-in mentah tetap ada setelah rekap kehadiran dikoreksi; koreksi menyimpan aktor, alasan, dan nilai lama/baru.
6. Cuti yang disetujui memperbarui saldo dan status kehadiran tanpa menghitung dua kali; pembatalan tercatat.
7. Izin guru yang memengaruhi jadwal mengajar memperlihatkan status pengganti secara terpisah.
8. Beban kerja dapat ditelusuri ke sumber jam/bobot dan versi aturan periode tersebut.
9. Evaluasi draf tidak terlihat oleh pegawai sebelum dibagikan; evaluasi final tidak ditimpa tanpa revisi.
10. Filter tabel dan periode kalender bertahan setelah refresh serta Back/Forward; modal detail mengikuti URL.
11. Alur pegawai dan atasan dapat digunakan pada mobile dan keyboard dengan loading/empty/error yang jelas.

## 17. Urutan implementasi

1. Tetapkan jenis pegawai, unit, atasan, kebijakan jam kerja, serta jenis cuti/izin.
2. Hubungkan data pegawai dari administrasi dan penugasan mengajar dari akademik.
3. Bangun tugas tambahan, jadwal kerja, kalender pegawai, dan pemeriksaan benturan.
4. Bangun kehadiran pegawai, koreksi, serta cuti/izin dan persetujuannya.
5. Tambahkan beban kerja berversi, laporan, dan evaluasi kinerja.
6. Uji otorisasi lintas peran, kejadian tanggal efektif, akses mobile, dan deep linking.

## 18. Keputusan terbuka

- Status dan jenis pegawai yang dipakai sekolah, termasuk pegawai paruh waktu dan pihak luar.
- Jam kerja, shift, toleransi keterlambatan, hari libur, lokasi check-in, dan kebijakan dinas luar.
- Apakah kehadiran kerja dan kehadiran mengajar dihitung terpisah.
- Jenis cuti/izin, saldo awal, akumulasi hak, bukti, batas pengajuan, serta jalur persetujuan.
- Siapa yang boleh mengoreksi kehadiran dan apakah perlu persetujuan kedua.
- Bobot tugas tambahan dan target beban kerja per jenis pegawai.
- Rubrik, frekuensi, evaluator, hak tanggapan, serta retensi evaluasi kinerja.
- Perangkat absensi yang tersedia dan cara memvalidasi kegagalan sinkronisasi.
- Apakah integrasi penggajian diperlukan; jika ya, data apa yang boleh dibagikan.

Keputusan ini menjadi dasar skema Prisma, aturan NestJS, halaman Next.js, dan backlog implementasi per fitur.
