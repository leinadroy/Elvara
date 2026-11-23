# ADR 0002: Batas ubah absensi hari yang sama, sesudahnya koreksi (D4)

- **Status:** Diterima
- **Tanggal:** 20 November 2026
- **Diputuskan oleh:** pemilik produk (jawaban "Hari yang sama" dan status "Hadir, Izin, Sakit, Alpa, Terlambat" saat memulai R1)

## Konteks

PRD D4 dan blueprint P0 meminta aturan absensi: definisi per sesi, status, batas koreksi, persetujuan, dan waktu notifikasi ke wali.

## Keputusan

1. **Absensi per sesi pelajaran** mengikuti jadwal terbit. Wali kelas boleh membuka sesi tambahan dengan alasan.
2. **Status:** Hadir, Izin, Sakit, Alpa, Terlambat. Status kosong berarti *belum diisi*, bukan alpa.
3. **Batas ubah:** guru bebas mengubah sampai pukul 23.59 hari sesi (zona waktu sekolah).
4. **Sesudah batas:** perubahan lewat koreksi beralasan. Koreksi diputuskan wali kelas rombel atau admin; koreksi yang diajukan sendiri diputuskan admin. Nilai lama, nilai baru, pengaju, dan pemutus tercatat.
5. **Notifikasi alpa** ke wali dikirim setelah status final: saat sesi ditutup, saat catatan pada sesi tertutup diubah, saat koreksi disetujui, atau saat batas hari lewat (job finalisasi). Satu notifikasi per catatan.
6. **Rekap:** persentase kehadiran = (Hadir + Terlambat) ÷ catatan terisi; sesi dibatalkan tidak dihitung.

## Alasan

Batas hari yang sama memberi guru waktu memperbaiki salah ketik tanpa birokrasi, tetapi catatan lama tidak bisa diubah diam-diam. Notifikasi setelah final mencegah wali menerima kabar alpa yang ternyata salah input.

## Konsekuensi

- Skema: `student_attendance_session`, `student_attendance_record` (`versionNo`, `finalizedAt`), `attendance_correction`.
- Kode: `apps/api/src/attendance/attendance.service.ts` (`editWindow`, `finalizeDue` tiap 10 menit, `notifyAbsent`).
- Belum ada aturan khusus keterlambatan (mis. batas menit atau terlambat dihitung setengah hadir).

## Masih terbuka

- Absensi harian di gerbang (bukan per sesi) dan izin dari wali (`absence_request`) direncanakan bersama modul keamanan/izin.
