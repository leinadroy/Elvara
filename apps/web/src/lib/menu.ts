import type { Me, Permission, RoleKey } from "@smart-school/contracts";
import { homeFor } from "./areas";

export type MenuGroup = "Utama" | "Kelas & absensi" | "Akademik" | "Data induk" | "Sekolah" | "Pesan" | "Sistem" | "Akun saya";

type MenuDef = {
  href: string;
  label: string;
  group: MenuGroup;
  icon: MenuIcon;
  /** Kata kunci tambahan untuk kotak cari. */
  keywords?: string;
  permission?: Permission;
  /** Cukup salah satu izin ini. */
  anyPermission?: Permission[];
  roles?: RoleKey[];
  needsPerson?: boolean;
};

export type MenuIcon = "home" | "child" | "students" | "staff" | "family" | "users" | "building" | "calendar" | "upload" | "log" | "inbox" | "profile" | "lock" | "classes" | "timetable" | "attendance" | "settings" | "megaphone" | "bell" | "chart";

export type MenuItem = Pick<MenuDef, "href" | "label" | "group" | "icon" | "keywords">;

/** Satu sumber menu untuk sidebar dan kotak cari. Hanya menu yang diizinkan untuk peran aktif yang ditampilkan. */
const MENU: MenuDef[] = [
  { href: "/dashboard", label: "Beranda", group: "Utama", icon: "home", keywords: "dashboard ringkasan" },
  { href: "/guardian/children", label: "Anak saya", group: "Utama", icon: "child", roles: ["GUARDIAN"], keywords: "anak wali" },
  { href: "/guardian/attendance", label: "Kehadiran anak", group: "Utama", icon: "attendance", roles: ["GUARDIAN"], keywords: "absensi alpa izin sakit" },
  { href: "/guardian/grades", label: "Nilai anak", group: "Utama", icon: "chart", roles: ["GUARDIAN"], keywords: "nilai penilaian akademik" },
  { href: "/guardian/activities", label: "Tugas anak", group: "Utama", icon: "classes", roles: ["GUARDIAN"] },
  { href: "/guardian/reports", label: "Rapor anak", group: "Utama", icon: "chart", roles: ["GUARDIAN"] },
  { href: "/guardian/timetable", label: "Jadwal anak", group: "Utama", icon: "timetable", roles: ["GUARDIAN"], keywords: "jadwal pelajaran" },
  { href: "/student/timetable", label: "Jadwal saya", group: "Utama", icon: "timetable", roles: ["STUDENT"], keywords: "jadwal pelajaran" },
  { href: "/student/attendance", label: "Kehadiran saya", group: "Utama", icon: "attendance", roles: ["STUDENT"], keywords: "absensi" },
  { href: "/student/grades", label: "Nilai saya", group: "Utama", icon: "chart", roles: ["STUDENT"], keywords: "nilai penilaian akademik" },
  { href: "/student/activities", label: "Tugas saya", group: "Utama", icon: "classes", roles: ["STUDENT"] },
  { href: "/student/reports", label: "Rapor saya", group: "Utama", icon: "chart", roles: ["STUDENT"] },
  { href: "/staff/schedule", label: "Jadwal tugas saya", group: "Utama", icon: "calendar", roles: ["STAFF", "TEACHER"], needsPerson: true, keywords: "shift piket tugas staf" },
  { href: "/teacher/attendance", label: "Absensi hari ini", group: "Kelas & absensi", icon: "attendance", permission: "attendance:take", keywords: "absen presensi kelas jadwal mengajar" },
  { href: "/teacher/assessments", label: "Penilaian", group: "Akademik", icon: "chart", roles: ["TEACHER"], keywords: "nilai penilaian draf kelas mapel" },
  { href: "/teacher/reports", label: "Rapor rombel", group: "Akademik", icon: "chart", roles: ["TEACHER"] },
  { href: "/teacher/attendance/corrections", label: "Koreksi absensi", group: "Kelas & absensi", icon: "inbox", anyPermission: ["attendance:take", "attendance:manage"], keywords: "koreksi wali kelas" },
  { href: "/academics/attendance-recap", label: "Rekap absensi", group: "Kelas & absensi", icon: "chart", anyPermission: ["attendance:read", "attendance:take"], keywords: "rekap persentase kehadiran" },
  { href: "/academics/calendar", label: "Kalender akademik", group: "Akademik", icon: "calendar", permission: "classes:read", keywords: "agenda ujian libur rapor semester" },
  { href: "/academics/calendar", label: "Kalender akademik", group: "Utama", icon: "calendar", roles: ["TEACHER", "STAFF", "STUDENT", "GUARDIAN"], keywords: "agenda ujian libur rapor semester" },
  { href: "/academics/classes", label: "Rombel", group: "Akademik", icon: "classes", permission: "classes:read", keywords: "kelas rombongan belajar wali kelas penempatan" },
  { href: "/academics/timetable", label: "Jadwal pelajaran", group: "Akademik", icon: "timetable", permission: "classes:read", keywords: "jadwal benturan terbit" },
  { href: "/academics/grading", label: "Skema nilai", group: "Akademik", icon: "chart", permission: "grading:read", keywords: "bobot komponen nilai kktp capaian pembelajaran rapor" },
  { href: "/academics/grade-recap", label: "Rekap nilai sekolah", group: "Akademik", icon: "chart", permission: "grading:read" },
  { href: "/academics/report-review", label: "Peninjauan rapor", group: "Akademik", icon: "chart", permission: "report-cards:approve" },
  { href: "/academics/setup", label: "Pengaturan akademik", group: "Akademik", icon: "settings", permission: "classes:read", keywords: "tingkat program jurusan mapel mata pelajaran jam pelajaran penugasan guru" },
  { href: "/admin/students", label: "Siswa", group: "Data induk", icon: "students", permission: "people:read", keywords: "murid nis nisn" },
  { href: "/admin/employees", label: "Pegawai", group: "Data induk", icon: "staff", permission: "people:read", keywords: "guru staf nip" },
  { href: "/admin/guardians", label: "Orang tua / wali", group: "Data induk", icon: "family", permission: "people:read", keywords: "ortu wali" },
  { href: "/admin/corrections", label: "Pengajuan koreksi", group: "Data induk", icon: "inbox", permission: "corrections:review", keywords: "koreksi perubahan data" },
  { href: "/admin/imports", label: "Impor data", group: "Data induk", icon: "upload", permission: "imports:manage", keywords: "csv excel xlsx" },
  { href: "/admin/school", label: "Gedung & ruang", group: "Sekolah", icon: "building", permission: "school:read", keywords: "kelas lab ruangan lantai" },
  { href: "/admin/staff-schedule", label: "Jadwal tugas staf", group: "Sekolah", icon: "calendar", permission: "work-shifts:read", keywords: "shift piket tugas pegawai" },
  { href: "/admin/academic-years", label: "Tahun ajaran", group: "Sekolah", icon: "calendar", permission: "academic-years:read", keywords: "semester" },
  { href: "/admin/accounts", label: "Akun pengguna", group: "Sistem", icon: "users", permission: "accounts:manage", keywords: "user peran role mfa" },
  { href: "/admin/audit", label: "Log audit", group: "Sistem", icon: "log", permission: "audit:read", keywords: "riwayat aktivitas" },
  { href: "/messages/announcements", label: "Pengumuman", group: "Pesan", icon: "megaphone", keywords: "info berita sekolah" },
  { href: "/messages/notifications", label: "Notifikasi", group: "Pesan", icon: "bell", keywords: "pemberitahuan" },
  { href: "/me", label: "Profil saya", group: "Akun saya", icon: "profile", needsPerson: true, keywords: "data diri dokumen koreksi" },
  { href: "/me/security", label: "Keamanan akun", group: "Akun saya", icon: "lock", keywords: "kata sandi password mfa autentikator" },
];

export function menuFor(me: Me): MenuItem[] {
  return MENU.filter(
    (m) =>
      (!m.permission || me.permissions.includes(m.permission)) &&
      (!m.anyPermission || m.anyPermission.some((p) => me.permissions.includes(p))) &&
      (!m.roles || m.roles.includes(me.activeRole)) &&
      (!m.needsPerson || me.person),
  ).map(({ href, label, group, icon, keywords }) => ({ href: href === "/dashboard" ? homeFor(me.activeRole) : href, label, group, icon, keywords }));
}
