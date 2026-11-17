"""Landscape, illustrated process infographics for all 21 Smart School modules."""

from __future__ import annotations

from html import escape
from pathlib import Path
import sys
import textwrap
import xml.etree.ElementTree as ET
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_infographics import BRIEFS  # titles, descriptions, and document slugs

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "infographics"
OUT.mkdir(exist_ok=True)

# Each stage: actor, action, explanation, object, illustrated prop.
FLOWS = [
    [
        ("Admin sekolah", "Daftarkan", "Input profil sekolah, siswa, pegawai, dan wali.", "Profil & identitas", "form"),
        ("Operator data", "Validasi", "Periksa duplikasi dan verifikasi hubungan wali.", "Data terverifikasi", "check"),
        ("Admin akademik", "Tempatkan", "Tetapkan tahun ajaran, rombel, serta jabatan.", "Penempatan aktif", "building"),
        ("Pengguna", "Akses layanan", "Akun aktif menurut peran; perubahan tetap terlacak.", "Akun & audit", "screen"),
    ],
    [
        ("Tim kurikulum", "Susun rencana", "Pilih kurikulum, mapel, guru, dan alokasi jam.", "Rencana belajar", "book"),
        ("Admin akademik", "Terbitkan jadwal", "Periksa benturan guru, rombel, dan ruang.", "Jadwal terbit", "calendar"),
        ("Guru", "Ajar & nilai", "Kelola tugas, ujian, rubrik, dan nilai draf.", "Nilai terverifikasi", "form"),
        ("Wali kelas", "Terbitkan rapor", "Periksa kelengkapan dan buat snapshot resmi.", "Rapor digital", "document"),
    ],
    [
        ("Siswa", "Buka beranda", "Lihat agenda, jadwal, tugas, dan pengumuman.", "Agenda pribadi", "phone"),
        ("Siswa", "Kerjakan tugas", "Kirim pekerjaan dan terima bukti waktu.", "Kiriman tugas", "upload"),
        ("Guru", "Publikasikan hasil", "Nilai dan umpan balik tampil setelah diterbitkan.", "Hasil belajar", "screen"),
        ("Siswa", "Ajukan layanan", "Minta koreksi atau bantuan dan pantau status.", "Tiket layanan", "ticket"),
    ],
    [
        ("Admin SDM", "Tetapkan tugas", "Susun shift, piket, jabatan, dan tugas tambahan.", "Penugasan aktif", "calendar"),
        ("Guru & staf", "Jalankan jadwal", "Lihat sesi mengajar, kerja, dan tanggung jawab.", "Agenda kerja", "screen"),
        ("Guru & staf", "Catat & ajukan", "Rekam hadir, cuti, izin, atau koreksi.", "Catatan kehadiran", "form"),
        ("Atasan", "Tinjau", "Setujui izin, cek beban kerja, dan evaluasi.", "Keputusan & evaluasi", "check"),
    ],
    [
        ("Guru", "Buka sesi", "Daftar peserta mengikuti penempatan pada tanggal sesi.", "Sesi absensi", "calendar"),
        ("Guru / perangkat", "Catat event", "Input status siswa atau check-in pegawai.", "Event kehadiran", "scan"),
        ("Petugas absensi", "Verifikasi", "Periksa anomali, izin, dan koreksi beralasan.", "Status final", "check"),
        ("Wali / manajemen", "Terima hasil", "Lihat rekap dan notifikasi sesuai hak.", "Rekap & pesan", "bell"),
    ],
    [
        ("Siswa / wali", "Kirim laporan", "Ceritakan kejadian atau minta bantuan darurat.", "Laporan / SOS", "phone"),
        ("Petugas triase", "Nilai urgensi", "Terima laporan dan cek konflik kepentingan.", "Keputusan triase", "shield"),
        ("Pemilik kasus", "Tindak lanjuti", "Catat tindakan, rujukan, dan eskalasi.", "Timeline kasus", "form"),
        ("Pelapor", "Pantau aman", "Terima status yang aman tanpa detail internal.", "Status & bantuan", "message"),
    ],
    [
        ("Siswa / tamu", "Datang", "Tunjukkan identitas atau kredensial di gerbang.", "Kartu / registrasi", "scan"),
        ("Petugas gerbang", "Verifikasi", "Periksa hak akses, tamu, kendaraan, atau izin.", "Keputusan akses", "shield"),
        ("Sistem", "Catat kejadian", "Simpan waktu masuk/keluar dan tandai anomali.", "Log akses", "document"),
        ("Koordinator", "Respons", "Tinjau alarm, penjemputan, dan insiden.", "Tindakan keamanan", "bell"),
    ],
    [
        ("Sensor kampus", "Deteksi sinyal", "QR, NFC, Wi-Fi, atau GPS memberi petunjuk zona.", "Sinyal bertimestamp", "scan"),
        ("Resolver", "Nilai kualitas", "Cocokkan identitas, waktu, sumber, dan konflik.", "Zona terakhir", "map"),
        ("Petugas / wali", "Lihat sesuai hak", "Tampilkan zona, waktu, dan kesegaran.", "Status lokasi", "phone"),
        ("Petugas SOS", "Cari & bantu", "Gunakan petunjuk zona tanpa menunda respons.", "Tindak lanjut", "shield"),
    ],
    [
        ("Admin sekolah", "Verifikasi wali", "Hubungkan wali dan anak dengan hak per kategori.", "Hak per anak", "check"),
        ("Wali", "Pilih anak", "Buka jadwal, nilai terbit, absensi, dan tagihan.", "Dashboard anak", "phone"),
        ("Wali", "Beri tindakan", "Ajukan izin, bayar tagihan, atau kirim pesan.", "Permintaan / bayar", "form"),
        ("Sekolah", "Tindak lanjuti", "Putuskan permintaan dan kirim status yang aman.", "Keputusan & notifikasi", "bell"),
    ],
    [
        ("Admin keuangan", "Susun biaya", "Tetapkan rencana biaya dan pratinjau siswa.", "Rencana biaya", "form"),
        ("Petugas keuangan", "Terbitkan", "Buat tagihan bernomor dengan snapshot nominal.", "Tagihan", "document"),
        ("Wali / gateway", "Bayar", "Kirim pembayaran; tunggu konfirmasi backend.", "Pembayaran", "phone"),
        ("Petugas keuangan", "Rekonsiliasi", "Alokasikan dana, cocokkan, dan terbitkan bukti.", "Kuitansi & laporan", "check"),
    ],
    [
        ("Pustakawan", "Kelola koleksi", "Daftarkan judul, eksemplar, dan sumber digital.", "Katalog & barcode", "book"),
        ("Siswa / staf", "Cari & reservasi", "Lihat ketersediaan dan antrean peminjaman.", "Reservasi", "phone"),
        ("Pustakawan", "Pinjamkan", "Periksa kuota lalu catat eksemplar dan jatuh tempo.", "Pinjaman aktif", "scan"),
        ("Peminjam", "Kembalikan", "Kondisi, denda, dan antrean diperbarui.", "Riwayat & denda", "check"),
    ],
    [
        ("Pengelola", "Siapkan ruang", "Isi kapasitas, fasilitas, jam, dan syarat pakai.", "Profil ruang", "building"),
        ("Guru / staf", "Ajukan booking", "Pilih ruang, waktu, tujuan, dan peserta.", "Permintaan ruang", "calendar"),
        ("Sistem", "Periksa benturan", "Bandingkan jadwal kelas, booking, dan blok.", "Slot tersedia", "check"),
        ("Pengelola", "Setujui", "Terbitkan booking atau tangani ruang terdampak.", "Kalender fasilitas", "screen"),
    ],
    [
        ("Pengguna", "Lapor rusak", "Kirim lokasi, deskripsi, dan foto bila ada.", "Tiket kerusakan", "phone"),
        ("Koordinator", "Triase", "Nilai risiko, kaitkan aset, dan tetapkan teknisi.", "Work order", "form"),
        ("Teknisi", "Perbaiki", "Catat diagnosis, material, pekerjaan, dan hasil.", "Riwayat perbaikan", "tools"),
        ("Pengelola", "Verifikasi", "Tutup tiket atau buka kembali; perbarui ruang.", "Aset siap pakai", "check"),
    ],
    [
        ("Koordinator", "Terbitkan kegiatan", "Tentukan syarat, kapasitas, jadwal, pembina.", "Program kegiatan", "calendar"),
        ("Siswa / wali", "Daftar & setujui", "Siswa mendaftar; wali memberi izin bila wajib.", "Pendaftaran", "phone"),
        ("Pembina", "Kelola sesi", "Tetapkan peserta, daftar tunggu, dan kehadiran.", "Peserta & latihan", "form"),
        ("Koordinator", "Verifikasi hasil", "Catat kompetisi dan terbitkan prestasi.", "Prestasi terbit", "trophy"),
    ],
    [
        ("Tenant", "Perbarui menu", "Input hidangan, harga, dan ketersediaan.", "Menu & harga", "food"),
        ("Admin layanan", "Terbitkan", "Tinjau tenant, menu, serta layanan yang aktif.", "Katalog layanan", "check"),
        ("Siswa", "Pilih layanan", "Lihat menu atau ajukan permintaan nonkantin.", "Pesanan / tiket", "phone"),
        ("Petugas", "Selesaikan", "Penuhi pesanan atau tangani tiket; catat status.", "Hasil layanan", "ticket"),
    ],
    [
        ("Koordinator", "Rancang rute", "Tetapkan kendaraan, pengemudi, halte, kapasitas.", "Rute & jadwal", "bus"),
        ("Wali", "Daftarkan anak", "Pilih halte dan hari; tunggu persetujuan kursi.", "Pendaftaran", "phone"),
        ("Pendamping", "Catat perjalanan", "Gunakan manifest untuk merekam naik dan turun.", "Event naik/turun", "scan"),
        ("Wali", "Pantau status", "Terima perubahan jadwal dan status perjalanan anak.", "Notifikasi", "bell"),
    ],
    [
        ("Siswa / wali", "Minta bantuan", "Ajukan kunjungan UKS atau sesi konseling.", "Permintaan layanan", "phone"),
        ("Petugas UKS", "Catat layanan", "Rekam kunjungan, tindakan, dan rujukan perlu.", "Catatan UKS", "medical"),
        ("Konselor", "Lakukan sesi", "Kelola janji dan catatan terbatas.", "Catatan konseling", "message"),
        ("Petugas terkait", "Tindak lanjuti", "Bagikan data minimum dan pantau rujukan.", "Rujukan aman", "shield"),
    ],
    [
        ("Modul sumber", "Picu informasi", "Absensi, akademik, atau layanan kirim event.", "Event bisnis", "document"),
        ("Pusat komunikasi", "Pilih penerima", "Periksa audiens, hak wali, dan preferensi.", "Daftar penerima", "check"),
        ("Provider", "Kirim pesan", "In-app, email, atau push dengan isi minimum.", "Percobaan kirim", "bell"),
        ("Pengguna", "Buka & respons", "Masuk ke detail; status baca dan aksi dicatat.", "Bukti pengiriman", "phone"),
    ],
    [
        ("Admin IT", "Daftarkan PC", "Pasang agen Windows dan tetapkan lokasi lab.", "Perangkat terkelola", "screen"),
        ("Agen perangkat", "Kirim telemetri", "Heartbeat, resource, storage, dan jaringan.", "Sampel & alert", "network"),
        ("Teknisi", "Diagnosis", "Periksa masalah dan usulkan tindakan terbatas.", "Tiket / action", "tools"),
        ("Penyetuju", "Jalankan & audit", "Setujui perintah allowlist atau transfer aman.", "Hasil & audit", "shield"),
    ],
    [
        ("Pengguna", "Tulis catatan", "Buat rich text, gambar, tag, dan folder.", "Catatan versi 1", "note"),
        ("Sistem", "Sinkronkan", "Simpan versi; tandai gagal simpan atau konflik.", "Revisi & sync", "network"),
        ("Pemilik", "Bagikan", "Beri hak baca/edit kepada orang atau tim.", "Izin berbagi", "share"),
        ("Kolaborator", "Lanjutkan", "Edit sesuai hak atau pulihkan versi lama.", "Catatan terbaru", "note"),
    ],
    [
        ("Modul sekolah", "Kirim fakta", "Akademik, absensi, fasilitas, dan keuangan.", "Event sumber", "network"),
        ("Mesin metrik", "Hitung indikator", "Pakai definisi, periode, dan kualitas data.", "Snapshot metrik", "chart"),
        ("Manajemen", "Tinjau alert", "Lihat tren dan pekerjaan yang perlu tindakan.", "Alert operasional", "screen"),
        ("Kepala unit", "Tindak lanjuti", "Buka rincian sesuai izin dan catat keputusan.", "Tindakan & laporan", "check"),
    ],
]

assert len(FLOWS) == len(BRIEFS) == 21

PALETTES = [
    ("#155E63", "#D8EFF0"), ("#32558C", "#E1E9F5"), ("#416B52", "#E1EEE2"),
    ("#885341", "#F5E7DF"), ("#5B5D93", "#EBE9F6"), ("#9B4D4B", "#F7E5E3"),
    ("#425E78", "#E1ECF2"),
]
PAPER, INK, MUTED, BORDER = "#FBFAF6", "#14262F", "#52636B", "#C9D5D6"


def text(x, y, value, size=25, weight=400, fill=INK, anchor="start"):
    return (f'<text x="{x}" y="{y}" font-family="Arial, Helvetica, sans-serif" '
            f'font-size="{size}" font-weight="{weight}" fill="{fill}" '
            f'text-anchor="{anchor}">{escape(value)}</text>')


def wrap(x, y, value, width=29, size=27, step=37, fill=INK, weight=400):
    return "".join(text(x, y+i*step, line, size, weight, fill)
                   for i, line in enumerate(textwrap.wrap(value, width, break_long_words=False)))


def prop(kind, x, y, scale, accent):
    """Small bespoke vector objects; each stage pairs one with a human figure."""
    g = [f'<g transform="translate({x} {y}) scale({scale})" stroke="{INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">']
    if kind in ("form", "document", "ticket", "note"):
        g += ['<rect x="0" y="0" width="105" height="130" rx="8" fill="#fff"/>',
              f'<rect x="17" y="21" width="67" height="10" rx="4" fill="{accent}" stroke="none"/>',
              '<path d="M18 53h68 M18 72h60 M18 91h66" fill="none"/>']
        if kind == "ticket":
            g += ['<circle cx="91" cy="108" r="18" fill="#fff"/>', '<path d="M82 108l7 7 13-15" fill="none"/>']
    elif kind in ("phone", "upload"):
        g += ['<rect x="12" y="0" width="77" height="137" rx="13" fill="#fff"/>',
              f'<rect x="24" y="21" width="53" height="82" rx="4" fill="{accent}" stroke="none"/>',
              '<circle cx="50" cy="119" r="4" fill="#fff"/>']
        if kind == "upload":
            g += ['<path d="M51 80V49 M39 61l12-12 12 12" fill="none" stroke="#fff" stroke-width="5"/>']
    elif kind == "screen" or kind == "chart":
        g += ['<rect x="0" y="0" width="132" height="87" rx="8" fill="#fff"/>',
              '<path d="M66 87v25 M39 113h54" fill="none"/>']
        if kind == "chart":
            g += [f'<path d="M18 64l24-18 18 7 26-29 26 11" fill="none" stroke="{accent}" stroke-width="7"/>']
        else:
            g += [f'<rect x="18" y="19" width="96" height="48" rx="3" fill="{accent}" stroke="none"/>']
    elif kind == "calendar":
        g += ['<rect x="0" y="12" width="120" height="113" rx="8" fill="#fff"/>',
              f'<rect x="0" y="12" width="120" height="30" rx="8" fill="{accent}" stroke="none"/>',
              '<path d="M25 0v26 M91 0v26 M22 65h76 M22 89h76" fill="none"/>']
    elif kind == "book":
        g += [f'<path d="M4 23q30-18 57 0v102q-28-18-57 0z M61 23q30-18 57 0v102q-28-18-57 0z" fill="#fff"/>',
              f'<path d="M61 23v102 M18 47h29 M75 47h29" fill="none" stroke="{accent}" stroke-width="5"/>']
    elif kind == "building":
        g += ['<rect x="15" y="24" width="105" height="105" rx="3" fill="#fff"/>',
              f'<path d="M4 24l63-23 64 23" fill="none" stroke="{accent}" stroke-width="7"/>',
              '<path d="M32 47h18v20H32z M80 47h18v20H80z M53 88h28v41H53z" fill="none"/>']
    elif kind in ("check", "shield"):
        g += [f'<path d="M62 4l51 16v43q0 45-51 67Q11 108 11 63V20z" fill="#fff"/>',
              f'<path d="M38 67l18 18 34-39" fill="none" stroke="{accent}" stroke-width="9"/>']
    elif kind == "scan":
        g += ['<rect x="13" y="13" width="106" height="106" rx="9" fill="#fff"/>',
              f'<path d="M27 52V27h25 M80 27h25v25 M27 80v25h25 M80 105h25V80" fill="none" stroke="{accent}" stroke-width="7"/>',
              '<rect x="48" y="48" width="35" height="35" fill="#fff"/>']
    elif kind == "bell":
        g += [f'<path d="M24 93h88l-13-20V47q0-31-31-31T37 47v26z" fill="#fff"/>',
              f'<circle cx="68" cy="111" r="10" fill="{accent}"/>']
    elif kind == "message":
        g += ['<path d="M9 12h116v82H46l-26 24V94H9z" fill="#fff"/>',
              f'<path d="M28 37h78 M28 59h57" fill="none" stroke="{accent}" stroke-width="6"/>']
    elif kind == "map":
        g += ['<path d="M7 18l37-12 37 12 37-12v110l-37 12-37-12-37 12z" fill="#fff"/>',
              f'<path d="M44 6v110 M81 18v110" fill="none" stroke="{accent}" stroke-width="5"/>',
              f'<circle cx="74" cy="62" r="12" fill="{accent}"/>']
    elif kind == "tools":
        g += [f'<path d="M18 110L99 29 M74 18q22-18 41 0l-20 20-21-20z" fill="#fff" stroke="{accent}" stroke-width="10"/>']
    elif kind == "trophy":
        g += [f'<path d="M29 15h70v36q0 33-35 33T29 51z" fill="#fff"/>',
              f'<path d="M29 29H6q1 32 27 34 M99 29h23q-1 32-27 34 M64 84v29 M38 114h52" fill="none" stroke="{accent}" stroke-width="7"/>']
    elif kind == "food":
        g += [f'<ellipse cx="65" cy="77" rx="57" ry="42" fill="#fff"/>',
              f'<ellipse cx="65" cy="77" rx="38" ry="25" fill="{accent}" stroke="none"/>',
              '<path d="M9 5v105 M1 5v38 M18 5v38 M121 5v105" fill="none"/>']
    elif kind == "bus":
        g += [f'<rect x="0" y="21" width="137" height="90" rx="13" fill="{accent}"/>',
              '<rect x="13" y="36" width="110" height="39" rx="3" fill="#fff"/>',
              '<path d="M64 36v39" fill="none"/>',
              '<circle cx="32" cy="113" r="14" fill="#fff"/><circle cx="106" cy="113" r="14" fill="#fff"/>']
    elif kind == "medical":
        g += ['<rect x="9" y="15" width="112" height="104" rx="9" fill="#fff"/>',
              f'<path d="M65 36v62 M34 67h62" fill="none" stroke="{accent}" stroke-width="12"/>']
    elif kind == "network":
        g += [f'<circle cx="64" cy="18" r="15" fill="{accent}"/>',
              f'<circle cx="17" cy="104" r="15" fill="{accent}"/>',
              f'<circle cx="112" cy="104" r="15" fill="{accent}"/>',
              '<path d="M64 33L17 89 M64 33l48 56 M32 104h65" fill="none"/>']
    elif kind == "share":
        g += ['<circle cx="15" cy="67" r="15" fill="#fff"/><circle cx="104" cy="20" r="15" fill="#fff"/><circle cx="104" cy="113" r="15" fill="#fff"/>',
              f'<path d="M30 61l59-34 M30 73l59 33" fill="none" stroke="{accent}" stroke-width="7"/>']
    else:
        g += ['<circle cx="60" cy="60" r="52" fill="#fff"/>']
    g.append("</g>")
    return "".join(g)


def person(x, y, accent, variant):
    # A restrained editorial character, with varied hair/pose and skin tone.
    skins = ["#D59B78", "#B97958", "#E4B78D", "#9A654C"]
    skin = skins[variant % 4]
    shirt = accent
    hair = "#26343A"
    flip = -1 if variant % 2 else 1
    return (f'<g transform="translate({x} {y}) scale({flip} 1)">'
            f'<ellipse cx="0" cy="176" rx="76" ry="11" fill="#D3DEDD"/>'
            f'<path d="M-28 103l-13 65 M20 103l23 65" stroke="{INK}" stroke-width="17" stroke-linecap="round"/>'
            f'<path d="M-42 168h24 M24 168h26" stroke="#293944" stroke-width="10" stroke-linecap="round"/>'
            f'<path d="M-35 36q35-13 70 0l16 70q-44 20-102 0z" fill="{shirt}"/>'
            f'<path d="M-38 48l-32 44 M39 48l44 31" stroke="{skin}" stroke-width="17" stroke-linecap="round"/>'
            f'<circle cx="-70" cy="94" r="9" fill="{skin}"/><circle cx="83" cy="80" r="9" fill="{skin}"/>'
            f'<rect x="-12" y="18" width="24" height="28" rx="8" fill="{skin}"/>'
            f'<circle cx="0" cy="-7" r="38" fill="{skin}"/>'
            f'<path d="M-37-12q-2-42 37-42 37 0 39 38-22-15-39-18-16 15-37 22z" fill="{hair}"/>'
            f'<circle cx="-12" cy="-5" r="2.8" fill="{INK}"/><circle cx="13" cy="-5" r="2.8" fill="{INK}"/>'
            f'<path d="M-8 11q8 6 16 0" fill="none" stroke="{INK}" stroke-width="2"/>'
            '</g>')


def stage(x, y, number, actor, action, description, obj, icon, accent, tint):
    w, h = 515, 675
    s = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="22" fill="#FFFFFF" stroke="{BORDER}" stroke-width="2"/>',
         f'<rect x="{x}" y="{y}" width="{w}" height="18" rx="9" fill="{accent}"/>',
         f'<circle cx="{x+48}" cy="{y+65}" r="28" fill="{accent}"/>',
         text(x+48, y+75, str(number), 29, 700, "#FFFFFF", "middle"),
         text(x+97, y+73, actor.upper(), 23, 700, accent),
         f'<rect x="{x+27}" y="{y+115}" width="{w-54}" height="267" rx="17" fill="{tint}"/>',
         person(x+153, y+244, accent, number),
         prop(icon, x+282, y+160, 1.18, accent),
         text(x+31, y+443, action, 36, 700),
         wrap(x+31, y+495, description, width=32, size=26, step=36, fill=MUTED),
         f'<path d="M{x+31} {y+591}H{x+w-31}" stroke="{BORDER}" stroke-width="2"/>',
         text(x+31, y+633, "OBJEK", 19, 700, accent),
         text(x+123, y+633, obj, 25, 700)]
    return "".join(s)


def render(index, brief, flow):
    slug, title, subtitle, *_ = brief
    accent, tint = PALETTES[(index-1) % len(PALETTES)]
    x_positions = [75, 660, 1245, 1830]
    actors = list(dict.fromkeys(stage_data[0] for stage_data in flow))
    objects = [stage_data[3] for stage_data in flow]
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1350" viewBox="0 0 2400 1350" role="img" aria-labelledby="title desc">',
        f'<title id="title">{escape(title)} — alur Smart School {index:02d}</title>',
        f'<desc id="desc">Empat tahap dari {escape(flow[0][1])} sampai {escape(flow[-1][1])}. Pemeran: {escape(", ".join(actors))}. Objek: {escape(", ".join(objects))}.</desc>',
        f'<rect width="2400" height="1350" fill="{PAPER}"/>',
        f'<rect x="0" y="0" width="23" height="1350" fill="{accent}"/>',
        text(75, 76, "SMART SCHOOL  /  PETA ALUR", 23, 700, accent),
        text(2325, 76, f"MODUL {index:02d} / 21", 23, 700, accent, "end"),
        f'<path d="M75 102H2325" stroke="{BORDER}" stroke-width="2"/>',
        text(75, 199, title, 72, 700),
        text(75, 260, subtitle, 31, 400, MUTED),
        text(75, 329, "PEMERAN", 22, 700, accent),
    ]
    ax = 235
    for actor in actors:
        width = 56 + min(280, len(actor)*16)
        parts += [f'<rect x="{ax}" y="293" width="{width}" height="55" rx="28" fill="{tint}" stroke="{BORDER}"/>',
                  f'<circle cx="{ax+28}" cy="320" r="14" fill="{accent}"/>',
                  text(ax+51, 328, actor, 23, 600)]
        ax += width + 15
    parts.append(text(2325, 329, "4 LANGKAH  →  4 OBJEK", 21, 700, MUTED, "end"))
    for i, (x, data) in enumerate(zip(x_positions, flow), 1):
        parts.append(stage(x, 389, i, *data, accent, tint))
        if i < 4:
            arrow_x = x + 530
            parts += [f'<path d="M{arrow_x} 725h42" stroke="{accent}" stroke-width="8" stroke-linecap="round"/>',
                      f'<path d="M{arrow_x+43} 725l-17-14v28z" fill="{accent}"/>']
    parts += [
        f'<rect x="75" y="1101" width="2250" height="165" rx="18" fill="{accent}"/>',
        text(112, 1152, "JEJAK OBJEK", 22, 700, "#FFFFFF"),
    ]
    obj_x = 112
    for i, obj in enumerate(objects):
        if i:
            parts.append(text(obj_x-38, 1222, "→", 35, 700, "#D9EEEE"))
        parts += [f'<rect x="{obj_x}" y="1174" width="475" height="66" rx="10" fill="#FFFFFF" opacity="0.96"/>',
                  text(obj_x+237, 1217, obj, 25, 700, INK, "middle")]
        obj_x += 555
    parts += [
        text(75, 1314, "ALUR KONSEPTUAL • KEPUTUSAN DAN ATURAN LENGKAP ADA DI DOKUMEN MODUL", 19, 700, MUTED),
        text(2325, 1314, f"docs/{slug}.md", 19, 400, MUTED, "end"),
        "</svg>",
    ]
    path = OUT / f"{index:02d}_{slug}.svg"
    path.write_text("\n".join(parts), encoding="utf-8")
    ET.parse(path)
    return path


def main():
    paths = [render(i, brief, flow) for i, (brief, flow) in enumerate(zip(BRIEFS, FLOWS), 1)]
    index = ["# Infografis alur Smart School", "",
             "Setiap gambar berformat landscape (2400 × 1350 px), memperlihatkan pemeran, empat langkah, ilustrasi, dan objek yang bergerak di dalam proses.",
             "",
             "| No. | Modul | Gambar | Dokumen rinci |", "| --- | --- | --- | --- |"]
    for i, (slug, title, *_rest) in enumerate(BRIEFS, 1):
        index.append(f"| {i:02d} | {title} | [Buka SVG](infographics/{paths[i-1].name}) | [Baca detail]({slug}.md) |")
    for i, (_slug, title, *_rest) in enumerate(BRIEFS, 1):
        index += ["", f"## {i:02d}. {title}", "", f"![Alur {title}](infographics/{paths[i-1].name})"]
    (ROOT / "docs" / "infographics.md").write_text("\n".join(index) + "\n", encoding="utf-8")
    with zipfile.ZipFile(OUT / "smart_school_infographics_svg.zip", "w", zipfile.ZIP_DEFLATED) as z:
        for path in paths:
            z.write(path, path.name)
    print(f"Created {len(paths)} landscape flow infographics")


if __name__ == "__main__":
    main()
