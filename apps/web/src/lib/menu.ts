import type { Me, Permission, RoleKey } from "@smart-school/contracts";

export type MenuGroup = "Utama" | "Data induk" | "Sekolah" | "Sistem" | "Akun saya";

type MenuDef = {
  href: string;
  label: string;
  group: MenuGroup;
  icon: MenuIcon;
  /** Kata kunci tambahan untuk kotak cari. */
  keywords?: string;
  permission?: Permission;
  roles?: RoleKey[];
  needsPerson?: boolean;
};

export type MenuIcon = "home" | "child" | "students" | "staff" | "family" | "users" | "building" | "calendar" | "upload" | "log" | "inbox" | "profile" | "lock";

export type MenuItem = Pick<MenuDef, "href" | "label" | "group" | "icon" | "keywords">;

/** Satu sumber menu untuk sidebar dan kotak cari. Hanya menu yang diizinkan untuk peran aktif yang ditampilkan. */
const MENU: MenuDef[] = [
  { href: "/dashboard", label: "Beranda", group: "Utama", icon: "home", keywords: "dashboard ringkasan" },
  { href: "/guardian/children", label: "Anak saya", group: "Utama", icon: "child", roles: ["GUARDIAN"], keywords: "anak wali" },
  { href: "/admin/students", label: "Siswa", group: "Data induk", icon: "students", permission: "people:read", keywords: "murid nis nisn" },
  { href: "/admin/employees", label: "Pegawai", group: "Data induk", icon: "staff", permission: "people:read", keywords: "guru staf nip" },
  { href: "/admin/guardians", label: "Orang tua / wali", group: "Data induk", icon: "family", permission: "people:read", keywords: "ortu wali" },
  { href: "/admin/corrections", label: "Pengajuan koreksi", group: "Data induk", icon: "inbox", permission: "corrections:review", keywords: "koreksi perubahan data" },
  { href: "/admin/imports", label: "Impor data", group: "Data induk", icon: "upload", permission: "imports:manage", keywords: "csv excel xlsx" },
  { href: "/admin/school", label: "Gedung & ruang", group: "Sekolah", icon: "building", permission: "school:read", keywords: "kelas lab ruangan lantai" },
  { href: "/admin/academic-years", label: "Tahun ajaran", group: "Sekolah", icon: "calendar", permission: "academic-years:read", keywords: "semester" },
  { href: "/admin/accounts", label: "Akun pengguna", group: "Sistem", icon: "users", permission: "accounts:manage", keywords: "user peran role mfa" },
  { href: "/admin/audit", label: "Log audit", group: "Sistem", icon: "log", permission: "audit:read", keywords: "riwayat aktivitas" },
  { href: "/me", label: "Profil saya", group: "Akun saya", icon: "profile", needsPerson: true, keywords: "data diri dokumen koreksi" },
  { href: "/me/security", label: "Keamanan akun", group: "Akun saya", icon: "lock", keywords: "kata sandi password mfa autentikator" },
];

export function menuFor(me: Me): MenuItem[] {
  return MENU.filter(
    (m) =>
      (!m.permission || me.permissions.includes(m.permission)) &&
      (!m.roles || m.roles.includes(me.activeRole)) &&
      (!m.needsPerson || me.person),
  ).map(({ href, label, group, icon, keywords }) => ({ href, label, group, icon, keywords }));
}
