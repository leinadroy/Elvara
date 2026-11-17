# Cross-Platform Notes & Collaboration

Rancangan poin 20 dari [dokumen utama](smart_school_management_ecosystem.md). Fitur ini menyediakan catatan pribadi/bersama bagi guru, staf, dan bila sesuai siswa di web responsif terlebih dahulu; Android/iOS native adalah tahap lanjutan. Identitas, peran, dan penugasan berasal dari [administrasi](school_administration_management.md).

## Tujuan dan batas

Pengguna dapat membuat catatan teks kaya, menyisipkan gambar, mengatur folder/tag, berbagi ke orang atau tim yang berhak, dan melanjutkan pekerjaan di perangkat lain. Catatan tidak boleh menjadi tempat tidak resmi untuk menyimpan kasus safeguarding, kesehatan, nilai belum terbit, atau dokumen sensitif tanpa klasifikasi dan kontrol yang tepat. Materi belajar resmi tetap di modul akademik.

## Peran, kepemilikan, dan berbagi

Pemilik dapat mengubah, mengarsipkan, serta membagikan catatan; penerima memperoleh peran pembaca/editor dengan tanggal berlaku; admin sistem tidak otomatis dapat membaca isi catatan pribadi. Catatan tim memiliki pemilik unit agar akses tidak bergantung pada satu pegawai. Berbagi di luar sekolah ditutup pada awal, kecuali ada kebijakan khusus. Saat pegawai keluar atau penugasan berakhir, akses tim ditinjau dan catatan institusional dialihkan melalui proses tercatat.

## Editor dan sinkronisasi

`Note` menyimpan judul, konten terstruktur, pemilik, klasifikasi, versi, waktu edit, dan status aktif/arsip. Gambar disimpan privat, dioptimalkan, serta memiliki alt text. Clipboard hanya digunakan setelah aksi pengguna; konten sensitif tidak disalin otomatis. Autosave menunjukkan status menyimpan/tersimpan/gagal. Konflik dua perangkat diselesaikan dengan versi atau mekanisme kolaborasi real-time yang dipilih; perubahan tidak boleh hilang diam-diam. Riwayat versi memungkinkan pemulihan.

MVP dapat memakai editor tunggal dengan autosave dan version check. Kolaborasi edit serentak memerlukan CRDT/OT, presence, rekoneksi, serta uji konflik terpisah. Jika mode offline dibuat, UI membedakan perubahan lokal dan tersinkron, serta menyediakan resolusi konflik setelah reconnect.

## Penguncian dan perlindungan

Kunci catatan individual dapat berupa verifikasi ulang sesi. Biometrik hanya tersedia pada perangkat yang mendukung dan tidak menjadi satu-satunya pemulihan akses. Enkripsi transit/penyimpanan wajib; pilihan end-to-end encryption, bila diinginkan, harus diputuskan bersama konsekuensi pencarian, berbagi, pemulihan kunci, dan audit. Jangan mengklaim E2EE jika server masih bisa membaca konten.

## Alur utama

Pengguna membuat catatan → editor menyimpan versi → pengguna membagikan ke orang/tim → penerima membaca/mengedit sesuai izin → perubahan muncul lintas perangkat → pemilik mencabut akses atau memulihkan versi. Saat konflik, pengguna melihat pilihan yang dapat dipahami, bukan kehilangan salah satu edit.

## Model data

| Entitas | Data penting | Constraint |
| --- | --- | --- |
| `Note` | owner, title, classification, status, version | Akses owner/team |
| `NoteRevision` | contentRef, editor, savedAt | Riwayat immutable |
| `NoteShare` | subject, role, validFrom/To | Izin per catatan |
| `NoteAttachment` | fileRef, mime, altText | File privat |
| `NoteFolder`, `NoteTag` | owner/team, name | Organisasi |
| `SyncCursor` | deviceRef, noteId, version | Opsional untuk offline |

UUID, UTC, indeks owner/team, updatedAt, tag, dan share. Konten besar/gambar tidak disimpan sebagai log aplikasi.

## UI, URL, dan API

Halaman: `/notes?scope=mine&q=&page=`, `/notes/[noteId]`, `/notes/shared`, `/notes/trash`. Query string untuk filter/pencarian; detail catatan halaman penuh agar editor stabil. Modal berbagi dapat memakai URL state bila perlu dipulihkan melalui Back/Forward; direct link/refresh membuka catatan dengan izin baru diperiksa.

Endpoint: `GET/POST /api/v1/notes`, `GET/PATCH /api/v1/notes/:id`, `GET /api/v1/notes/:id/revisions`, `POST /api/v1/notes/:id/shares`, `DELETE /api/v1/notes/:id/shares/:shareId`, `POST /api/v1/notes/:id/attachments`. NestJS memeriksa pemilik/share, DTO, version check, dan file privat.

Next.js App Router + TypeScript, Tailwind CSS + shadcn/ui, TanStack Table jika daftar besar, Agentation untuk inspeksi editor/responsivitas. Loading, kosong, gagal simpan, konflik, offline, dan akses dicabut harus jelas; keyboard/editor screen reader diuji.

## Kriteria penerimaan dan keputusan terbuka

Edit dua perangkat tidak hilang diam-diam; penerima hanya mendapat peran yang diberikan; pencabutan share segera memutus API/file; autosave/gagal terlihat; gambar memiliki alt text; deep link/Back/Forward benar. Putuskan pengguna sasaran, klasifikasi data, editor, offline, kolaborasi real-time, biometrik, kunci catatan, E2EE, dan retensi.
