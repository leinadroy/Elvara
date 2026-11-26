# Arah Visual — Mengikuti PDF Elvara

## Pembacaan acuan

PDF acuan berformat landscape dengan komposisi editorial: garis burgundy tipis di sisi atas, penanda bab kecil, judul charcoal besar di kiri, paragraf singkat dan daftar terpilih, lalu ilustrasi kegiatan sekolah di bidang kanan yang dibingkai abu-abu sangat muda. Beberapa halaman memakai garis merah untuk menunjukkan aliran data antarpemeran. Halaman judul memberi kesan formal dan tenang.

Yang perlu dibawa ke produk adalah **hierarki, ketenangan, dan kejelasan alur**, bukan bentuk slide 16:9 secara literal. Antarmuka harus bekerja pada desktop dan mobile, sementara dokumen presentasi/wireframe dapat mengikuti komposisi landscape PDF.

## Token awal untuk eksplorasi UI

| Elemen | Arah awal | Pemakaian |
| --- | --- | --- |
| Latar utama | Putih hangat, contoh `#FFFFFF` / `#FAFAF8` | Halaman kerja yang bersih |
| Teks utama | Charcoal, contoh `#252A2E` | Judul dan isi |
| Teks sekunder | Abu slate, contoh `#5F6972` | Metadata dan keterangan |
| Aksen primer | Burgundy tua, contoh `#7C1025` | Brand, navigasi aktif, aksi utama |
| Aksen proses | Merah terkendali, contoh `#D72E3E` | Penghubung alur dan status tindakan, bukan semua elemen |
| Panel lembut | Abu sangat muda, contoh `#F5F6F7` | Ringkasan, ilustrasi, empty state |
| Garis | Abu netral, contoh `#D9DEE1` | Pemisah tipis |

Warna di atas adalah **perkiraan visual dari PDF**, bukan spesifikasi brand resmi. Nilai final diambil dari brand kit Elvara dan diuji kontrasnya. Merah untuk status error harus dibedakan dari merah brand/aksi.

## Pola layar

- **Dashboard desktop:** area judul dan konteks tahun ajaran di kiri atas; tindakan utama jelas; panel KPI ringkas; daftar pekerjaan dengan prioritas; ilustrasi hanya untuk onboarding/empty state, bukan memenuhi halaman operasional.
- **Halaman alur:** tampilkan pemeran, keputusan, objek yang berubah, dan status berikutnya. Gunakan garis/anak panah burgundy yang menghubungkan langkah, seperti pada PDF.
- **Formulir:** satu tugas utama per layar, label permanen, bantuan singkat, dan ringkasan sebelum tindakan berisiko.
- **Tabel:** TanStack Table dengan judul kolom, filter URL, jumlah hasil, status teks, dan row action yang jelas. Jangan menjadikan semua data sebagai kartu dekoratif.
- **Mobile:** susun informasi vertikal; tindakan hari ini muncul dulu. Ilustrasi kecil dan kontekstual, bukan gambar besar yang mendorong pekerjaan penting ke bawah.
- **Loading/empty/error:** gunakan ruang putih dan tipografi yang sama. Empty state memberi alasan dan aksi, error memberi langkah pemulihan serta `requestId`.

## Aset dan ilustrasi

Ilustrasi harus menggambarkan kegiatan sekolah nyata: guru di kelas, wali melihat pesan, petugas gerbang, pustakawan, teknisi, atau aliran antarobjek seperti izin/tagihan/rapor. Hindari ikon generik yang diulang untuk semua modul. Gunakan latar sekolah yang konsisten dengan dua gedung dan seragam/konteks lokal bila sekolah menyetujuinya. Logo, foto, dan ilustrasi dari PDF tidak disalin ke produk tanpa file sumber dan hak penggunaan yang jelas.

## Yang tidak diadopsi secara literal

Slide memiliki teks kecil dan ilustrasi lebar yang cocok untuk presentasi, tetapi kurang cocok untuk layar ponsel atau tabel operasional. Di produk, aksesibilitas, kontras, fokus keyboard, responsive layout, dan kepadatan informasi lebih penting daripada meniru komposisi slide secara persis. Visual di PDF mengarahkan mood dan narasi; komponen produk tetap mengikuti kebutuhan tugas.

## Uji desain sebelum implementasi

Uji satu layar desktop dan satu layar mobile untuk tiga alur representatif: guru mengisi absensi, wali melihat tagihan/izin, dan petugas keamanan memverifikasi penjemputan. Gunakan Agentation untuk mencatat isu UI dan verifikasi manual keyboard serta pembaca layar. Jika pola visual tidak membantu menyelesaikan tugas, sederhanakan.
