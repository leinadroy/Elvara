# Communication & Notification Center

Rancangan poin 18 dari [dokumen utama](smart_school_management_ecosystem.md). Modul ini menyatukan pengumuman, pesan resmi, notifikasi aplikasi, email/push, preferensi penerima, serta bukti pengiriman. Modul sumber menentukan alasan bisnis suatu pesan; pusat komunikasi menentukan penerima dan kanal sesuai hak.

## Cakupan dan peran

Admin komunikasi menerbitkan pengumuman; guru/wali kelas mengirim pesan sesuai penugasan; wali/siswa menerima pesan yang berhak; operator meninjau kegagalan pengiriman; admin sistem mengelola provider tanpa otomatis membaca isi pesan. Izin: `announcement.publish`, `message.send-assigned`, `notification.template.manage`, `delivery.retry`, `communication.export`. Hubungan wali dan penugasan guru diperiksa pada waktu kirim dan waktu membuka tautan.

## Pengumuman dan pesan

`Announcement` memuat judul, isi, audiens, penerbit, jadwal terbit/akhir, status draf/terjadwal/terbit/ditarik, serta versi. Perubahan audiens setelah terbit memerlukan audit. Tanda baca tidak sama dengan persetujuan. `MessageThread` memiliki topik, siswa/kelas terkait, peserta, status terbuka/ditutup, lampiran, dan kebijakan arsip. Pesan terhapus oleh pengguna dapat disembunyikan dari tampilan pribadi, tetapi retensi resmi mengikuti kebijakan. Batas jam respons dan eskalasi perlu ditetapkan.

## Notifikasi lintas modul

Modul sumber menerbitkan event internal dengan ID unik, tipe, subjek, konteks, dan template. Pusat komunikasi memeriksa penerima serta hak per kategori, memilih in-app/email/push, menerapkan preferensi dan jam tenang untuk pesan biasa, lalu mencatat setiap percobaan. Notifikasi keselamatan mendesak memiliki aturan tersendiri. Payload eksternal minim data pribadi; penerima membuka detail setelah login. Status terjadwal, terkirim ke provider, gagal, dibaca, dan tindakan selesai berbeda.

Retry memakai idempotency key agar satu event tidak menghasilkan pesan ganda. Provider error masuk antrean; fallback kanal hanya jika diizinkan. Perubahan hak wali sesudah pengiriman harus langsung membatasi akses tautan detail. Template berversi dan dapat dipratinjau dengan data contoh yang aman.

## Model data

| Entitas | Data penting | Constraint |
| --- | --- | --- |
| `Announcement`, `AudienceRule` | isi, target, jadwal, status | Versi publikasi |
| `MessageThread`, `Message` | peserta, konteks, isi, waktu | Akses peserta/scope |
| `NotificationEvent` | sourceEventId, type, targetRef | Idempoten |
| `Notification` | recipientId, channel, templateVersion, status | Satu target per aturan |
| `DeliveryAttempt` | providerRef, result, time | Riwayat retry |
| `ReadReceipt` | recipientId, itemId, readAt | Tidak berarti persetujuan |
| `CommunicationPreference` | recipient, category, channel | Hak khusus tetap berlaku |

UUID, UTC, indeks audiens/status/waktu, penerima, thread, dan source event ID. Worker/outbox memisahkan komit bisnis dari pengiriman.

## UI, URL, dan API

Halaman: `/communications/announcements?status=`, `/communications/announcements/[id]`, `/messages/[threadId]`, `/notifications`, `/communications/delivery?status=failed`, `/settings/notifications`. Query string menyimpan filter; detail pengumuman dapat memakai modal Intercepting/Parallel Routes dari daftar dan halaman penuh saat direct link/refresh. Back/Forward benar.

Endpoint: `GET/POST /api/v1/announcements`, `POST /api/v1/announcements/:id/publish`, `GET/POST /api/v1/message-threads`, `POST /api/v1/message-threads/:id/messages`, `GET /api/v1/notifications/me`, `POST /api/v1/notifications/:id/read`, `GET /api/v1/communications/delivery-attempts`. NestJS memeriksa audiens/scope dan DTO; event internal tidak diekspos sebagai endpoint publik umum.

Next.js App Router + TypeScript, Tailwind CSS + shadcn/ui, TanStack Table untuk pengumuman/delivery, Agentation untuk inspeksi. Loading, kosong, pengiriman tertunda/gagal, error, keyboard, dan mobile jelas.

## Kriteria penerimaan dan keputusan terbuka

Pengguna tidak melihat pengumuman di luar audiens; retry tidak mengirim ganda; hak wali dicabut menutup tautan lama; pesan eksternal tidak mengandung data sensitif; status provider dan baca berbeda; deep link/refresh/Back/Forward benar. Putuskan kanal, provider, biaya, jam tenang, pesan darurat, arsip, batas komunikasi guru-wali, dan persetujuan notifikasi.
