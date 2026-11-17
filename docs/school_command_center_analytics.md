# School Command Center & Analytics

Rancangan poin 21 dari [dokumen utama](smart_school_management_ecosystem.md). Command center menyatukan indikator operasional dari modul administrasi, akademik, absensi, fasilitas, keuangan, keamanan, dan layanan. Ia tidak menggantikan sumber data atau membuat keputusan otomatis pada kasus individual.

## Tujuan dan pengguna

Kepala sekolah/manajemen melihat kondisi sekolah dan tindakan yang memerlukan perhatian; kepala unit melihat domain yang ditugaskan; operator melihat antrean operasionalnya. Setiap dashboard memiliki scope peran. Data kesehatan, konseling, safeguarding, dan lokasi siswa hanya boleh tampil sebagai agregat aman atau antrean khusus bagi petugas berwenang.

## Prinsip metrik

Setiap metrik mempunyai definisi tertulis, sumber, filter, denominator, periode, waktu pembaruan, pemilik, dan batas kualitas data. Contoh: jumlah siswa aktif memakai status/tanggal efektif; tingkat kehadiran memakai sesi final dan mengecualikan sesi batal; piutang memakai tagihan terbit minus pembayaran terkonfirmasi; ruang tersedia memperhitungkan jadwal, booking, dan blok. Angka “menunggu sinkronisasi” tidak digabung dengan nol.

Drill-down dari agregat ke daftar individual memerlukan izin baru. Kartu yang menampilkan angka kecil pada domain sensitif disembunyikan atau digabung agar identitas tidak dapat ditebak. Perbandingan periode memakai definisi metrik yang sama; jika aturan berubah, grafik menandai perubahan metode.

## Dashboard awal

| Area | Indikator/tindakan |
| --- | --- |
| Administrasi | Siswa/staf aktif, penempatan belum lengkap, verifikasi wali tertunda |
| Akademik | Jadwal bentrok, nilai belum lengkap, rapor menunggu persetujuan |
| Kehadiran | Sesi belum ditutup, anomali, tren terlambat dengan kualitas data |
| Fasilitas/aset | Ruang ditutup, tiket kritis, perbaikan terlambat |
| Keuangan | Tagihan jatuh tempo, penerimaan terkonfirmasi, rekonsiliasi tertunda |
| Keamanan | Alarm belum diakui, tamu belum checkout, perangkat offline |
| Keselamatan | Hanya jumlah/antrean yang aman sesuai izin; tanpa narasi kasus |

Setiap indikator punya ambang peringatan yang dapat dikonfigurasi dan alasan mengapa ia muncul. Peringatan tidak menyatakan kesimpulan final; pengguna membuka daftar sumber dan mencatat tindakan. AI/rekomendasi, jika kelak dipakai, harus menjelaskan sumber serta melewati peninjauan manusia.

## Arsitektur data

Modul sumber menerbitkan event atau menyediakan query baca. Worker membangun `MetricSnapshot` dan read model terpisah untuk dashboard. Event diproses idempoten; job rekonsiliasi membandingkan hasil agregasi dengan sumber untuk menemukan drift. Cache punya TTL dan waktu pembaruan. Jika sumber gagal, kartu menunjukkan data terakhir dan status usang. Query dashboard tidak mengunci transaksi operasional.

## Model data

| Entitas | Data penting | Aturan |
| --- | --- | --- |
| `MetricDefinitionVersion` | code, formula, source, denominator | Definisi berversi |
| `MetricSnapshot` | metricId, scope, period, value, calculatedAt | Jejak waktu |
| `DataQualityStatus` | source, freshness, missingCount | Kualitas terlihat |
| `AlertRuleVersion` | metricId, threshold, audience | Aturan terbit |
| `OperationalAlert` | sourceRef, owner, priority, status | Deduplikasi |
| `ReportJob` | template, filters, requester, status, fileRef | Ekspor berizin |

UUID, UTC, indeks metrik/scope/periode, alert status, serta job. Definisi historis tidak ditimpa. Data sensitif tidak disalin ke snapshot agregat tanpa kebutuhan.

## UI, URL, dan API

Halaman: `/command-center?period=&buildingId=`, `/command-center/metrics/[metricCode]`, `/command-center/alerts?status=open`, `/command-center/reports/[reportId]`. Filter di URL. Detail alert dari daftar dapat memakai Intercepting/Parallel Routes sebagai modal bila tidak sensitif; direct link/refresh menjadi halaman penuh, Back/Forward benar. Drill-down yang sensitif tetap halaman penuh dan pemeriksaan izin ulang.

Endpoint NestJS: `GET /api/v1/command-center/overview`, `GET /api/v1/command-center/metrics/:code`, `GET /api/v1/command-center/alerts`, `POST /api/v1/command-center/reports`, `GET /api/v1/command-center/reports/:id`. API memeriksa scope, filter, row-level access, dan format kesalahan konsisten. Ekspor besar berjalan di worker dan hasilnya memiliki masa unduh terbatas.

Next.js App Router + TypeScript, Tailwind CSS + shadcn/ui, TanStack Table untuk drill-down, Agentation untuk inspeksi. Grafik harus punya ringkasan teks, label, periode, serta tabel alternatif; loading, kosong, error, dan data usang berbeda. Mobile menampilkan prioritas tindakan sebelum grafik.

## Kriteria penerimaan dan keputusan terbuka

Setiap angka dapat ditelusuri ke definisi dan sumber; izin drill-down lebih ketat daripada agregat; data usang diberi label; retry event tidak menggandakan nilai/alert; kelompok sensitif kecil terlindungi; URL/filter/Back/Forward bekerja. Putuskan KPI utama, definisi denominator, frekuensi pembaruan, ambang alert, pemilik tindakan, dan target kualitas data.
