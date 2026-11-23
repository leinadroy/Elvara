# PRD — Smart School

| | |
| --- | --- |
| **Status** | Draf untuk ditinjau |
| **Versi** | 0.1 |
| **Tanggal** | 18 November 2026 |
| **Pemilik produk** | [Nama] |
| **Peninjau** | [Kepala sekolah / pemilik proses], [Tech lead] |
| **Cakupan dokumen** | Seluruh produk, dengan rincian kebutuhan untuk rilis **Fondasi + MVP Operasional** |

Dokumen ini merangkum *apa* yang dibangun dan *mengapa*. Rancangan teknis dan aturan rinci per modul ada di [dokumen ekosistem](smart_school_management_ecosystem.md), [catatan induk](smart_school_master_note.md), dan 21 dokumen modul. Bila PRD dan dokumen modul berbeda, PRD menentukan prioritas dan cakupan rilis; dokumen modul menentukan aturan bisnis rinci.

---

## 1. Latar belakang dan masalah

Sekolah sasaran adalah **satu sekolah dengan dua gedung**: ruang kelas, laboratorium, perpustakaan, fasilitas olahraga, serta layanan untuk siswa, guru, staf, dan orang tua. Saat ini operasional sekolah umumnya tersebar di banyak alat yang tidak saling terhubung:

| Area | Kondisi umum | Dampak |
| --- | --- | --- |
| Absensi | Kertas dan rekap manual | Orang tua terlambat tahu; rekap memakan waktu guru |
| Nilai | File Excel per guru | Sulit dikonsolidasi; versi tidak jelas |
| Keuangan | Buku kas, bukti transfer dicek manual | Rekonsiliasi lambat; rawan salah catat |
| Informasi | Grup WhatsApp | Pengumuman tenggelam; audiens tidak terkontrol |
| Keselamatan | Tidak ada kanal laporan yang jelas | Kasus tidak punya pemilik dan jejak tindak lanjut |

Akibatnya data diinput berulang, tidak sinkron, dan sulit diaudit. Pimpinan tidak punya gambaran kondisi sekolah yang dapat dipercaya.

> Kondisi di atas adalah pola umum. **[Validasi dengan wawancara sekolah sasaran sebelum PRD disetujui.]**

## 2. Visi produk

**Satu data. Satu aplikasi. Setiap orang melihat bagiannya sendiri.**

Smart School adalah platform web terpadu yang menyatukan administrasi, akademik, absensi, komunikasi, layanan, dan keselamatan sekolah dalam satu basis data. Setiap peran mendapat beranda sesuai pekerjaannya, dengan hak akses yang dibatasi dan diaudit.

## 3. Tujuan dan non-tujuan

### 3.1 Tujuan

| ID | Tujuan |
| --- | --- |
| G1 | Satu identitas resmi untuk setiap siswa, pegawai, dan wali; tanpa input ulang antarmodul. |
| G2 | Absensi kelas diisi dari ponsel guru dan diketahui wali setelah status final. |
| G3 | Jadwal terbit bebas benturan guru, rombel, dan ruang. |
| G4 | Pengumuman resmi sampai ke audiens yang tepat, dengan bukti pengiriman. |
| G5 | Setiap peran punya beranda yang menampilkan tindakan hariannya. |
| G6 | Data anak dilindungi: akses berbasis peran dan scope, tindakan sensitif tercatat. |
| G7 | Fondasi yang modular sehingga modul lanjutan dapat ditambahkan bertahap. |

### 3.2 Non-tujuan (untuk rilis MVP)

- Aplikasi native Android/iOS. MVP memakai web responsif; kebutuhan native dievaluasi setelah uji pemakaian.
- Tugas, penilaian, dan rapor digital (rilis Akademik).
- Tagihan dan pembayaran online (rilis Keuangan & Layanan).
- Pelaporan keselamatan digital, SOS, UKS/konseling, pelacakan lokasi, integrasi gerbang/CCTV (rilis Keselamatan & Perangkat, setelah SOP dan kajian privasi).
- Multi-sekolah/multi-tenant. Struktur data tetap tidak menghalanginya.
- Pengambilan keputusan otomatis oleh AI atas kasus individual.

## 4. Pengguna

Peran adalah kumpulan izin, bukan satu atribut pengguna. Satu orang dapat memegang beberapa peran (misalnya guru yang juga wali murid) dan berpindah konteks di UI.

| Peran | Pekerjaan utama | Batas akses | Perangkat utama | Rilis |
| --- | --- | --- | --- | --- |
| Admin sekolah | Master data, akun, verifikasi wali, impor | Tidak otomatis membaca data konseling/kesehatan | Desktop | MVP |
| Kepala sekolah / manajemen | Memantau indikator, menyetujui | Data sensitif hanya agregat aman | Desktop, ringkasan di ponsel | MVP |
| Wakasek kurikulum / admin akademik | Menyusun dan menerbitkan jadwal, penugasan guru | Domain akademik | Desktop | MVP |
| Guru / wali kelas | Jadwal hari ini, absensi kelas, komunikasi kelas | Hanya kelas/mapel yang ditugaskan | Ponsel dan desktop | MVP |
| Staf non-guru | Jadwal tugas, pengumuman | Data diri sendiri | Ponsel | MVP |
| Siswa | Jadwal, pengumuman, kehadiran sendiri | Hanya data diri sendiri | Ponsel | MVP |
| Orang tua / wali | Memantau anak, menerima notifikasi | Hanya anak dengan hubungan wali aktif dan terverifikasi | Ponsel | MVP |
| Keuangan, keamanan, fasilitas/teknisi, pustakawan, UKS/konselor, transportasi, kantin, IT | Domain masing-masing | Domain tugasnya | Beragam | Lanjutan |

Total target **15 beranda peran** dalam satu aplikasi; **7 untuk MVP** (tujuh peran teratas di tabel).

## 5. Metrik keberhasilan

Target angka ditetapkan bersama sekolah sebelum pilot. Metrik dihitung dari data sistem, bukan survei semata, kecuali disebutkan.

| ID | Metrik | Definisi | Target pilot |
| --- | --- | --- | --- |
| M1 | Adopsi absensi digital | % sesi terjadwal yang ditutup guru di sistem pada hari yang sama | [__ %] |
| M2 | Kecepatan informasi ke wali | Median waktu dari status final "tidak hadir" sampai notifikasi terkirim | [__ menit] |
| M3 | Aktivasi wali | % wali terdaftar yang terverifikasi dan login minimal sekali dalam 30 hari | [__ %] |
| M4 | Kualitas jadwal | Jumlah jadwal terbit yang mengandung benturan | 0 |
| M5 | Waktu rekap | Waktu wali kelas untuk rekap kehadiran bulanan, dibanding sebelum pilot (survei) | Turun [__ %] |
| M6 | Keamanan akses | Insiden akses data di luar hak yang ditemukan pada uji atau audit | 0 |
| M7 | Keandalan | Ketersediaan layanan pada jam sekolah | [__ %] |

## 6. Ruang lingkup dan rilis

| Rilis | Isi | Syarat mulai |
| --- | --- | --- |
| **R0 Fondasi** | Login, peran dan scope, audit, tahun ajaran, gedung/lantai/ruang, siswa/pegawai/wali, hubungan wali, impor data, file privat | Keputusan D1–D3 |
| **R1 MVP Operasional** | Rombel dan penempatan, jadwal, absensi siswa, pengumuman dan notifikasi, 7 beranda peran, dashboard dasar | R0; keputusan D4, D8 |
| R2 Akademik | Tugas, penilaian, rapor digital, kalender akademik, koreksi | R1 |
| R3 Keuangan & Layanan | Tagihan, pembayaran, rekonsiliasi, perpustakaan, fasilitas, aset, ekstrakurikuler, transportasi, kantin, kehadiran pegawai, cuti | R0; keputusan D5 |
| R4 Keselamatan & Perangkat | Kanal laporan rahasia, kasus, SOS, UKS/konseling, akses gerbang, QR/NFC, lokasi berbasis zona, CCTV, agen Windows | SOP, kajian privasi, uji perangkat (D6, D7) |

Kanal bantuan dan SOP keselamatan **tetap disiapkan sekolah sejak awal**. R4 hanya menentukan kapan versi digital penuhnya diluncurkan, setelah alur respons nyata teruji. Kanal pelaporan keselamatan boleh dimajukan bila SOP petugas penerima dan eskalasi sudah siap.

Bagian 7 merinci R0 dan R1. Rilis berikutnya dirinci di PRD lanjutan dengan dasar dokumen modul masing-masing.

## 7. Kebutuhan fungsional (R0 + R1)

Prioritas: **Must** wajib ada untuk rilis; **Should** penting tetapi dapat menyusul dalam rilis yang sama; **Could** bila waktu memungkinkan.

### E1. Identitas, akun, dan hak akses

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-1.1 | Pengguna masuk dengan akun sekolah; sesi aman dengan masa berlaku dan logout. | Must |
| FR-1.2 | Admin membuat, menonaktifkan, dan memulihkan akun tanpa menghapus riwayat. | Must |
| FR-1.3 | Peran adalah kumpulan izin; satu pengguna dapat memegang beberapa peran dan memilih konteks aktif. | Must |
| FR-1.4 | Setiap izin dibatasi scope: sekolah, tahun ajaran, kelas yang diajar, hubungan wali, atau unit. | Must |
| FR-1.5 | Semua pemeriksaan izin dilakukan di server; menyembunyikan tombol di UI tidak dianggap pengamanan. | Must |
| FR-1.6 | MFA untuk peran berisiko (admin, manajemen) sesuai kebijakan sekolah. | Should |

**Kriteria penerimaan**
- Pengguna tanpa izin tidak bisa membaca atau mengubah data meskipun mengetahui URL atau ID objek, baik lewat UI maupun API langsung.
- Menonaktifkan akun atau mencabut peran berlaku segera, termasuk untuk halaman dan file yang sebelumnya terbuka.

### E2. Data sekolah dan tahun ajaran

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-2.1 | Admin mengelola profil sekolah, dua gedung, lantai, dan ruang beserta kapasitas. | Must |
| FR-2.2 | Admin mengelola tahun ajaran dan semester; hanya satu tahun ajaran aktif. | Must |
| FR-2.3 | Pergantian tahun ajaran aktif menolak bila data prasyarat belum lengkap, dan tercatat di audit. | Must |

**Kriteria penerimaan**
- Kode ruang unik per gedung.
- Data tahun ajaran lama tetap dapat dibaca setelah pergantian.

### E3. Data orang dan hubungan wali

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-3.1 | Admin membuat profil siswa, pegawai, dan wali. Profil orang terpisah dari akun login. | Must |
| FR-3.2 | Sistem menolak NIS/NIP aktif yang duplikat dengan pesan per field. | Must |
| FR-3.3 | Admin menautkan wali ke siswa; wali memverifikasi undangan sebelum dapat melihat data anak. | Must |
| FR-3.4 | Hubungan wali memuat status verifikasi, hak menerima informasi per kategori, dan tanggal berlaku. | Must |
| FR-3.5 | Impor massal (CSV/XLSX) dengan validasi per baris; mengulang batch yang sama tidak membuat duplikat. | Must |
| FR-3.6 | Siswa dan pegawai dapat mengajukan koreksi profil; data resmi baru berubah setelah disetujui. | Should |
| FR-3.7 | Dokumen pribadi disimpan privat dan hanya dapat diunduh pengguna berwenang. | Should |

**Kriteria penerimaan**
- Wali tidak dapat melihat anak sebelum hubungan terverifikasi, termasuk lewat URL detail atau API.
- Pencocokan data tidak memakai nama sebagai kunci.

### E4. Rombel dan penempatan siswa

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-4.1 | Admin mengelola rombel per tahun ajaran beserta wali kelas dan kapasitas. | Must |
| FR-4.2 | Admin menempatkan siswa ke rombel dengan tanggal berlaku; sistem memeriksa kapasitas dan benturan. | Must |
| FR-4.3 | Pindah kelas membuat riwayat baru, bukan mengubah catatan lama. | Must |

**Kriteria penerimaan**
- Siswa tidak dapat berada di dua rombel utama aktif pada tanggal yang sama.
- Absensi dan jadwal masa lalu tetap mengacu pada rombel yang berlaku saat itu.

### E5. Jadwal pelajaran

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-5.1 | Kurikulum menetapkan mapel dan penugasan mengajar (guru–mapel–rombel–periode). | Must |
| FR-5.2 | Kurikulum menyusun jadwal draf dari slot hari/jam, penugasan, rombel, dan ruang. | Must |
| FR-5.3 | Publikasi jadwal ditolak bila guru, rombel, atau ruang bentrok, dengan rincian konflik. | Must |
| FR-5.4 | Perubahan jadwal terbit menghasilkan versi dengan tanggal efektif. | Must |
| FR-5.5 | Pembatalan atau penggantian satu pertemuan tidak mengubah jadwal mingguan dasar. | Should |
| FR-5.6 | Jadwal dapat dilihat per rombel, per guru, dan per ruang dari data yang sama. | Should |

**Kriteria penerimaan**
- Hanya jadwal terbit yang muncul di portal siswa dan wali.
- Siswa dan wali melihat penanda perubahan dan waktu pembaruan.

### E6. Absensi siswa

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-6.1 | Guru membuka sesi absensi dari jadwal hari ini, atau sesi ad hoc dengan alasan. | Must |
| FR-6.2 | Peserta sesi mengikuti penempatan pada tanggal sesi. | Must |
| FR-6.3 | Status: hadir, izin, sakit, alpa, terlambat. Satu record aktif per siswa per sesi. | Must |
| FR-6.4 | Guru dapat menyimpan draf lalu menutup sesi setelah pemeriksaan kelengkapan. | Must |
| FR-6.5 | Koreksi setelah batas waktu memerlukan alasan dan persetujuan; nilai lama, nilai baru, aktor, dan waktu disimpan. | Must |
| FR-6.6 | Rekap kehadiran per siswa, rombel, dan periode. | Must |
| FR-6.7 | Pengisian absensi optimal di ponsel: satu layar per sesi, tombol besar, status koneksi jelas. | Must |

**Kriteria penerimaan**
- Guru hanya dapat mengisi sesi pada kelas yang ditugaskan; akses URL/API kelas lain ditolak.
- Mengirim ulang tidak menggandakan record.
- Status "belum diisi" tidak dihitung sebagai alpa; sesi batal tidak masuk penyebut.

### E7. Pengumuman dan notifikasi

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-7.1 | Petugas berwenang menerbitkan pengumuman dengan audiens (sekolah, gedung, rombel, peran) dan waktu terbit. | Must |
| FR-7.2 | Notifikasi in-app untuk pengumuman dan ketidakhadiran anak. | Must |
| FR-7.3 | Notifikasi ketidakhadiran ke wali dikirim **setelah** status final; pengiriman dicatat terpisah dari absensi. | Must |
| FR-7.4 | Kanal email dan/atau push sesuai keputusan D8. | Should |
| FR-7.5 | Pengguna mengatur preferensi kanal notifikasi non-wajib. | Could |

**Kriteria penerimaan**
- Pengguna tidak melihat pengumuman di luar audiensnya; perubahan audiens langsung berlaku.
- Retry pengiriman tidak membuat pesan ganda.
- Status "terkirim" dibedakan dari "dibaca".
- Pesan eksternal tidak memuat data sensitif.

### E8. Beranda peran dan dashboard dasar

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-8.1 | **Admin**: siswa belum ditempatkan, verifikasi wali tertunda, hasil impor, akun. | Must |
| FR-8.2 | **Manajemen**: siswa/pegawai aktif, tingkat kehadiran, sesi belum ditutup, verifikasi tertunda. | Must |
| FR-8.3 | **Kurikulum**: jadwal draf/terbit, konflik, penugasan guru belum lengkap. | Must |
| FR-8.4 | **Guru/wali kelas**: jadwal hari ini, sesi absensi yang harus diisi, ringkasan kehadiran rombel. | Must |
| FR-8.5 | **Staf**: jadwal tugas dan pengumuman. | Must |
| FR-8.6 | **Siswa**: jadwal, pengumuman, riwayat kehadiran sendiri. | Must |
| FR-8.7 | **Wali**: pemilih anak, kehadiran, jadwal, pengumuman. | Must |
| FR-8.8 | Setiap angka di dashboard punya definisi tertulis, sumber, dan waktu pembaruan. | Must |

**Kriteria penerimaan**
- Pemilih anak selalu terlihat di halaman wali, dan setiap aksi menegaskan anak yang dipilih.
- Dashboard tetap berguna bila satu sumber data gagal, dengan label data usang.
- Data sensitif tidak muncul sebagai ringkasan umum.

### E9. Audit

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-9.1 | Catat login penting, perubahan izin, ekspor, koreksi absensi, dan perubahan data sensitif. | Must |
| FR-9.2 | Catatan audit tidak dapat diubah melalui UI operasional. | Must |
| FR-9.3 | Admin berwenang dapat mencari audit per objek, aktor, dan periode. | Should |

## 8. Kebutuhan nonfungsional

| Area | Kebutuhan |
| --- | --- |
| **Keamanan** | Cookie sesi `HttpOnly`/`Secure`, rotasi sesi; deny by default; backend memilih field yang dikirim per peran; rahasia di secret store; enkripsi saat transit dan saat disimpan. |
| **Privasi** | Data minimum per peran; kebijakan retensi tertulis; hak wali dicabut segera saat hubungan berakhir; staging hanya memakai data sintetis atau tersamarkan. |
| **Integritas data** | UUID sebagai primary key; waktu disimpan UTC dan ditampilkan dalam zona waktu sekolah; riwayat untuk penempatan, jadwal, dan koreksi; mutasi penting idempoten atau memakai version check (konflik → HTTP 409). |
| **API** | Berversi di `/api/v1`; DTO tervalidasi; error `{ code, message, requestId, fieldErrors? }`; pagination, filter, dan sort di server; OpenAPI. |
| **UX dan navigasi** | Setiap tampilan penting punya URL. Filter, sort, halaman, dan tab ada di query string. Modal detail punya URL sendiri, refresh membuka halaman penuh, Back/Forward berfungsi. |
| **Aksesibilitas** | Target WCAG 2.2 AA pada alur inti: navigasi keyboard, fokus modal, kontras, target sentuh, label form, pengumuman status. |
| **Keadaan UI** | Setiap halaman membedakan loading, kosong, error (dengan `requestId`), akses ditolak, dan data usang. Validasi form menjaga input pengguna. |
| **Perangkat** | Web responsif. Ponsel menjadi prioritas untuk guru, siswa, wali, dan staf; desktop untuk data padat. |
| **Kinerja** | [p95 latensi API pada jam sibuk ≤ __ ms]; [halaman beranda siap dipakai ≤ __ detik di jaringan 4G]. Ditetapkan setelah keputusan D9. |
| **Ketersediaan dan pemulihan** | [Target ketersediaan jam sekolah __ %]; backup terenkripsi; uji restore berkala; [RPO __], [RTO __]. |
| **Observabilitas** | Log terstruktur dengan `requestId`, metrik latensi dan error, health check, pemantauan job gagal. |
| **Bahasa** | Antarmuka Bahasa Indonesia. |

## 9. Arsitektur ringkas

Sudah diputuskan dan di-scaffold di repositori ini:

- **1 aplikasi web** Next.js (App Router, TypeScript, Tailwind CSS, shadcn/ui, TanStack Table) untuk semua peran.
- **1 API** NestJS sebagai modular monolith: modul identity, school, people, academics, attendance, communications, dan seterusnya.
- **1 worker** untuk impor, notifikasi, dan ekspor (ditambahkan saat R0/R1).
- **PostgreSQL** melalui Prisma, plus object storage privat untuk file.
- `packages/contracts` berisi skema yang dipakai bersama web dan API.

Rincian: [catatan induk, bagian A](smart_school_master_note.md).

## 10. Dependensi dan integrasi

| Dependensi | Dibutuhkan untuk | Rilis |
| --- | --- | --- |
| Data awal sekolah (siswa, pegawai, wali, kelas) | Impor R0 | R0 |
| Penyedia email dan/atau push | FR-7.4 | R1 |
| Hosting dan domain sekolah | Go-live | R1 |
| Payment gateway | Tagihan dan pembayaran | R3 |
| Perangkat QR/NFC, gerbang, CCTV | Absensi perangkat, akses | R4 |

## 11. Asumsi, batasan, dan risiko

**Asumsi**
- Satu sekolah, dua gedung, satu zona waktu.
- Guru dan wali memiliki ponsel dengan browser modern dan akses internet di sekolah.
- Sekolah menyediakan pemilik proses untuk setiap keputusan di bagian 12.

**Risiko**

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Data awal tidak bersih (duplikat, format NIS beragam) | Impor gagal, akun wali salah tertaut | Validasi per baris, laporan impor, sesi pembersihan data sebelum pilot |
| Adopsi guru rendah | Absensi tetap di kertas | Alur ponsel satu layar, pelatihan singkat, pendamping di minggu pertama |
| Wali tidak menyelesaikan verifikasi | Notifikasi tidak sampai | Undangan berulang, bantuan TU, metrik M3 dipantau |
| Kebocoran data anak | Kerugian kepercayaan dan hukum | Scope server-side, uji akses lintas peran di setiap rilis, audit |
| Keputusan sekolah tertunda | Skema data tertunda | Rilis bertahap; R0 hanya bergantung pada D1–D3 |
| Konektivitas buruk di kelas | Absensi gagal tersimpan | Status koneksi jelas dan draf yang aman. Mode offline dievaluasi setelah pilot. |

## 12. Keputusan terbuka

| ID | Keputusan | Memblokir | Pemilik |
| --- | --- | --- | --- |
| D1 | Jenjang, struktur kelas/jurusan, sistem semester | R0 | Diputuskan: [ADR 0001](adr/0001-d1-struktur-kelas.md) |
| D2 | Sumber data awal, format NIS/NIP, pemilik koreksi data | R0 | [__] |
| D3 | Kebijakan hubungan wali ganda dan verifikasi identitas wali | R0 | [__] |
| D4 | Aturan absensi: batas koreksi, persetujuan, keterlambatan, waktu notifikasi | R1 | Diputuskan: [ADR 0002](adr/0002-d4-aturan-absensi.md) |
| D5 | Struktur biaya, gateway pembayaran, rekonsiliasi, pembatalan | R3 | [__] |
| D6 | SOP keselamatan, petugas siaga, SLA respons, retensi catatan sensitif | R4 | [__] |
| D7 | Perangkat yang benar-benar tersedia: QR/NFC, akses gerbang, CCTV, lokasi | R4 | [__] |
| D8 | Kanal notifikasi, penyedia, biaya, preferensi penerima | R1 | Diputuskan (dalam aplikasi dulu): [ADR 0003](adr/0003-d8-kanal-notifikasi.md) |
| D9 | Kapasitas pengguna, jam sibuk, target ketersediaan, RPO/RTO | Go-live | [__] |
| D10 | Kebutuhan aplikasi native/offline setelah uji web responsif | Pasca-pilot | [__] |
| D11 | Format rapor dan aturan publikasi nilai | R2 | Diputuskan (Kurikulum Merdeka): [ADR 0005](adr/0005-d11-penilaian-rapor.md) |

Setiap keputusan dicatat sebagai ADR singkat di [`docs/adr/`](adr/README.md) lalu diturunkan menjadi skema Prisma, kontrak API, dan acceptance criteria.

## 13. Rencana pilot

1. **Diskusi kebutuhan** dengan pimpinan, kurikulum, dan tata usaha. Hasilnya keputusan D1–D4 dan D8.
2. **R0 + R1** dibangun dan diuji pada data sintetis, lalu data sekolah yang telah dibersihkan.
3. **Pilot** pada [cakupan: satu angkatan / satu gedung] selama [__ minggu], dengan metrik M1–M7 dipantau.
4. **Tinjauan pilot**: lanjut ke R2/R3, atau perbaikan dulu.

Tanggal milestone: [ditetapkan setelah keputusan D1–D3].

## 14. Rujukan

- [Smart School Management Ecosystem](smart_school_management_ecosystem.md): daftar kapabilitas dan rancangan implementasi
- [Catatan induk](smart_school_master_note.md): arsitektur, topologi, dan 15 beranda
- Modul R0/R1: [administrasi](school_administration_management.md), [akademik](academic_management_system.md), [absensi](attendance_management_system.md), [portal siswa](student_information_portal.md), [portal wali](parent_guardian_portal.md), [guru & staf](teacher_staff_management.md), [komunikasi](communication_notification_center.md), [command center](school_command_center_analytics.md)
- [Infografis alur](infographics.md)
