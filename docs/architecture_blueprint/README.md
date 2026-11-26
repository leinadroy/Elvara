# Elvara School Ecosystem — Peta Pra-Desain

Folder ini adalah keputusan awal sebelum wireframe, desain UI, dan skema Prisma final. Ia merangkum 21 [dokumen modul](../smart_school_master_note.md) menjadi peta aplikasi, peran, topologi, dan tabel database. **Status: usulan v0.1**, bukan spesifikasi yang sudah disetujui sekolah.

## Keputusan utama

**Persiapan desain:** skill [UI/UX Pro Max](../../.agents/skills/ui-ux-pro-max/SKILL.md) telah dipasang untuk Codex di project ini. Gunakan bersama [brief UI/UX web](09_web_ui_ux_designer_brief.md) saat mulai desain; acuan brand Elvara dan kebutuhan pengguna tetap menjadi sumber keputusan produk.

| Pertanyaan | Usulan |
| --- | --- |
| Berapa aplikasi web? | **1 Next.js App Router** dengan area kerja berbasis peran |
| Berapa aplikasi mobile? | **1 pengalaman mobile/PWA** dari codebase web yang sama; **0 aplikasi native** pada rilis awal |
| Backend? | **1 NestJS modular monolith**, ditambah worker untuk pekerjaan latar |
| Database? | **1 PostgreSQL** melalui Prisma ORM, dengan kepemilikan tabel per domain |
| Berapa dashboard? | **15 konfigurasi beranda** jangka panjang, **7 pada MVP**; bukan 15 aplikasi |
| Perangkat utama? | Desktop untuk pekerjaan data padat; ponsel/tablet untuk siswa, wali, dan petugas lapangan |
| Integrasi perangkat? | Adaptor bertahap; agen Windows dan aplikasi native dievaluasi sesudah pilot |

## Isi folder

1. [Arah visual dari PDF Elvara](01_visual_direction.md) — bahasa desain dan pola presentasi yang akan dipakai saat desain.
2. [Peta aplikasi web dan mobile](02_application_map.md) — jumlah aplikasi, codebase, area kerja, dan batas fitur.
3. [Topologi teknis](03_topology.md) — deploy, aliran data, keamanan, file, dan integrasi.
4. [Dashboard dan perangkat](04_dashboards_roles.md) — 15 beranda per kelompok peran serta prioritas desktop/mobile.
5. [Tabel inti database](05_database_core_tables.md) — identitas, sekolah, akademik, absensi, komunikasi, file, audit.
6. [Tabel domain lanjutan](06_database_domain_tables.md) — keuangan, layanan, operasi kampus, keselamatan, analitik, IT.
7. [Matriks modul ke aplikasi](07_module_coverage.md) — posisi 21 poin di web/mobile dan tahap rilis.
8. [Keputusan sebelum desain](08_open_decisions.md) — hal yang perlu disepakati, sketsa layar, dan urutan kerja.
9. [Brief UI/UX web](09_web_ui_ux_designer_brief.md) — arah visual dan isi tujuh dashboard MVP untuk desainer.

## Cara membaca

Mulai dari jumlah aplikasi dan dashboard, lalu periksa topologi serta rancangan tabel. Setelah pemilik proses sekolah menyetujui asumsi penting, dokumen ini menjadi dasar sitemap, user flow, wireframe, kontrak API, dan skema Prisma. Tabel yang tertulis adalah **rancangan logis**, belum migrasi siap produksi.

## Prinsip yang diambil dari PDF acuan

PDF *Elvara — Ekosistem Digital Sekolah* menekankan satu aplikasi sebagai pintu masuk, tampilan sesuai peran, data yang mengalir mengikuti proses sekolah, dan aktivasi modul bertahap. Arah visualnya: latar terang, judul kuat, aksen burgundy/merah, ruang putih luas, dan ilustrasi alur sekolah yang kontekstual. Detailnya dicatat di [arah visual](01_visual_direction.md). Ini acuan gaya, bukan instruksi untuk menyalin logo atau aset PDF.
