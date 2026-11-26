# Dashboard, Peran, dan Perangkat

## Definisi hitungan

**15 konfigurasi beranda** adalah target ekosistem penuh. Satu konfigurasi dapat melayani beberapa peran yang tugasnya berdekatan, tetapi data, widget, dan aksi tetap difilter oleh izin. **7 konfigurasi MVP** adalah yang harus disiapkan untuk alur harian pertama. Dashboard bukan semua layar: formulir, detail, tabel, dan laporan mempunyai URL tersendiri.

| No. | Beranda | Pengguna | Tiga hal yang perlu terlihat segera | Bentuk utama | Tahap |
| ---: | --- | --- | --- | --- | --- |
| 1 | Admin sekolah | Admin, operator data | Data belum lengkap; verifikasi wali; impor/akun gagal | Desktop | MVP |
| 2 | Manajemen | Kepala sekolah/pimpinan | KPI dengan definisi; persetujuan; alert | Desktop + ringkasan mobile | MVP |
| 3 | Kurikulum | Wakil kurikulum/admin akademik | Jadwal bentrok; penugasan guru; nilai/rapor tertunda | Desktop | MVP |
| 4 | Guru/wali kelas | Guru mapel, wali kelas | Jadwal hari ini; sesi absensi; tugas/nilai perlu tindakan | Desktop dan mobile | MVP |
| 5 | Staf | Pegawai non-guru | Shift/tugas; hadir/izin; pengumuman internal | Mobile | MVP |
| 6 | Siswa | Siswa | Jadwal; tugas dekat tenggat; pengumuman | Mobile | MVP |
| 7 | Wali | Orang tua/wali | Pilih anak; kehadiran; tagihan/pesan/izin | Mobile | MVP |
| 8 | Keuangan | Kasir, admin/atasan keuangan | Tagihan; pembayaran belum cocok; piutang | Desktop | Lanjutan |
| 9 | Keamanan | Petugas/koordinator | Tamu aktif; izin keluar; alarm/anomali | Tablet pos | Lanjutan |
| 10 | Fasilitas/teknisi | Pengelola, teknisi | Booking bentrok; ruang ditutup; tiket kerja | Desktop pengelola, mobile teknisi | Lanjutan |
| 11 | Perpustakaan | Pustakawan | Pinjam/kembali; reservasi; terlambat | Desktop/tablet loket | Lanjutan |
| 12 | UKS/konseling | Petugas UKS, konselor | Janji/kunjungan; rujukan; tindak lanjut | Desktop privat | Lanjutan |
| 13 | Transportasi | Koordinator, pengemudi/pendamping | Rute/kursi; manifest; status naik/turun | Desktop koordinator, mobile lapangan | Lanjutan |
| 14 | Kantin/layanan | Tenant, kasir, petugas layanan | Menu/pesanan atau tiket menunggu | Tablet/mobile | Lanjutan |
| 15 | IT sekolah | Admin IT, teknisi lab | Perangkat offline; alert; action menunggu | Desktop | Lanjutan |

## Pola dashboard

Setiap beranda mempunyai: konteks peran aktif, tanggal/tahun ajaran, ringkasan 3–5 indikator yang dapat dijelaskan, antrean tindakan, pembaruan terakhir, dan tautan ke detail yang berizin. Tampilan mengikuti bahasa PDF Elvara: heading tegas, ruang putih, burgundy sebagai aksen, dan penjelasan singkat. Ilustrasi hanya untuk orientasi atau empty state; dashboard operasional memprioritaskan data dan pekerjaan.

## Peran majemuk dan batas khusus

- Guru yang juga wali murid berpindah konteks, tidak memiliki dua akun.
- Wali kelas mendapat widget rombel tambahan di beranda guru, bukan aplikasi terpisah.
- Petugas UKS dan konselor boleh memakai kerangka layout yang sama, tetapi daftar record dan izin tidak digabung.
- Koordinator transportasi melihat rute/kapasitas; pengemudi hanya manifest perjalanan yang ditugaskan.
- Pengelola fasilitas melihat kalender/kapasitas; teknisi melihat work order dan checklist.
- Tenant hanya melihat kios/menu/pesanan sendiri; petugas layanan hanya antrean unitnya.
- Petugas keselamatan mempunyai **workspace kasus khusus** yang tidak ditampilkan sebagai kartu sensitif di dashboard umum. Ini bagian dari area `/safety`, bukan beranda publik ke-16.

## Bentuk mobile yang benar

Siswa/wali: satu kolom, konteks anak jelas, tindakan dekat tenggat di atas. Guru: absensi satu siswa per baris dengan target sentuh besar, status dan jumlah tetap terlihat. Keamanan: verifikasi penjemput dan tamu harus dapat dilakukan pada tablet tanpa membuka tabel lebar. Teknisi/pengemudi: checklist/manifest cepat dengan status koneksi. Semua tetap bisa dibuka melalui URL langsung, refresh, dan Back/Forward.

## Kriteria sebelum desain visual

Untuk setiap beranda, sepakati pemilik KPI, 3 pekerjaan teratas, hak akses, ukuran layar utama, serta kondisi loading/kosong/error/data usang. Wireframe pertama cukup untuk 7 konfigurasi MVP dan tiga alur lintas peran: absensi → notifikasi wali, tugas → nilai → rapor, dan izin keluar → verifikasi gerbang.
