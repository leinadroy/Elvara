# ADR 0001: Tingkat, program/jurusan, dan rombel diatur sekolah (D1)

- **Status:** Diterima
- **Tanggal:** 20 November 2026
- **Diputuskan oleh:** pemilik produk (jawaban "Bisa diatur" saat memulai R1)

## Konteks

PRD D1 dan blueprint P0 meminta keputusan tentang jenjang, struktur kelas/jurusan, dan sistem semester sebelum model akademik dibuat. Elvara ditujukan untuk beberapa jenjang (SD, SMP, SMA, SMK) yang struktur kelas dan jurusannya berbeda.

## Keputusan

Struktur kelas tidak di-hardcode. Admin/kurikulum sekolah mengatur sendiri:

- **Tingkat** (`grade_level`): kode, urutan, nama. Contoh: 7/8/9 untuk SMP, X/XI/XII untuk SMA.
- **Program/jurusan** (`program`): opsional. Dipakai SMA (peminatan) atau SMK (kompetensi keahlian); sekolah tanpa jurusan cukup tidak mengisinya.
- **Rombel** (`class_group`): per tahun ajaran, dengan kode bebas (mis. 7A, X-IPA-1), kapasitas, ruang utama, dan wali kelas berriwayat.
- **Semester** mengikuti `term` pada tahun ajaran (R0): jumlah dan tanggalnya diatur sekolah.

## Alasan

Satu produk untuk banyak jenjang; aturan yang di-hardcode akan memaksa sekolah menyesuaikan diri dengan aplikasi.

## Konsekuensi

- Skema: `grade_level`, `program`, `class_group`, `homeroom_assignment` (`apps/api/prisma/schema.prisma`).
- Halaman: `/academics/setup` (tingkat, program) dan `/academics/classes`.
- Kenaikan kelas antar tahun ajaran belum otomatis; penempatan tahun baru dibuat ulang (dapat dibantu impor). Fitur kenaikan kelas massal dicatat untuk rilis berikutnya.

## Masih terbuka

- Kurikulum yang dipakai (mis. Kurikulum Merdeka) baru berpengaruh pada penilaian dan rapor di R2 (keputusan D11).
