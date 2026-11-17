# Campus Security & Access Control

Dokumen ini merinci poin 7 dari [Smart School Management Ecosystem](smart_school_management_ecosystem.md). Modul ini membantu petugas menjaga akses ke dua gedung sekolah, mencatat tamu dan kendaraan, mengelola izin keluar siswa, serta merespons kejadian keamanan. Identitas siswa/pegawai dan struktur gedung berasal dari [Administrasi Sekolah](school_administration_management.md). Permintaan bantuan darurat dan kasus keselamatan siswa tetap dikelola [Student Safety & Safeguarding System](student_safety_safeguarding_system.md).

**Status:** rancangan awal. Kebijakan gerbang, verifikasi pengunjung, penggunaan CCTV, dan respons alarm harus disetujui sekolah sebelum perangkat diintegrasikan.

## 1. Tujuan dan batas modul

Sistem harus menjawab siapa yang diizinkan masuk/keluar, kapan dan melalui titik mana, siapa yang sedang berkunjung, serta tindakan petugas saat ada pengecualian. Catatan digital mendukung pengawasan lapangan; layar aplikasi tidak menggantikan pemeriksaan identitas atau prosedur keselamatan fisik.

| Dalam modul keamanan kampus | Terkait tetapi dimiliki modul lain |
| --- | --- |
| Titik akses, kredensial, kebijakan akses, event gerbang | Profil orang dan status sekolah dari administrasi |
| Registrasi dan kunjungan tamu, kendaraan | Lokasi gedung/ruang dari administrasi/fasilitas |
| Izin keluar siswa dan verifikasi penjemput | Hubungan wali terverifikasi dari administrasi |
| Insiden keamanan area, alarm, referensi CCTV | Kasus bullying/kekerasan dan SOS dari keselamatan siswa |
| Dashboard petugas dan laporan akses | Absensi siswa/pegawai memiliki aturan serta rekap sendiri |

Event gerbang bukan bukti tunggal kehadiran pelajaran. Data lokasi siswa berbasis zona dibahas pada modul terpisah; modul ini hanya mencatat kejadian akses di titik yang disetujui.

## 2. Aktor dan hak akses

| Peran | Kewenangan | Batasan |
| --- | --- | --- |
| Petugas keamanan | Verifikasi tamu, check-in/out, akses gerbang, catat insiden | Data identitas minimum untuk tugasnya |
| Koordinator keamanan | Atur shift/titik akses, tinjau anomali, eskalasi | Akses sesuai lokasi dan masa penugasan |
| Admin sekolah | Kelola kebijakan akses dan identitas resmi | Tidak otomatis membaca semua rekaman CCTV |
| Wali kelas/admin kesiswaan | Menyetujui izin keluar sesuai kebijakan | Tidak mengubah event gerbang |
| Orang tua/wali | Mengajukan izin dan melihat status anak | Hanya anak dengan hubungan terverifikasi |
| Siswa | Melihat status izin keluar diri sendiri | Tidak mengesahkan izin sendiri |
| Operator CCTV/IT | Menjaga perangkat dan referensi rekaman | Akses konten sesuai mandat khusus |
| Auditor | Meninjau log dan insiden sesuai mandat | Tanpa mengubah event historis |

Contoh izin: `access-point.manage`, `access-event.review`, `visitor.register`, `visitor.checkout`, `exit-permit.request`, `exit-permit.approve`, `security-incident.manage`, `cctv-reference.read`, `security-report.export`. Backend memeriksa izin, lokasi, sekolah, serta penugasan aktif. Petugas tidak boleh mendapat akses luas ke data akademik atau kasus rahasia hanya karena bekerja di gerbang.

## 3. Zona, titik akses, dan kebijakan

Struktur fisik: sekolah → gedung → lantai → area/ruang → titik akses. `AccessPoint` adalah gerbang, pintu, atau meja resepsionis yang memiliki ID, nama, lokasi, arah masuk/keluar, jam operasional, status, dan perangkat terkait. Dua gedung awal menjadi data, bukan kondisi khusus di kode. Area dapat berstatus umum, terbatas, atau khusus petugas.

`AccessPolicy` menentukan kelompok yang boleh lewat, jadwal, persyaratan pendamping, dan pengecualian. Kebijakan berversi dengan tanggal berlaku agar keputusan akses historis dapat dijelaskan. Perubahan kebijakan kritis memerlukan persetujuan sesuai SOP. Akses darurat seperti evakuasi mengikuti prosedur terpisah yang tidak boleh terhalang oleh kegagalan aplikasi.

## 4. Identitas dan kredensial

Kartu identitas, QR, atau NFC mengacu pada `Credential` yang terhubung ke orang atau izin kunjungan. Kredensial memiliki jenis, token referensi, penerbit, masa berlaku, status aktif/hilang/dicabut, dan riwayat penerbitan. Jangan memakai NIS/NIP langsung sebagai token yang dapat ditebak atau ditampilkan di kode QR statis. Kredensial hilang segera dicabut; penerbitan ulang membuat token baru tanpa menghapus log lama.

Perangkat gerbang harus bisa membedakan hasil valid, kedaluwarsa, dicabut, tidak dikenal, di luar jadwal, dan perlu pemeriksaan manual. Respons yang ditampilkan pada perangkat tidak boleh membocorkan data pribadi berlebih. Jika jaringan atau pembaca gagal, petugas memakai prosedur manual yang mencatat alasan, identitas pemeriksa, dan waktu; data manual direkonsiliasi kemudian.

## 5. Event masuk dan keluar

`AccessEvent` menyimpan titik akses, arah, waktu kejadian menurut perangkat, waktu diterima server, identitas/kredensial yang dipetakan, keputusan, sumber, dan ID event eksternal. Event mentah tidak ditimpa; koreksi pemetaan atau keputusan dicatat sebagai revisi/penjelasan. Perangkat mengirim event dengan autentikasi dan ID unik agar retry tidak membuat duplikasi.

Anomali yang perlu ditinjau: dua tap berdekatan, keluar tanpa event masuk, masuk di luar jam, kartu dicabut, perangkat dengan jam melenceng, event terlambat sinkron, serta akses ditolak berulang. Sistem dapat memberi peringatan, tetapi keputusan lapangan tetap pada petugas. Dashboard “di dalam kampus” adalah estimasi berdasarkan event yang lengkap; tampilkan waktu pembaruan dan ketidakpastian, terutama saat perangkat offline atau ada pintu tanpa pembaca.

## 6. Registrasi pengunjung

### 6.1 Praregistrasi dan kedatangan

Tamu dapat dipreregistrasi oleh host/unit atau didaftarkan di resepsionis. Catat nama, organisasi bila relevan, tujuan, host, lokasi tujuan, waktu rencana, kontak yang diperlukan, dan persyaratan pendamping. Pengumpulan dokumen identitas dibatasi pada kebutuhan dan kebijakan sekolah; jangan menyimpan foto dokumen penuh bila pemeriksaan visual cukup.

Saat datang, petugas memverifikasi identitas dan persetujuan host, mencatat waktu masuk, memberi badge sementara, serta menjelaskan area yang boleh diakses. Status: dijadwalkan, menunggu verifikasi, disetujui, di dalam, selesai, ditolak, dibatalkan. Check-out mencatat waktu keluar dan pengembalian badge. Kunjungan yang melewati jadwal atau belum check-out masuk antrean tindak lanjut.

### 6.2 Pengunjung dengan akses khusus

Vendor, kontraktor, pembicara, dan orang tua yang berkunjung dapat memiliki aturan berbeda. Akses ke area siswa memerlukan pendamping/otorisasi sesuai SOP. Pendaftaran tamu tidak otomatis memberi hak mengambil siswa. Identitas host dan petugas yang menyetujui tercatat.

## 7. Kendaraan dan parkir

`Vehicle` menyimpan jenis, nomor polisi bila diperlukan, pemilik/kategori, dan status izin. `VehicleVisit` menghubungkan kendaraan dengan orang/kunjungan, titik masuk/keluar, area parkir, waktu, dan petugas. Kendaraan sekolah, pegawai, tamu, serta vendor dapat memiliki kebijakan terpisah. Nomor polisi adalah data pribadi operasional; akses dan retensinya dibatasi. Catatan kendaraan tidak boleh dipakai sebagai bukti otomatis bahwa semua penumpangnya telah diverifikasi.

## 8. Izin keluar siswa dan penjemputan

Permintaan izin keluar memuat siswa, tanggal/waktu, alasan kategori, pemohon, rencana penjemput, tujuan bila diperlukan, serta status. Pemohon dapat wali terverifikasi atau petugas sekolah sesuai kebijakan. Alur: diajukan → diverifikasi → disetujui/ditolak → siswa dilepas di gerbang → selesai; pembatalan tercatat. Persetujuan harus memiliki masa berlaku dan titik keluar yang jelas.

Di gerbang, petugas memeriksa izin aktif, identitas siswa, identitas penjemput, hubungan atau otorisasi penjemput, serta waktu. Wali yang memiliki akses portal belum tentu otomatis berwenang menjemput; hak penjemputan harus tercatat terpisah. Jika orang yang datang berbeda dari rencana, petugas mengikuti prosedur verifikasi ulang dan tidak mengubah izin secara sepihak. Event pelepasan mencatat petugas, waktu, titik keluar, dan penjemput yang terverifikasi.

Izin darurat, pembatalan mendadak, dan ketidakcocokan identitas harus memiliki jalur eskalasi manusia. Portal wali menampilkan status izin tanpa mengekspos catatan keamanan internal. Perubahan status keluar dapat dikirim ke wali sesuai kebijakan notifikasi.

## 9. CCTV, alarm, dan insiden keamanan

### 9.1 CCTV

Modul menyimpan metadata kamera: lokasi, status, pemilik operasional, dan referensi kejadian/rekaman bila diperlukan. Streaming serta penyimpanan video tetap di sistem CCTV, kecuali ada keputusan integrasi dan kapasitas yang jelas. Akses live view atau rekaman memerlukan izin khusus, alasan, dan audit. Masa simpan, area yang boleh direkam, serta proses permintaan rekaman ditetapkan sekolah. Jangan menampilkan CCTV pada dashboard umum.

### 9.2 Alarm

Alarm kebakaran, pintu, atau intrusi dikirim sebagai `SecuritySignal` dengan sumber, waktu, tingkat prioritas, dan status acknowledgment. Signal perangkat tidak otomatis menjadi insiden terkonfirmasi. Petugas mengakui, memeriksa, lalu mencatat tindakan. Kegagalan koneksi alarm harus terlihat sebagai status perangkat bermasalah. Prosedur evakuasi fisik berlaku walaupun aplikasi tidak tersedia.

### 9.3 Insiden

`SecurityIncident` mencatat waktu, lokasi, kategori, pelapor, dampak, tindakan awal, petugas, bukti, dan status. Jika insiden menyangkut keselamatan siswa atau kekerasan, buat rujukan ke modul safeguarding dengan akses terbatas; jangan menggandakan narasi sensitif di laporan keamanan umum. Status minimal: dilaporkan, ditriase, ditangani, selesai, dibuka kembali. Tiap perubahan memiliki aktor dan waktu.

## 10. Dashboard dan laporan

Dashboard petugas menampilkan tamu yang sedang berada di kampus, izin keluar yang menunggu atau berlaku hari ini, anomali gerbang, alarm belum diakui, perangkat offline, dan insiden terbuka. Angka okupansi diberi label estimasi jika sumber tidak lengkap. Petugas dapat memfilter menurut gedung, titik akses, shift, dan status.

Laporan awal: log akses per periode, kunjungan tamu, kunjungan belum check-out, izin keluar siswa, kendaraan, anomali perangkat, serta waktu respons alarm/insiden. Ekspor dibatasi peran, lokasi, periode, dan tujuan. Data identitas yang tidak diperlukan disamarkan. Laporan agregat tidak menampilkan detail kasus safeguarding.

## 11. Alur kerja prioritas

### 11.1 Tamu datang

1. Petugas mencari praregistrasi atau membuat kunjungan baru.
2. Petugas memverifikasi identitas dan menghubungi host bila diwajibkan.
3. Sistem mencatat persetujuan, area tujuan, badge, dan waktu masuk.
4. Petugas menandai check-out dan pengembalian badge saat tamu keluar.
5. Kunjungan tanpa check-out muncul pada antrean akhir shift.

### 11.2 Siswa pulang lebih awal

1. Wali/petugas berwenang mengajukan izin keluar.
2. Pejabat berwenang memeriksa alasan dan rencana penjemput lalu memutuskan.
3. Gerbang menerima daftar izin aktif; petugas memverifikasi siswa dan penjemput.
4. Pelepasan dicatat dengan waktu serta petugas; wali menerima status sesuai kebijakan.
5. Ketidakcocokan identitas menghentikan pelepasan dan memicu eskalasi.

### 11.3 Perangkat gerbang offline

1. Dashboard menunjukkan waktu sinkron terakhir dan titik yang terdampak.
2. Petugas mengikuti log manual yang disetujui.
3. Saat perangkat pulih, event disinkronkan secara idempoten.
4. Petugas merekonsiliasi duplikat/urutan yang tidak pasti dan mencatat keputusan.

## 12. Model data konseptual

| Entitas | Field penting | Aturan/relasi |
| --- | --- | --- |
| `SecurityZone`, `AccessPoint` | lokasi, jenis, arah, status | Terhubung ke gedung/area resmi |
| `AccessPolicyVersion` | subjek, zona, jadwal, syarat, berlaku | Kebijakan terbit berversi |
| `Credential` | ownerRef, tokenRef, jenis, berlaku, status | Token tidak sama dengan NIS/NIP |
| `AccessDevice` | accessPointId, jenis, status, lastSyncAt | Secret perangkat terpisah |
| `AccessEvent` | externalId, credentialRef, pointId, eventAt, receivedAt, decision | Event mentah immutable, idempoten |
| `Visitor`, `Visit` | identitas minimum, tujuan, host, badge, masuk/keluar | Kunjungan historis tetap ada |
| `Vehicle`, `VehicleVisit` | nomor, kategori, visitId, masuk/keluar | Retensi data kendaraan dibatasi |
| `StudentExitPermit` | studentId, requesterId, pickupRef, waktu, status | Persetujuan dan masa berlaku eksplisit |
| `StudentReleaseEvent` | permitId, guardId, pickupVerifiedRef, releasedAt | Tidak dapat dibuat tanpa izin valid kecuali alur pengecualian |
| `CameraReference`, `SecuritySignal` | lokasi, deviceRef, waktu, status | Rekaman tetap di sistem CCTV |
| `SecurityIncident`, `IncidentEvent` | kategori, lokasi, status, tindakan | Rujukan safeguarding tanpa salin detail |

Gunakan UUID internal dan timestamp UTC. Index utama: titik akses + waktu, external event ID + perangkat, kunjungan aktif, izin keluar siswa + tanggal/status, serta alarm/insiden terbuka. Mutasi izin, pelepasan siswa, dan keputusan perangkat memakai transaksi serta audit.

## 13. Rancangan halaman dan URL

| Halaman | URL contoh | Fungsi |
| --- | --- | --- |
| Dashboard keamanan | `/security/dashboard?buildingId=...` | Antrean dan status perangkat |
| Titik akses | `/security/access-points/[accessPointId]` | Kebijakan dan perangkat |
| Log gerbang | `/security/access-events?date=...&pointId=...` | Pencarian dan anomali |
| Tamu | `/security/visits?status=inside` | Daftar kunjungan aktif |
| Detail kunjungan | `/security/visits/[visitId]` | Identitas minimum dan check-out |
| Kendaraan | `/security/vehicles?status=inside` | Catatan kendaraan |
| Izin keluar | `/security/student-exit-permits?date=...` | Verifikasi gerbang |
| Detail izin | `/security/student-exit-permits/[permitId]` | Persetujuan dan pelepasan |
| Insiden | `/security/incidents/[incidentId]` | Tindakan dan eskalasi |
| Perangkat/alarm | `/security/devices?status=offline` | Kesehatan integrasi |
| Izin wali | `/guardian/children/[studentId]/exit-permits/[permitId]` | Pengajuan dan status aman |

Next.js App Router memakai nested layout per peran dan Dynamic Routes untuk detail. Filter, tanggal, gedung, sort, dan pagination yang perlu dibagikan disimpan di query string. Detail kunjungan atau izin dari daftar dapat memakai Intercepting/Parallel Routes sebagai modal; URL langsung/refresh menampilkan halaman penuh, Back menutup modal, Forward membukanya lagi. Formulir verifikasi pelepasan sebaiknya halaman atau panel yang jelas agar identitas tidak tertukar. Jangan menaruh nomor identitas, token kartu, atau detail insiden di URL.

UI dibangun dengan TypeScript, Tailwind CSS, shadcn/ui, dan TanStack Table untuk log serta antrean, dengan filter/sort/pagination server. Pada tablet gerbang, tombol verifikasi harus mudah disentuh dan hasil validasi tidak hanya mengandalkan warna. Agentation dipakai untuk inspeksi alur petugas, responsivitas, serta fokus modal.

## 14. Kontrak API awal

NestJS menyediakan API berversi dengan DTO tervalidasi, pemeriksaan peran dan lokasi, pagination, serta kesalahan konsisten (`code`, `message`, `fieldErrors`, `requestId`).

```text
GET    /api/v1/security/dashboard?buildingId=
GET    /api/v1/security/access-points
POST   /api/v1/security/access-points
GET    /api/v1/security/access-events?from=&to=&pointId=&status=
POST   /api/v1/security/device-events
GET    /api/v1/security/visits?status=&date=
POST   /api/v1/security/visits
POST   /api/v1/security/visits/:id/check-in
POST   /api/v1/security/visits/:id/check-out
POST   /api/v1/security/student-exit-permits
POST   /api/v1/security/student-exit-permits/:id/decisions
POST   /api/v1/security/student-exit-permits/:id/release
GET    /api/v1/security/signals?status=unacknowledged
POST   /api/v1/security/signals/:id/acknowledge
GET    /api/v1/security/incidents
POST   /api/v1/security/incidents
POST   /api/v1/security/incidents/:id/events
```

Ingest perangkat memakai autentikasi kuat, external event ID unik, dan idempotensi. Keputusan izin serta pelepasan siswa memakai transaksi dan version check; konflik menghasilkan `409` dengan keadaan terbaru. Respons detail meminimalkan field sesuai peran. Unduhan referensi rekaman CCTV memakai otorisasi khusus dan audit.

## 15. Keamanan, privasi, dan keandalan

- Terapkan akses minimum berdasarkan lokasi dan shift; akses gerbang tidak membuka data akademik/kesehatan.
- Simpan token kredensial dan secret perangkat secara aman; rotasi dan pencabutan dapat dilakukan tanpa menghapus log.
- Catat siapa melihat data tamu, menyetujui izin keluar, melepas siswa, membuka rekaman, atau menutup insiden.
- Tetapkan retensi log gerbang, data pengunjung/kendaraan, rekaman CCTV, dan dokumen identitas sesuai kebijakan sekolah.
- Sistem menampilkan waktu sinkron terakhir dan status offline; tidak menyatakan seseorang pasti berada di kampus dari event yang tidak lengkap.
- Siapkan prosedur manual untuk jaringan/power/perangkat gagal dan rekonsiliasi sesudahnya.
- Loading, tidak ada data, sinkronisasi tertunda, error, dan akses ditolak dibedakan pada UI; semua aksi utama dapat diakses keyboard.

## 16. Kriteria penerimaan MVP

1. Petugas hanya melihat titik akses/kunjungan pada lokasi yang ditugaskan; URL dan API lokasi lain ditolak.
2. Event perangkat yang sama tidak menghasilkan log ganda setelah retry; event terlambat sinkron mempertahankan waktu asli dan waktu diterima.
3. Kredensial yang dicabut ditolak, sedangkan log penggunaan lama tetap dapat diaudit.
4. Tamu tidak berstatus “di dalam” sebelum check-in terverifikasi; kunjungan tanpa check-out terlihat di akhir shift.
5. Izin keluar siswa membutuhkan persetujuan aktif dan verifikasi penjemput sebelum event pelepasan dibuat.
6. Wali portal yang terverifikasi tidak otomatis dianggap berhak menjemput tanpa hak penjemputan yang sesuai.
7. Identitas penjemput tidak cocok menghentikan alur normal dan membuka jalur eskalasi petugas.
8. Dashboard perangkat offline dan alarm belum diakui menampilkan waktu/status yang jelas.
9. Rekaman CCTV hanya dapat dibuka oleh peran khusus, dengan alasan dan audit.
10. Filter log, status tamu, dan tanggal bertahan setelah refresh serta Back/Forward; modal detail mengikuti URL.
11. Alur tablet/mobile, keyboard, loading, kosong, dan error diuji bersama petugas lapangan.

## 17. Urutan implementasi

1. Sepakati SOP gerbang, tamu, penjemputan, alarm, CCTV, serta retensi data.
2. Bangun titik akses, kebijakan dasar, registrasi tamu, dan izin keluar siswa dengan alur manual terverifikasi.
3. Bangun dashboard petugas, insiden, laporan, dan audit.
4. Integrasikan kartu/QR/NFC serta perangkat gerbang setelah pemetaan dan uji offline.
5. Integrasikan alarm dan referensi CCTV sesuai kemampuan perangkat serta mandat akses.
6. Uji skenario lapangan, termasuk jaringan gagal, penjemput tidak cocok, dan dua gedung serentak.

## 18. Keputusan terbuka

- Titik masuk/keluar yang benar-benar dijaga dan area terbatas pada tiap gedung.
- Jam operasional, kebijakan siswa keluar, serta siapa yang berwenang menyetujui pengecualian.
- Cara verifikasi pengunjung dan penjemput, termasuk hak wali yang berbeda dari hak portal.
- Informasi tamu/kendaraan yang perlu dicatat dan masa retensinya.
- Jenis kartu/QR/NFC, perangkat gerbang, kemampuan offline, dan pemilik pemeliharaan.
- Apakah semua pintu memiliki pembaca; jika tidak, batas keandalan estimasi okupansi.
- Akses live view/rekaman CCTV, masa simpan, dan proses permintaan bukti.
- Jenis alarm, petugas penerima, target respons, serta fallback saat sistem gagal.
- Kapan insiden keamanan harus dirujuk ke modul safeguarding dan siapa yang memutuskan.

Keputusan ini menjadi dasar skema Prisma, aturan NestJS, halaman Next.js, serta pengujian perangkat dan SOP lapangan.
