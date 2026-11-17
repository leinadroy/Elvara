# Student Safety & Safeguarding System

Dokumen ini merinci poin 6 dari [Smart School Management Ecosystem](smart_school_management_ecosystem.md). Modul keselamatan siswa menyediakan kanal pelaporan bullying/kekerasan, penanganan kasus terbatas, serta permintaan bantuan darurat. Identitas dan hubungan wali berasal dari [Administrasi Sekolah](school_administration_management.md); notifikasi dikirim melalui pusat komunikasi dengan aturan khusus untuk informasi sensitif.

**Status:** rancangan produk dan teknis, bukan SOP penanganan kasus. Sekolah harus menetapkan petugas, jalur eskalasi, jam layanan, tindakan darurat, dan kebijakan kerahasiaan sebelum modul ini diluncurkan. Antarmuka tidak boleh menjanjikan pemantauan 24 jam atau respons langsung jika layanan tersebut belum tersedia.

## 1. Tujuan dan prinsip kerja

Tujuan modul adalah membuat siswa, orang tua, guru, dan staf dapat meminta bantuan dengan aman; memastikan laporan diterima oleh petugas yang tepat; mencatat keputusan dan tindak lanjut; serta menjaga identitas dan isi laporan dari pengguna yang tidak berwenang. Sistem mendukung pekerjaan petugas, bukan menggantikan keputusan profesional atau jalur darurat resmi.

Prinsip utama:

1. **Keselamatan lebih dulu:** laporan mendesak memiliki jalur eskalasi yang jelas dan fallback di luar aplikasi.
2. **Akses minimum:** petugas hanya melihat kasus yang ditugaskan atau berada dalam fungsi triase yang berwenang.
3. **Kerahasiaan terukur:** jelaskan kepada pelapor siapa yang mungkin perlu menerima informasi untuk menindaklanjuti laporan; jangan menjanjikan kerahasiaan absolut.
4. **Jejak tindakan:** setiap akses, perubahan status, penugasan, dan pembagian informasi sensitif tercatat.
5. **Tidak menyalahkan pelapor:** formulir tidak mengharuskan bukti lengkap agar permintaan bantuan dapat dikirim.
6. **Bahasa sesuai usia:** instruksi dan pilihan tindakan harus mudah dipahami siswa.

## 2. Batas modul dan hubungan dengan domain lain

| Dalam modul ini | Hubungan dengan modul lain |
| --- | --- |
| Laporan keselamatan dan kanal rahasia | Identitas pelapor hanya diverifikasi bila tersedia/diizinkan |
| Triase urgensi dan penugasan petugas | Struktur organisasi dan akun dari administrasi |
| Catatan kasus, tindakan, eskalasi, dan penutupan | Konselor/UKS hanya menerima data yang diperlukan untuk tugasnya |
| Permintaan bantuan darurat dan status respons | Petugas keamanan dapat menerima lokasi/identitas minimum yang diperlukan |
| Komunikasi aman terkait kasus | Pusat komunikasi mengirim pemberitahuan tanpa isi kasus di kanal eksternal |
| Ringkasan agregat untuk manajemen | Analitik tidak membuka identitas korban/pelapor |

Kasus disiplin, catatan konseling, rekam kesehatan, dan rekaman CCTV mempunyai pemilik proses serta retensi sendiri. Modul ini dapat menyimpan referensi terbatas, bukan menyalin seluruh berkasnya.

## 3. Pengguna dan hak akses

| Peran | Kewenangan | Batasan |
| --- | --- | --- |
| Pelapor (siswa/wali/guru/staf) | Membuat laporan, melihat status aman, menambah informasi bila diminta | Tidak melihat identitas pihak lain atau catatan internal |
| Petugas triase | Menerima laporan, menilai urgensi, menetapkan pemilik kasus | Akses hanya antrean yang menjadi mandatnya |
| Penanggung jawab kasus | Melihat detail kasus, mencatat tindakan, membuat rencana tindak lanjut | Hanya kasus yang ditugaskan |
| Konselor/UKS | Menangani bagian kasus sesuai rujukan | Tidak otomatis melihat seluruh riwayat investigasi |
| Petugas keamanan | Merespons permintaan darurat atau insiden area | Informasi minimum untuk respons lapangan |
| Kepala sekolah/pejabat berwenang | Eskalasi, persetujuan keputusan tertentu, ringkasan | Detail kasus sesuai mandat eksplisit |
| Auditor terbatas | Memeriksa jejak proses sesuai penugasan berbatas waktu | Tanpa perubahan isi kasus |
| Admin sistem | Menjaga sistem dan akun | Tidak otomatis dapat membaca isi laporan/kasus |

Contoh izin: `safety.report.create`, `safety.report.triage`, `safety.case.read-assigned`, `safety.case.assign`, `safety.case.update`, `safety.case.close`, `safety.emergency.respond`, `safety.audit.read`. Pemeriksaan akses menggabungkan izin, penugasan kasus, status penugasan, dan kebutuhan kerja. Daftar kasus juga harus disaring; menyembunyikan tombol saja tidak cukup.

## 4. Kanal pelaporan

### 4.1 Jenis laporan

Kategori awal dapat mencakup bullying, kekerasan fisik/verbal, pelecehan, ancaman, masalah keamanan area, dan permintaan bantuan lain. Kategori membantu triase, tetapi pelapor boleh memilih “tidak yakin” dan menjelaskan dengan kata sendiri. Formulir meminta apa yang terjadi, kapan, lokasi bila diketahui, apakah ada bahaya saat ini, cara aman untuk dihubungi, dan lampiran opsional. Nama pihak terlibat tidak wajib untuk mengirim laporan.

### 4.2 Identitas pelapor

Sediakan pilihan yang disetujui sekolah: laporan dengan akun terverifikasi, identitas dirahasiakan dari petugas nonkasus, atau laporan tanpa identitas login. Tiap pilihan memiliki konsekuensi yang dijelaskan sebelum kirim. Laporan tanpa identitas tetap perlu cara aman untuk tindak lanjut, misalnya kode pelacakan dan kanal pesan anonim; kehilangan kode dapat membatasi akses kembali. Jangan menyebut kanal “anonim” bila metadata atau proses operasional masih dapat mengidentifikasi pelapor.

Pengiriman laporan harus berhasil tanpa memaksa pelapor mengulang cerita karena gagal unggah lampiran. Setelah kirim, tampilkan nomor/kode, waktu penerimaan, penjelasan langkah berikutnya, dan jalur bantuan segera bila situasi mendesak.

### 4.3 Perlindungan pihak yang dilaporkan

Laporan adalah informasi awal, bukan putusan. UI tidak memberi label bersalah atau menyebarkan identitas pihak yang dilaporkan. Akses, verifikasi fakta, komunikasi, dan keputusan ditangani menurut SOP sekolah dengan pencatatan yang adil dan terbatas.

## 5. Triase dan manajemen kasus

### 5.1 Status proses

`received` → `triaging` → `assigned` → `in_progress` → `monitoring` → `closed`; kasus dapat `reopened`. Laporan yang tidak masuk ruang lingkup sekolah diberi status terarah/dirujuk dengan alasan, bukan dihapus. Status yang terlihat pelapor lebih sederhana, misalnya diterima, ditangani, membutuhkan informasi, selesai, karena detail internal dapat membahayakan pihak terkait.

Triase mencatat tingkat urgensi, jenis risiko, apakah bahaya sedang berlangsung, petugas penerima, keputusan awal, waktu, dan alasan. Tingkat urgensi membantu prioritas kerja tetapi tidak boleh menjadi satu-satunya pemicu tindakan otomatis. Batas respons per tingkat ditetapkan sekolah. Kasus yang belum diambil petugas harus naik ke antrean eskalasi; dashboard menampilkan umur antrean dan siapa penanggung jawabnya.

### 5.2 Penugasan dan akses kasus

Satu kasus memiliki pemilik utama dan dapat memiliki anggota tim dengan peran spesifik. Penugasan menyimpan tanggal mulai/akhir dan alasan. Perubahan pemilik tidak menghapus riwayat. Akses dicabut saat penugasan berakhir. Kasus yang melibatkan petugas biasa harus memiliki jalur alternatif agar laporan tidak otomatis dikirim ke orang yang dilaporkan atau memiliki konflik kepentingan.

### 5.3 Catatan tindakan

`CaseEvent` mencatat tindakan faktual, kontak, rujukan, keputusan, tenggat, dan hasil. Bedakan fakta yang dilaporkan, observasi petugas, dan kesimpulan. Lampiran memiliki klasifikasi dan akses tersendiri. Perbaikan catatan dilakukan dengan tambahan atau revisi berjejak; catatan lama tidak ditimpa diam-diam. Sekolah perlu menetapkan siapa yang menyetujui penutupan, kriteria selesai, dan kapan kasus diperiksa kembali.

### 5.4 Komunikasi dengan pelapor

Pelapor dapat menerima konfirmasi penerimaan, permintaan informasi tambahan, dan pembaruan status aman. Pesan tidak menampilkan catatan investigasi, identitas pihak lain, atau informasi yang dapat membahayakan penanganan. Petugas memilih kanal kontak yang dinyatakan aman oleh pelapor; notifikasi email/push hanya berisi ajakan membuka aplikasi. Jika pelapor tidak aman menerima pesan di perangkatnya, opsi tersebut harus dihormati.

## 6. SOS dan permintaan bantuan darurat

Fitur SOS hanya boleh aktif jika tersedia petugas penerima, jadwal siaga, prosedur eskalasi, dan uji respons. Tombol SOS mengirim permintaan dengan identitas akun jika tersedia, waktu, lokasi yang dipilih/diketahui, jenis bantuan singkat, serta status pengiriman. Geolokasi perangkat diminta secara eksplisit bila digunakan; jika tidak tersedia, siswa dapat memilih gedung/lantai/area. Lokasi terakhir terdeteksi harus diberi label waktu dan akurasi, bukan ditampilkan sebagai lokasi real-time.

Alur minimal: `sent` → `acknowledged` → `responding` → `resolved` atau `cancelled`. Sistem memberi konfirmasi bahwa permintaan **terkirim ke sistem** dan hanya menunjukkan “diterima petugas” setelah petugas benar-benar mengakui. Jika pengiriman gagal atau tidak ada petugas yang merespons dalam ambang waktu, UI menampilkan jalur bantuan alternatif yang ditetapkan sekolah. Pembatalan oleh pelapor tidak boleh menghapus permintaan dari antrean tanpa ditinjau petugas.

Latihan/drill dan permintaan nyata harus dibedakan secara tegas. Cegah kiriman ganda akibat ketukan berulang, tetapi jangan menghalangi permintaan baru saat situasi berubah.

## 7. Notifikasi dan eskalasi

Notifikasi internal berisi ID kasus/permintaan, urgensi, dan tindakan yang diperlukan. Isi sensitif hanya dibuka setelah login dan pemeriksaan akses. Eskalasi bertingkat mengikuti jadwal petugas: penerima utama, cadangan, lalu pejabat berwenang. Kegagalan push/email tidak boleh dianggap sebagai penerimaan; sistem mencatat status pengiriman dan acknowledgment manusia secara terpisah.

Kasus yang melewati target respons, tugas yang jatuh tempo, atau permintaan SOS yang belum diakui masuk antrean tindakan. Notifikasi ke orang tua bukan otomatis untuk semua jenis kasus; keputusan siapa, kapan, dan isi pemberitahuan ditetapkan dalam SOP dengan mempertimbangkan keselamatan siswa.

## 8. Privasi, penyimpanan, dan audit

- Pisahkan data identitas sensitif dari ringkasan kasus yang biasa dibaca; API hanya mengembalikan field sesuai tugas.
- Enkripsi saat transit dan penyimpanan; file privat memakai akses sementara dan tidak dapat diindeks publik.
- Catat pembukaan kasus, unduhan lampiran, penugasan, perubahan status, ekspor, serta akses darurat di audit yang tidak dapat diubah lewat UI operasional.
- Akses darurat di luar penugasan (*break glass*) memerlukan alasan, masa berlaku singkat, pencatatan, dan peninjauan setelahnya.
- Kebijakan retensi, pembatasan salinan, pemusnahan, dan permintaan akses data ditetapkan sekolah sebelum produksi.
- Pencarian global, dashboard umum, dan log teknis tidak boleh memuat narasi kasus atau identitas pelapor.
- Analitik agregat menyembunyikan kelompok sangat kecil yang berisiko mengidentifikasi siswa.
- Backup dan pemulihan harus mempertahankan kontrol akses serta audit.

## 9. Alur kerja prioritas

### 9.1 Laporan rahasia

1. Pelapor memilih kanal dan membaca batas kerahasiaan serta jalur bantuan darurat.
2. Pelapor mengirim narasi singkat; lampiran opsional diproses terpisah jika gagal.
3. Sistem memberi bukti penerimaan dan menempatkan laporan di antrean triase yang benar.
4. Petugas melakukan triase, menilai urgensi, memeriksa konflik kepentingan, lalu menugaskan pemilik kasus.
5. Pemilik kasus mencatat tindakan, rujukan, dan pembaruan aman untuk pelapor.
6. Pejabat berwenang meninjau penutupan; kasus dapat dibuka kembali dengan alasan.

### 9.2 SOS di sekolah

1. Siswa menekan SOS, memilih area jika lokasi tidak tersedia, lalu mengirim.
2. UI membedakan status terkirim dan status diakui petugas.
3. Petugas siaga menerima informasi minimum, mengakui, dan bertindak sesuai SOP.
4. Jika tidak diakui dalam ambang waktu, sistem mengeskalasi serta menampilkan fallback.
5. Tindakan, waktu respons, hasil, dan penutupan tercatat.

## 10. Model data konseptual

| Entitas | Field penting | Aturan/relasi |
| --- | --- | --- |
| `SafetyReport` | kategori, narasi, reportedAt, reporterMode, status | Identitas pelapor dipisah dan dilindungi |
| `ReportContactChannel` | reportId, jenis, alamat terenkripsi, safeToContact | Hanya petugas berwenang |
| `SafetyCase` | reportId, urgency, ownerId, status, openedAt | Satu laporan dapat perlu penanganan berbeda sesuai SOP |
| `CaseAssignment` | caseId, userId, role, startAt/endAt | Menentukan scope akses |
| `CaseEvent` | caseId, type, actorId, occurredAt, content, classification | Riwayat tindakan dan revisi terlacak |
| `CaseTask` | caseId, ownerId, dueAt, status | Eskalasi tugas terlambat |
| `CaseAttachment` | fileRef, classification, uploaderId | URL privat sementara |
| `ReporterUpdate` | reportId, safeMessage, publishedAt | Tidak membuka catatan internal |
| `EmergencyRequest` | requesterRef, location, sentAt, acknowledgedAt, status | Status pengiriman dan respons terpisah |
| `EmergencyResponseEvent` | requestId, responderId, action, time | Timeline respons |
| `SensitiveAccessAudit` | actorId, resourceRef, action, reason, time | Termasuk akses break glass |

Gunakan UUID internal, timestamp UTC, serta ID referensi yang tidak mengungkap kategori kasus. Index operasional: status/urgensi/waktu laporan, pemilik kasus, tugas jatuh tempo, dan SOS belum diakui. Hindari indeks pencarian teks umum pada narasi rahasia tanpa rancangan akses yang ketat. Keputusan retensi dan pemisahan database/kolom perlu dilakukan setelah threat model.

## 11. Rancangan halaman dan navigasi

| Halaman | URL contoh | Fungsi |
| --- | --- | --- |
| Bantuan dan pilihan kanal | `/safety/help` | Jalur bantuan, batas layanan, pilihan laporan/SOS |
| Buat laporan | `/safety/reports/new` | Formulir bertahap dengan lampiran opsional |
| Status laporan sendiri | `/safety/reports/[reportId]` | Status aman dan pesan petugas |
| Antrean triase | `/safety/triage?urgency=&status=` | Laporan yang perlu tindakan |
| Detail kasus | `/safety/cases/[caseId]` | Timeline, tugas, penugasan, lampiran |
| Antrean SOS | `/safety/emergencies?status=unacknowledged` | Permintaan darurat |
| Detail SOS | `/safety/emergencies/[requestId]` | Lokasi, status, timeline respons |
| Laporan agregat | `/safety/analytics?period=...` | Tren aman dan SLA |

Next.js App Router memakai Dynamic Routes untuk detail serta nested layout petugas yang terpisah dari portal umum. URL dapat dibuka langsung setelah autentikasi; refresh dan Back/Forward harus benar. Detail kasus sensitif sebaiknya halaman penuh, bukan modal yang mudah terlihat di belakang daftar. Modal boleh dipakai untuk aksi kecil seperti konfirmasi penugasan, tetapi state yang perlu dipulihkan tetap tercermin di URL bila relevan. Query string hanya berisi filter nonrahasia; jangan menaruh narasi, identitas pelapor, atau token akses di URL.

UI memakai TypeScript, Tailwind CSS, shadcn/ui, dan TanStack Table untuk antrean petugas dengan pagination/filter server. Pada mobile, tombol bantuan dan informasi fallback mudah ditemukan, tetapi tidak boleh mudah tertekan tanpa konteks. Agentation digunakan untuk inspeksi UI, termasuk alur fokus, ukuran target sentuh, dan privasi tampilan. Loading, kosong, error, tidak berwenang, dan status pengiriman belum pasti harus dibedakan.

## 12. Kontrak API awal

NestJS menyediakan endpoint berversi, DTO tervalidasi, otorisasi per kasus, rate limiting yang tidak menghalangi laporan darurat sah, dan respons kesalahan dengan `code`, `message`, `fieldErrors`, `requestId`.

```text
GET    /api/v1/safety/help
POST   /api/v1/safety/reports
GET    /api/v1/safety/reports/mine
GET    /api/v1/safety/reports/:id/status
POST   /api/v1/safety/reports/:id/additional-information
GET    /api/v1/safety/triage?status=&urgency=&page=
POST   /api/v1/safety/reports/:id/triage
GET    /api/v1/safety/cases/:id
POST   /api/v1/safety/cases/:id/assignments
POST   /api/v1/safety/cases/:id/events
POST   /api/v1/safety/cases/:id/close
POST   /api/v1/safety/cases/:id/reopen
POST   /api/v1/safety/emergencies
POST   /api/v1/safety/emergencies/:id/acknowledge
POST   /api/v1/safety/emergencies/:id/response-events
GET    /api/v1/safety/analytics?period=
```

Pengiriman laporan/SOS memakai idempotency key untuk ketukan ulang; backend menyimpan hasil sebelum mengirim notifikasi. Triase, penugasan, dan perubahan status memakai transaksi serta version check. Respons 403/404 tidak boleh membocorkan keberadaan kasus kepada pengguna tanpa hak. Lampiran diunggah melalui jalur privat dan diperiksa sebelum dibuka petugas.

## 13. Keadaan UI dan aksesibilitas

Formulir laporan harus sederhana, dapat disimpan sebagai draf lokal hanya jika aman bagi pengguna, dan tidak membuang isi ketika validasi gagal. Pertanyaan sensitif tidak dipaksa bila tidak diperlukan. Sediakan pilihan keluar cepat dari halaman hanya jika perilakunya jelas dan tidak memberikan rasa aman palsu; uji bagaimana riwayat browser serta notifikasi terlihat di perangkat bersama.

Pesan status memakai teks selain warna. Fokus keyboard, pembaca layar, urutan heading, label formulir, kontras, dan target sentuh diperiksa. Konfirmasi pengiriman menjelaskan apakah data sudah diterima server. Error jaringan menampilkan apakah pengiriman dapat diverifikasi dan langkah berikutnya; jangan menyarankan kirim ulang tanpa perlindungan duplikasi. Petugas melihat indikator tugas mendesak dengan waktu, pemilik, dan status acknowledgment yang jelas.

## 14. Kriteria penerimaan MVP

1. Siswa/wali/guru/staf dapat mengirim laporan dengan informasi minimum dan memperoleh bukti penerimaan; lampiran opsional tidak memblokir narasi.
2. Pengguna tanpa penugasan tidak dapat membuka detail kasus melalui URL, API, file, atau daftar pencarian.
3. Petugas yang disebut dalam laporan tidak menerima kasus itu secara otomatis melalui aturan penugasan biasa.
4. Triase mencatat urgensi, aktor, waktu, alasan, dan pemilik kasus; laporan tanpa pemilik tampak di antrean eskalasi.
5. Pelapor hanya melihat status/pesan aman, bukan identitas pihak lain atau catatan internal.
6. Perubahan status, pembukaan lampiran, penugasan, serta akses darurat tercatat di audit.
7. Notifikasi eksternal tidak memuat narasi atau identitas sensitif; kegagalan kirim terlihat oleh petugas.
8. SOS membedakan terkirim dari diakui, mengeskalasi jika tidak diakui, dan menunjukkan jalur fallback yang benar.
9. Ketukan ulang/koneksi tidak stabil tidak menghasilkan laporan atau SOS ganda.
10. Dashboard agregat tidak memungkinkan identifikasi siswa dari kelompok yang terlalu kecil.
11. Akses langsung, refresh, Back/Forward, mobile, keyboard, loading, dan error diuji pada alur pelapor serta petugas.

## 15. Urutan implementasi

1. Sekolah menetapkan SOP, petugas, jadwal siaga, konflik kepentingan, dan jalur bantuan darurat.
2. Lakukan threat model serta tetapkan klasifikasi, retensi, dan audit data kasus.
3. Bangun kanal laporan, bukti penerimaan, antrean triase, dan penugasan kasus.
4. Bangun timeline tindakan, komunikasi aman, eskalasi tugas, serta penutupan/reopen.
5. Uji alur nyata bersama petugas dan pengguna perwakilan, termasuk kegagalan jaringan.
6. Aktifkan SOS hanya setelah jadwal petugas, fallback, dan latihan respons lulus uji.
7. Tambahkan analitik agregat dan integrasi lain secara bertahap.

## 16. Keputusan terbuka

- Siapa petugas penerima, cadangan, dan pejabat eskalasi pada setiap jam/hari.
- Jenis laporan yang diterima, tingkat urgensi, target respons, serta jalur di luar jam layanan.
- Apakah laporan tanpa login/identitas diperbolehkan dan bagaimana tindak lanjut amannya.
- Cara menangani konflik kepentingan jika pelapor menyebut petugas, guru, atau pimpinan.
- Kapan orang tua diberi tahu dan siapa yang memutuskan isi pemberitahuan.
- Syarat penutupan kasus, hak pelapor memberi informasi tambahan, dan proses membuka kembali.
- Kategori lampiran, pembatasan akses, masa retensi, ekspor, dan pemusnahan.
- Ketersediaan respons SOS, lokasi yang dapat ditentukan secara andal, dan fallback saat jaringan gagal.
- Kebutuhan rujukan ke konselor, UKS, keamanan, atau pihak luar dan batas data yang dibagikan.
- Bentuk laporan agregat yang aman untuk ukuran populasi sekolah.

Keputusan operasional tersebut harus menjadi dasar skema Prisma, aturan NestJS, rancangan Next.js, pelatihan petugas, dan pengujian sebelum peluncuran.
