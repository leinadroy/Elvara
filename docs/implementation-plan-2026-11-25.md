# Rencana implementasi Elvara setelah audit repo

**Tanggal audit:** 25 November 2026  
**Dasar:** kode `apps/web`, `apps/api`, `packages/contracts`, PRD R0–R2, ADR 0001–0005, skema Prisma, migrasi, dan seed.  
**Tujuan terdekat:** menuntaskan R2 Akademik di atas fondasi R0–R1 yang sudah ada, tanpa mengulang aplikasi dari awal.

**Pembaruan implementasi:** perintah seed pada instalasi bersih sudah diperbaiki agar generate Prisma Client otomatis; syarat Node dan penjelasan PGlite di README telah disesuaikan. E13 kini memiliki alur guru untuk membuat penilaian dari komponen skema terbit, mengisi empat keadaan nilai per siswa pada `/teacher/assessments/[assessmentId]`, dan menerbitkan setelah seluruh peserta selesai dinilai. Tanggal penilaian yang semula kosong dikunci saat terbit. Koreksi nilai terbit kini memerlukan alasan, memeriksa versi, menyimpan riwayat `grade_change`, dan mencatat audit termasuk umpan balik lama/baru. Irisan E14 menampilkan nilai terbit di `/student/grades` dan `/guardian/grades`; akses wali diperiksa dari hubungan terverifikasi dan izin akademik pada setiap permintaan. **Belum tersedia:** beranda R2 dan verifikasi pilot.

## 1. Kondisi yang sudah ada

| Area | Temuan dari repo | Keputusan implementasi |
| --- | --- | --- |
| Arsitektur | Monorepo npm: Next.js App Router, NestJS modular monolith, kontrak Zod bersama, Prisma/PostgreSQL. | Pertahankan satu aplikasi web dan satu API. Tidak perlu menambah aplikasi baru untuk R2. |
| R0 | Login/sesi, peran dan scope, audit, sekolah/tahun ajaran, siswa/pegawai/wali, undangan, impor, dokumen privat, koreksi profil, MFA sudah memiliki modul API dan halaman web. | Uji alur kritis dan perbaiki temuan sebelum pilot; jangan bangun ulang. |
| R1 | Rombel, penugasan, jadwal, absensi, pengumuman/notifikasi, jadwal staf, dan tujuh beranda peran sudah memiliki route. | Jadikan R1 baseline regresi untuk perubahan R2. |
| R2 selesai sebagian | Kalender akademik dan skema nilai/capaian pembelajaran memiliki API serta halaman web. | Lanjutkan dari model dan kontrak yang ada. |
| R2 belum selesai | Alur guru untuk penilaian dan nilai per siswa mulai tersedia; tugas, pengumpulan, rapor, agregasi nilai, dan portal nilai masih belum memiliki alur lengkap. Beranda R2 belum memuat pekerjaan terkait. | Lanjutkan alur vertikal per objek; jangan menyatakan R2 selesai hanya karena tabel sudah dibuat. |
| Desain | Shell dan dashboard tim sudah tersedia. Umpan balik pemilik proyek sebelumnya menolak desain dashboard generik. | Validasi arah visual baru pada alur nyata sebelum memperluas UI R2; komponen dan pola interaksi mengikuti keputusan desain tersebut. |

## 2. Status database lokal

- Database development terisolasi `smart-school` berjalan lewat `prisma dev` pada `localhost:51214`, database `template1`. Database tes terpisah `smart-school-test` ada pada `localhost:51218`.
- **10 migrasi berhasil diterapkan** sampai `20261124100000_r2_akademik`. Verifikasi SQL: **55 tabel**, 1 sekolah contoh, 6 siswa, 7 akun contoh. Seed memakai identitas sintetis dan berhasil dijalankan.
- Koneksi ada di `apps/api/.env` (dibuat dari `.env.example`); konfigurasi web ada di `apps/web/.env.local`. Kedua file lokal jangan dikomit.
- Instalasi PostgreSQL 17 native pada mesin ini terdeteksi, tetapi layanan `postgresql-x64-17` sedang **stopped**. Akun proses saat ini tidak punya izin membuka/menyalakan layanan tersebut. Database yang berhasil dimuat saat audit adalah layanan lokal `prisma dev` (PGlite), **bukan** instance PostgreSQL 17 native pada port 5432.
- Untuk memakai PostgreSQL 17 native kelak: jalankan layanannya dengan hak OS yang sesuai, buat database khusus `elvara_dev`, atur `DATABASE_URL` dan `DATABASE_POOL_MAX`, lalu jalankan `npm run db:deploy -w api` dan `npm run db:seed`. Jangan mengarahkan seed atau tes ke database yang berisi data sekolah nyata. Database tes harus tetap terpisah.

## 3. Urutan pekerjaan

### Tahap 0 — baseline dan stabilisasi

1. Bekukan versi lingkungan sesuai engine dependensi: Node 24.15+ (atau 22.22.3+) dan npm 11 yang sesuai `packageManager`; `npm ci` saat audit berhasil tetapi Node 24.13 menimbulkan peringatan engine.
2. Catat hasil `typecheck`, unit test, e2e, build, dan pemeriksaan dependency. Pada audit ini `typecheck` dan build penuh lulus; e2e API **53/53 lulus** (4 berkas, database tes terpisah). Unit test dan pemeriksaan browser belum dijalankan dalam audit ini.
3. Tinjau 7 temuan `npm audit` (4 moderate, 3 high); tentukan paket terdampak dan pembaruan aman tanpa `audit fix --force` otomatis.
4. Pastikan data development dan tes tetap terpisah; buat prosedur backup/restore sebelum memasukkan data sekolah nyata.

**Gerbang:** aplikasi dapat dibangun, migrasi dapat diterapkan ulang pada database kosong, dan tes R0–R1 kritis lulus.

### Tahap 1 — kunci desain alur R2

1. Tinjau tiga alur bersama guru, siswa/wali, kurikulum, dan kepala sekolah: **guru menerbitkan penilaian → siswa/wali melihat nilai**; **guru memberi tugas → siswa mengumpulkan → guru menilai**; **wali kelas menyusun rapor → kepala sekolah menyetujui → siswa/wali mengunduh**.
2. Buat rancangan desktop dan web responsif untuk halaman tugas, buku nilai, dan rapor dengan data realistis serta keadaan kosong, konflik, gagal, dan menunggu persetujuan.
3. Uji satu alur utama bersama pemilik produk sebelum membangun seluruh halaman. Jangan memakai satu template dashboard untuk semua peran.

**Gerbang:** URL dan alur disetujui, termasuk informasi yang boleh dilihat tiap peran dan desain baru yang dipilih.

### Tahap 2 — penilaian dan buku nilai (PRD R2 E13)

**Pengisian massal:** lembar nilai draf menerima tempelan NIS dan nilai, menampilkan galat per baris dan jumlah perubahan sebelum simpan. API menyimpan satu kelompok dalam satu transaksi dan menolak seluruh kelompok jika satu versi sudah berubah.

**Buku nilai kelas:** halaman penilaian menyandingkan siswa dan penilaian untuk penugasan terpilih. Tabel menampilkan nilai, keadaan, umpan balik, dan tautan ke lembar penilaian. Sel untuk siswa di luar daftar peserta dibedakan dari nilai yang belum diisi.

**Status 26 November:** penyimpanan draf dan penerbitan memakai kunci transaksi yang sama. Guru dapat melihat rekap per kelas dan mata pelajaran di `/teacher/assessments`, termasuk bobot, rata-rata, nilai akhir, dan ketuntasan per versi skema. Pengisian massal tersedia untuk draf. Kurikulum, admin, dan pimpinan dapat membaca rekap nilai terbit dalam cakupan sekolah.

1. Tambah kontrak Zod untuk penilaian, grade entry, bulk update, publish, dan riwayat perubahan di `packages/contracts`.
2. Bangun API pada modul `grading`: penilaian terikat penugasan mengajar dan versi skema yang terbit; buku nilai per rombel; empat keadaan nilai; perhitungan backend; validasi 0–100; konflik versi `409`; alasan dan audit untuk perubahan nilai terbit.
3. Bangun halaman guru untuk membuat penilaian, mengisi buku nilai, melihat sel yang belum lengkap, dan menerbitkan nilai. Kurikulum memperoleh tampilan baca sesuai scope.
4. Tes perhitungan, nol vs kosong vs tidak berlaku, pembulatan sekali, akses lintas rombel, publish, dan perubahan bersamaan.

**Gerbang:** nilai draf tidak bocor ke portal; hasil hitung dan audit bisa direproduksi lewat tes e2e.

### Tahap 3 — tugas dan pengumpulan (E12)

**Status 26 November:** guru dapat membuat dan menerbitkan kegiatan dari halaman penilaian, memeriksa versi kiriman, mengunduh lampiran privat, dan mengisi nilai. Siswa dapat mengirim teks atau satu lampiran PDF, JPG, atau PNG maksimal 5 MB. Wali berizin dapat melihat status kiriman. Tes integrasi mencakup isolasi kelas, percobaan ulang, format berkas, akses unduhan, dan penutupan pengumpulan. Tampilan browser masih perlu diperiksa.

1. API kegiatan belajar: draf/terbit/tutup/batal, waktu buka dan tenggat, izin terlambat/kirim ulang, lampiran privat dengan batas tipe/ukuran.
2. API pengumpulan berversi: idempoten untuk retry, status tepat waktu/terlambat, akses hanya siswa dalam rombel aktif. Kegagalan unggah tidak dianggap terkumpul.
3. UI guru untuk membuat tugas dan memeriksa kiriman; UI siswa untuk melihat dan mengumpulkan; ringkasan status untuk wali yang berizin.
4. Tes tenggat pada zona waktu sekolah, kirim ulang, unggahan gagal, dan akses objek dari URL/API langsung.

**Gerbang:** satu tugas bisa diselesaikan dari pembuatan sampai penilaian tanpa input manual di database.

### Tahap 4 — nilai di portal (E14)

**Status 26 November:** portal siswa dan wali menampilkan penilaian, umpan balik, serta nilai akhir berjalan dan status kelengkapan per penugasan dan versi skema. Penerbitan nilai dan tugas membuat notifikasi dalam aplikasi untuk akun siswa dan wali yang berhak.

1. Sajikan hanya nilai yang sudah diterbitkan, beserta umpan balik dan status kelengkapan. Scope siswa berdasarkan diri sendiri; scope wali berdasarkan hubungan terverifikasi dan `canViewAcademic`.
2. Hubungkan notifikasi dalam aplikasi untuk nilai dan tugas baru melalui modul komunikasi yang sudah ada; catat peristiwa agar pengiriman tidak ganda.
3. Tambah UI siswa/wali dengan URL langsung dan keadaan ketika belum ada nilai terbit.

**Gerbang:** tes negatif memastikan wali lain, siswa rombel lain, dan pengguna tanpa izin mendapat penolakan API.

### Tahap 5 — rapor (E15)

**Status implementasi:** API menyediakan pratinjau, deskripsi capaian, pengajuan, antrean peninjau, pengembalian, persetujuan, PDF privat dan penerbitan revisi dengan alasan. Siswa dan wali berizin memiliki halaman unduhan versi terbit dan menerima notifikasi setiap versi baru. Peninjau berwenang dapat memeriksa isi rapor, memutuskan pengajuan, dan membuka revisi lewat web. Wali kelas dapat melihat kelengkapan per siswa dan mengajukan rapor dari halaman Rapor rombel. Guru mapel dapat mengisi deskripsi capaian dari halaman Penilaian. Form terkunci saat rapor diajukan atau terbit.

1. Deskripsi capaian per mapel; pratinjau wali kelas dan daftar kekurangan; larang pengajuan bila belum lengkap.
2. Alur status draf → diajukan → disetujui/diterbitkan atau dikembalikan, dengan otorisasi berdasarkan penugasan wali kelas dan peran pimpinan.
3. Saat terbit, simpan snapshot data dan PDF privat berversi; revisi membuat versi baru beralasan tanpa mengubah versi lama. Audit setiap persetujuan dan unduhan.
4. Portal siswa/wali hanya menampilkan versi terbit. Tes keutuhan snapshot ketika nilai sumber berubah dan akses file melalui URL langsung.

**Gerbang:** satu rapor lengkap dapat diproses lintas peran, diunduh, dan diverifikasi tetap sama setelah data sumber berubah.

### Tahap 6 — beranda R2 dan pilot (E16)

**Status implementasi:** beranda pimpinan dan admin menampilkan jumlah rapor diajukan dan tautan antrean. Beranda siswa dan wali menampilkan agenda tujuh hari, tugas belum dikumpulkan yang dekat tenggat, dan nilai terbaru. Guru melihat pekerjaan penilaian yang tersisa, wali kelas melihat kelengkapan rapor rombel binaan, dan kurikulum melihat skema belum terbit serta progres rapor per rombel. Pemeriksaan browser dan regresi penuh masih terbuka.

1. Tambahkan antrean kerja R2 ke beranda guru, wali kelas, kurikulum, pimpinan, siswa, dan wali. Setiap angka memiliki definisi, sumber, waktu pembaruan, dan tautan ke daftar berizin.
2. Uji alur pada desktop dan layar ponsel; keyboard, fokus, loading, error, empty, refresh, dan Back/Forward. Produk ini tetap **web responsif**; aplikasi native belum masuk cakupan R2.
3. Jalankan tes regresi R0–R1, e2e lintas peran, uji migrasi dari database kosong, dan uji dengan data contoh yang lebih mendekati skala sekolah sebelum pilot.

**Gerbang:** pemilik produk menerima alur utama dan sekolah pilot dapat menjalankannya tanpa intervensi database manual.

**Verifikasi 26 November:** build produksi API dan web lulus, bersama 9 tes unit API. PostgreSQL 17.9 dijalankan sebagai instance lokal terisolasi. Seluruh 10 migrasi dan seed berhasil pada database kosong, lalu instance ditutup. Verifikasi ini memakai data sintetis.

**Verifikasi Chrome:** akun contoh guru, pimpinan, siswa, dan wali lulus login, pemeriksaan bagian beranda, tautan langsung ke halaman rapor, dan muat ulang pada lebar 1440 px serta 390 px. Uji juga mencakup Back/Forward pada filter antrean rapor. Pengujian ini belum menggantikan uji penerimaan lintas peran dengan data pilot.

**Regresi API 26 November:** 59/59 tes integrasi lulus pada database tes terpisah. Regresi ini selesai sebelum penambahan tabel buku nilai kelas.

## 4. Keputusan yang perlu ditutup sebelum pilot

- Arah visual baru untuk web dan hasil review tiga alur R2; jangan menganggap desain yang ada sebagai final.
- Kebijakan identitas data sekolah nyata, retensi dokumen/rapor, format kop dan penandatangan, serta siapa yang berwenang merevisi rapor terbit.
- Target database pilot: PostgreSQL 17 native/terkelola. `prisma dev` cocok untuk development lokal dan tes, tetapi bukan target pilot.
- Target metrik pilot pada `docs/prd.md` yang masih berupa placeholder.

## 5. Perintah lokal yang sudah terbukti

```bash
npm ci
npm run db:up
npm run db:deploy -w api
npm run db:generate -w api
npm run db:seed
npm run typecheck
```

`npm run db:down` menghentikan dua database lokal bila tidak dipakai. Jangan menjalankan `db:reset` pada database development yang sudah berisi pekerjaan.
