# ADR 0005: Penilaian dan rapor Kurikulum Merdeka (D11)

- **Status:** Diterima
- **Tanggal:** 23 November 2026
- **Diputuskan oleh:** pemilik produk (jawaban saat menyiapkan R2)

## Konteks

PRD D11 memblokir R2 Akademik: format rapor dan aturan publikasi nilai. Blueprint (`05_database_core_tables.md` bagian C) menyediakan `grade_scheme_version`, `grade_component`, `assessment`, `grade_entry`, `grade_change`, `report_card`, dan `report_card_version`.

## Keputusan

1. **Kurikulum Merdeka.** Rapor per mapel berisi nilai akhir 0–100 dan deskripsi capaian kompetensi (capaian tertinggi dan yang perlu ditingkatkan), ditambah rekap kehadiran dan catatan wali kelas.
2. **Komponen dan bobot nilai ditetapkan bagian kurikulum per mapel per semester** (mis. tugas 30%, sumatif tengah semester 30%, sumatif akhir semester 40%). Semua guru mapel itu memakai skema yang sama. Skema berversi: setelah terbit dan dipakai, tidak diubah diam-diam; perubahan membuat versi baru.
3. **Nilai terlihat per penilaian.** Guru menerbitkan nilai per tugas/ulangan; siswa dan wali (hubungan terverifikasi, izin akademik) melihatnya setelah terbit. Nilai kosong berbeda dari nol. Perubahan nilai yang sudah terbit dicatat (`grade_change`: nilai lama, baru, alasan, pelaku).
4. **Alur rapor: wali kelas → kepala sekolah.** Wali kelas menyusun dan mengajukan; kepala sekolah (peran Manajemen) menyetujui, lalu rapor terbit sebagai versi yang tidak berubah (`report_card_version.snapshot_json` + file PDF). Koreksi setelah terbit membuat versi baru, bukan menimpa.

## Alasan

Kurikulum Merdeka adalah kurikulum yang berlaku umum; bobot seragam per mapel menjaga keadilan antar kelas; nilai per penilaian membuat siswa dan wali bisa menindaklanjuti lebih awal; persetujuan kepala sekolah menjaga mutu dokumen resmi.

## Konsekuensi

- R2 membangun: skema penilaian berversi per mapel–semester, penilaian dan nilai per siswa, terbit nilai, rekap nilai akhir, deskripsi capaian, rapor berversi dengan persetujuan, serta tampilan nilai/rapor di portal siswa dan wali.
- Deskripsi capaian: guru menulis atau memilih dari daftar capaian per mapel (`learning_outcome`), detailnya ditetapkan saat merinci PRD R2.

## Masih terbuka

- Pembulatan nilai akhir dan ada tidaknya batas ketuntasan (KKTP) per mapel.
- Templat tampilan PDF rapor (kop sekolah, tanda tangan) — mengikuti contoh rapor sekolah.
