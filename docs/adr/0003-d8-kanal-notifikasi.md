# ADR 0003: Notifikasi dalam aplikasi dulu (D8)

- **Status:** Diterima
- **Tanggal:** 20 November 2026
- **Diputuskan oleh:** pemilik produk (jawaban "Dalam aplikasi dulu" saat memulai R1)

## Konteks

PRD D8 meminta keputusan kanal notifikasi, penyedia, biaya, dan preferensi penerima. Email, SMS, WhatsApp, dan push butuh penyedia berbayar, kebijakan isi pesan, dan uji pengiriman.

## Keputusan

R1 memakai **notifikasi dalam aplikasi** saja: lonceng di header, halaman Notifikasi, dan tanda baca per pengguna. Struktur data sudah disiapkan untuk kanal lain.

## Alasan

Tanpa biaya dan dependensi penyedia, bisa diuji saat pilot, dan tidak mengirim data siswa ke pihak ketiga sebelum ada kebijakannya.

## Konsekuensi

- Skema: `notification_event` (`sourceEventId` unik), `notification` (kolom `channel`: `IN_APP`/`EMAIL`/`PUSH`), `delivery_attempt`, `read_receipt`.
- Kode: `apps/api/src/communications/notifications.service.ts`. Kanal baru cukup menambah adapter yang membuat `notification` untuk kanal tersebut dan mencatat `delivery_attempt`.
- PRD FR-7.4 (email/push) dan FR-7.5 (preferensi kanal) ditunda sampai keputusan lanjutan.
- Pengguna harus membuka aplikasi untuk melihat notifikasi; sekolah perlu menyampaikan ini saat pilot.

## Masih terbuka

- Penyedia email/push, biaya, dan isi pesan eksternal. Pesan eksternal tidak boleh memuat data sensitif (PRD E7).
