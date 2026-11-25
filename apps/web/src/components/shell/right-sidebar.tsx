"use client";

import { usePathname } from "next/navigation";
import { Widget } from "./widget";

type Guide = { title: string; points: string[] };

/** Panduan singkat per halaman. Pola dicocokkan berurutan; yang pertama cocok dipakai. */
const GUIDES: [RegExp, Guide][] = [
  [/^\/([a-z]+\/)?dashboard$/, { title: "Beranda", points: ["Widget di beranda menyesuaikan peran aktif.", "Angka dihitung langsung dari data saat halaman dibuka.", "Klik angka untuk membuka daftar terkait; buka Definisi untuk cara hitung dan sumbernya."] }],
  [/^\/teacher\/attendance\/sessions\//, { title: "Pengisian absensi", points: ["Ketuk H/I/S/A/T untuk tiap siswa; ketuk lagi untuk mengosongkan.", "Simpan kapan saja; catatan bisa diubah sampai pukul 23.59 hari sesi.", "Tutup sesi setelah semua terisi. Notifikasi alpa ke wali dikirim saat status final.", "Sesudah batas hari, ajukan koreksi beralasan untuk disetujui wali kelas."] }],
  [/^\/teacher\/grades\/[^/]+/, { title: "Buku nilai", points: ["Buat penilaian per komponen skema, lalu Isi nilai per siswa.", "Belum dinilai berbeda dari nol; Tidak mengumpulkan dihitung 0; Tidak berlaku tidak dihitung.", "Nilai baru terlihat siswa dan wali setelah penilaian diterbitkan.", "Mengubah nilai yang sudah terbit wajib beralasan dan tercatat di riwayat."] }],
  [/^\/teacher\/grades$/, { title: "Buku nilai saya", points: ["Satu kartu per kelas dan mapel yang Anda ajar.", "Bila skema nilai belum terbit, hubungi bagian kurikulum."] }],
  [/^\/teacher\/attendance\/corrections/, { title: "Koreksi absensi", points: ["Wali kelas memutuskan koreksi rombel binaannya; admin untuk semua rombel.", "Koreksi yang Anda ajukan sendiri diputuskan admin.", "Nilai lama, nilai baru, pengaju, dan pemutus tercatat."] }],
  [/^\/teacher\/attendance$/, { title: "Absensi hari ini", points: ["Daftar mengikuti jadwal terbit, termasuk pertemuan yang Anda gantikan.", "Pertemuan yang dibatalkan atau digantikan guru lain tidak bisa dibuka.", "Sesi tambahan dibuka wali kelas dari rombel binaannya."] }],
  [/^\/academics\/calendar/, { title: "Kalender akademik", points: ["Agenda baru tersimpan sebagai draf; hanya yang terbit tampil untuk siswa, wali, dan guru.", "Agenda yang beririsan dengan ujian atau libur ditandai untuk ditinjau.", "Agenda dibatalkan, bukan dihapus; perubahan agenda terbit tercatat di log audit."] }],
  [/^\/academics\/grading/, { title: "Skema nilai", points: ["Satu skema per mapel dan tingkat untuk satu semester; berlaku untuk semua guru mapel itu.", "Jumlah bobot harus tepat 100% sebelum terbit.", "Skema terbit tidak diubah. Untuk mengubah, buat versi baru; penilaian lama tetap memakai versi saat dibuat.", "Capaian pembelajaran dipakai guru untuk deskripsi rapor."] }],
  [/^\/academics\/setup/, { title: "Pengaturan akademik", points: ["Tingkat dan program diatur sekolah.", "Mapel nonaktif tidak bisa dipakai penugasan baru.", "Mengubah jam bel tidak menggeser jadwal yang sudah tersusun.", "Kolom terjadwal/target menunjukkan penugasan yang slotnya belum cukup."] }],
  [/^\/academics\/classes\/[^/]+$/, { title: "Data rombel", points: ["Header selalu terbuka; simpan lewat toolbar.", "Pindah kelas menutup penempatan lama sehari sebelumnya; riwayat tidak ditimpa.", "Ganti wali kelas dengan tanggal mulai; wali lama berakhir otomatis."] }],
  [/^\/academics\/classes$/, { title: "Rombel", points: ["Filter tingkat atau rombel tanpa wali kelas, lalu Terapkan.", "Klik judul kolom untuk mengurutkan.", "Satu siswa hanya punya satu rombel yang berlaku pada satu tanggal."] }],
  [/^\/academics\/timetable/, { title: "Jadwal pelajaran", points: ["Ubah jadwal lewat draf; jadwal terbit tetap berlaku sampai draf diterbitkan.", "Penerbitan ditolak selama masih ada benturan guru, rombel, atau ruang.", "Batal atau ganti guru untuk satu tanggal lewat Perubahan pertemuan, bukan dengan mengubah jadwal mingguan."] }],
  [/^\/academics\/attendance-recap/, { title: "Rekap absensi", points: ["Persentase = (Hadir + Terlambat) dibagi catatan yang sudah terisi.", "Sesi yang dibatalkan tidak dihitung.", "Wali kelas hanya melihat rombel binaannya."] }],
  [/^\/admin\/staff-schedule/, { title: "Jadwal tugas staf", points: ["Isi tugas per tanggal, jam, dan lokasi.", "Tugas yang bentrok untuk pegawai yang sama ditolak.", "Batalkan dengan alasan; tugas tidak dihapus agar riwayat tetap utuh.", "Pola jadwal mingguan otomatis menyusul bersama modul kehadiran pegawai."] }],
  [/^\/staff\/schedule/, { title: "Jadwal tugas saya", points: ["Menampilkan tugas hari ini sampai 14 hari ke depan.", "Tugas yang dibatalkan tetap tampil dicoret beserta alasannya.", "Hubungi tata usaha bila ada tugas yang belum tercatat."] }],
  [/^\/student\//, { title: "Portal siswa", points: ["Jadwal mengikuti versi yang sudah diterbitkan sekolah.", "Bila ada catatan kehadiran yang keliru, sampaikan ke wali kelas."] }],
  [/^\/messages\/announcements/, { title: "Pengumuman", points: ["Pengumuman hanya tampil untuk penerima yang dituju, diperiksa setiap kali dibuka.", "Pengumuman terjadwal terbit otomatis pada waktunya.", "Menarik pengumuman menyembunyikannya dari penerima; riwayat tetap tersimpan."] }],
  [/^\/messages\/notifications/, { title: "Notifikasi", points: ["Notifikasi alpa dikirim ke wali setelah status kehadiran final.", "Terkirim belum tentu dibaca; tanda baca tercatat per pengguna."] }],
  [/^\/admin\/students\/new$/, { title: "Siswa baru", points: ["Isi header lalu tekan Simpan pada toolbar.", "NIS tidak bisa diubah setelah disimpan; periksa dulu.", "Tab wali, dokumen, dan akun terbuka setelah data tersimpan."] }],
  [/^\/admin\/students\/[^/]+$/, { title: "Detail siswa", points: ["Header berisi data resmi siswa dan selalu terbuka untuk diubah.", "Simpan atau Batalkan perubahan lewat toolbar di atas.", "Tab Orang tua/wali: tautkan wali, lalu kirim tautan undangan. Wali baru melihat data setelah verifikasi.", "Tab Dokumen: hanya PDF/JPG/PNG, maks. 5 MB. Setiap unduhan tercatat."] }],
  [/^\/admin\/students$/, { title: "Daftar siswa", points: ["Cari nama, NIS, atau NISN; filter status lalu Terapkan.", "Klik judul kolom untuk mengurutkan.", "Pencarian dan halaman tersimpan di URL, jadi bisa dibagikan."] }],
  [/^\/admin\/employees\/(new|[^/]+)$/, { title: "Data pegawai", points: ["Nomor pegawai wajib; NIP boleh kosong untuk honorer.", "Akun portal dibuat lewat undangan di tab Akun.", "Peran (guru, kurikulum, dst.) diatur saat undangan atau di Akun pengguna."] }],
  [/^\/admin\/employees$/, { title: "Daftar pegawai", points: ["Filter Jenis untuk memisahkan guru dan staf.", "Klik nama untuk membuka detail."] }],
  [/^\/admin\/guardians/, { title: "Orang tua / wali", points: ["Email wajib agar wali bisa diundang.", "Tautan ke siswa dilakukan dari halaman detail siswa."] }],
  [/^\/admin\/corrections/, { title: "Pengajuan koreksi", points: ["Data resmi baru berubah setelah pengajuan disetujui.", "Bila data sudah berubah sejak diajukan, persetujuan ditolak sistem; tolak dan minta ajukan ulang.", "Penolakan wajib disertai alasan."] }],
  [/^\/admin\/imports/, { title: "Impor data", points: ["Gunakan templat CSV atau file Excel (.xlsx) dengan header yang sama.", "Baris bermasalah dilaporkan per baris; baris lain tetap diproses.", "Mengunggah file yang sama dua kali tidak membuat data ganda."] }],
  [/^\/admin\/school/, { title: "Gedung & ruang", points: ["Kode ruang unik per gedung.", "Ruang yang tidak dipakai dinonaktifkan, bukan dihapus."] }],
  [/^\/admin\/academic-years/, { title: "Tahun ajaran", points: ["Hanya satu tahun ajaran aktif.", "Tutup tahun berjalan sebelum mengaktifkan yang baru; tahun yang ditutup tidak bisa diaktifkan lagi."] }],
  [/^\/admin\/accounts/, { title: "Akun pengguna", points: ["Akun dinonaktifkan, bukan dihapus, agar riwayat tetap utuh.", "Reset verifikasi dua langkah bila pengguna kehilangan ponselnya."] }],
  [/^\/admin\/audit/, { title: "Log audit", points: ["Catatan tidak dapat diubah atau dihapus.", "Pakai kelompok aksi untuk menyaring."] }],
  [/^\/guardian/, { title: "Portal wali", points: ["Hanya anak dengan hubungan wali terverifikasi yang tampil.", "Pilih anak di bagian atas bila Anda wali lebih dari satu siswa.", "Notifikasi alpa dikirim setelah guru menutup sesi atau setelah hari sekolah berakhir."] }],
  [/^\/me\/security/, { title: "Keamanan akun", points: ["Ganti kata sandi mengakhiri sesi di perangkat lain.", "Verifikasi dua langkah memakai aplikasi autentikator (mis. Google Authenticator, Microsoft Authenticator)."] }],
  [/^\/me/, { title: "Profil saya", points: ["Data resmi diubah oleh tata usaha.", "Ajukan koreksi bila ada data yang salah; status pengajuan tampil di halaman ini."] }],
];

export function RightSidebar() {
  const pathname = usePathname();
  const guide = GUIDES.find(([re]) => re.test(pathname))?.[1];
  return (
    <div className="flex flex-col gap-3 p-3">
      <Widget id="guide" title="Panduan halaman">
        {guide ? (
          <div className="flex flex-col gap-2 px-1 text-sm">
            <p className="font-medium">{guide.title}</p>
            <ul className="flex list-disc flex-col gap-1.5 pl-4 text-muted-foreground">
              {guide.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="px-1 text-sm text-muted-foreground">Belum ada panduan untuk halaman ini.</p>
        )}
      </Widget>
      <Widget id="shortcuts" title="Pintasan keyboard" defaultOpen={false}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-1 text-sm">
          <dt>
            <kbd className="rounded border bg-muted px-1 text-xs">Ctrl K</kbd>
          </dt>
          <dd className="text-muted-foreground">Fokus ke kotak cari</dd>
          <dt>
            <kbd className="rounded border bg-muted px-1 text-xs">Esc</kbd>
          </dt>
          <dd className="text-muted-foreground">Tutup hasil cari / panel</dd>
        </dl>
      </Widget>
      <Widget id="help" title="Butuh bantuan?" defaultOpen={false}>
        <p className="px-1 text-sm text-muted-foreground">
          Hubungi tata usaha sekolah. Bila muncul pesan error, sebutkan <span className="font-medium text-foreground">kode permintaan</span> yang tertera.
        </p>
      </Widget>
    </div>
  );
}
