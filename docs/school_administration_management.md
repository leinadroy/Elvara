# School Administration & Management

Dokumen ini merinci modul **Administrasi Sekolah** dari [Smart School Management Ecosystem](smart_school_management_ecosystem.md). Fokusnya adalah data induk dan proses administratif yang menjadi sumber data bagi modul akademik, absensi, keuangan, komunikasi, dan layanan sekolah.

**Status:** rancangan awal untuk dibahas dengan pihak sekolah. Aturan yang belum diputuskan ditandai pada bagian *Keputusan terbuka*.

## 1. Tujuan dan batas modul

Modul ini harus memungkinkan admin membuat satu data resmi untuk sekolah, orang, struktur kelas, periode ajaran, organisasi, akun, dan arsip. Perubahan dapat dilacak dan data historis tetap terbaca setelah siswa pindah kelas, pegawai berganti jabatan, atau tahun ajaran berakhir.

| Termasuk dalam modul ini | Dikelola oleh modul lain |
| --- | --- |
| Profil sekolah, gedung, unit, ruang dasar | Reservasi dan pemeliharaan ruang |
| Identitas dan status administrasi siswa, pegawai, wali | Nilai, absensi, kesehatan, konseling |
| Tahun ajaran, semester, jurusan, rombel, penempatan siswa | Kurikulum, jadwal, tugas, rapor |
| Struktur organisasi dan penugasan jabatan | Penilaian kinerja dan cuti pegawai |
| Akun, undangan, peran, izin, audit administrasi | Proses bisnis khusus setiap modul |
| Dokumen administrasi dan arsip | Materi pembelajaran dan dokumen kasus rahasia |
| Dashboard dan laporan administrasi | Analitik mendalam lintas modul |

## 2. Peran dan kewenangan

Hak akses bersifat gabungan antara **izin tindakan** dan **cakupan data**. Satu pengguna boleh memiliki lebih dari satu peran; backend memeriksa izin pada setiap permintaan.

| Peran | Kewenangan utama | Batasan |
| --- | --- | --- |
| Super admin sistem | Konfigurasi teknis, pemulihan akses, pengaturan izin | Tidak otomatis boleh membaca dokumen pribadi atau kasus sensitif |
| Admin sekolah | Kelola profil sekolah, data induk, kelas, akun, dokumen administrasi | Perubahan berisiko tinggi dapat memerlukan persetujuan |
| Operator data | Input dan perbaiki data siswa/pegawai sesuai unit | Tidak mengubah kebijakan izin atau menghapus arsip |
| Kepala sekolah | Melihat ringkasan, menyetujui perubahan yang ditentukan | Tidak mengedit data teknis akun |
| Wali kelas | Melihat data administrasi siswa di rombel aktif | Tidak melihat rombel lain tanpa penugasan |
| Guru | Melihat identitas minimum siswa yang diajar | Tidak melihat dokumen pribadi siswa |
| Orang tua/wali | Melihat profil anak yang hubungan walinya terverifikasi | Tidak melihat data anak lain atau seluruh data pegawai |
| Siswa | Melihat dan mengajukan koreksi profil sendiri | Perubahan data resmi perlu verifikasi admin |
| Auditor internal | Membaca laporan dan audit sesuai mandat | Akses berbatas waktu, tanpa mutasi |

Izin granular contoh: `student.read`, `student.create`, `student.update`, `student.archive`, `guardian.verify`, `class.assign`, `account.invite`, `role.assign`, `document.download`, `report.export`. Hindari satu izin `admin.*` yang membuka seluruh data sensitif.

## 3. Data sekolah dan konfigurasi dasar

### 3.1 Profil sekolah

Simpan nama resmi, nama singkat, kode sekolah yang berlaku, jenjang, alamat, zona waktu, kontak resmi, logo, dan status operasional. Perubahan nama atau alamat resmi memiliki tanggal berlaku dan riwayat, karena dokumen lama tetap harus menampilkan identitas sekolah yang berlaku saat diterbitkan.

### 3.2 Struktur lokasi

Hierarki awal: **sekolah → gedung → lantai → ruang**. Dua gedung awal menjadi data, bukan dua kolom khusus dalam skema. Setiap ruang memiliki kode unik dalam gedung, nama, jenis, kapasitas, status aktif, dan aksesibilitas dasar. Modul fasilitas dapat memperluas atribut peralatan dan pemesanan.

### 3.3 Konfigurasi administratif

Tetapkan format nomor induk, kalender kerja, bahasa tampilan, zona waktu, pola penamaan kelas, dan kanal kontak resmi. Konfigurasi yang mengubah perilaku sistem harus memiliki aktor, waktu, nilai lama, dan nilai baru. Perubahan tahun ajaran aktif merupakan tindakan eksplisit dengan konfirmasi dan pemeriksaan prasyarat.

## 4. Data induk orang

Pisahkan identitas orang dari peran sekolah: satu `Person` dapat terkait dengan `Student`, `Employee`, atau `Guardian`. Akun login `User` juga terpisah dari profil orang agar data seseorang tetap ada ketika akun belum dibuat atau sudah dinonaktifkan.

### 4.1 Siswa

Data minimum: ID internal, NIS, nama resmi, nama panggilan bila diperlukan, tanggal lahir, status siswa, tanggal masuk, jenjang, dan kontak darurat melalui wali. Alamat, dokumen identitas, dan atribut sensitif hanya dikumpulkan jika ada kebutuhan operasional yang jelas. Status contoh: calon, aktif, cuti, pindah, lulus, keluar. Perubahan status menyimpan tanggal efektif, alasan, dan dokumen pendukung bila diperlukan.

Admin dapat mencari duplikasi berdasarkan NIS dan kombinasi identitas sebelum membuat siswa. Sistem menolak NIS aktif yang sama sesuai kebijakan sekolah. Penggabungan dua profil yang telanjur duplikat harus menjadi proses khusus dengan pratinjau referensi, persetujuan, dan audit; jangan melakukan penghapusan langsung.

### 4.2 Guru dan staf

Data minimum: ID internal, NIP/nomor pegawai bila ada, nama resmi, jenis pegawai, unit kerja, tanggal mulai, status kerja, dan kontak kerja. Jabatan organisasi disimpan sebagai penugasan dengan rentang tanggal, bukan satu teks di profil. Informasi kontrak, gaji, kesehatan, dan evaluasi kinerja berada pada domain dengan izin tersendiri.

### 4.3 Orang tua dan wali

Hubungan `StudentGuardian` menyimpan jenis hubungan, status verifikasi, tanggal berlaku, hak menerima informasi, prioritas kontak darurat, dan batasan yang sah sesuai kebijakan. Satu siswa bisa memiliki beberapa wali; satu wali bisa terkait dengan beberapa siswa. Undangan portal tidak otomatis membuktikan hak akses: admin harus memverifikasi hubungan sebelum data anak tampil. Putusnya hubungan segera mencabut akses portal ke anak tersebut tanpa menghapus riwayat administratif.

### 4.4 Perubahan dan koreksi data

Bedakan **koreksi kesalahan input** dari **perubahan keadaan**. Koreksi nama memperbaiki data resmi dan meninggalkan audit; pindah kelas, ganti wali, atau perubahan status membuat riwayat berlaku. Siswa dan wali boleh mengajukan koreksi melalui formulir dengan bukti bila diperlukan; admin memutuskan dan mencatat alasan penolakan atau persetujuan.

## 5. Tahun ajaran, jurusan, kelas, dan penempatan

- `AcademicYear`: label, tanggal mulai/akhir, status draf/aktif/ditutup. Rentang tahun ajaran untuk sekolah yang sama tidak boleh ambigu.
- `Term`: semester atau periode lain di dalam tahun ajaran, dengan tanggal dan status publikasi.
- `GradeLevel`: tingkat kelas menurut jenjang sekolah.
- `Program/Major`: jurusan atau program bila sekolah menggunakannya; opsional untuk jenjang yang tidak membutuhkan.
- `ClassGroup`: rombongan belajar dengan kode, tingkat, program, tahun ajaran, kapasitas, ruang utama opsional, dan status.
- `HomeroomAssignment`: wali kelas dan rentang penugasannya.
- `Enrollment`: siswa, rombel, tanggal mulai/akhir, status, alasan perubahan.

Satu siswa hanya boleh memiliki satu penempatan rombel utama yang aktif pada tanggal yang sama dalam satu sekolah. Sistem memeriksa kapasitas sebelum penempatan dan menampilkan daftar tunggu atau pengecualian beralasan jika kebijakan sekolah mengizinkan. Pemindahan siswa menutup penempatan lama lalu membuka yang baru dalam satu transaksi. Penutupan tahun ajaran tidak mengubah riwayat kelas sebelumnya; proses kenaikan kelas menampilkan pratinjau dan daftar pengecualian sebelum diterapkan.

## 6. Struktur organisasi

Modelkan unit organisasi, jabatan, hubungan pelaporan, dan penugasan pegawai dengan tanggal berlaku. Contoh unit: pimpinan sekolah, tata usaha, kesiswaan, kurikulum, sarana-prasarana, perpustakaan, dan UKS. Bagan organisasi menampilkan penugasan aktif pada tanggal yang dipilih, sedangkan riwayat menunjukkan pemegang jabatan sebelumnya.

Penugasan jabatan tidak otomatis memberikan seluruh izin aplikasi. Perubahan jabatan dapat memicu usulan perubahan akses, tetapi pemberian izin tetap mengikuti alur persetujuan akun. Cegah hubungan atasan-bawahan yang membentuk siklus.

## 7. Akun, autentikasi, dan hak akses

### 7.1 Siklus akun

Alur: admin mengaitkan akun ke profil orang → mengirim undangan ke kanal terverifikasi → pengguna mengaktifkan akun → sistem mencatat persetujuan yang diperlukan → akun aktif. Status: diundang, aktif, terkunci, nonaktif. Proses reset akses, perubahan kontak login, dan penonaktifan harus tercatat. Akun tidak dihapus untuk menyembunyikan aktivitas historis.

### 7.2 Izin dan cakupan

RBAC menentukan tindakan, sedangkan aturan scope menentukan objek mana yang boleh diakses. Contoh: guru dengan `student.read` hanya membaca siswa pada kelas yang diajar dalam periode penugasan; wali hanya membaca anak pada hubungan yang terverifikasi; operator data hanya pada unit yang ditetapkan. API memilih field yang diizinkan sebelum mengirim respons.

MFA diprioritaskan untuk admin dan peran dengan akses sensitif. Sesi memakai cookie aman dengan masa berlaku dan mekanisme pencabutan. Perubahan peran, ekspor data, dan akses dokumen sensitif masuk audit. Pemeriksaan akses diuji untuk URL langsung, bukan hanya menu yang terlihat.

## 8. Dokumen dan arsip digital

### 8.1 Kategori dan metadata

Kategori awal: dokumen sekolah, dokumen siswa, dokumen pegawai, surat keputusan, surat keluar/masuk, dan dokumen kelas. Metadata: nomor dokumen bila ada, judul, kategori, pemilik data, tanggal dokumen, tanggal unggah, pembuat, status, versi, label kerahasiaan, serta tanggal retensi. File berada di object storage privat; database menyimpan metadata dan referensi file.

### 8.2 Siklus dokumen

Draf → ditinjau → disahkan/diterbitkan → diarsipkan. Versi baru tidak menimpa file versi lama. Unduhan menggunakan akses sementara setelah pemeriksaan izin; akses dan ekspor dokumen sensitif dicatat. Validasi unggahan meliputi ukuran, jenis file, pemindaian malware bila tersedia, dan penamaan aman. Retensi dan pemusnahan memerlukan kebijakan sekolah serta catatan tindakan.

Template surat dapat menjadi pengembangan lanjut. Dokumen hasil sistem, seperti surat keterangan, menyimpan snapshot data dan versi template saat dibuat supaya isi historis tidak berubah ketika profil siswa diperbarui.

## 9. Dashboard dan laporan administrasi

Dashboard admin menampilkan pekerjaan yang perlu tindakan: undangan akun tertunda, koreksi profil diajukan, wali belum diverifikasi, siswa belum ditempatkan, kelas melebihi kapasitas, dokumen menunggu persetujuan, serta impor yang gagal. Angka siswa dan pegawai dihitung berdasarkan status serta tanggal efektif; setiap kartu menjelaskan definisi angkanya.

Laporan awal: daftar siswa aktif per tingkat/rombel, mutasi siswa, daftar pegawai aktif, hubungan wali belum lengkap, kapasitas kelas, akun tidak aktif, dan arsip menurut kategori. Filter meliputi tahun ajaran, periode, status, tingkat, program, dan unit. Ekspor mengikuti izin `report.export`, memiliki batas ukuran, dan tercatat di audit. Laporan besar dibuat sebagai pekerjaan latar dan hasilnya memiliki masa unduh terbatas.

## 10. Alur kerja prioritas

### 10.1 Pendaftaran siswa baru

1. Operator mengisi atau mengimpor data minimum; sistem memeriksa duplikasi.
2. Admin memvalidasi identitas dan menetapkan status administratif.
3. Admin menautkan wali serta memverifikasi hubungan.
4. Admin menempatkan siswa ke rombel yang memiliki kapasitas.
5. Sistem mengundang akun yang diperlukan dan mencatat seluruh tindakan.

### 10.2 Awal tahun ajaran

1. Admin membuat tahun ajaran dan periode dalam status draf.
2. Admin menyalin struktur tingkat/program/rombel dari periode sebelumnya sebagai pratinjau, lalu menyesuaikannya.
3. Admin meninjau kapasitas, wali kelas, siswa tanpa penempatan, dan duplikasi.
4. Kepala sekolah atau admin berwenang mengaktifkan tahun ajaran.
5. Sistem menyimpan riwayat aktivasi; modul lain membaca periode aktif dari sumber yang sama.

### 10.3 Mutasi atau keluar sekolah

Admin mencatat tanggal efektif, alasan, dan dokumen pendukung. Sistem menutup penempatan aktif, menandai status siswa, memicu peninjauan akun/akses wali, dan memberi tahu modul terkait melalui event internal. Data nilai, absensi, dan tagihan historis tetap ada sesuai retensi.

### 10.4 Impor massal

Unggah file → validasi format dan nilai → tampilkan pratinjau baris valid/gagal/duplikat → konfirmasi → proses latar → unduh hasil per baris. Impor memakai idempotency key atau batch ID untuk mencegah data ganda saat diulang. File sumber memiliki masa retensi terbatas.

## 11. Rancangan layar dan URL

Semua halaman penting dapat dibuka langsung, di-refresh, serta mengikuti Back/Forward browser. Filter dan pagination yang perlu dibagikan berada di query string.

| Halaman | URL contoh | Fungsi |
| --- | --- | --- |
| Dashboard admin | `/admin/dashboard` | Ringkasan dan antrean pekerjaan |
| Profil sekolah | `/admin/school/profile` | Identitas dan konfigurasi dasar |
| Gedung dan ruang | `/admin/school/buildings/[buildingId]` | Detail lokasi |
| Daftar siswa | `/admin/students?year=2026&q=&page=1` | Cari, filter, impor, ekspor |
| Detail siswa | `/admin/students/[studentId]` | Profil dan riwayat administratif |
| Hubungan wali | `/admin/students/[studentId]/guardians` | Verifikasi dan hak akses wali |
| Daftar pegawai | `/admin/employees?status=active` | Profil administratif pegawai |
| Tahun ajaran | `/admin/academic-years/[yearId]` | Periode, aktivasi, penutupan |
| Rombel | `/admin/class-groups/[classGroupId]` | Kapasitas dan penempatan |
| Organisasi | `/admin/organization` | Unit dan jabatan aktif |
| Akun dan peran | `/admin/accounts/[userId]` | Status akun serta izin |
| Arsip | `/admin/documents?category=&page=1` | Pencarian dan siklus dokumen |
| Laporan | `/admin/reports` | Filter, buat, dan unduh laporan |

Detail siswa dapat dibuka sebagai modal dari daftar dengan Parallel dan Intercepting Routes; URL yang sama dibuka sebagai halaman penuh ketika diakses langsung atau setelah refresh. Tombol Back menutup modal ke daftar dan Forward membukanya kembali. Formulir panjang tetap lebih cocok sebagai halaman penuh. Loading, kosong, error, akses ditolak, dan konflik perubahan memiliki tampilan tersendiri.

TanStack Table mengelola definisi kolom dan interaksi; filter, sort, dan pagination besar diproses server dan disinkronkan ke URL. Tabel menyediakan label kolom, jumlah hasil, aksi keyboard, serta tampilan ringkas pada layar kecil. Komponen dibuat dengan Next.js App Router, TypeScript, Tailwind CSS, dan shadcn/ui. Agentation digunakan untuk inspeksi responsivitas dan interaksi saat pengembangan.

## 12. Model data konseptual

| Entitas | Field penting | Relasi/constraint |
| --- | --- | --- |
| `School` | kode, nama, zona waktu, status | Kode unik |
| `Building`, `Floor`, `Room` | kode, nama, kapasitas, status | Ruang unik per gedung; lantai milik gedung |
| `Person` | nama resmi, tanggal lahir, kontak terverifikasi | Tidak sama dengan akun login |
| `Student` | personId, NIS, status, tanggal masuk | NIS unik dalam cakupan sekolah |
| `Employee` | personId, nomor pegawai, jenis, status | Nomor pegawai unik bila ada |
| `Guardian` | personId, kontak | Bisa terkait beberapa siswa |
| `StudentGuardian` | studentId, guardianId, hubungan, verifikasi, hak akses, tanggal berlaku | Cegah hubungan aktif duplikat |
| `AcademicYear`, `Term` | label, tanggal, status | Periode tidak ambigu |
| `GradeLevel`, `Program`, `ClassGroup` | kode, tingkat, kapasitas, tahun ajaran | Kode rombel unik per tahun ajaran |
| `Enrollment` | studentId, classGroupId, tanggal berlaku, status | Satu rombel utama aktif per siswa per tanggal |
| `OrgUnit`, `Position`, `PositionAssignment` | nama, atasan, pegawai, tanggal berlaku | Tanpa siklus organisasi |
| `User`, `Role`, `Permission`, `UserRole` | login, status, relasi profil, izin | Peran dapat dibatasi scope dan masa berlaku |
| `Document`, `DocumentVersion` | kategori, pemilik, klasifikasi, status, fileRef | Versi immutable setelah terbit |
| `AuditEvent`, `ImportBatch` | aktor, aksi, waktu, hasil | Jejak perubahan dan impor |

Seluruh tabel operasional memiliki ID internal, waktu pembuatan/perubahan, dan aktor bila relevan. Waktu disimpan sebagai timestamp UTC dan ditampilkan menurut zona waktu sekolah. Index awal mengikuti pencarian nyata: NIS, nomor pegawai, nama, status, tahun ajaran, rombel, dan hubungan wali. Detail Prisma ditetapkan setelah aturan bisnis disetujui.

## 13. Kontrak API awal

NestJS menyediakan API berversi dengan validasi DTO, pemeriksaan izin dan scope, dokumentasi OpenAPI, pagination server, serta format kesalahan konsisten (`code`, `message`, `fieldErrors`, `requestId`). Contoh endpoint:

```text
GET    /api/v1/school
PATCH  /api/v1/school
GET    /api/v1/students?q=&status=&classGroupId=&page=&sort=
POST   /api/v1/students
GET    /api/v1/students/:id
PATCH  /api/v1/students/:id
POST   /api/v1/students/:id/guardians
POST   /api/v1/students/:id/status-transitions
GET    /api/v1/employees
POST   /api/v1/academic-years
POST   /api/v1/academic-years/:id/activate
GET    /api/v1/class-groups/:id/enrollments
POST   /api/v1/class-groups/:id/enrollments
POST   /api/v1/accounts/invitations
PATCH  /api/v1/accounts/:id/roles
GET    /api/v1/documents
POST   /api/v1/documents
POST   /api/v1/import-batches
GET    /api/v1/import-batches/:id
POST   /api/v1/reports/exports
```

Perubahan status, aktivasi tahun ajaran, dan mutasi siswa memakai transaksi database. Mutasi yang dapat diulang memakai idempotency key; pembaruan serentak memakai pemeriksaan versi dan mengembalikan konflik `409`. File diunggah melalui alur privat dengan validasi ukuran dan jenis; URL unduh hanya diterbitkan sesudah otorisasi.

## 14. Keamanan, privasi, dan audit

- Gunakan prinsip akses minimum dan field-level filtering untuk identitas, kontak, dan dokumen.
- Simpan file privat terpisah dari aset publik. Enkripsi saat transit dan di penyimpanan.
- Catat perubahan identitas resmi, hubungan wali, status siswa, penempatan kelas, peran, izin, unduhan dokumen sensitif, impor, dan ekspor.
- Batasi ekspor berdasarkan peran, scope, periode, dan alasan bila dibutuhkan; beri masa berlaku pada berkas hasil.
- Tetapkan retensi serta penghapusan berdasarkan kebijakan dan hukum yang berlaku sebelum produksi. Soft delete sendiri tidak cukup.
- Uji backup dan pemulihan data PostgreSQL serta file dokumen. Log aplikasi tidak boleh memuat data pribadi yang tidak diperlukan.

## 15. Kriteria penerimaan MVP

1. Admin dapat membuat profil siswa, pegawai, dan wali; sistem menolak identifier unik yang duplikat dan menunjukkan pesan field yang jelas.
2. Wali tidak dapat melihat anak sebelum hubungan terverifikasi, termasuk melalui URL detail atau API langsung.
3. Siswa tidak dapat ditempatkan ke dua rombel utama aktif pada tanggal yang sama; pindah kelas mempertahankan riwayat.
4. Perubahan tahun ajaran aktif menolak data prasyarat yang belum lengkap dan tercatat di audit.
5. Pengguna tanpa izin tidak bisa membaca atau mengubah data meskipun mengetahui URL atau ID objek.
6. Daftar siswa mempertahankan filter, sort, dan halaman setelah refresh serta Back/Forward.
7. Detail modal dari daftar mempunyai URL; refresh membuka detail penuh, Back menutup modal, Forward membukanya lagi.
8. Impor menampilkan hasil validasi per baris dan pengulangan batch tidak menciptakan duplikasi.
9. Dokumen privat hanya dapat diunduh oleh pengguna berwenang dan akses sensitif tercatat.
10. Dashboard menjelaskan definisi angka dan memperlihatkan keadaan loading, kosong, serta error.

## 16. Urutan implementasi yang disarankan

1. Konfirmasi aturan identitas, tahun ajaran, rombel, hubungan wali, dan peran.
2. Buat skema Prisma dan migrasi untuk sekolah, orang, akun, periode, rombel, penempatan, audit.
3. Bangun autentikasi, otorisasi backend, dan fondasi layout admin.
4. Selesaikan CRUD data induk, validasi duplikasi, pencarian, serta riwayat perubahan.
5. Tambahkan impor, undangan akun, verifikasi wali, dan dokumen.
6. Bangun dashboard/laporan, lalu uji alur lintas peran serta deep linking.

## 17. Keputusan terbuka

- Jenjang sekolah dan apakah jurusan/program dipakai pada semua tingkat.
- Format dan cakupan keunikan NIS/NIP; data mana yang wajib pada saat pendaftaran.
- Siapa yang berwenang mengesahkan perubahan identitas, mutasi, aktivasi tahun ajaran, dan ekspor.
- Cara verifikasi wali serta penanganan sengketa atau pembatasan akses wali.
- Status siswa/pegawai yang dipakai sekolah dan dampaknya terhadap akun.
- Template dokumen, penomoran surat, masa retensi, dan kategori kerahasiaan.
- Sumber data awal serta volume impor yang diharapkan.
- Target jumlah pengguna serentak dan kebutuhan multi sekolah di masa depan.

Setelah keputusan ini disepakati, dokumen dapat diturunkan menjadi skema Prisma, spesifikasi endpoint, desain layar, dan backlog per fitur.
