import type { Permission, RoleKey } from '@smart-school/contracts';

/**
 * Peta peran → izin untuk R0. Izin ini menentukan endpoint yang boleh dipanggil;
 * scope data (anak sendiri, diri sendiri) diperiksa lagi di service masing-masing.
 * Peran STUDENT dan GUARDIAN tidak memegang izin administratif: aksesnya lewat endpoint /me dan /guardian.
 */
export const ROLE_PERMISSIONS: Record<RoleKey, readonly Permission[]> = {
  ADMIN: [
    'school:read',
    'school:manage',
    'academic-years:read',
    'academic-years:manage',
    'people:read',
    'people:manage',
    'guardian-links:manage',
    'accounts:manage',
    'imports:manage',
    'audit:read',
    'documents:read',
    'documents:manage',
    'corrections:review',
    'classes:read',
    'classes:manage',
    'curriculum:manage',
    'timetable:read',
    'attendance:take',
    'attendance:read',
    'attendance:manage',
    'announcements:publish',
    'work-shifts:read',
    'work-shifts:manage',
  ],
  MANAGEMENT: ['school:read', 'academic-years:read', 'people:read', 'audit:read', 'classes:read', 'timetable:read', 'attendance:read', 'announcements:publish', 'work-shifts:read'],
  CURRICULUM: [
    'school:read',
    'academic-years:read',
    'academic-years:manage',
    'people:read',
    'classes:read',
    'classes:manage',
    'curriculum:manage',
    'timetable:read',
    'attendance:read',
    'announcements:publish',
  ],
  /** Guru: mengisi absensi kelas yang diajar. Wali kelas mendapat scope tambahan dari data (rombel yang diampu). */
  TEACHER: ['school:read', 'academic-years:read', 'timetable:read', 'attendance:take'],
  STAFF: ['school:read', 'academic-years:read', 'timetable:read'],
  STUDENT: [],
  GUARDIAN: [],
};

/** Urutan peran default saat pengguna masuk (peran pertama yang dimiliki menjadi konteks aktif). */
export const ROLE_PRIORITY: readonly RoleKey[] = ['ADMIN', 'MANAGEMENT', 'CURRICULUM', 'TEACHER', 'STAFF', 'GUARDIAN', 'STUDENT'];

export function permissionsFor(role: RoleKey): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}
