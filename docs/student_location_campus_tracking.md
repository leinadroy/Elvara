# Student Location & Campus Tracking

Dokumen ini merinci poin 8 dari [Smart School Management Ecosystem](smart_school_management_ecosystem.md). Fitur ini bertujuan membantu petugas menemukan **area terakhir yang terdeteksi** saat ada kebutuhan operasional atau permintaan bantuan, serta memberi informasi yang pantas kepada wali terverifikasi. Struktur gedung/ruang dan identitas siswa bersumber dari [Administrasi Sekolah](school_administration_management.md); titik akses dari [Campus Security & Access Control](campus_security_access_control.md); permintaan SOS dari [Student Safety & Safeguarding System](student_safety_safeguarding_system.md).

**Status:** eksplorasi rancangan. Fitur pelacakan tidak termasuk MVP awal sampai tujuan, akurasi teknologi, kebijakan privasi, hak akses, dan prosedur respons disepakati serta diuji di dua gedung. UI tidak boleh memberi kesan bahwa sekolah selalu mengetahui posisi siswa.

## 1. Tujuan, istilah, dan batas sistem

Tujuan awal yang layak diuji: membantu petugas mengidentifikasi zona terakhir saat siswa meminta bantuan, mengurangi waktu pencarian di kampus, dan memberi wali informasi terbatas yang disetujui sekolah. Data lokasi tidak dipakai untuk menilai disiplin atau kehadiran kelas secara otomatis.

| Istilah | Makna yang harus ditampilkan di UI |
| --- | --- |
| `deteksi zona` | Sinyal perangkat menunjukkan siswa mungkin berada di area tertentu pada waktu tertentu |
| `lokasi terakhir terdeteksi` | Zona dari sinyal valid terbaru; bukan jaminan posisi saat ini |
| `lokasi real-time` | Posisi yang diperbarui terus menerus dengan batas keterlambatan dan akurasi yang terukur; hanya boleh disebut demikian jika benar-benar tersedia |
| `tidak diketahui` | Tidak ada sinyal yang cukup baru atau cukup terpercaya untuk menyimpulkan zona |
| `di luar cakupan` | Sistem tidak memantau pada waktu/tempat tersebut menurut kebijakan |

Setiap tampilan lokasi harus menampilkan **zona, waktu deteksi, sumber/tingkat keyakinan yang dapat dipahami, dan status kesegaran**. Hindari titik presisi pada peta bila teknologi hanya mampu menentukan gedung atau area.

## 2. Cakupan data dan hubungan antar modul

| Dalam modul lokasi | Sumber atau pemilik proses lain |
| --- | --- |
| Zona yang dapat dideteksi, event sinyal, estimasi lokasi terakhir, kualitas sinyal | Gedung, lantai, ruang dari administrasi |
| Aturan jam aktif, izin akses, retensi, audit pembacaan | Akun, hubungan wali, peran dari administrasi |
| Permintaan melihat lokasi dalam konteks bantuan | SOS/kasus dari safeguarding |
| Pemberitahuan lokasi terbatas sesuai kebijakan | Pusat komunikasi mengirim pesan, tanpa detail sensitif di kanal luar |
| Status perangkat dan ingest | IT/perangkat kampus |

Event gerbang, absensi kelas, dan data transportasi tidak otomatis menjadi lokasi siswa yang terus menerus. Masing-masing hanya dapat menjadi petunjuk dengan waktu dan konteks yang jelas.

## 3. Kasus penggunaan yang diizinkan

1. **Siswa meminta bantuan:** petugas respons melihat zona terakhir terdeteksi agar dapat memulai pencarian.
2. **Operasional sekolah yang disetujui:** petugas berwenang mencari siswa pada jam sekolah dengan alasan yang dicatat.
3. **Portal wali:** wali terverifikasi melihat informasi yang sekolah izinkan, misalnya status “terdeteksi di kampus” dan gedung terakhir, tanpa detail yang tidak diperlukan.
4. **Insiden keselamatan:** akses sementara oleh petugas yang ditugaskan dengan audit dan alasan.

Penggunaan untuk memantau setiap gerakan, membuat peringkat perilaku, atau menyimpulkan pelanggaran dari sinyal tunggal tidak termasuk rancangan ini. Jika kebutuhan berubah, sekolah harus meninjau tujuan, dampak, dan kebijakan sebelum memperluas pemakaian.

## 4. Pengguna dan hak akses

| Peran | Data yang mungkin diperlukan | Syarat |
| --- | --- | --- |
| Siswa | Status apakah pelacakan aktif dan kapan data terakhir tersedia | Data diri sendiri |
| Wali | Ringkasan lokasi anak sesuai kebijakan | Hubungan wali terverifikasi dan hak lokasi aktif |
| Petugas keamanan/respons | Zona terakhir siswa tertentu | Penugasan atau alasan operasional tercatat |
| Petugas safeguarding | Zona terkait SOS/kasus | Penugasan kasus dan masa akses terbatas |
| Admin kebijakan | Konfigurasi zona, jam, retensi, izin | Tidak otomatis membaca riwayat lokasi individual |
| IT/perangkat | Kesehatan sensor dan ingest | Tidak membaca identitas siswa jika tidak perlu |
| Auditor terbatas | Log akses dan perubahan kebijakan | Mandat berbatas waktu |

Contoh izin: `location.self.read`, `location.guardian.read`, `location.operational.lookup`, `location.emergency.lookup`, `location.policy.manage`, `location.audit.read`. Hak wali ke profil anak tidak otomatis berarti hak lokasi. Akses petugas per siswa harus memiliki alasan dan scope waktu; pencarian massal dibatasi atau memerlukan mandat khusus.

## 5. Zona kampus dan teknologi kandidat

`CampusZone` mewakili area yang bermakna secara operasional: gedung, lantai, koridor, lapangan, perpustakaan, atau laboratorium. Zona punya hierarki, batas deskriptif, tingkat presisi, status aktif, dan sensor/titik deteksi terkait. Dua gedung ditangani sebagai data biasa. Peta atau denah harus sesuai tata letak nyata dan mudah diperbarui.

| Teknologi | Sinyal yang diberikan | Keterbatasan utama |
| --- | --- | --- |
| QR scan di titik tertentu | Kehadiran di titik scan pada waktu tertentu | Tidak menunjukkan posisi setelah siswa bergerak; scan dapat terlewat |
| NFC/kartu di pintu | Lewat titik akses pada waktu tertentu | Pintu tanpa pembaca dan peminjaman kartu membuat riwayat tidak lengkap |
| Wi-Fi association | Perkiraan area dari access point | Perangkat harus tersambung; cakupan dan roaming memengaruhi akurasi |
| Bluetooth beacon | Perkiraan dekat beacon | Membutuhkan perangkat dan kalibrasi; sinyal dapat terhalang |
| GPS perangkat | Koordinat saat izin dan sinyal tersedia | Umumnya kurang tepat di dalam gedung, boros baterai, dan tergantung izin OS |

Pilih teknologi setelah uji lapangan pada kedua gedung, bukan hanya berdasarkan fitur vendor. Ukur cakupan, keterlambatan, tingkat salah zona, baterai, perangkat siswa yang tersedia, serta beban pemeliharaan. Jika sinyal berbeda saling bertentangan, tampilkan “tidak pasti” atau beberapa petunjuk dengan waktu, bukan satu posisi pasti.

## 6. Alur data dan estimasi lokasi

1. Sensor/perangkat mengirim `LocationSignal` dengan ID event, identitas token, sumber, zona/titik, waktu kejadian, dan waktu diterima.
2. Gateway memverifikasi sumber, menghapus duplikat, memetakan token ke siswa yang berlaku pada waktu itu, dan menandai kualitas event.
3. Resolver menghitung `LastKnownZone` berdasarkan aturan sumber, kesegaran, dan konflik sinyal.
4. API mengembalikan zona, `detectedAt`, `receivedAt`, `staleAfter`, tingkat keyakinan, serta alasan jika tidak diketahui.
5. UI menampilkan keterbatasan secara jelas; permintaan akses individual masuk audit.

Aturan kesegaran harus berversi. Contoh konseptual: sinyal yang melewati ambang usia tidak ditampilkan sebagai lokasi aktif; nilainya tetap dapat muncul sebagai riwayat jika pengguna berwenang. Angka ambang ditentukan lewat uji lapangan. Sistem tidak boleh mengisi celah waktu dengan asumsi bahwa siswa tetap di tempat yang sama.

Jika perangkat offline, event datang terlambat dan disimpan dengan dua timestamp. Event yang terlambat tidak boleh menimpa lokasi yang lebih baru. Resolver mempertimbangkan urutan waktu kejadian, sumber, dan kualitas. Keputusan estimasi dapat dihitung ulang, tetapi hasil yang pernah ditampilkan untuk keputusan insiden perlu jejak audit.

## 7. Jam aktif, persetujuan, dan retensi

Pelacakan hanya aktif pada waktu dan area yang disetujui. `TrackingPolicy` menentukan tujuan, kelompok siswa, jam aktif, zona, sumber sinyal, siapa yang boleh membaca, masa retensi, dan versi kebijakan. Di luar jam aktif, ingestor menolak atau membatasi pemrosesan menurut desain privasi yang diputuskan; jangan hanya menyembunyikan data di UI sementara tetap mengumpulkannya tanpa alasan.

Sekolah harus menetapkan dasar persetujuan/pemberitahuan yang berlaku, cara mencatatnya, prosedur keberatan, dan alternatif bagi siswa tanpa perangkat. Wali yang kehilangan hak akses langsung tidak boleh melihat lokasi historis setelah hak dicabut, kecuali ada dasar akses lain yang sah. Riwayat detail disimpan sesingkat mungkin sesuai tujuan; agregat anonim untuk kesehatan sensor dipisahkan dari riwayat siswa.

## 8. Portal wali dan siswa

Portal wali menampilkan informasi yang proporsional, misalnya “terakhir terdeteksi di Gedung A, pukul 10.42” atau “lokasi tidak tersedia”. Jika data berasal dari pintu gerbang, tulis “terdeteksi melewati gerbang” alih-alih “berada di gedung”. Detail lantai/ruang hanya diberikan bila teknologi dan kebijakan mendukung. Wali tidak melihat riwayat lengkap secara default.

Portal siswa menjelaskan kapan fitur aktif, jenis informasi yang dapat dilihat wali/petugas, serta cara meminta bantuan atau melaporkan kesalahan. Pengaturan yang bisa dipilih siswa bergantung pada kebijakan sekolah dan usia; UI tidak menjanjikan tombol opt-out jika sekolah tidak menyediakannya. Perubahan kebijakan penting diumumkan secara jelas.

## 9. Bantuan darurat dan eskalasi

Saat SOS dibuat, petugas yang ditugaskan dapat melihat lokasi terakhir terdeteksi beserta waktu dan keyakinannya. Jika tidak ada data, sistem meminta siswa memilih area atau memberi deskripsi. Petugas tidak boleh menunda respons hanya untuk menunggu lokasi otomatis. Lokasi yang dilihat untuk SOS dicatat dengan konteks permintaan dan masa akses. Jika lokasi berubah, petugas melihat pembaruan sebagai petunjuk tambahan, bukan kebenaran tunggal.

Notifikasi kepada wali atau petugas mengikuti SOP safeguarding. Isi notifikasi eksternal tidak memuat koordinat atau detail lokasi sensitif; penerima membuka aplikasi dan melewati pemeriksaan akses. Permintaan bantuan harus tetap bisa dikirim meski layanan lokasi gagal.

## 10. Dashboard dan operasional perangkat

Dashboard IT menampilkan sensor aktif/offline, waktu sinkron terakhir, antrian event, zona tanpa cakupan, serta tingkat error pemetaan token. Dashboard petugas menampilkan pencarian individual berbasis alasan, bukan peta seluruh siswa secara default. Peta agregat okupansi hanya dibuat jika data cukup andal dan ukuran kelompok tidak membuka identitas.

Operasional harus mempunyai prosedur kalibrasi, penggantian sensor, pergantian token, penanganan jam perangkat melenceng, serta uji ulang setelah perubahan denah atau Wi-Fi. Status gangguan memengaruhi UI wali/petugas secara langsung agar data usang tidak terlihat segar.

## 11. Alur kerja prioritas

### 11.1 Pencarian saat SOS

1. Siswa mengirim SOS dengan lokasi pilihan atau deskripsi bila ada.
2. Petugas menerima permintaan dan melihat zona terakhir, waktu, sumber, serta keyakinan.
3. Petugas merespons sesuai SOP dan tidak menunggu sinyal yang lebih baru.
4. Akses lokasi dan tindakan dicatat pada timeline permintaan.
5. Setelah selesai, hak akses khusus SOS berakhir sesuai kebijakan.

### 11.2 Wali melihat status lokasi

1. Backend memeriksa hubungan wali, hak lokasi, jam aktif, dan versi kebijakan.
2. Resolver mengembalikan lokasi terakhir atau alasan tidak tersedia.
3. UI menunjukkan zona dan waktu deteksi dengan label akurasi.
4. Pembacaan dicatat sesuai kebijakan audit; data tidak disimpan di cache publik.

### 11.3 Sensor offline

Sistem menandai sensor offline setelah ambang yang ditetapkan, memperbarui status zona terdampak, dan tidak menampilkan estimasi lama sebagai lokasi saat ini. Event yang datang setelah pulih direkonsiliasi secara idempoten tanpa menimpa sinyal lebih baru.

## 12. Model data konseptual

| Entitas | Field penting | Aturan/relasi |
| --- | --- | --- |
| `CampusZone` | buildingId, parentZoneId, name, granularity, status | Hierarki zona dapat berubah berversi |
| `LocationSensor` | zoneId, type, status, lastSyncAt | Terhubung ke perangkat fisik |
| `LocationTokenMap` | tokenRef, studentId, validFrom/To | Token privat; tidak memakai NIS langsung |
| `TrackingPolicyVersion` | purpose, activeHours, sources, retention, accessRules | Versi terbit immutable |
| `TrackingEligibility` | studentId, policyId, status, effectiveAt | Dasar cakupan/persetujuan tercatat |
| `LocationSignal` | externalId, sensorId, tokenRef, eventAt, receivedAt, quality | Event mentah idempoten dan terbatas retensi |
| `LastKnownZone` | studentId, zoneId, detectedAt, staleAt, confidence | Proyeksi, bukan fakta permanen |
| `LocationLookupAudit` | actorId, studentId, purpose, contextRef, time | Akses individual dapat ditinjau |
| `LocationResolutionEvent` | signalRefs, outcome, reason, resolvedAt | Menjelaskan konflik/estimasi penting |

Gunakan UUID internal dan timestamp UTC. Index pada token + waktu berlaku, siswa + waktu event, sensor + external ID, serta status sensor. Partisi/retensi sinyal dipertimbangkan jika volume tinggi. Data lokasi tidak dicampur ke tabel profil siswa atau disalin ke laporan umum. Prisma mengelola metadata dan transaksi; pemrosesan sinyal dapat berjalan melalui worker dengan idempotensi.

## 13. Rancangan halaman dan URL

| Halaman | URL contoh | Fungsi |
| --- | --- | --- |
| Penjelasan lokasi siswa | `/student/location` | Kebijakan dan status pribadi |
| Status anak bagi wali | `/guardian/children/[studentId]/location` | Zona terakhir sesuai hak |
| Pencarian petugas | `/operations/location/lookup` | Cari siswa dengan alasan |
| Detail hasil petugas | `/operations/location/students/[studentId]` | Lokasi terakhir dan kualitas |
| Zona kampus | `/admin/location/zones/[zoneId]` | Struktur serta cakupan sensor |
| Kesehatan sensor | `/operations/location/sensors?status=offline` | Gangguan dan sinkronisasi |
| Kebijakan | `/admin/location/policies/[policyId]` | Jam aktif, retensi, hak akses |
| Audit akses | `/admin/location/access-audit?date=...` | Peninjauan akses individual |

Next.js App Router memakai nested layouts per portal dan Dynamic Routes untuk detail. Filter nonrahasia, tanggal, dan pagination dapat berada di query string; alasan pencarian dan data lokasi tidak ditaruh di URL. Halaman detail petugas sebaiknya halaman penuh. Bila daftar sensor membuka modal detail melalui Intercepting/Parallel Routes, URL langsung/refresh menampilkan halaman penuh dan Back/Forward memulihkan modal. Hak akses diperiksa lagi oleh NestJS pada setiap refresh dan deep link.

UI memakai TypeScript, Tailwind CSS, shadcn/ui, dan TanStack Table untuk sensor/audit dengan filter server. Peta hanya ditambahkan jika benar-benar membantu dan presisinya sesuai data; daftar zona berlabel waktu sering lebih jujur. Agentation dipakai untuk inspeksi mobile, label akurasi, dan keadaan tidak tersedia.

## 14. Kontrak API awal

NestJS menyediakan endpoint berversi dengan DTO tervalidasi, pemeriksaan izin/scope/purpose, pagination, dan kesalahan konsisten (`code`, `message`, `fieldErrors`, `requestId`).

```text
GET    /api/v1/location/me/status
GET    /api/v1/location/guardian/children/:studentId/status
POST   /api/v1/location/operational-lookups
GET    /api/v1/location/operational-lookups/:id/result
GET    /api/v1/location/zones
POST   /api/v1/location/zones
GET    /api/v1/location/sensors?status=
POST   /api/v1/location/device-signals
GET    /api/v1/location/policies
POST   /api/v1/location/policies/:id/publish
GET    /api/v1/location/access-audit?from=&to=
```

`operational-lookups` menerima siswa dan alasan dalam body, memeriksa kewenangan, lalu mencatat audit sebelum hasil diberikan. Ingest sinyal diautentikasi, memiliki external ID unik, dan idempoten. Respons status selalu memuat `detectedAt`, `staleAt`, granularity, dan status kualitas; jika tidak tersedia, respons menjelaskan kategori alasan tanpa membocorkan data internal perangkat kepada wali.

## 15. Keamanan, privasi, dan aksesibilitas

- Batasi pembacaan lokasi individual berdasarkan hubungan wali atau penugasan petugas serta tujuan yang dicatat.
- Jangan menampilkan daftar posisi semua siswa kepada pengguna biasa atau menyertakan lokasi dalam log/notifikasi eksternal.
- Simpan token perangkat dan secret secara aman; pisahkan identitas dari sinyal mentah bila memungkinkan.
- Enkripsi data saat transit dan di penyimpanan; tetapkan retensi pendek untuk event rinci sesuai tujuan.
- Catat perubahan kebijakan, akses lokasi individual, ekspor, dan akses darurat; tinjau akses yang tidak biasa.
- Tampilkan status “tidak diketahui”, “di luar cakupan”, dan “data usang” sebagai kondisi berbeda.
- Label zona dan waktu harus dapat dibaca tanpa warna/peta; semua informasi inti tersedia bagi pembaca layar.
- Loading dan gangguan perangkat tidak boleh menampilkan hasil lama sebagai kondisi terkini.

## 16. Kriteria penerimaan pilot

1. Pengujian di dua gedung mengukur cakupan, keterlambatan, dan kesalahan zona; hasilnya didokumentasikan sebelum fitur wali diaktifkan.
2. UI selalu menampilkan waktu deteksi, granularity, dan status kesegaran; data usang tidak disebut real-time.
3. Wali tanpa hak lokasi aktif tidak dapat melihat lokasi anak melalui URL, API, atau cache.
4. Petugas harus memasukkan alasan sebelum pencarian individual; akses masuk audit.
5. Pelacakan berhenti atau dibatasi di luar jam/area kebijakan pada tingkat ingest sesuai desain yang disetujui.
6. Event terlambat, duplikat, dan jam perangkat menyimpang tidak menimpa lokasi yang lebih baru.
7. Sensor offline membuat zona terdampak berstatus tidak pasti dan terlihat di dashboard IT.
8. SOS tetap dapat dikirim ketika layanan lokasi gagal; petugas melihat fallback area manual.
9. Token yang dicabut tidak menghasilkan pemetaan siswa baru, sedangkan riwayat yang sah tetap dapat diaudit sesuai retensi.
10. Deep link, refresh, Back/Forward, mobile, keyboard, loading, dan error diuji pada portal wali serta petugas.

## 17. Urutan implementasi

1. Tetapkan tujuan, kebijakan privasi, jam aktif, hak akses, retensi, dan SOP penggunaan lokasi.
2. Survei dua gedung, inventaris perangkat, dan pilih zona yang memang dapat dideteksi.
3. Bangun model kebijakan, zona, token, ingest sinyal, resolver, serta audit akses.
4. Jalankan pilot internal dengan data uji dan ukur akurasi/keterlambatan.
5. Uji alur SOS petugas dan kondisi perangkat gagal.
6. Aktifkan tampilan siswa/wali secara terbatas setelah hasil pilot memenuhi kriteria sekolah.

## 18. Keputusan terbuka

- Tujuan operasional spesifik yang membenarkan pengumpulan lokasi siswa.
- Teknologi yang tersedia dan hasil uji akurasi nyata per gedung/lantai/area.
- Apakah sekolah akan menyediakan perangkat/token untuk siswa tanpa ponsel.
- Jam aktif, area cakupan, masa retensi sinyal rinci dan lokasi terakhir.
- Hak wali, cara pemberitahuan/persetujuan, dan kondisi pencabutan akses.
- Siapa boleh melakukan pencarian individual serta alasan yang sah.
- Ambang kesegaran, aturan konflik sinyal, dan istilah akurasi yang digunakan UI.
- Apakah fitur wali menampilkan gedung saja atau zona yang lebih rinci.
- Prosedur respons saat lokasi tidak tersedia atau salah, termasuk saat SOS.
- Apakah data akses gerbang boleh menjadi petunjuk lokasi dan bagaimana keterbatasannya dijelaskan.

Keputusan ini wajib mendahului skema Prisma final, integrasi perangkat, dan peluncuran fitur pelacakan.
