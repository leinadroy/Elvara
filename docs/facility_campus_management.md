# Facility & Campus Management

Rancangan poin 12 dari [dokumen utama](smart_school_management_ecosystem.md). Master gedung/lantai/ruang berasal dari [administrasi](school_administration_management.md); aset dan penutupan perbaikan dari [maintenance](maintenance_asset_management.md); jadwal kelas dari [akademik](academic_management_system.md).

## Cakupan dan pengguna

Modul mengelola profil ruang, kapasitas, ketersediaan, reservasi, kalender penggunaan, serta laporan utilisasi. Dua gedung direpresentasikan sebagai data. Pengelola fasilitas mengatur ruang; guru/staf mengajukan booking; admin akademik memesan ruang kelas; keamanan melihat agenda area yang perlu dijaga. Scope izin berdasarkan gedung/unit.

## Aturan bisnis

- Ruang kelas, lab, ruang guru, toilet, pantry, kantin, lapangan, dan area bersama mempunyai jenis dan status. Tidak semua area dapat dipesan.
- Profil ruang memuat lokasi, kapasitas, fasilitas, aksesibilitas, pengelola, jam tersedia, serta tanggal berlaku. Lab dapat mewajibkan petugas/ketentuan kapasitas khusus.
- Booking memuat pemohon, tujuan, peserta, waktu, ruang, kebutuhan peralatan, dan status draf/diajukan/disetujui/ditolak/dibatalkan/selesai.
- Persetujuan memeriksa benturan dengan booking lain, jadwal akademik terbit, blok perbaikan, serta buffer persiapan. Booking berulang memiliki seri dan pengecualian per tanggal.
- Penutupan ruang menandai seluruh jadwal terdampak untuk tindak lanjut; tidak menghapus booking otomatis. Perubahan terbit memberitahu pemilik kegiatan.
- Utilisasi terpesan dan penggunaan aktual dihitung terpisah. Tampilan peta tidak boleh menyatakan data aktual bila hanya booking yang tersedia.

## Alur utama

Pengelola menerbitkan profil/aturan → pemohon memilih waktu dan melihat konflik → pejabat berwenang memutuskan → booking tampil di kalender → penutupan/perubahan ruang memicu daftar kegiatan terdampak. Konflik serentak dicegah dengan transaksi dan version check.

## Model data

| Entitas | Data penting | Constraint |
| --- | --- | --- |
| `RoomProfile` | roomId, jenis, kapasitas, status | Ekstensi master ruang |
| `RoomAvailabilityRule` | jam, pengecualian, versi | Berlaku per periode |
| `RoomBooking` | roomId, startAt/endAt, owner, status | Tidak bentrok saat disetujui |
| `BookingSeries`, `Occurrence` | pola, tanggal, pengecualian | Riwayat kejadian |
| `RoomBlock` | ruang, periode, alasan, sourceRef | Blok perbaikan |
| `FacilityUsageEvent` | bookingId, waktu aktual | Opsional |

UUID, UTC, indeks ruang + rentang waktu, gedung, dan status. Persetujuan harus atomik.

## UI, URL, dan API

Halaman: `/facilities/buildings/[buildingId]`, `/facilities/rooms?buildingId=&type=`, `/facilities/rooms/[roomId]`, `/facilities/bookings?week=`, `/facilities/bookings/[bookingId]`. Query string menyimpan filter/waktu. Detail booking boleh menjadi modal Intercepting/Parallel Routes dari kalender; direct link/refresh membuka halaman penuh, Back/Forward benar.

Endpoint NestJS: `GET /api/v1/facilities/rooms`, `GET /api/v1/facilities/availability`, `POST /api/v1/facilities/bookings`, `POST /api/v1/facilities/bookings/:id/decisions`, `POST /api/v1/facilities/rooms/:id/blocks`. DTO, scope, 409 konflik, audit, dan pagination berlaku.

Next.js App Router + TypeScript, Tailwind CSS + shadcn/ui, TanStack Table, Agentation. Loading, kosong, ruang ditutup, konflik, mobile, dan keyboard diuji.

## Kriteria penerimaan dan keputusan terbuka

Booking disetujui bebas benturan; kapasitas dan syarat lab diperiksa; penutupan ruang memunculkan dampak; pengguna hanya mengubah booking sesuai hak; deep link dan Back/Forward bekerja. Putuskan prioritas akademik, buffer, persetujuan, booking berulang, dan penggunaan aktual.
