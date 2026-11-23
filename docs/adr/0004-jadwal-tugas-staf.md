# ADR 0004: Jadwal tugas staf sederhana sebelum modul kehadiran pegawai (FR-8.5)

- **Status:** Diterima
- **Tanggal:** 23 November 2026
- **Diputuskan oleh:** pemilik produk ("selesaikan R1 yang masih pending")

## Konteks

PRD FR-8.5 (Must) meminta beranda staf menampilkan jadwal tugas. Blueprint menyediakan `work_schedule` (pola berversi) dan `work_shift` (tugas per waktu, benturan diperiksa) pada kelompok absensi dan pekerjaan pegawai, yang lengkapnya masuk rilis R3 bersama kehadiran pegawai, izin, dan cuti.

## Keputusan

R1 memakai **`work_shift` saja**: admin mengisi tugas staf per tanggal dan jam (mis. piket gerbang 06.30–07.30 di Gedung A). Staf melihat tugas hari ini di beranda dan daftar 14 hari di `/staff/schedule`. Tugas yang bentrok untuk pegawai yang sama ditolak. Tugas dibatalkan, bukan dihapus.

## Alasan

Beranda staf berguna sejak pilot tanpa menunggu aturan shift berulang, kehadiran pegawai, dan cuti yang masih butuh keputusan sekolah.

## Konsekuensi

- Skema: `work_shift` (`employeeId`, `title`, `startsAt`, `endsAt`, `roomId` sebagai lokasi, `status`, `note`).
- R3 menambah `work_schedule` (pola mingguan) yang menghasilkan `work_shift`; data R1 tetap terpakai.
- Belum ada pengisian berulang otomatis; admin mengisi per tanggal (bisa menyalin dari minggu sebelumnya di rilis berikutnya).
