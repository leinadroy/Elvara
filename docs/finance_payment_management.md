# Finance & Payment Management

Dokumen ini merinci poin 10 dari [Smart School Management Ecosystem](smart_school_management_ecosystem.md). Modul keuangan mengelola biaya pendidikan, tagihan, pembayaran, keringanan, dan laporan operasional. Identitas siswa, wali, tahun ajaran, serta hubungan hak akses bersumber dari [Administrasi Sekolah](school_administration_management.md). Wali melihat data yang diizinkan melalui [Parent & Guardian Portal](parent_guardian_portal.md).

**Status:** rancangan awal untuk sistem administrasi tagihan dan penerimaan sekolah. Kebijakan akuntansi, pajak, kontrak payment gateway, dan format laporan resmi harus disepakati dengan tim keuangan sebelum implementasi. Modul ini belum otomatis menjadi buku besar akuntansi lengkap.

## 1. Tujuan dan batas modul

Sistem harus menjawab biaya apa yang berlaku untuk siswa, tagihan mana yang sudah diterbitkan, berapa yang dibayar, bagaimana pembayaran dialokasikan, dan tindakan apa yang dilakukan saat terjadi selisih. Setiap nominal dan perubahan harus dapat ditelusuri ke dokumen serta aktor. Portal wali hanya menampilkan tagihan dan bukti yang telah resmi tersedia.

| Dalam modul ini | Di luar cakupan awal atau pemilik lain |
| --- | --- |
| Katalog biaya, rencana biaya, tagihan, potongan, pembayaran, alokasi | Identitas siswa/wali dan status penempatan dari administrasi |
| Rekonsiliasi pembayaran manual dan gateway | Pemrosesan kartu/rekening oleh penyedia pembayaran |
| Beasiswa/keringanan dan persetujuan | Kriteria penerima dari kebijakan sekolah |
| Pengingat, kuitansi, laporan penerimaan dan piutang | Pengiriman kanal oleh pusat komunikasi |
| Koreksi, pembatalan, refund operasional | Buku besar, payroll, pengadaan, dan laporan pajak bila diperlukan terpisah |

Nominal memakai tipe desimal dalam PostgreSQL/Prisma, bukan floating point. Mata uang awal diasumsikan IDR, tetapi field mata uang tetap eksplisit pada transaksi. Semua tanggal jatuh tempo ditafsirkan dalam zona waktu sekolah.

## 2. Peran dan pemisahan tugas

| Peran | Kewenangan | Pembatasan |
| --- | --- | --- |
| Admin keuangan | Kelola katalog biaya, terbitkan tagihan, tinjau pembayaran | Pembatalan/penyesuaian bernilai besar dapat perlu persetujuan kedua |
| Kasir/petugas pembayaran | Catat penerimaan manual dan bukti | Tidak mengubah aturan biaya atau mengesahkan transaksinya sendiri jika kebijakan melarang |
| Peninjau/atasan keuangan | Setujui keringanan, refund, pembatalan, tutup periode | Tidak mengubah event gateway mentah |
| Kepala sekolah/manajemen | Melihat ringkasan dan menyetujui kebijakan tertentu | Data individual hanya sesuai mandat |
| Wali | Lihat/bayar tagihan anak sesuai hak | Hak melihat dan membayar dapat berbeda |
| Siswa | Lihat informasi biaya jika sekolah mengizinkan | Tidak otomatis dapat membayar atau melihat data wali |
| Auditor | Baca laporan, transaksi, dan jejak perubahan | Tanpa mutasi |
| Integrasi gateway | Mengirim callback terverifikasi | Hanya endpoint khusus, tanpa hak baca umum |

Contoh izin: `fee-plan.manage`, `invoice.draft`, `invoice.publish`, `payment.record`, `payment.reconcile`, `discount.approve`, `refund.approve`, `finance-report.export`. Pemeriksaan backend menggabungkan izin, sekolah, tahun ajaran, siswa, dan hubungan wali yang aktif. Perubahan aturan harga tidak otomatis mengubah tagihan yang telah terbit.

## 3. Katalog biaya dan rencana penagihan

`FeeItem` adalah jenis biaya seperti SPP, pendaftaran, kegiatan, ujian, transportasi, atau layanan lain. Atributnya: kode, nama, kategori, deskripsi, mata uang, status, dan aturan pajak bila relevan. `FeePlan` menentukan siapa yang dikenai biaya berdasarkan tahun ajaran, tingkat, program, rombel, layanan pilihan, dan periode berlaku. Plan dapat memiliki frekuensi sekali, bulanan, per semester, atau sesuai kegiatan.

Sebelum diterbitkan, admin melihat pratinjau siswa terdampak, nominal, tanggal jatuh tempo, serta pengecualian. Aturan biaya berversi. Ketika siswa pindah kelas, masuk terlambat, atau keluar, sistem tidak secara diam-diam menghitung ulang tagihan lama; petugas meninjau dampak dan menerbitkan penyesuaian yang terlacak. Kebutuhan prorata dan pembulatan diputuskan sekolah.

## 4. Tagihan

`Invoice` memiliki nomor unik, siswa, wali penanggung jawab bila ada, periode, tanggal terbit, tanggal jatuh tempo, status, nominal total, serta versi. `InvoiceLine` menyimpan jenis biaya, kuantitas, harga satuan, diskon, dan total baris. Status operasional: draf, terbit, sebagian dibayar, lunas, lewat jatuh tempo, dibatalkan. “Lewat jatuh tempo” adalah kondisi turunan dari sisa dan tanggal; riwayat status tetap dijaga.

Tagihan draf boleh diedit oleh petugas berwenang. Setelah terbit, perubahan nominal dilakukan melalui nota koreksi/penyesuaian atau pembatalan dan penerbitan ulang menurut kebijakan, bukan menimpa baris lama. Nomor tagihan dan dokumen terbit memiliki snapshot identitas sekolah, siswa, biaya, serta aturan yang dipakai. Sistem mencegah penerbitan tagihan ganda untuk kombinasi siswa, plan, dan periode kecuali ada jenis penagihan tambahan yang eksplisit.

## 5. Pembayaran dan alokasi

`Payment` mencatat nominal, mata uang, kanal, waktu diterima, referensi eksternal, status, dan bukti. Status: menunggu, terkonfirmasi, gagal, dibatalkan, dikembalikan sebagian, dikembalikan penuh. `PaymentAllocation` menghubungkan pembayaran ke satu atau beberapa tagihan. Jumlah alokasi tidak boleh melebihi pembayaran yang tersedia; tagihan tidak boleh menjadi lunas sebelum alokasi terkonfirmasi cukup.

Pembayaran parsial diperbolehkan bila kebijakan sekolah mengizinkan. Pembayaran lebih harus masuk saldo belum dialokasikan atau proses refund, bukan hilang dalam pembulatan. Pembayaran yang ditujukan untuk beberapa anak perlu identifikasi alokasi yang jelas. Bukti pembayaran manual tidak otomatis menjadi konfirmasi; petugas memverifikasi penerimaan dana terlebih dahulu.

Semua nominal ditampilkan dengan format IDR yang konsisten, sementara API mengirim nilai desimal sebagai string atau satuan minor yang disepakati, bukan bilangan floating point JavaScript. Aturan pembulatan ditetapkan sekali dan digunakan konsisten pada diskon, pajak, total, serta refund.

## 6. Integrasi payment gateway

Saat wali memilih bayar, backend membuat `PaymentIntent` dengan ID unik, tagihan/alokasi yang dituju, nominal, masa berlaku, dan status. Browser dapat diarahkan ke gateway atau membuka alur yang disediakan. Tampilan “berhasil” di browser hanya status sementara; pembayaran dianggap terkonfirmasi setelah callback gateway yang sah atau rekonsiliasi resmi diterima backend.

Callback harus diverifikasi sesuai mekanisme penyedia, diproses idempoten berdasarkan external event/transaction ID, dan disimpan sebagai event mentah yang dapat diaudit. Callback dapat datang terlambat atau tidak berurutan; state machine menolak transisi mundur yang tidak sah. Kegagalan callback masuk antrean retry/peninjauan. Jangan menyimpan nomor kartu, CVV, atau kredensial pembayaran di sistem sekolah. Secret gateway disimpan terpisah dari source code.

Refund dan chargeback mengikuti alur khusus dengan persetujuan, referensi gateway, nilai, alasan, waktu, serta dampak ke alokasi/tagihan. Jangan menghapus pembayaran awal; buat transaksi pembalik atau event koreksi sesuai desain yang disepakati.

## 7. Rekonsiliasi dan penutupan periode

Rekonsiliasi mencocokkan pembayaran sistem dengan laporan gateway/bank/kasir berdasarkan referensi, nominal, tanggal, dan kanal. Status: cocok, belum ditemukan, nominal berbeda, duplikat, refund, atau perlu investigasi. Petugas dapat memberi keputusan manual dengan alasan dan bukti; keputusan tidak mengubah event sumber. Dashboard menampilkan transaksi belum cocok dan umur antreannya.

Penutupan periode membekukan laporan dan membatasi perubahan langsung. Koreksi setelah tutup dilakukan sebagai penyesuaian pada periode berikutnya atau pembukaan kembali dengan persetujuan, sesuai kebijakan keuangan. Simpan snapshot laporan serta aturan perhitungan yang digunakan agar angka historis dapat direproduksi.

## 8. Beasiswa, keringanan, dan pembebasan

`Scholarship` atau `DiscountGrant` menyimpan jenis, siswa, nilai tetap/persentase, batas nominal, periode berlaku, sumber dana bila relevan, status, pemberi persetujuan, dan alasan internal. Keputusan keringanan dibatasi aksesnya; portal wali hanya menampilkan dampak yang boleh diketahui, bukan informasi evaluasi pribadi atau pembiayaan siswa lain.

Aturan potongan menentukan urutan penerapan, kombinasi yang boleh, dan apakah berlaku ke tagihan yang sudah terbit. Persetujuan berjenjang dapat bergantung pada nominal. Perubahan atau pencabutan keringanan menghasilkan penyesuaian terbit, bukan mengubah pembayaran historis.

## 9. Pengingat dan komunikasi

Pengingat dapat dijadwalkan sebelum/sesudah jatuh tempo sesuai kebijakan, preferensi penerima, dan status tagihan. Pekerjaan terjadwal memeriksa ulang sisa tagihan sebelum mengirim agar tagihan yang baru lunas tidak tetap diingatkan. Event pengingat memakai idempotency key supaya retry tidak mengirim ganda. Pesan eksternal menyebut informasi minimum dan menautkan ke portal setelah login; jangan mengirim detail finansial yang tidak diperlukan.

Jika satu siswa memiliki beberapa wali, hak menerima informasi keuangan serta hak membayar ditentukan per hubungan. Riwayat pengiriman, gagal, dan dibaca disimpan di modul komunikasi, sementara modul keuangan menyimpan alasan bisnis pengingat.

## 10. Laporan dan dashboard

Dashboard keuangan menampilkan tagihan terbit, penerimaan terkonfirmasi, piutang, jatuh tempo, transaksi belum rekonsiliasi, refund menunggu, dan keringanan menunggu persetujuan. Setiap angka menyebut periode, basis kas atau tagihan, serta waktu pembaruan. Jangan mencampur “pembayaran dimulai” dengan “dana diterima”.

Laporan awal: daftar tagihan per status/periode, umur piutang, penerimaan per kanal, pembayaran parsial, keringanan/beasiswa, refund, rekonsiliasi, dan audit penyesuaian. Filter meliputi tahun ajaran, semester/bulan, tingkat, program, jenis biaya, kanal, serta status. Ekspor CSV/PDF memiliki izin khusus, batas ukuran, audit, dan masa berlaku unduhan. Laporan manajemen agregat tidak perlu memuat identitas siswa bila tidak dibutuhkan.

## 11. Alur kerja prioritas

### 11.1 Terbitkan SPP bulanan

1. Admin memilih versi `FeePlan`, bulan, serta kelompok siswa.
2. Sistem menampilkan pratinjau biaya, potongan, siswa yang dikecualikan, dan potensi duplikat.
3. Petugas berwenang menerbitkan batch; sistem memberi nomor tagihan dan snapshot.
4. Portal wali menampilkan tagihan sesuai hak; pengingat berjalan menurut jadwal.
5. Koreksi setelah terbit memakai penyesuaian atau pembatalan resmi.

### 11.2 Pembayaran gateway

1. Wali memilih tagihan dan meninjau anak, nominal, serta metode bayar.
2. Backend membuat intent; gateway memproses pembayaran.
3. UI menunjukkan status menunggu sampai callback sah diterima.
4. Backend mencatat pembayaran, alokasi, dan kuitansi dalam transaksi idempoten.
5. Rekonsiliasi mencocokkan data dengan laporan gateway/bank.

### 11.3 Pembayaran manual yang tidak cocok

Kasir mencatat bukti dan referensi; status belum terkonfirmasi. Petugas rekonsiliasi membandingkan mutasi bank, menandai cocok atau meminta informasi. Setelah konfirmasi, alokasi ke tagihan dilakukan dan wali menerima pembaruan. Selisih nominal tidak diubah diam-diam.

## 12. Model data konseptual

| Entitas | Field penting | Aturan/relasi |
| --- | --- | --- |
| `FeeItem` | code, name, category, currency, status | Kode unik per sekolah |
| `FeePlanVersion` | yearId, targetRule, frequency, amount, dueRule | Versi terbit immutable |
| `FeeAssessment` | planVersionId, studentId, period, amount | Mencegah penagihan ganda |
| `Invoice`, `InvoiceLine` | number, studentId, dueAt, amount, status | Nomor unik, snapshot setelah terbit |
| `InvoiceAdjustment` | invoiceId, amount, reason, approverId | Tidak menimpa tagihan lama |
| `DiscountGrant` | studentId, type, value, period, status | Persetujuan dan akses terbatas |
| `PaymentIntent` | invoiceRefs, amount, expiresAt, status | ID unik per percobaan |
| `Payment`, `PaymentEvent` | channel, externalRef, amount, status | Event gateway idempoten |
| `PaymentAllocation` | paymentId, invoiceId, amount | Total alokasi tidak melebihi dana |
| `Refund`, `ReconciliationMatch` | paymentId, amount, sourceRef, status | Riwayat tidak menghapus transaksi awal |
| `FinancePeriodClose`, `FinanceAuditEvent` | period, snapshotRef, actor, action | Penutupan dan koreksi terlacak |

Gunakan UUID internal dan tipe `Decimal` Prisma/`numeric` PostgreSQL dengan presisi yang ditetapkan. Index pada siswa + periode, nomor tagihan, status/jatuh tempo, external transaction ID, dan status rekonsiliasi. Transaksi atomik menjaga pembayaran, alokasi, status tagihan, dan audit tetap konsisten. Outbox/event internal memisahkan komit database dari pengiriman notifikasi.

## 13. Rancangan halaman dan URL

| Halaman | URL contoh | Fungsi |
| --- | --- | --- |
| Dashboard keuangan | `/finance/dashboard?period=...` | Ringkasan dan antrean |
| Katalog biaya | `/finance/fee-items` | Jenis biaya |
| Rencana biaya | `/finance/fee-plans/[planId]` | Target, nominal, versi |
| Pratinjau batch | `/finance/billing-batches/[batchId]` | Validasi sebelum terbit |
| Daftar tagihan | `/finance/invoices?status=overdue&page=1` | Filter dan aksi |
| Detail tagihan | `/finance/invoices/[invoiceId]` | Baris, alokasi, riwayat |
| Pembayaran | `/finance/payments/[paymentId]` | Status dan event |
| Rekonsiliasi | `/finance/reconciliation?status=unmatched` | Selisih dan keputusan |
| Keringanan | `/finance/discounts/[grantId]` | Pengajuan/persetujuan |
| Laporan | `/finance/reports?period=...` | Ekspor terkontrol |
| Tagihan wali | `/guardian/children/[studentId]/invoices/[invoiceId]` | Detail dan bayar |

Next.js App Router memakai nested layout keuangan/wali dan Dynamic Routes untuk detail. Filter, status, periode, sort, dan pagination yang perlu dibagikan berada di query string. Detail tagihan dari daftar dapat memakai Intercepting/Parallel Routes sebagai modal; URL langsung atau refresh menampilkan halaman penuh, Back menutup modal, dan Forward membukanya lagi. Pembayaran, refund, serta persetujuan bernilai besar tetap memakai halaman penuh/konfirmasi yang jelas. Jangan menaruh data pembayaran atau token gateway sensitif di URL.

UI memakai TypeScript, Tailwind CSS, shadcn/ui, dan TanStack Table untuk tagihan, pembayaran, serta rekonsiliasi dengan filter/sort/pagination server. Tampilkan angka rata kanan, format mata uang konsisten, sisa tagihan jelas, dan status dengan teks selain warna. Agentation digunakan untuk inspeksi modal, mobile, dan kejelasan status “menunggu” versus “lunas”.

## 14. Kontrak API awal

NestJS menyediakan API berversi dengan DTO tervalidasi, pemeriksaan izin dan hubungan wali, pagination, format kesalahan `code`, `message`, `fieldErrors`, `requestId`, serta idempotensi untuk mutasi uang.

```text
GET    /api/v1/finance/fee-items
POST   /api/v1/finance/fee-items
GET    /api/v1/finance/fee-plans
POST   /api/v1/finance/fee-plans/:id/versions
POST   /api/v1/finance/billing-batches/preview
POST   /api/v1/finance/billing-batches/:id/publish
GET    /api/v1/finance/invoices?status=&studentId=&page=
GET    /api/v1/finance/invoices/:id
POST   /api/v1/finance/invoices/:id/adjustments
POST   /api/v1/finance/payment-intents
POST   /api/v1/finance/gateway-webhooks/:provider
POST   /api/v1/finance/manual-payments
GET    /api/v1/finance/reconciliation?status=
POST   /api/v1/finance/reconciliation/:id/decisions
POST   /api/v1/finance/refunds
GET    /api/v1/finance/reports?period=
GET    /api/v1/guardians/me/children/:studentId/invoices
```

Webhook memakai autentikasi/verifikasi penyedia, external ID unik, dan penyimpanan event mentah. Proses payment intent, konfirmasi, alokasi, refund, dan koreksi memakai transaksi serta version check. Konflik menghasilkan `409` dengan keadaan terbaru. API tidak mengembalikan secret gateway atau detail instrumen pembayaran.

## 15. Keamanan, privasi, dan keandalan

- Pisahkan izin membuat tagihan, mencatat pembayaran, menyetujui keringanan/refund, dan menutup periode.
- Jangan menyimpan data kartu; gunakan penyedia pembayaran sesuai kontrak dan simpan secret pada secret store.
- Audit perubahan biaya, publikasi tagihan, alokasi, refund, rekonsiliasi manual, ekspor, dan akses dokumen sensitif.
- File kuitansi/bukti disimpan privat dengan URL unduh sementara; hak wali diperiksa lagi pada setiap akses.
- Backup PostgreSQL dan file serta uji restore diperlukan sebelum produksi; laporan periode tertutup disimpan sebagai snapshot.
- Job pengingat dan callback tahan retry; kegagalan ditampilkan di antrean operasional, bukan disembunyikan.
- Loading, kosong, error, pembayaran menunggu, callback terlambat, dan akses ditolak adalah keadaan UI yang berbeda.

## 16. Kriteria penerimaan MVP

1. Rencana biaya menghasilkan pratinjau siswa dan nominal; batch terbit tidak membuat tagihan duplikat saat diulang.
2. Tagihan terbit memiliki nomor unik, baris, tanggal, versi, dan snapshot; perubahan berikutnya melalui penyesuaian terlacak.
3. Pembayaran parsial menghitung sisa dengan tepat; total alokasi tidak melebihi pembayaran terkonfirmasi.
4. Browser yang menampilkan sukses tidak membuat tagihan lunas sebelum callback sah/rekonsiliasi diterima.
5. Callback duplikat atau datang tidak berurutan tidak menghasilkan pembayaran/alokasi ganda.
6. Refund atau pembatalan tidak menghapus pembayaran awal dan memiliki alasan serta persetujuan sesuai aturan.
7. Wali hanya melihat tagihan anak dengan hak keuangan aktif; URL/API/file anak lain ditolak.
8. Keringanan hanya diterapkan sesuai periode dan urutan aturan, dengan riwayat persetujuan.
9. Laporan membedakan tagihan, pembayaran dimulai, dana terkonfirmasi, dan hasil rekonsiliasi.
10. Filter/halaman daftar bertahan setelah refresh dan Back/Forward; modal detail mengikuti URL.
11. Alur bayar mobile, keyboard, loading, error, dan status menunggu diuji bersama tim keuangan/wali.

## 17. Urutan implementasi

1. Tetapkan jenis biaya, periode, kebijakan potongan, pembayaran parsial, refund, dan pemisahan tugas.
2. Bangun katalog biaya, rencana berversi, pratinjau dan penerbitan tagihan.
3. Bangun pembayaran manual, alokasi, kuitansi, serta laporan dasar.
4. Integrasikan gateway dengan webhook idempoten dan rekonsiliasi.
5. Tambahkan beasiswa/keringanan, refund, pengingat, dan penutupan periode.
6. Uji transaksi duplikat, callback terlambat, pembatalan, hak wali, dan pemulihan data.

## 18. Keputusan terbuka

- Jenis biaya, periode penagihan, dan aturan prorata saat masuk/pindah/keluar.
- Siapa penanggung jawab tagihan jika ada beberapa wali; hak lihat dan hak bayar per wali.
- Apakah pembayaran parsial, lebih bayar, saldo lintas anak, dan cicilan diperbolehkan.
- Metode pembayaran, gateway, rekening tujuan, biaya layanan, dan siapa menanggung biaya itu.
- Urutan penerapan diskon/beasiswa, batas nilai, serta alur persetujuannya.
- Kebijakan nomor tagihan/kuitansi, pembatalan, refund, dan koreksi setelah periode tutup.
- Basis serta format laporan resmi, kebutuhan integrasi akuntansi, dan masa retensi.
- Jadwal pengingat dan konten yang boleh dikirim lewat email/push.
- Nilai ambang yang memerlukan persetujuan kedua dan siapa auditor transaksi.

Keputusan ini menjadi dasar skema Prisma, aturan transaksi NestJS, halaman Next.js, dan uji rekonsiliasi sebelum produksi.
