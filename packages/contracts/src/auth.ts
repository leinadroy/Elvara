import { z } from 'zod';

export const ROLE_KEYS = ['ADMIN', 'MANAGEMENT', 'CURRICULUM', 'TEACHER', 'STAFF', 'STUDENT', 'GUARDIAN'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
  ADMIN: 'Admin sekolah',
  MANAGEMENT: 'Manajemen',
  CURRICULUM: 'Kurikulum',
  TEACHER: 'Guru',
  STAFF: 'Staf',
  STUDENT: 'Siswa',
  GUARDIAN: 'Orang tua / wali',
};

/** Izin R0. Peta peran → izin ada di API (src/auth/permissions.ts); web hanya memakai daftar ini untuk menampilkan menu. */
export const PERMISSIONS = [
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
  // R1
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
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const SESSION_COOKIE = 'ss_session';

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email({ error: 'Email tidak valid.' })),
  password: z.string().min(1, { error: 'Kata sandi wajib diisi.' }).max(200),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const SwitchRoleSchema = z.object({ role: z.enum(ROLE_KEYS) });

export interface Me {
  user: { id: string; email: string };
  person: { id: string; fullName: string } | null;
  school: { id: string; name: string };
  roles: RoleKey[];
  activeRole: RoleKey;
  permissions: Permission[];
}

export const PasswordSchema = z
  .string()
  .min(10, { error: 'Kata sandi minimal 10 karakter.' })
  .max(200, { error: 'Kata sandi terlalu panjang.' });

export const AcceptInvitationSchema = z.object({
  /** Wajib bila orang tersebut belum punya akun. */
  password: PasswordSchema.optional(),
});

export interface InvitationPreview {
  schoolName: string;
  personName: string;
  email: string;
  role: RoleKey;
  /** Diisi bila undangan memverifikasi hubungan wali–siswa. */
  studentName: string | null;
  /** true bila akun untuk orang ini sudah ada: pengguna harus masuk dulu lalu menerima. */
  hasAccount: boolean;
  expiresAt: string;
}

/** Peran yang boleh diberikan lewat undangan akun pegawai/siswa. GUARDIAN hanya lewat tautan wali. */
export const EMPLOYEE_ROLES = ['ADMIN', 'MANAGEMENT', 'CURRICULUM', 'TEACHER', 'STAFF'] as const;

export const CreateAccountInvitationSchema = z.object({
  role: z.enum([...EMPLOYEE_ROLES, 'STUDENT']),
});

export interface InvitationCreated {
  id: string;
  /** Path relatif di web, mis. /invite/<token>. Token hanya diperlihatkan sekali. */
  invitePath: string;
  email: string;
  expiresAt: string;
}

// ───────────── MFA (TOTP) ─────────────

/** Peran yang disarankan memakai MFA (PRD FR-1.6). */
export const MFA_RECOMMENDED_ROLES: readonly RoleKey[] = ['ADMIN', 'MANAGEMENT'];

export const TotpCodeSchema = z.string().trim().regex(/^\d{6}$/, { error: 'Masukkan 6 digit kode dari aplikasi autentikator.' });

export const MfaCodeSchema = z.object({ code: TotpCodeSchema });
export const MfaVerifyLoginSchema = z.object({ challenge: z.string().min(20).max(200), code: TotpCodeSchema });

/** Respons login: langsung masuk, atau perlu kode MFA. */
export type LoginResponse = ({ mfaRequired: false } & Me) | { mfaRequired: true; challenge: string };

export interface MfaSetup {
  secret: string;
  otpauthUrl: string;
}

export interface MfaStatus {
  enabled: boolean;
  enabledAt: string | null;
  recommended: boolean;
}

export interface AccountSummary {
  id: string;
  email: string;
  status: 'ACTIVE' | 'DISABLED';
  roles: RoleKey[];
  personId: string | null;
  personName: string | null;
  lastLoginAt: string | null;
  mfaEnabled: boolean;
}

export const UpdateAccountRolesSchema = z.object({
  roles: z.array(z.enum(ROLE_KEYS)).min(1, { error: 'Pilih minimal satu peran.' }),
});
