# PRD lanjutan: R2 Akademik

Rincian kebutuhan rilis **R2 Akademik** untuk Elvara School Ecosystem. Dokumen ini melanjutkan [PRD utama](prd.md) bagian 6–7 dan mengikuti [ADR 0005](adr/0005-d11-penilaian-rapor.md) (Kurikulum Merdeka, bobot per mapel oleh kurikulum, nilai terlihat per penilaian, rapor wali kelas → kepala sekolah). Dasar rancangan: [modul akademik](academic_management_system.md) bagian 5–9 dan `architecture_blueprint/05_database_core_tables.md` bagian C.

- **Status:** Draf untuk dibangun
- **Tanggal:** 24 November 2026
- **Syarat mulai:** R1 selesai (sudah), keputusan D11 (ADR 0005)

## 1. Tujuan R2

1. Guru mengelola tugas dan penilaian kelas yang diajarnya, dari pembuatan sampai nilai terbit, tanpa spreadsheet terpisah.
2. Siswa dan wali melihat tugas, tenggat, dan nilai yang sudah terbit sesuai hak masing-masing.
3. Sekolah menghasilkan rapor Kurikulum Merdeka yang disusun wali kelas, disetujui kepala sekolah, dan terbit sebagai versi yang tidak berubah.
4. Agenda akademik (ujian, libur, pembagian rapor) terbit di satu kalender.

**Di luar R2:** ujian online bertimer, bank soal, analisis butir, integrasi LMS, tanda tangan digital, verifikasi rapor publik, kenaikan kelas massal.

## 2. Default yang dipakai sampai sekolah memutuskan lain

Hal berikut masih terbuka di ADR 0005 dan [modul akademik](academic_management_system.md) bagian 17. R2 dibangun dengan default di bawah, yang **bisa diubah tanpa mengubah skema**:

| Hal | Default R2 | Dapat diatur di |
| --- | --- | --- |
| Skala nilai | 0–100, satu angka desimal | Tetap |
| Pembulatan | Nilai akhir dibulatkan **sekali** ke bilangan bulat (setengah ke atas); komponen tidak dibulatkan | Skema nilai (`roundingRule`) |
| Ketuntasan (KKTP) | Opsional per mapel; bila diisi, nilai di bawahnya ditandai "perlu tindak lanjut" | Skema nilai |
| Keadaan nilai | Berangka, **belum dinilai** (kosong), **tidak mengumpulkan** (dihitung 0), **tidak berlaku** (dikecualikan dari rata-rata) | Tetap |
| Nilai belum lengkap | Nilai akhir berstatus "belum lengkap" bila ada nilai kosong pada penilaian yang sudah terbit; tidak dianggap nol | Tetap |
| Berkas tugas | PDF, JPG, PNG, maks. 5 MB per berkas, disimpan privat (sama dengan dokumen R0) | Konfigurasi aplikasi |
| Keterlambatan | Kiriman setelah tenggat ditandai **terlambat**; diterima bila tugas mengizinkan | Per tugas |
| Kirim ulang | Boleh sampai tenggat; setiap kiriman menjadi versi baru | Per tugas |
| PDF rapor | Dibuat server dari snapshot dengan templat bawaan (kop: nama sekolah, NPSN, alamat) | Templat berversi |

## 3. Kebutuhan fungsional

### E10. Kalender akademik

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-10.1 | Kurikulum/admin membuat agenda: judul, kategori (awal/akhir semester, ujian, libur, pembagian rapor, tenggat, kegiatan), tanggal mulai–selesai, audiens (semua, guru & staf, siswa & wali, satu tingkat), lokasi opsional. | Must |
| FR-10.2 | Agenda berstatus draf atau terbit; hanya yang terbit tampil di portal. Agenda terbit yang diubah tetap tercatat di audit. | Must |
| FR-10.3 | Kalender per bulan dan daftar agenda mendatang tersedia untuk semua peran sesuai audiens. | Must |
| FR-10.4 | Agenda yang bertabrakan dengan kategori ujian atau libur ditandai saat disimpan. | Should |

**Kriteria penerimaan:** agenda draf tidak terlihat di portal; audiens diperiksa saat dibaca.

### E11. Skema nilai

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-11.1 | Kurikulum menetapkan skema nilai per **mapel × tingkat × semester**: komponen (kode, nama, bobot %) dan KKTP opsional. | Must |
| FR-11.2 | Jumlah bobot harus 100% sebelum skema terbit. | Must |
| FR-11.3 | Skema terbit tidak diubah; perubahan membuat versi baru. Penilaian yang sudah ada tetap menunjuk versi skema saat dibuat. | Must |
| FR-11.4 | Kurikulum menetapkan daftar capaian pembelajaran per mapel × tingkat (kode, deskripsi) untuk dipakai di deskripsi rapor. | Should |

### E12. Tugas dan pengumpulan

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-12.1 | Guru membuat kegiatan pada penugasan mengajarnya: jenis (tugas, kuis, ujian, praktik), judul, instruksi, waktu buka, tenggat, komponen nilai, izin terlambat, izin kirim ulang. | Must |
| FR-12.2 | Status kegiatan: draf, terbit, ditutup, dibatalkan. Siswa hanya melihat kegiatan terbit untuk rombel tempatnya ditempatkan. | Must |
| FR-12.3 | Siswa mengirim teks dan/atau berkas; setiap kiriman tercatat sebagai versi dengan waktu dan status tepat waktu/terlambat. Unggahan gagal tidak menandai terkumpul. | Must |
| FR-12.4 | Guru melihat daftar kiriman per siswa (belum mengumpulkan, tepat waktu, terlambat), membuka berkas, dan memberi nilai serta umpan balik dari halaman yang sama. | Must |
| FR-12.5 | Wali melihat daftar tugas dan status pengumpulan anaknya (izin akademik). | Should |

**Kriteria penerimaan:** siswa dari rombel lain atau setelah tenggat (bila tidak diizinkan) ditolak lewat API langsung; pengiriman ulang tidak menggandakan kiriman (idempoten per versi).

### E13. Penilaian dan buku nilai

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-13.1 | Penilaian dibuat dari kegiatan atau langsung (mis. sumatif akhir semester), selalu terkait satu komponen skema. | Must |
| FR-13.2 | Buku nilai per penugasan mengajar: siswa × penilaian, dengan empat keadaan nilai, umpan balik, dan rata-rata komponen/akhir yang dihitung backend. | Must |
| FR-13.3 | Guru menerbitkan nilai per penilaian; hanya nilai terbit yang terlihat oleh siswa dan wali. | Must |
| FR-13.4 | Mengubah nilai yang sudah terbit wajib beralasan dan tercatat (`grade_change`: lama, baru, alasan, pelaku, waktu). | Must |
| FR-13.5 | Penyimpanan memakai pemeriksaan versi; dua perubahan bersamaan pada nilai yang sama → 409. | Must |
| FR-13.6 | Nilai di luar 0–100 ditolak; isian massal menampilkan jumlah perubahan dan galat per baris. | Must |

**Kriteria penerimaan:** nilai kosong, nol, dan tidak berlaku menghasilkan perhitungan berbeda; perhitungan ulang setelah skema berganti versi tidak mengubah rapor yang sudah terbit.

### E14. Nilai di portal

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-14.1 | Siswa melihat nilai terbit per mapel: penilaian, nilai, umpan balik, dan nilai akhir berjalan beserta status lengkap/belum. | Must |
| FR-14.2 | Wali melihat hal yang sama untuk anak dengan hubungan terverifikasi dan izin akademik. | Must |
| FR-14.3 | Notifikasi dalam aplikasi saat nilai penilaian terbit dan saat tugas baru terbit. | Should |

### E15. Rapor

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-15.1 | Rapor per siswa per semester berisi: identitas siswa dan rombel saat terbit, nilai akhir per mapel, deskripsi capaian (tertinggi dan perlu ditingkatkan), rekap kehadiran (Hadir/Izin/Sakit/Alpa/Terlambat), catatan wali kelas. | Must |
| FR-15.2 | Wali kelas melihat pratinjau rapor rombel binaan beserta daftar masalah (mapel belum lengkap, deskripsi kosong). Rapor dengan masalah tidak dapat diajukan. | Must |
| FR-15.3 | Guru mapel menulis deskripsi capaian per siswa (boleh memilih dari daftar capaian pembelajaran). | Must |
| FR-15.4 | Alur: draf → diajukan (wali kelas) → disetujui dan terbit (kepala sekolah) atau dikembalikan dengan catatan. | Must |
| FR-15.5 | Terbit membuat versi rapor yang tidak berubah: snapshot data + berkas PDF. Revisi setelah terbit membuat versi baru beralasan; versi lama tetap tersimpan. | Must |
| FR-15.6 | Siswa dan wali (izin akademik) melihat dan mengunduh rapor terbit; setiap unduhan tercatat. | Must |
| FR-15.7 | Notifikasi dalam aplikasi ke siswa dan wali saat rapor terbit. | Should |

**Kriteria penerimaan:** rapor terbit tetap sama setelah nilai sumber berubah; wali hanya membuka rapor anak terverifikasi, termasuk lewat tautan langsung.

### E16. Beranda R2

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-16.1 | **Guru:** kiriman belum dinilai, penilaian belum terbit, deskripsi rapor belum diisi. | Must |
| FR-16.2 | **Wali kelas:** kelengkapan rapor rombel binaan. | Must |
| FR-16.3 | **Kurikulum:** skema nilai belum terbit per mapel, progres rapor per rombel. | Must |
| FR-16.4 | **Pimpinan:** rapor menunggu persetujuan. | Must |
| FR-16.5 | **Siswa/wali:** tugas dekat tenggat, nilai terbaru, agenda mendatang. | Must |

Semua angka mengikuti aturan FR-8.8 (definisi, sumber, waktu pembaruan).

## 4. Hak akses

| Izin | Peran | Untuk |
| --- | --- | --- |
| `calendar:manage` | Admin, Kurikulum | Agenda akademik |
| `grading:manage` | Admin, Kurikulum | Skema nilai, capaian pembelajaran |
| `grading:read` | Admin, Kurikulum, Pimpinan | Buku nilai dan rapor semua rombel (baca) |
| `report-cards:approve` | Pimpinan (kepala sekolah), Admin | Menyetujui dan menerbitkan rapor |

Guru mengelola tugas dan nilai **berdasarkan data** (penugasan mengajarnya), wali kelas menyusun rapor berdasarkan penugasan wali kelas, siswa dan wali berdasarkan penempatan dan hubungan terverifikasi; tanpa izin tambahan.

## 5. Tabel (blueprint bagian C)

`academic_calendar_event`, `grade_scheme_version`, `grade_component`, `learning_outcome`, `learning_activity`, `submission`, `submission_version`, `assessment`, `grade_entry`, `grade_change`, `report_card`, `report_card_subject` (nilai dan deskripsi per mapel sebelum terbit), `report_card_version`. Rincian kolom ada di [model data](r0-data-model.md#r2-akademik-13-tabel). Templat PDF rapor saat ini sederhana (kop teks, tanda tangan nama); kop/logo dan format resmi sekolah menunggu masukan sekolah.

## 6. Urutan pembangunan

1. Kalender akademik (E10).
2. Skema nilai dan capaian pembelajaran (E11).
3. Penilaian, buku nilai, terbit dan koreksi nilai (E13).
4. Tugas dan pengumpulan (E12).
5. Nilai di portal dan notifikasi (E14).
6. Rapor: deskripsi, pratinjau, pengajuan, persetujuan, snapshot dan PDF (E15).
7. Beranda R2 (E16), tes e2e lintas peran, uji browser.
