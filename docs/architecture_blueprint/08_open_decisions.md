# Keputusan Sebelum Mulai Desain

Dokumen ini memisahkan hal yang dapat kita desain sekarang dari hal yang memerlukan keputusan operasional sekolah. Keputusan yang belum ada tidak perlu menghentikan wireframe umum, tetapi tidak boleh disamarkan sebagai aturan final pada skema atau UI.

## Keputusan produk prioritas

| Prioritas | Keputusan | Pengaruh |
| --- | --- | --- |
| P0 | Jenjang, kurikulum, semester, program/jurusan, format rombel | Model akademik, navigasi, rapor |
| P0 | Hubungan wali, verifikasi, hak per anak, penjemput | Portal wali, izin, keamanan, privasi |
| P0 | Definisi absensi per hari/sesi, batas koreksi, notifikasi | Tabel absensi, dashboard, komunikasi |
| P0 | Peran dan scope: kelas, unit, gedung, kasus | Semua API, menu, dashboard |
| P0 | Sumber data awal siswa/pegawai dan kualitas NIS/NIP | Impor, validasi, migrasi |
| P1 | Biaya, gateway, potongan, pembayaran parsial, refund | Keuangan dan portal wali |
| P1 | SOP pelaporan keselamatan, petugas siaga, jalur darurat | Safeguarding/SOS |
| P1 | Aturan UKS/konseling dan retensi catatan | Data sensitif dan akses |
| P1 | Perangkat QR/NFC/gerbang, jaringan dua gedung | Integrasi dan fallback |
| P2 | Lokasi siswa: tujuan, teknologi, akurasi, jam aktif | Pilot lokasi, bukan fitur dasar |
| P2 | Offline/native mobile dan agen Windows | Codebase/deployment tambahan |
| P2 | Voucher/kupon makan seperti opsi pada PDF acuan | Hak penerima, saldo/kuota, kasir, rekonsiliasi |

## Desain yang bisa dimulai setelah P0

1. **Information architecture:** sitemap area kerja, menu per peran, dan hubungan URL.
2. **User flow:** tiga alur lintas modul pada [matriks modul](07_module_coverage.md).
3. **Wireframe desktop/mobile:** Admin, Guru, Siswa, Wali terlebih dahulu; lalu Kurikulum, Manajemen, Staf.
4. **Design system:** token visual dari [PDF Elvara](01_visual_direction.md), komponen shadcn/ui, tabel, form, status, empty/error/loading.
5. **Kontrak API dan Prisma:** setelah user flow serta aturan data yang mengubah state disetujui.

## Pertanyaan untuk lokakarya dengan sekolah

- Dalam satu hari, tiga pekerjaan apa yang paling sering dilakukan admin, guru, wali, siswa, dan petugas gerbang?
- Berapa pengguna aktif bersamaan pada jam masuk, pergantian kelas, dan pembagian rapor?
- Apakah semua siswa memiliki perangkat pribadi dan koneksi memadai?
- Seberapa sering dua gedung kehilangan internet/jaringan internal?
- Siapa menyetujui perubahan identitas, nilai, tagihan, izin keluar, dan laporan keselamatan?
- Laporan apa yang saat ini diwajibkan pimpinan, dan bagaimana definisi angkanya?
- Perangkat apa yang sudah ada dan apakah vendor menyediakan API yang dapat diuji?
- Apakah sekolah memerlukan dua bahasa, aksesibilitas khusus, atau kebijakan perangkat bersama?

## Exit criteria sebelum desain visual final

- P0 dijawab dan dicatat sebagai keputusan arsitektur/produk.
- Hitungan aplikasi disetujui: 1 web, 1 pengalaman mobile dari codebase yang sama, native 0 awal.
- Tujuh dashboard MVP dan pemilik prosesnya disetujui.
- Tiga alur lintas modul diuji dengan perwakilan pengguna.
- Tabel inti mempunyai relasi/constraint yang cukup untuk mendukung alur tersebut.
- Arah visual diuji pada satu layar data padat desktop dan satu layar tindakan mobile.

Setelah itu, desain detail layar dapat dimulai tanpa harus menebak aturan yang memengaruhi keamanan, uang, atau riwayat siswa.
