"""Shared Smart School module briefs; run generate_flow_infographics.py for images."""

from __future__ import annotations

from html import escape
from pathlib import Path
import textwrap
import zipfile


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "infographics"
OUT.mkdir(parents=True, exist_ok=True)

# Each brief is a deliberately short visual summary of its corresponding Markdown document.
# Card order: core capabilities, operating flow, data/controls, success checks.
BRIEFS = [
    ("school_administration_management", "Administrasi sekolah", "Satu data resmi untuk orang, organisasi, kelas, akun, dan arsip.",
     ["Profil sekolah, dua gedung, ruang, tahun ajaran", "Siswa, pegawai, wali: identitas dan status", "Rombel, penempatan, jabatan, akun, arsip"],
     ["Daftarkan dan validasi identitas", "Verifikasi wali dan tempatkan siswa", "Aktifkan akun; simpan riwayat perubahan"],
     ["Person terpisah dari User", "Enrollment bertanggal berlaku", "RBAC + scope; audit mutasi dan ekspor"],
     ["Tidak ada NIS aktif ganda", "Satu rombel utama per tanggal", "Hak wali dicabut segera"]),
    ("academic_management_system", "Manajemen akademik", "Kurikulum hingga rapor, dengan versi dan publikasi yang terlacak.",
     ["Kurikulum, mapel, penugasan guru", "Jadwal, tugas, ujian, buku nilai", "Rapor snapshot dan kalender akademik"],
     ["Susun kurikulum dan jadwal", "Nilai draf → diperiksa → terbit", "Validasi lalu terbitkan rapor"],
     ["TeachingAssignment mengikat guru–kelas", "Benturan guru, rombel, ruang diblokir", "Skema nilai dan rapor berversi"],
     ["Nilai draf tidak tampil ke siswa", "Nilai kosong ≠ nol", "Rapor terbit tidak berubah diam-diam"]),
    ("student_information_portal", "Portal siswa", "Jadwal, tugas, hasil belajar, dan layanan dalam satu tempat.",
     ["Beranda tindakan hari ini", "Profil, jadwal, tugas, nilai, absensi", "Kegiatan, pengumuman, layanan siswa"],
     ["Lihat agenda dan tenggat", "Kumpulkan tugas; terima bukti waktu", "Ajukan koreksi atau layanan; pantau status"],
     ["Data berasal dari modul pemilik", "Endpoint /me membatasi ke diri sendiri", "Hanya nilai dan rapor terbit"],
     ["URL siswa lain ditolak", "Status pending berbeda dari final", "Kartu tetap berguna saat satu sumber gagal"]),
    ("teacher_staff_management", "Guru & staf", "Penugasan, kehadiran, cuti, beban kerja, dan evaluasi.",
     ["Jadwal mengajar, shift, piket", "Kehadiran kerja dan koreksi", "Cuti, pengganti, beban kerja, evaluasi"],
     ["Terbitkan penugasan dan jadwal", "Catat hadir atau ajukan izin", "Tinjau beban kerja dan evaluasi"],
     ["Jadwal akademik tidak disalin", "Event check-in mentah tetap ada", "Rubrik evaluasi dan bobot berversi"],
     ["Benturan tugas terlihat", "Cuti dan pengganti punya status terpisah", "Evaluasi hanya untuk pihak berwenang"]),
    ("attendance_management_system", "Absensi", "Catatan siswa dan pegawai yang bisa diverifikasi dan dikoreksi.",
     ["Sesi kelas dan peserta efektif", "Check-in/out pegawai, anomali", "Izin, koreksi, rekap, notifikasi wali"],
     ["Buka sesi; isi dan tutup", "Verifikasi event dan anomali", "Koreksi beralasan; kirim notifikasi final"],
     ["Event perangkat ≠ status final", "Satu record aktif per siswa/sesi", "Dua waktu: kejadian dan diterima"],
     ["Belum diisi ≠ alpa", "Retry tidak menggandakan pesan", "Riwayat koreksi tetap tersedia"]),
    ("student_safety_safeguarding_system", "Keselamatan siswa", "Laporan rahasia dan bantuan darurat dengan penanggung jawab jelas.",
     ["Kanal laporan bullying/kekerasan", "Triase, kasus, tugas, eskalasi", "SOS dan pembaruan aman bagi pelapor"],
     ["Terima laporan dan beri bukti", "Triase urgensi; cek konflik kepentingan", "Tugaskan, tindak lanjuti, tutup/rujuk"],
     ["Akses hanya per penugasan", "Identitas dan lampiran dilindungi", "SOS terkirim ≠ diakui petugas"],
     ["Kasus tanpa pemilik masuk eskalasi", "Notifikasi tidak memuat narasi", "Fallback darurat teruji"]),
    ("campus_security_access_control", "Keamanan kampus", "Akses gerbang, tamu, penjemputan, alarm, dan insiden.",
     ["Titik akses, kartu/QR/NFC", "Registrasi tamu dan kendaraan", "Izin keluar, CCTV, alarm, insiden"],
     ["Verifikasi orang dan kredensial", "Catat masuk/keluar atau kunjungan", "Eskalasi anomali dan tutup insiden"],
     ["Event gerbang bukan absensi kelas", "Hak portal ≠ hak menjemput", "Rekaman CCTV akses khusus"],
     ["Penjemput diverifikasi fisik", "Perangkat offline terlihat", "Event duplikat tidak menggandakan log"]),
    ("student_location_campus_tracking", "Lokasi siswa", "Petunjuk zona terakhir dengan waktu, akurasi, dan batas kebijakan.",
     ["Zona dua gedung dan sumber sinyal", "Lokasi terakhir terdeteksi", "Akses petugas, wali, dan SOS terbatas"],
     ["Terima sinyal bertimestamp", "Resolusi zona dan kesegaran", "Tampilkan petunjuk sesuai hak"],
     ["Lokasi terakhir ≠ real-time", "Jam aktif dan retensi kebijakan", "Pencarian individual beralasan + audit"],
     ["Data usang diberi label", "Sensor offline membuat status tidak pasti", "Pilot akurasi di dua gedung"]),
    ("parent_guardian_portal", "Portal wali", "Satu portal untuk beberapa anak dengan hak yang berbeda.",
     ["Akademik, absensi, kalender", "Tagihan, pesan, pengumuman", "Izin, kegiatan, penjemputan, lokasi terbatas"],
     ["Verifikasi hubungan wali–anak", "Pilih anak dan lihat data terbit", "Ajukan izin, bayar, atau kirim pesan"],
     ["Hak per anak dan per kategori", "Lokasi dan penjemputan izin terpisah", "Cache batal saat hak dicabut"],
     ["Anak lain tak terbuka via URL", "Pembayaran menunggu konfirmasi", "Nama anak jelas saat mutasi"]),
    ("finance_payment_management", "Keuangan & pembayaran", "Dari rencana biaya sampai rekonsiliasi, tanpa kehilangan jejak uang.",
     ["Rencana biaya, tagihan, keringanan", "Pembayaran, alokasi, refund", "Rekonsiliasi, pengingat, laporan"],
     ["Pratinjau dan terbitkan tagihan", "Terima pembayaran terverifikasi", "Alokasikan, cocokkan, laporkan"],
     ["Decimal; bukan float", "Callback gateway idempoten", "Tagihan terbit pakai penyesuaian"],
     ["Sukses browser ≠ dana diterima", "Alokasi tidak melebihi pembayaran", "Refund tak menghapus transaksi awal"]),
    ("library_learning_resource_management", "Perpustakaan", "Katalog, eksemplar, pinjaman, reservasi, dan sumber digital.",
     ["Judul dan eksemplar berbarcode", "Peminjaman, kembali, perpanjangan", "Reservasi, denda, e-book"],
     ["Cari ketersediaan", "Checkout dengan kuota dan antrean", "Kembali; nilai kondisi dan denda"],
     ["Satu copy: satu pinjaman aktif", "Kebijakan pinjam berversi", "File digital privat berizin"],
     ["Pinjaman tidak ganda", "Antrean reservasi konsisten", "Peminjam hanya lihat miliknya"]),
    ("facility_campus_management", "Fasilitas kampus", "Ruang dan area dua gedung yang bisa direncanakan dan dipesan.",
     ["Ruang kelas, lab, lapangan, area umum", "Kapasitas dan jam tersedia", "Booking, blok perbaikan, utilisasi"],
     ["Pilih ruang dan waktu", "Periksa benturan serta syarat", "Setujui; beri tahu perubahan"],
     ["Jadwal kelas ikut perhitungan", "Booking berulang punya pengecualian", "Terpesan ≠ digunakan"],
     ["Tak ada booking bentrok", "Penutupan tampilkan dampak", "Kapasitas dan syarat lab diperiksa"]),
    ("maintenance_asset_management", "Aset & pemeliharaan", "Inventaris, tiket kerusakan, pekerjaan teknisi, dan perawatan.",
     ["Aset dan perpindahan lokasi", "Tiket, prioritas, work order", "Jadwal preventif dan ruang ditutup"],
     ["Laporkan kerusakan", "Triase dan tugaskan teknisi", "Perbaiki, verifikasi, buka kembali"],
     ["Tag aset unik", "Riwayat lokasi dan perbaikan", "Blok ruang terhubung fasilitas"],
     ["Tiket boleh tanpa ID aset", "Teknisi hanya tiket tugasnya", "Ruang berisiko tak bisa dipesan"]),
    ("extracurricular_school_activities", "Ekstrakurikuler", "Kegiatan, pendaftaran, latihan, persetujuan, dan prestasi.",
     ["Klub dan kegiatan sekolah", "Kapasitas, daftar tunggu, pembina", "Kehadiran latihan dan prestasi"],
     ["Terbitkan kegiatan", "Siswa daftar; wali setujui bila wajib", "Pembina pilih peserta dan catat sesi"],
     ["Kursi dijaga atomik", "Benturan jadwal diberi tanda", "Prestasi diverifikasi sebelum terbit"],
     ["Tak ada pendaftaran ganda", "Pelatih luar akses terbatas", "Absensi latihan ≠ absensi kelas"]),
    ("canteen_school_services", "Kantin & layanan", "Menu, tenant, transaksi opsional, dan permintaan layanan siswa.",
     ["Tenant, menu, harga, ketersediaan", "Pesanan/pembayaran bila diperlukan", "Katalog dan tiket layanan"],
     ["Tenant perbarui menu", "Admin terbitkan; siswa lihat", "Permintaan layanan ditangani petugas"],
     ["Harga transaksi disnapshot", "Tenant hanya mengelola miliknya", "Kasus sensitif kanal khusus"],
     ["Pesanan retry tak ganda", "Menu habis tidak bisa dipesan", "Siswa hanya lihat tiket sendiri"]),
    ("transportation_management", "Transportasi", "Rute, kursi, perjalanan, dan naik/turun siswa yang terlacak.",
     ["Kendaraan, pengemudi, halte", "Pendaftaran dan manifest", "Naik/turun, perubahan, notifikasi"],
     ["Susun rute dan jadwal", "Tetapkan kursi dan manifest", "Catat naik/turun; tutup perjalanan"],
     ["Kapasitas dijaga", "Manifest per perjalanan snapshot", "GPS kendaraan ≠ posisi siswa"],
     ["Event naik/turun tidak ganda", "Wali hanya lihat anak sendiri", "Manifest manual saat offline"]),
    ("health_counseling_management", "UKS & konseling", "Layanan siswa yang sensitif dengan akses dan rujukan terbatas.",
     ["Kunjungan UKS dan tindakan", "Janji serta sesi konseling", "Rujukan dan tindak lanjut"],
     ["Terima permintaan/kunjungan", "Petugas mencatat layanan", "Rujuk dan tindak lanjuti"],
     ["Catatan per penugasan", "Admin teknis bukan pembaca isi", "Akses darurat beralasan + audit"],
     ["Catatan tak bocor lewat URL", "Janji tak bentrok", "Rujukan hanya data minimum"]),
    ("communication_notification_center", "Komunikasi", "Pengumuman, pesan resmi, notifikasi, dan bukti pengiriman.",
     ["Pengumuman berdasar audiens", "Percakapan guru–wali", "In-app, email, push, preferensi"],
     ["Modul sumber kirim event", "Pilih penerima dan kanal", "Kirim, retry, catat hasil"],
     ["Event idempoten", "Terkirim ≠ dibaca", "Payload eksternal minim data"],
     ["Audiens tepat", "Retry tidak kirim ganda", "Hak dicabut menutup tautan lama"]),
    ("windows_utility_school_it_management", "IT sekolah", "Inventaris dan kesehatan perangkat dengan tindakan remote terkontrol.",
     ["PC Windows dan perangkat lab", "Resource, jaringan, storage, alert", "Diagnosis, tindakan, transfer lokal"],
     ["Daftarkan agen perangkat", "Pantau heartbeat dan anomali", "Setujui dan audit tindakan"],
     ["Agen Windows terpisah", "Perintah allowlist; bukan shell bebas", "Telemetri usang diberi label"],
     ["Token dicabut menghentikan akses", "Action beralasan dan diaudit", "Transfer diverifikasi hash"]),
    ("cross_platform_notes_collaboration", "Catatan & kolaborasi", "Catatan pribadi dan tim yang sinkron, berbagi, dan berversi.",
     ["Rich text dan gambar", "Folder, tag, berbagi", "Riwayat versi dan sync perangkat"],
     ["Buat dan simpan otomatis", "Bagikan per peran dan masa akses", "Pulihkan versi atau selesaikan konflik"],
     ["Owner/team dan share terpisah", "Offline harus jelas status sync", "Biometrik hanya jika didukung"],
     ["Edit tak hilang saat konflik", "Share dicabut segera", "Gagal simpan terlihat"]),
    ("school_command_center_analytics", "Command center", "Indikator lintas modul yang jelas sumber, definisi, dan kualitasnya.",
     ["Siswa/staf, akademik, absensi", "Fasilitas, keuangan, keamanan", "Alert, drill-down, laporan"],
     ["Kumpulkan event sumber", "Hitung snapshot metrik", "Tinjau alert dan tindak lanjut"],
     ["Definisi metrik berversi", "Agregat sensitif dilindungi", "Data usang punya label"],
     ["Setiap angka bisa ditelusuri", "Drill-down perlu izin baru", "Retry tidak gandakan alert"]),
]

COLORS = ["#B74835", "#3C6793", "#4A7A60", "#8A5A38", "#5C6F97", "#A04753", "#4D756F"]
INK, MUTED, PAPER, LINE = "#17242B", "#526068", "#F7F5F0", "#D9D7D0"


def t(x: float, y: float, value: str, size: int, weight=400, fill=INK, anchor="start"):
    return (f'<text x="{x}" y="{y}" font-family="Arial, Helvetica, sans-serif" '
            f'font-size="{size}" font-weight="{weight}" fill="{fill}" '
            f'text-anchor="{anchor}">{escape(value)}</text>')


def lines(x, y, items, width=43, size=25, step=43, color=INK):
    result = []
    yy = y
    for item in items:
        wrapped = textwrap.wrap(item, width=width, break_long_words=False)
        for part in wrapped:
            result.append(t(x, yy, part, size, fill=color))
            yy += step
        yy += 10
    return "".join(result)


def box(x, y, w, h, label, items, color, number):
    parts = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="4" fill="#FFFFFF" stroke="{LINE}"/>',
             f'<rect x="{x}" y="{y}" width="7" height="{h}" fill="{color}"/>',
             t(x + 33, y + 48, f"{number:02d} / {label.upper()}", 21, 700, color)]
    yy = y + 100
    for item in items:
        wrapped = textwrap.wrap(item, width=48, break_long_words=False)
        parts.append(f'<circle cx="{x+39}" cy="{yy-7}" r="4" fill="{color}"/>')
        for part in wrapped:
            parts.append(t(x + 60, yy, part, 22))
            yy += 30
        yy += 14
    return "".join(parts)


def infographic(index, brief):
    slug, title, subtitle, capabilities, flow, controls, checks = brief
    color = COLORS[(index - 1) % len(COLORS)]
    out = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-labelledby="title desc">',
        f'<title id="title">{escape(title)} — Smart School {index:02d}</title>',
        f'<desc id="desc">{escape(subtitle)} Empat bagian: kapabilitas, alur, kontrol data, dan bukti keberhasilan.</desc>',
        f'<rect width="1600" height="1000" fill="{PAPER}"/>',
        f'<rect x="0" y="0" width="20" height="1000" fill="{color}"/>',
        t(75, 72, "SMART SCHOOL / MODUL", 20, 700, color),
        t(1525, 72, f"{index:02d} / 21", 20, 700, color, "end"),
        f'<path d="M75 91 H1525" stroke="{INK}" stroke-width="2"/>',
        t(75, 177, title, 66, 700),
        t(75, 228, subtitle, 27, 400, MUTED),
        box(75, 290, 700, 266, "Kapabilitas", capabilities, color, 1),
        box(825, 290, 700, 266, "Alur kerja", flow, color, 2),
        box(75, 581, 700, 266, "Kontrol & data", controls, color, 3),
        box(825, 581, 700, 266, "Bukti keberhasilan", checks, color, 4),
        f'<path d="M75 892 H1525" stroke="{LINE}" stroke-width="2"/>',
        t(75, 934, "RINGKASAN VISUAL — BACA DOKUMEN MODUL UNTUK ATURAN LENGKAP", 17, 700, MUTED),
        t(1525, 934, f"docs/{slug}.md", 17, 400, MUTED, "end"),
        "</svg>",
    ]
    target = OUT / f"{index:02d}_{slug}.svg"
    target.write_text("\n".join(out), encoding="utf-8")
    return target


def main():
    paths = [infographic(i, brief) for i, brief in enumerate(BRIEFS, 1)]
    index = ["# Infografis Smart School", "",
             "Satu gambar SVG untuk setiap poin. SVG bersifat vektor, tajam saat diperbesar, dan dapat dibuka langsung di browser.",
             "",
             "| No. | Modul | Infografis | Dokumen rinci |", "| --- | --- | --- | --- |"]
    for i, (slug, title, *_rest) in enumerate(BRIEFS, 1):
        index.append(f"| {i:02d} | {title} | [Lihat SVG](infographics/{paths[i-1].name}) | [Dokumen rinci]({slug}.md) |")
    for i, (_slug, title, *_rest) in enumerate(BRIEFS, 1):
        index.extend(["", f"## {i:02d}. {title}", "",
                      f"![Infografis {title}](infographics/{paths[i-1].name})"])
    (ROOT / "docs" / "infographics.md").write_text("\n".join(index) + "\n", encoding="utf-8")
    with zipfile.ZipFile(OUT / "smart_school_infographics_svg.zip", "w", zipfile.ZIP_DEFLATED) as bundle:
        for path in paths:
            bundle.write(path, path.name)
    print(f"Generated {len(paths)} SVG files and docs/infographics.md")


if __name__ == "__main__":
    from generate_flow_infographics import main as flow_main

    flow_main()
