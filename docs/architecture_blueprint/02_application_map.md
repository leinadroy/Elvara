# Peta Aplikasi Web dan Mobile

## Hitungan yang jelas

| Istilah | Jumlah rilis awal | Penjelasan |
| --- | ---: | --- |
| Aplikasi web pengguna | **1** | Satu Next.js App Router pada satu domain; semua peran login di sini |
| Versi mobile web/PWA | **1 pengalaman**, **0 codebase tambahan** | Halaman responsif dari aplikasi web yang sama; dapat dievaluasi untuk instalasi PWA |
| Aplikasi native Android/iOS | **0** | Belum ada stack mobile native yang dipilih; jangan membuat dua aplikasi sebelum kebutuhan perangkat terbukti |
| NestJS API | **1** | Modular monolith, bukan 21 backend |
| Worker | **1 deployment awal** | Impor, notifikasi, ekspor, sinkronisasi, laporan |
| Agen Windows | **0 awal; 1 jenis agen opsional** | Hanya untuk poin 19 setelah pilot IT |

Jika pilot membuktikan kebutuhan offline nyata, NFC latar, GPS kendaraan yang andal, atau push yang tidak terpenuhi oleh web/PWA, usulkan **1 aplikasi native lintas platform** dengan mode peran. Keputusan framework mobile dibuat saat itu; stack yang sudah dipilih saat ini hanya menyebut Next.js untuk frontend.

## Satu identitas, beberapa area kerja

Satu `User` dapat memiliki beberapa `RoleAssignment` dengan scope berbeda. Contoh: seorang guru juga wali murid. Setelah login ia memilih konteks **Guru** atau **Wali**, tetapi tetap memakai akun yang sama. Menu dan dashboard berubah, sedangkan backend tetap memeriksa izin tiap objek.

| Area URL | Pengguna utama | Contoh layar |
| --- | --- | --- |
| `/admin` | Admin sekolah, operator data | Siswa, pegawai, tahun ajaran, akun, dokumen |
| `/management` | Kepala sekolah/pimpinan | Command center, persetujuan, laporan |
| `/academics` | Kurikulum/admin akademik | Kurikulum, jadwal, rapor |
| `/teacher` | Guru dan wali kelas | Jadwal, absensi, tugas, buku nilai |
| `/staff` | Pegawai non-guru | Shift, tugas, hadir, izin |
| `/student` | Siswa | Jadwal, tugas, hasil, layanan |
| `/guardian` | Wali | Anak, kehadiran, tagihan, pesan |
| `/finance` | Keuangan | Tagihan, pembayaran, rekonsiliasi |
| `/operations` | Keamanan, fasilitas, teknisi, perpustakaan, transportasi, kantin, IT | Alur lapangan sesuai role |
| `/safety` | Pelapor dan petugas keselamatan | Laporan, kasus, SOS dengan batas akses ketat |

Area URL bukan aplikasi terpisah. Nested layout memberi navigasi sesuai peran; Dynamic Routes memberi URL langsung untuk detail. Filter, sort, tab yang perlu dibagikan, dan pagination ada di query string. Intercepting/Parallel Routes dipakai selektif untuk modal detail; direct link/refresh menjadi halaman penuh dan Back/Forward mempertahankan state.

## Pembagian desktop versus mobile

| Pengalaman | Desktop | Mobile/tablet |
| --- | --- | --- |
| Admin, kurikulum, keuangan, laporan | Pekerjaan utama: tabel, impor, edit massal, rekonsiliasi | Pantau ringkasan dan persetujuan sederhana |
| Guru | Buku nilai, perencanaan, rapor | Jadwal, absensi cepat, tugas, pesan |
| Siswa | Semua fungsi tersedia | Prioritas: jadwal hari ini, tugas, notifikasi, layanan |
| Wali | Semua fungsi tersedia | Prioritas: pemilih anak, absensi, izin, tagihan, pesan |
| Keamanan | Pengawasan/riwayat koordinator | Tablet pos gerbang untuk tamu dan penjemputan |
| Teknisi | Inventaris dan laporan | Tiket, foto, lokasi, checklist kerja |
| Pengemudi/pendamping | Koordinator mengatur rute di desktop | Manifest naik/turun pada ponsel/tablet |
| UKS/konselor | Catatan privat dan jadwal | Ringkasan tugas tanpa membocorkan catatan sensitif |
| IT sekolah | Diagnosis perangkat dan tindakan | Alert dan status, bukan terminal remote penuh |

Mobile tidak berarti semua tabel desktop diperkecil. Alur lapangan mempunyai tata letak dan prioritas aksi sendiri. Data/aturan bisnis tetap satu.

## Aplikasi native: gerbang keputusan

Keputusan native baru dibuat jika uji membuktikan salah satu kebutuhan berikut: pekerjaan offline beberapa jam dengan sinkronisasi aman, pemindaian NFC/perangkat yang tidak cukup didukung browser, pelacakan kendaraan latar yang disetujui, notifikasi kritis yang memerlukan jaminan kanal tambahan, atau kontrol perangkat sekolah yang khusus. Sebelum itu, web responsif/PWA mengurangi biaya pemeliharaan dua platform.

## Bukan 21 aplikasi

Ke-21 poin adalah domain fungsional. Mereka berbagi orang, kelas, tahun ajaran, ruang, hak akses, audit, dan komunikasi. Memecahnya menjadi aplikasi terpisah sejak awal akan membuat login, navigasi, data, serta notifikasi menjadi terfragmentasi—berlawanan dengan gagasan “satu aplikasi, banyak kebutuhan” pada PDF acuan.
