"use client";

import { usePathname } from "next/navigation";
import { Widget } from "./widget";

type Guide = { title: string; points: string[] };

/** Panduan singkat per halaman. Pola dicocokkan berurutan; yang pertama cocok dipakai. */
const GUIDES: [RegExp, Guide][] = [
  [/^\/dashboard$/, { title: "Beranda", points: ["Widget di beranda menyesuaikan peran aktif.", "Angka dihitung langsung dari data saat halaman dibuka.", "Klik angka untuk membuka daftar terkait."] }],
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
  [/^\/guardian/, { title: "Anak saya", points: ["Hanya anak dengan hubungan wali terverifikasi yang tampil.", "Jadwal, kehadiran, dan pengumuman menyusul pada rilis berikutnya."] }],
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
