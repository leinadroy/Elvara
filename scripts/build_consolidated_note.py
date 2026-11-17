"""Build one readable master note from the 21 detailed module documents."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
TARGET = DOCS / "smart_school_master_note.md"

MODULES = [
    ("school_administration_management.md", "School Administration & Management"),
    ("academic_management_system.md", "Academic Management System"),
    ("student_information_portal.md", "Student Information & Portal"),
    ("teacher_staff_management.md", "Teacher & Staff Management"),
    ("attendance_management_system.md", "Attendance Management System"),
    ("student_safety_safeguarding_system.md", "Student Safety & Safeguarding System"),
    ("campus_security_access_control.md", "Campus Security & Access Control"),
    ("student_location_campus_tracking.md", "Student Location & Campus Tracking"),
    ("parent_guardian_portal.md", "Parent & Guardian Portal"),
    ("finance_payment_management.md", "Finance & Payment Management"),
    ("library_learning_resource_management.md", "Library & Learning Resource Management"),
    ("facility_campus_management.md", "Facility & Campus Management"),
    ("maintenance_asset_management.md", "Maintenance & Asset Management"),
    ("extracurricular_school_activities.md", "Extracurricular & School Activities"),
    ("canteen_school_services.md", "Canteen & School Services"),
    ("transportation_management.md", "Transportation Management"),
    ("health_counseling_management.md", "Health & Counseling Management"),
    ("communication_notification_center.md", "Communication & Notification Center"),
    ("windows_utility_school_it_management.md", "Windows Utility & School IT Management"),
    ("cross_platform_notes_collaboration.md", "Cross-Platform Notes & Collaboration"),
    ("school_command_center_analytics.md", "School Command Center & Analytics"),
]

INTRO = """# Smart School — Catatan Induk Produk dan Topologi

Catatan ini menggabungkan **seluruh isi 21 dokumen modul** dalam satu file, lalu menambahkan keputusan arsitektur, jumlah aplikasi, dan rancangan dashboard per peran. Dokumen modul individual tetap menjadi sumber edit; jalankan `python scripts/build_consolidated_note.py` setelah mengubahnya untuk memperbarui catatan ini.

**Asumsi perencanaan:** satu sekolah, dua gedung, aplikasi web responsif sebagai kanal awal, dan ekspansi bertahap. Angka dashboard di bawah adalah **konfigurasi beranda per kelompok peran**, bukan 15 codebase atau 15 produk terpisah. Aturan yang ditandai sebagai keputusan terbuka pada setiap modul perlu disetujui pemilik proses sekolah.

## A. Keputusan arsitektur yang disarankan

### A.1 Ada berapa aplikasi?

| Komponen | Jumlah awal | Fungsi | Terlihat oleh pengguna? |
| --- | ---: | --- | --- |
| **Next.js web app** | **1** | Semua portal dan dashboard; layout serta navigasi menurut peran | Ya, satu aplikasi/URL utama |
| **NestJS API** | **1** | Autentikasi, otorisasi, aturan bisnis, transaksi, audit, integrasi | Tidak langsung |
| **Worker** | **1 proses/deployment** | Impor, notifikasi, ekspor, sinkronisasi, perhitungan laporan | Tidak langsung |
| **PostgreSQL** | **1 cluster/database awal** | Data transaksional melalui Prisma | Tidak |
| **Object storage privat** | **1 layanan** | Dokumen, lampiran, rapor, bukti pembayaran | Tidak langsung |
| **Agen Windows** | **opsional, tahap lanjut** | Telemetri dan tindakan pada PC/lab | Dipasang pada perangkat terkelola |

Jadi, **1 aplikasi yang diakses manusia**; secara operasional ada **3 komponen aplikasi** (web, API, worker). Agen Windows menjadi komponen keempat hanya jika poin 19 benar-benar dikerjakan. Android/iOS native belum diperlukan pada tahap awal: portal siswa, wali, guru, keamanan, teknisi, dan pengemudi memakai web responsif. Kebutuhan offline, kamera/NFC, push, serta uji lapangan menentukan apakah aplikasi native/PWA dibutuhkan kemudian.

Saya menyarankan **modular monolith NestJS**: satu deploy API, tetapi feature module dan pemilik data dipisahkan. Ini mengurangi kompleksitas integrasi antarlayanan pada satu sekolah, sambil menjaga batas yang jelas untuk pemisahan di masa depan. Modul NestJS memang dirancang untuk mengelompokkan kemampuan terkait dan mengekspor antarmuka provider secara eksplisit: [dokumentasi NestJS](https://docs.nestjs.com/modules).

### A.2 Topologi logis

```mermaid
flowchart LR
    U[Browser desktop / tablet / ponsel] --> E[HTTPS edge / reverse proxy]
    E --> W[Next.js web app]
    W -->|API terautentikasi| A[NestJS API modular]
    A --> P[(PostgreSQL + Prisma)]
    A --> O[(Object storage privat)]
    A --> Q[(Antrian pekerjaan)]
    Q --> K[NestJS worker]
    K --> P
    K --> O
    K --> N[Email / push / gateway pembayaran]
    D[QR / NFC / gerbang / absensi / CCTV metadata] --> I[Integration gateway]
    I --> A
    X[Agen Windows opsional] --> I
```

**Batas jaringan:** hanya edge/web dan endpoint API yang diperlukan browser/perangkat yang dibuka ke luar. PostgreSQL, object storage privat, worker, dan dashboard observabilitas tetap di jaringan privat. Perangkat sekolah memakai autentikasi perangkat dan endpoint integrasi khusus. File privat diberikan melalui URL sementara setelah pemeriksaan hak.

`Integration gateway` pada diagram adalah modul/adaptor di dalam deployment NestJS API pada tahap awal, bukan aplikasi atau server tambahan.

**Data dan pekerjaan latar:** transaksi penting disimpan terlebih dahulu di PostgreSQL, kemudian event/outbox memicu worker. Pengiriman pesan, impor, callback gateway, serta sinkronisasi perangkat harus idempoten. Worker dapat memakai antrean berbasis database pada volume awal; pilihan teknologi antrean final ditentukan setelah beban dan kebutuhan retry diukur. Jika memakai connection pool, jalur aplikasi/worker dan jalur migrasi/admin perlu dikonfigurasi sesuai penyedia PostgreSQL; lihat [panduan koneksi Prisma](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections).

**Keamanan:** autentikasi terpusat, sesi aman, RBAC ditambah scope data (anak, kelas, unit, kasus, gedung), audit tindakan sensitif, backup terenkripsi dan uji restore. Modul keselamatan, UKS/konseling, lokasi, dan keuangan memiliki kebijakan field/file yang lebih ketat. Admin teknis tidak otomatis berhak melihat isi sensitif.

**Lingkungan:** development, staging, dan production terpisah. Staging memakai data sintetis atau data yang telah disamarkan. Migrasi Prisma, backup, dan restore diuji sebelum rilis. Log terstruktur memakai `requestId`; metrik mencakup latensi API, kegagalan job, koneksi database, kesehatan perangkat, dan kesegaran data dashboard.

### A.3 Struktur aplikasi web dan URL

```text
apps/web/app/
  (public)/login
  (portal)/admin/...
  (portal)/management/...
  (portal)/academics/...
  (portal)/teacher/...
  (portal)/staff/...
  (portal)/student/...
  (portal)/guardian/...
  (portal)/finance/...
  (portal)/security/...
  (portal)/operations/...
```

Route Groups dipakai untuk organisasi/layout tanpa menjadi bagian URL. Nested layout berbagi shell; Dynamic Routes mewakili objek. Parallel dan Intercepting Routes dipakai selektif untuk modal detail dari daftar, dengan halaman penuh saat URL dibuka langsung/refresh. Filter, sort, halaman tabel, tab penting, dan periode masuk query string. Browser Back/Forward memulihkan daftar atau modal. Pola ini didukung oleh [Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) dan [Intercepting Routes](https://nextjs.org/docs/app/api-reference/file-conventions/intercepting-routes) pada Next.js.

### A.4 Modul backend dan kepemilikan data

| Kelompok NestJS | Sumber data yang dimiliki | Membaca/merujuk ke |
| --- | --- | --- |
| Identity + School | User, Role, Person, Student, Employee, Guardian, tahun ajaran, rombel, gedung/ruang | Fondasi seluruh modul |
| Academics | Kurikulum, jadwal, tugas, nilai, rapor | Siswa, guru, kelas, ruang |
| Attendance + Staff | Sesi/record absensi, jadwal kerja, cuti | Jadwal, penempatan, pegawai |
| Guardian + Communications | Preferensi portal, pengumuman, pesan, notifikasi | Hubungan wali dan event modul |
| Finance | Plan biaya, tagihan, pembayaran, alokasi | Siswa, wali, kegiatan |
| Operations | Fasilitas, aset, perpustakaan, transportasi, kantin | Lokasi, orang, keuangan |
| Safety + Care | Laporan/kasus, UKS, konseling, lokasi sesuai kebijakan | Identitas minimum, petugas |
| Reporting + Integration | Snapshot metrik, audit integrasi, device event | Event dari modul pemilik |

Satu tabel mempunyai pemilik proses yang jelas. Modul lain menggunakan service/kontrak atau event, bukan mengubah tabel domain lain secara langsung. Prisma schema dapat dipisah per file/domain bila tooling proyek mendukung, tetapi tetap satu migration history yang ditinjau bersama.

## B. Dashboard yang perlu disiapkan

### B.1 Jumlah

Rekomendasi target adalah **15 konfigurasi beranda** dalam satu Next.js app. Setiap konfigurasi memakai komponen bersama (kartu tindakan, tabel, kalender, notifikasi), tetapi memilih data, izin, urutan, dan tampilan yang cocok untuk pekerjaan peran tersebut. Pengguna dengan beberapa peran dapat berpindah konteks; backend selalu memeriksa scope objek.

Untuk **MVP operasional**, bangun **7 konfigurasi terlebih dahulu**: Admin Sekolah, Kepala Sekolah, Kurikulum, Guru/Wali Kelas, Staf, Siswa, dan Wali. Dashboard domain lanjutan ditambahkan seiring modulnya siap. Halaman detail modul tetap memiliki URL sendiri; jumlah dashboard tidak sama dengan jumlah seluruh halaman.

### B.2 Matriks peran dan perangkat

| No. | Konfigurasi beranda | Peran yang dilayani | Isi/action utama | Prioritas perangkat | Tahap |
| ---: | --- | --- | --- | --- | --- |
| 1 | Admin sekolah | Admin, operator data | Verifikasi wali, siswa belum ditempatkan, akun, impor, arsip | Desktop utama; tablet pendamping | MVP |
| 2 | Manajemen | Kepala sekolah, pimpinan | KPI terdefinisi, persetujuan, alert, laporan | Desktop utama; mobile ringkasan | MVP |
| 3 | Kurikulum | Wakil kepala sekolah, admin akademik | Jadwal bentrok, penugasan guru, nilai/rapor belum lengkap | Desktop utama | MVP |
| 4 | Guru dan wali kelas | Guru mapel, wali kelas | Jadwal hari ini, absensi, tugas/nilai, tindak lanjut rombel | Desktop + mobile setara untuk tugas harian | MVP |
| 5 | Staf | Staf non-guru | Shift, tugas, hadir, izin/cuti, pengumuman | Mobile utama; desktop tersedia | MVP |
| 6 | Siswa | Siswa | Jadwal, tugas dekat tenggat, pengumuman, hasil terbit | Mobile utama; desktop tersedia | MVP |
| 7 | Wali | Orang tua/wali | Pemilih anak, absensi, tagihan, pesan, izin | Mobile utama; desktop tersedia | MVP |
| 8 | Keuangan | Petugas/kepala keuangan | Tagihan, pembayaran, rekonsiliasi, piutang | Desktop utama; mobile ringkasan | Lanjutan |
| 9 | Keamanan | Petugas/koordinator keamanan | Tamu aktif, izin keluar, alarm, anomali gerbang | Tablet di pos + mobile; desktop koordinator | Lanjutan |
| 10 | Fasilitas dan teknisi | Pengelola fasilitas, teknisi | Booking/ruang ditutup, tiket, work order | Desktop pengelola; mobile teknisi | Lanjutan |
| 11 | Perpustakaan | Pustakawan | Pinjaman/kembali, reservasi, terlambat, katalog | Desktop atau tablet loket | Lanjutan |
| 12 | UKS dan konseling | Petugas UKS, konselor | Kunjungan/janji/tindak lanjut sesuai penugasan | Desktop utama; tablet privat opsional | Lanjutan |
| 13 | Transportasi | Koordinator, pengemudi, pendamping | Rute/kursi/manifest untuk koordinator; naik/turun untuk petugas lapangan | Desktop koordinator; mobile lapangan | Lanjutan |
| 14 | Kantin dan layanan | Tenant, kasir, petugas layanan | Menu/pesanan atau tiket layanan sesuai peran | Tablet kasir + mobile; desktop pengelola | Lanjutan |
| 15 | IT sekolah | Admin IT, teknisi lab | Perangkat offline, alert, diagnosis, action menunggu | Desktop utama; mobile alert | Lanjutan |

**Catatan batas akses:** UKS dan konselor boleh memakai shell/desain beranda yang sama, tetapi widget, daftar, dan data record tetap dipisahkan oleh izin. Begitu juga koordinator transportasi versus pengemudi, pengelola fasilitas versus teknisi, serta tenant versus petugas layanan. Jika uji pengguna menunjukkan alur mereka terlalu berbeda, satu konfigurasi dapat dipecah tanpa membuat aplikasi baru.

### B.3 Bentuk desktop dan mobile

| Tipe pekerjaan | Bentuk yang disarankan |
| --- | --- |
| Data padat: master data, nilai, rekonsiliasi, laporan, IT | Desktop first; tabel TanStack dengan filter/pagination server dan ekspor berizin |
| Lapangan: absensi kelas, gerbang, perbaikan, manifest bus | Mobile/tablet first; satu tindakan utama per layar, tombol besar, status koneksi jelas |
| Keluarga dan siswa: jadwal, tugas, izin, pembayaran | Mobile first; desktop tetap lengkap |
| Manajemen | Desktop untuk analisis; mobile untuk ringkasan dan persetujuan sederhana |

Semua halaman tetap responsif, bukan dua codebase. Jangan memaksa tabel desktop menjadi tabel sangat lebar di ponsel: tampilkan kolom prioritas, kartu ringkas, dan halaman detail. Loading, empty, error, akses ditolak, data usang, dan transaksi menunggu harus berbeda. Agentation dipakai untuk inspeksi UI selama pengembangan.

### B.4 MVP dan urutan rilis yang realistis

1. **Fondasi:** identitas, hak peran/scope, master sekolah/orang, tahun ajaran/kelas, audit, file privat.
2. **MVP harian:** jadwal, absensi kelas, pengumuman, dashboard guru/siswa/wali/admin/manajemen.
3. **Akademik lengkap:** tugas, penilaian, rapor, kalender dan koreksi.
4. **Operasional:** keuangan, perpustakaan, fasilitas, aset, kegiatan, transportasi, kantin.
5. **Fitur berisiko/berperangkat:** safeguarding/SOS, UKS/konseling, lokasi, gerbang/CCTV, agen Windows—setelah SOP, petugas, privasi, dan pilot siap.

Rilis poin 5 bukan berarti keselamatan siswa ditunda secara operasional: sekolah harus punya kanal dan SOP bantuan sejak awal. Implementasi digital penuh baru aman setelah alur respons nyata tersedia.

## C. Daftar isi modul rinci

"""


def promote_headings(markdown: str, number: int, title: str) -> str:
    lines = markdown.splitlines()
    # The standalone H1 is replaced with a numbered H2. All other headings
    # shift one level deeper so the master note has one H1.
    first_h1 = next((i for i, line in enumerate(lines) if line.startswith("# ")), None)
    if first_h1 is None:
        raise ValueError(f"Missing H1 in module {number}: {title}")
    lines[first_h1] = f"## {number:02d}. {title}"
    for i, line in enumerate(lines):
        if i != first_h1 and re.match(r"^#{2,6} ", line):
            lines[i] = "#" + line
    return "\n".join(lines).strip()


def build() -> None:
    toc = [
        f"- [{i:02d}. {title}](#{i:02d}-{re.sub(r'[^a-z0-9 -]', '', title.lower()).replace(' ', '-')})"
        for i, (_filename, title) in enumerate(MODULES, 1)
    ]
    parts = [INTRO.rstrip(), "\n".join(toc), ""]
    for i, (filename, title) in enumerate(MODULES, 1):
        source = DOCS / filename
        body = source.read_text(encoding="utf-8-sig")
        parts.extend([
            "---",
            "",
            promote_headings(body, i, title),
            "",
            f"*Sumber edit: [{filename}]({filename}).*",
            "",
        ])
    TARGET.write_text("\n".join(parts).rstrip() + "\n", encoding="utf-8")
    print(f"Wrote {TARGET.name}: {len(MODULES)} modules, {TARGET.stat().st_size:,} bytes")


if __name__ == "__main__":
    build()
