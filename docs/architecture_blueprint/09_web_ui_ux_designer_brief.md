# Brief UI/UX Designer — Aplikasi Web Elvara

**Tujuan dokumen:** arahan untuk menyusun information architecture, wireframe, dan desain visual **web** sebelum desain mobile atau aplikasi native. Rujukan produk: [peta aplikasi](02_application_map.md), [dashboard peran](04_dashboards_roles.md), [21 modul](../smart_school_master_note.md), dan PDF *Elvara — Ekosistem Digital Sekolah* yang diberikan pemilik proyek.

**Skill pendukung sebelum desain:** [UI/UX Pro Max](../../.agents/skills/ui-ux-pro-max/SKILL.md) tersedia untuk Codex di project ini. Pakai pencarian desain sistem/UX/stack saat mengeksplorasi solusi, lalu uji hasilnya terhadap alur nyata, aksesibilitas, dan gaya PDF Elvara. Rekomendasi skill adalah masukan, bukan pengganti keputusan produk atau brand.

## 1. Produk yang akan didesain

Elvara adalah **satu aplikasi web sekolah** dengan satu login dan area kerja yang berubah menurut peran serta cakupan akses. Seorang pengguna bisa memiliki lebih dari satu konteks, misalnya guru sekaligus wali murid. Perpindahan konteks tidak membuat akun kedua. Desain tahap ini berfokus pada **desktop/laptop**, dengan tata letak yang tetap responsif sampai tablet; desain pengalaman ponsel akan dibahas tersendiri setelah alur web disetujui.

Tujuan dashboard bukan memamerkan semua fitur. Dashboard harus menjawab: **apa yang perlu saya lakukan hari ini, apa yang berubah, dan ke mana saya harus masuk untuk menyelesaikannya?** Setiap angka dan status harus punya definisi, periode, serta tautan ke data sumber yang berizin.

## 2. Arah visual dari PDF Elvara

PDF memberi kesan formal, optimistis, dan mudah diikuti: bidang putih luas, garis burgundy di atas, judul charcoal yang tegas, teks singkat, panel abu sangat muda, dan ilustrasi sekolah yang menjelaskan hubungan antarpihak. Gunakan ini sebagai **bahasa visual**; jangan menyalin layout slide, logo, foto, atau ilustrasi PDF ke layar produk tanpa aset dan izin resmi.

| Unsur | Arahan untuk web |
| --- | --- |
| Warna | Putih hangat sebagai latar; charcoal untuk teks; burgundy sebagai aksen utama; merah terang hanya untuk alur/penekanan yang bermakna |
| Tipografi | Satu keluarga sans-serif yang mudah dibaca. Judul halaman kuat, label dan isi ringkas; ukuran tubuh teks nyaman untuk pekerjaan lama |
| Komposisi | Grid rapi, ruang putih cukup, hirarki kiri-ke-kanan. Tidak ada hero marketing di dashboard internal |
| Ilustrasi | Pakai pada onboarding, penjelasan alur, dan empty state yang spesifik; halaman kerja harian memprioritaskan daftar serta tindakan |
| Ikon | Sederhana dan konsisten; tidak menjadi pengganti label teks |
| Grafik | Hanya bila membantu keputusan; selalu tampilkan periode, satuan, definisi, dan alternatif tabel/rincian |
| Status | Teks + warna, bukan warna saja. Burgundy brand tidak boleh disalahartikan sebagai error |

Token eksplorasi awal: `#FFFFFF`/`#FAFAF8` (latar), `#252A2E` (teks), `#5F6972` (teks sekunder), `#7C1025` (burgundy), `#F5F6F7` (panel), `#D9DEE1` (garis). Warna final perlu dicocokkan dengan brand kit dan diuji kontras. Gunakan Tailwind CSS dan shadcn/ui sebagai dasar komponen; jangan mengubah komponen hanya untuk memberi ornamen.

## 3. Kerangka web bersama

**Ukuran rancangan utama:** desktop 1440 px, lalu periksa laptop 1280 px dan tablet 1024 px. Ukuran ini adalah target review desain, bukan breakpoint implementasi final.

- **Sidebar tetap** sekitar 240–260 px: area kerja, navigasi domain yang tersedia untuk peran aktif, dan penanda halaman aktif. Tidak semua dari 21 modul muncul sekaligus.
- **Header ringkas:** nama sekolah, tahun ajaran/semester aktif bila relevan, pencarian yang benar-benar memiliki cakupan, notifikasi, akun, dan pemilih konteks peran.
- **Area konten:** judul halaman, satu kalimat konteks bila perlu, aksi utama, filter/periode, lalu pekerjaan atau data. Breadcrumb pada detail yang bertingkat.
- **Pola halaman:** dashboard tindakan, daftar/tabel, detail, formulir, kalender, dan laporan. Gunakan pola yang sama untuk hubungan navigasi, bukan template visual identik untuk semua dashboard.
- **Tabel:** TanStack Table; pencarian/filter/sort/pagination yang penting tercermin dalam URL. Kolom prioritas, jumlah hasil, status, serta aksi baris jelas.
- **Detail dan modal:** sumber daya memiliki URL langsung. Modal detail dari daftar boleh memakai Intercepting/Parallel Routes; direct link atau refresh membuka halaman penuh, Back menutup modal, Forward membukanya lagi. Formulir panjang lebih baik halaman penuh.
- **Akses:** menu mengikuti role aktif, tetapi UI harus punya keadaan akses ditolak karena izin backend tetap otoritatif.

## 4. Tujuh dashboard web utama untuk MVP

### 4.1 Admin sekolah / operator data — `/admin/dashboard`

**Pertanyaan utama:** data resmi apa yang belum lengkap atau perlu diverifikasi sebelum proses sekolah berjalan?

1. **Antrean tindakan teratas:** wali belum terverifikasi, siswa tanpa rombel, impor gagal, undangan akun tertunda.
2. **Ringkasan operasional:** jumlah siswa aktif, pegawai aktif, rombel aktif, dan kelengkapan data; masing-masing berperiode dan berdefinisi.
3. **Perubahan terakhir:** mutasi siswa, perubahan status pegawai, penempatan kelas, dan dokumen menunggu pengesahan.
4. **Aksi utama:** tambah/impor siswa, verifikasi wali, buka tahun ajaran, kelola akun.
5. **Drill-down:** `/admin/students`, `/admin/academic-years/[id]`, `/admin/accounts`, `/admin/documents`.

**Bentuk:** daftar kerja dan tabel adalah fokus. Jangan menghabiskan separuh layar untuk empat angka besar tanpa tindak lanjut. Operator hanya melihat antrean dalam unit/scope-nya; admin melihat lebih luas.

### 4.2 Kepala sekolah / manajemen — `/management/dashboard`

**Pertanyaan utama:** kondisi mana yang memerlukan keputusan pimpinan hari ini?

1. **Persetujuan menunggu:** publikasi rapor, kebijakan/pengecualian, permintaan lain sesuai mandat.
2. **Indikator inti MVP:** kehadiran final, kelengkapan absensi, jadwal bentrok, nilai/rapor tertunda, siswa/pegawai aktif.
3. **Peringatan operasional:** antrean melewati target waktu; sumber data usang atau belum lengkap diberi label.
4. **Tren singkat:** hanya 1–2 grafik yang benar-benar membantu melihat perubahan, dengan definisi dan periode.
5. **Drill-down:** `/management/approvals`, `/command-center/metrics/[code]`, laporan berizin.

**Bentuk:** ringkasan terukur + daftar keputusan. Jangan menampilkan nama atau detail kasus keselamatan/UKS pada dashboard umum. KPI keuangan baru tampil saat modul keuangan dan definisinya siap.

### 4.3 Kurikulum / admin akademik — `/academics/dashboard`

**Pertanyaan utama:** apa yang menghambat jadwal, proses penilaian, atau penerbitan rapor?

1. **Antrean masalah:** benturan guru/ruang/rombel, penugasan belum lengkap, sesi belum terbit.
2. **Status semester:** kurikulum/mapel aktif, jadwal draf vs terbit, kelas tanpa guru.
3. **Kelengkapan penilaian:** mapel/rombel yang belum lengkap; rapor menunggu pemeriksaan/persetujuan.
4. **Aksi utama:** buka penugasan mengajar, perbaiki jadwal, tinjau publikasi rapor.
5. **Drill-down:** `/academics/teaching-assignments`, `/academics/timetable`, `/academics/report-cards`.

**Bentuk:** tabel exception dan kalender kerja lebih berguna daripada KPI generik. Benturan harus menunjukkan objek dan waktu yang bertabrakan.

### 4.4 Guru / wali kelas — `/teacher/dashboard`

**Pertanyaan utama:** kelas mana yang akan saya ajar dan pekerjaan apa yang perlu saya selesaikan?

1. **Jadwal hari ini** dengan rombel, mapel, ruang, waktu, dan perubahan sesi.
2. **Aksi cepat:** buka absensi sesi berikutnya, lihat tugas yang perlu dinilai, lanjutkan buku nilai.
3. **Antrean kelas:** absensi belum ditutup, kiriman belum dinilai, nilai belum diterbitkan.
4. **Wali kelas saja:** tindak lanjut siswa dan kelengkapan rapor rombel yang ditugaskan.
5. **Drill-down:** `/teacher/attendance/sessions/[id]`, `/teacher/assignments/[id]`, `/teacher/classes/[id]/grades`.

**Bentuk:** agenda + pekerjaan terurut waktu. Modul wali kelas muncul kontekstual; tidak perlu dashboard terpisah.

### 4.5 Staf non-guru — `/staff/dashboard`

**Pertanyaan utama:** shift/tugas apa yang saya pegang dan permintaan mana yang harus saya tindak lanjuti?

1. **Jadwal dan lokasi kerja hari ini**, termasuk perubahan tugas.
2. **Status kehadiran pribadi** dan pengajuan izin/cuti yang menunggu.
3. **Tugas/permintaan yang ditugaskan**, dengan tenggat dan prioritas.
4. **Pengumuman internal** yang relevan.
5. **Drill-down:** `/staff/schedule`, `/staff/attendance`, `/staff/leave/requests`, tugas unit.

**Bentuk:** sederhana dan personal. Jangan tampilkan data kinerja/izin rekan kerja. Untuk staf lapangan, desain web desktop ini harus tetap punya jalur responsif yang jelas, tetapi detail ponsel dikerjakan tahap berikutnya.

### 4.6 Siswa — `/student/dashboard`

**Pertanyaan utama:** apa yang harus saya lakukan untuk sekolah hari ini?

1. **Jadwal hari ini** dan perubahan ruang/waktu.
2. **Tugas dekat tenggat** serta status pengumpulan.
3. **Pengumuman penting** dan kegiatan terdekat.
4. **Hasil yang baru diterbitkan**, tanpa nilai draf.
5. **Drill-down:** `/student/timetable`, `/student/assignments/[id]`, `/student/announcements/[id]`.

**Bentuk:** jelas, tidak padat, bahasa sesuai usia. Jangan memajang peringkat atau label perilaku. Layar desktop tetap nyaman, tetapi urutan konten harus dapat dipindahkan ke ponsel kelak.

### 4.7 Orang tua / wali — `/guardian/dashboard`

**Pertanyaan utama:** anak mana yang membutuhkan perhatian saya, dan tindakan apa yang harus saya ambil?

1. **Pemilih anak yang sangat jelas**; hak dan informasi tiap anak dapat berbeda.
2. **Kehadiran terbaru** dan izin/koreksi yang menunggu.
3. **Jadwal, tenggat, pengumuman, serta pesan sekolah** yang relevan.
4. **Aksi utama:** ajukan izin, buka pesan, lihat detail anak.
5. **Drill-down:** `/guardian/children/[studentId]/attendance`, `/guardian/children/[studentId]/timetable`, `/guardian/messages/[id]`.

**Bentuk:** setiap kartu/aksi menegaskan anak yang sedang dipilih. Tagihan dan pembayaran ditambahkan ketika modul keuangan siap; lokasi dan informasi insiden hanya setelah kebijakan khusus disetujui. Jangan membuat placeholder data yang terlihat seolah sudah aktif.

## 5. Urutan desain layar

1. **Shell dan navigasi:** login, pilih peran, sidebar/header, akses ditolak, dan breadcrumb.
2. **Empat dashboard pembuka:** Admin, Guru, Siswa, Wali. Keempatnya menguji kepadatan informasi yang berbeda.
3. **Tiga dashboard berikutnya:** Manajemen, Kurikulum, Staf.
4. **Tiga alur lintas peran:** guru mengisi absensi → wali menerima informasi; guru menilai → rapor terbit; wali mengajukan izin keluar → petugas gerbang memverifikasi (alur ketiga sebagai eksplorasi lanjut).
5. **Komponen umum:** tabel, filter URL, kalender, status, form, modal dengan URL, notifikasi, loading, empty, error, konflik, data usang.

## 6. Deliverable yang diminta dari UI/UX designer

- Sitemap area web dan menu untuk tujuh peran MVP.
- User flow untuk tiga alur di atas, termasuk pemeran, objek data, keputusan, dan exception.
- Wireframe 1440 px untuk tujuh dashboard; review juga pada 1280 dan 1024 px.
- High-fidelity minimal untuk shell, Admin, Guru, Siswa, dan Wali; tiga dashboard lain memakai sistem komponen yang sama setelah pola disetujui.
- Komponen dan token dalam Figma/design system: tipografi, warna, spacing, button, input, status, tabel, kalender, empty/error/loading, modal.
- Spesifikasi interaksi: direct URL, refresh, Back/Forward, fokus keyboard, izin yang berubah, dan pemulihan error.
- Daftar pertanyaan keputusan produk yang memengaruhi desain, bukan asumsi tersembunyi di mockup.

## 7. Kriteria review desain

Seorang pengguna baru dapat menemukan pekerjaan utamanya dalam 10 detik; tindakan terpenting tidak tersembunyi di bawah grafik/dekorasi. Setiap angka dapat dijelaskan, setiap status punya tindakan berikutnya, dan tiap URL detail dapat dibuka langsung. Desain sesuai gaya Elvara tanpa membuat semua dashboard terlihat identik. Peninjauan aksesibilitas mencakup kontras, keyboard, fokus modal, label formulir, dan penggunaan warna. Saat implementasi, inspeksi UI dilakukan dengan Agentation.

**Batas brief:** ini hanya arah **web**. Versi mobile/PWA dan kemungkinan aplikasi native akan mendapat brief tersendiri setelah alur web utama divalidasi.
