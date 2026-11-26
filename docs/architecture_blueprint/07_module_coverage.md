# Matriks 21 Modul ke Aplikasi

Semua modul di bawah berada dalam **satu aplikasi web** dan satu backend NestJS modular. Kolom mobile menjelaskan alur yang perlu benar-benar dirancang untuk ponsel/tablet, bukan aplikasi native terpisah. Dashboard yang disebut mengacu pada [15 konfigurasi beranda](04_dashboards_roles.md).

| No. | Modul | Area web utama | Prioritas mobile | Dashboard pemilik | Tahap |
| ---: | --- | --- | --- | --- | --- |
| 01 | Administrasi sekolah | `/admin` | Koreksi profil, persetujuan sederhana | Admin | Fondasi |
| 02 | Akademik | `/academics`, `/teacher` | Jadwal, tugas, nilai terbatas | Kurikulum, Guru | MVP/lanjutan |
| 03 | Portal siswa | `/student` | **Utama**: jadwal, tugas, layanan | Siswa | MVP |
| 04 | Guru dan staf | `/teacher`, `/staff` | Jadwal, hadir, izin | Guru, Staf | MVP |
| 05 | Absensi | `/teacher`, `/staff`, `/guardian` | **Utama**: isi kelas, lihat status | Guru, Staf, Wali | MVP |
| 06 | Keselamatan siswa | `/safety` | **Utama**: laporan/SOS bila SOP siap | Workspace kasus khusus | Setelah SOP |
| 07 | Keamanan kampus | `/operations/security` | **Utama**: tamu/izin keluar di tablet | Keamanan | Lanjutan |
| 08 | Lokasi siswa | `/operations/location`, `/guardian` | Status terbatas; waktu/akurasi jelas | Keamanan/Wali | Pilot khusus |
| 09 | Portal wali | `/guardian` | **Utama**: pilih anak, izin, tagihan | Wali | MVP |
| 10 | Keuangan | `/finance`, `/guardian` | Bayar dan lihat status untuk wali | Keuangan, Wali | Lanjutan |
| 11 | Perpustakaan | `/operations/library`, `/student` | Cari/reservasi; loket tablet | Perpustakaan | Lanjutan |
| 12 | Fasilitas | `/operations/facilities` | Lihat ketersediaan/booking | Fasilitas | Lanjutan |
| 13 | Aset/pemeliharaan | `/operations/maintenance` | **Utama**: tiket/foto/checklist teknisi | Fasilitas/Teknisi | Lanjutan |
| 14 | Ekstrakurikuler | `/student`, `/guardian`, `/operations/activities` | Daftar/persetujuan | Siswa, Wali, Guru | Lanjutan |
| 15 | Kantin/layanan | `/operations/canteen`, `/student/services` | Menu, pesanan, tiket | Kantin/Layanan | Lanjutan |
| 16 | Transportasi | `/operations/transport`, `/guardian` | **Utama**: manifest naik/turun | Transportasi | Lanjutan |
| 17 | UKS/konseling | `/operations/health`, `/safety` | Janji/status minimum | UKS/Konseling | Setelah SOP |
| 18 | Komunikasi | Lintas area; `/messages` | **Utama**: pesan/notifikasi | Semua peran | MVP |
| 19 | IT sekolah/Windows | `/operations/it` + agen opsional | Alert saja | IT | Pilot khusus |
| 20 | Catatan kolaborasi | `/notes` | Baca/edit ringan setelah uji | Guru, Staf, Siswa | Lanjutan |
| 21 | Command center | `/management` | Ringkasan/alert | Manajemen | MVP bertahap |

## Tiga alur lintas modul untuk wireframe pertama

### A. Kehadiran → wali

Guru membuka sesi kelas → memilih status siswa → sesi ditutup → absensi membuat event final → komunikasi memilih wali berhak → wali membuka detail anak. Objek utama: `AttendanceSession`, `AttendanceRecord`, `Notification`, `StudentGuardian`. Uji mobile guru dan wali, direct link, serta koreksi setelah notifikasi.

### B. Nilai → rapor

Kurikulum menyiapkan mapel/penugasan → guru menilai → nilai diterbitkan → wali kelas meninjau rapor → rapor snapshot diterbitkan → siswa/wali melihat versi terbit. Objek utama: `TeachingAssignment`, `GradeScheme`, `GradeEntry`, `ReportCardVersion`. Uji desktop guru/kurikulum dan mobile siswa/wali.

### C. Izin keluar → gerbang

Wali berhak mengajukan izin → pejabat sekolah menyetujui → petugas gerbang memverifikasi identitas penjemput → siswa dilepas → wali menerima status. Objek utama: `StudentGuardian`, `GuardianPermission`, `StudentExitPermit`, `StudentReleaseEvent`. Uji tablet gerbang, kondisi penjemput tidak cocok, dan jaringan putus.

## Dependency yang menentukan urutan

Administrasi adalah sumber orang, kelas, ruang, dan hak. Akademik membutuhkan tahun ajaran/rombel/guru. Absensi membutuhkan jadwal serta penempatan efektif. Portal wali membutuhkan hubungan wali terverifikasi. Keuangan membutuhkan siswa/wali dan aturan biaya. Modul perangkat serta lokasi membutuhkan SOP dan uji lapangan. Command center membaca metrik dari proses yang sudah stabil, bukan membuat data sendiri.
