import { z } from 'zod';
import { PageQuerySchema, optionalIsoDate, optionalText } from './common.js';

export const GENDERS = ['MALE', 'FEMALE'] as const;
export const GENDER_LABELS = { MALE: 'Laki-laki', FEMALE: 'Perempuan' } as const;

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(200)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .pipe(z.email({ error: 'Email tidak valid.' }).nullable());

export const PersonInputSchema = z.object({
  fullName: z.string().trim().min(2, { error: 'Nama minimal 2 karakter.' }).max(150),
  gender: z.enum(GENDERS).optional().nullable(),
  birthDate: optionalIsoDate,
  birthPlace: optionalText(100),
  phone: optionalText(30),
  email: optionalEmail,
  address: optionalText(300),
});

export interface PersonView {
  id: string;
  fullName: string;
  gender: (typeof GENDERS)[number] | null;
  birthDate: string | null;
  birthPlace: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

// ───────────── Siswa ─────────────

export const STUDENT_STATUSES = ['ACTIVE', 'GRADUATED', 'TRANSFERRED_OUT', 'WITHDRAWN'] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];
export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  ACTIVE: 'Aktif',
  GRADUATED: 'Lulus',
  TRANSFERRED_OUT: 'Pindah',
  WITHDRAWN: 'Keluar',
};

const nis = z.string().trim().regex(/^[0-9A-Za-z.-]{3,20}$/, { error: 'NIS 3–20 karakter: angka, huruf, titik, atau tanda hubung.' });
const nisn = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .pipe(z.string().regex(/^\d{10}$/, { error: 'NISN harus 10 digit.' }).nullable());

export const CreateStudentSchema = PersonInputSchema.extend({
  nis,
  nisn,
  enrolledAt: optionalIsoDate,
});
export type CreateStudentInput = z.input<typeof CreateStudentSchema>;

export const UpdateStudentSchema = PersonInputSchema.partial().extend({
  nisn: nisn.optional(),
  status: z.enum(STUDENT_STATUSES).optional(),
  enrolledAt: optionalIsoDate,
  exitedAt: optionalIsoDate,
});

export const STUDENT_SORTS = ['name', '-name', 'nis', '-nis', 'createdAt', '-createdAt'] as const;
export const StudentListQuerySchema = PageQuerySchema.extend({
  sort: z.enum(STUDENT_SORTS).default('name'),
  status: z.enum(STUDENT_STATUSES).optional(),
});
export type StudentListQuery = z.infer<typeof StudentListQuerySchema>;

export interface StudentListItem {
  id: string;
  personId: string;
  nis: string;
  nisn: string | null;
  fullName: string;
  gender: (typeof GENDERS)[number] | null;
  status: StudentStatus;
  verifiedGuardianCount: number;
}

export interface StudentDetail extends StudentListItem {
  person: PersonView;
  enrolledAt: string | null;
  exitedAt: string | null;
  guardians: GuardianLinkView[];
  account: { status: 'ACTIVE' | 'DISABLED'; email: string } | null;
}

/** Tampilan terbatas untuk wali: hanya data yang diperlukan. */
export interface ChildSummary {
  studentId: string;
  fullName: string;
  nis: string;
  status: StudentStatus;
  relationship: GuardianRelationship;
  canViewAcademic: boolean;
  canViewAttendance: boolean;
}

// ───────────── Pegawai ─────────────

export const EMPLOYMENT_TYPES = ['PERMANENT', 'CONTRACT', 'HONORARY'] as const;
export const EMPLOYMENT_TYPE_LABELS = { PERMANENT: 'Tetap', CONTRACT: 'Kontrak', HONORARY: 'Honorer' } as const;
export const EMPLOYEE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

const optionalNip = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v.replace(/\s+/g, '') : null))
  .pipe(z.string().regex(/^\d{18}$/, { error: 'NIP harus 18 digit.' }).nullable());

export const CreateEmployeeSchema = PersonInputSchema.extend({
  employeeNumber: z.string().trim().regex(/^[0-9A-Za-z.-]{2,20}$/, { error: 'Nomor pegawai 2–20 karakter.' }),
  nip: optionalNip,
  position: z.string().trim().min(2).max(100),
  employmentType: z.enum(EMPLOYMENT_TYPES).default('PERMANENT'),
  isTeacher: z.boolean().default(false),
  joinedAt: optionalIsoDate,
});
export type CreateEmployeeInput = z.input<typeof CreateEmployeeSchema>;

export const UpdateEmployeeSchema = PersonInputSchema.partial().extend({
  nip: optionalNip.optional(),
  position: z.string().trim().min(2).max(100).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  isTeacher: z.boolean().optional(),
  status: z.enum(EMPLOYEE_STATUSES).optional(),
  joinedAt: optionalIsoDate,
});

export const EMPLOYEE_SORTS = ['name', '-name', 'employeeNumber', '-employeeNumber'] as const;
export const EmployeeListQuerySchema = PageQuerySchema.extend({
  sort: z.enum(EMPLOYEE_SORTS).default('name'),
  status: z.enum(EMPLOYEE_STATUSES).optional(),
  isTeacher: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export interface EmployeeListItem {
  id: string;
  personId: string;
  employeeNumber: string;
  nip: string | null;
  fullName: string;
  position: string;
  employmentType: (typeof EMPLOYMENT_TYPES)[number];
  isTeacher: boolean;
  status: (typeof EMPLOYEE_STATUSES)[number];
}

export interface EmployeeDetail extends EmployeeListItem {
  person: PersonView;
  joinedAt: string | null;
  account: { status: 'ACTIVE' | 'DISABLED'; email: string; roles: string[] } | null;
}

// ───────────── Wali ─────────────

export const GUARDIAN_RELATIONSHIPS = ['FATHER', 'MOTHER', 'LEGAL_GUARDIAN', 'OTHER'] as const;
export type GuardianRelationship = (typeof GUARDIAN_RELATIONSHIPS)[number];
export const GUARDIAN_RELATIONSHIP_LABELS: Record<GuardianRelationship, string> = {
  FATHER: 'Ayah',
  MOTHER: 'Ibu',
  LEGAL_GUARDIAN: 'Wali',
  OTHER: 'Lainnya',
};
export type GuardianLinkStatus = 'PENDING' | 'VERIFIED' | 'REVOKED';
export const GUARDIAN_LINK_STATUS_LABELS: Record<GuardianLinkStatus, string> = {
  PENDING: 'Menunggu verifikasi',
  VERIFIED: 'Terverifikasi',
  REVOKED: 'Dicabut',
};

export const CreateGuardianSchema = PersonInputSchema.extend({
  occupation: optionalText(100),
});

export const GuardianListQuerySchema = PageQuerySchema;

export interface GuardianListItem {
  id: string;
  personId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  childCount: number;
}

export const LinkGuardianSchema = z.object({
  guardianId: z.uuid(),
  relationship: z.enum(GUARDIAN_RELATIONSHIPS),
  isPrimaryContact: z.boolean().default(false),
  canViewAcademic: z.boolean().default(true),
  canViewAttendance: z.boolean().default(true),
  canViewFinance: z.boolean().default(false),
});

export interface GuardianLinkView {
  id: string;
  guardianId: string;
  guardianName: string;
  guardianEmail: string | null;
  relationship: GuardianRelationship;
  status: GuardianLinkStatus;
  isPrimaryContact: boolean;
  canViewAcademic: boolean;
  canViewAttendance: boolean;
  canViewFinance: boolean;
  verifiedAt: string | null;
  pendingInvitationExpiresAt: string | null;
}
