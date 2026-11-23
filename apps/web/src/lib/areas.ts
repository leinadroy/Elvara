import type { RoleKey } from "@smart-school/contracts";

/**
 * Area URL per peran mengikuti architecture_blueprint (04_dashboard_and_navigation): setiap area punya
 * /<area>/dashboard. /dashboard mengalihkan ke beranda peran aktif.
 */
export const ROLE_AREA: Record<RoleKey, { area: string; label: string }> = {
  ADMIN: { area: "admin", label: "Administrasi" },
  MANAGEMENT: { area: "management", label: "Pimpinan" },
  CURRICULUM: { area: "academics", label: "Akademik" },
  TEACHER: { area: "teacher", label: "Guru" },
  STAFF: { area: "staff", label: "Staf" },
  STUDENT: { area: "student", label: "Siswa" },
  GUARDIAN: { area: "guardian", label: "Orang tua / wali" },
};

export const homeFor = (role: RoleKey) => `/${ROLE_AREA[role].area}/dashboard`;
