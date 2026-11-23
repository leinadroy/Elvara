import type { AcademicYearView } from './school.js';
import type { ChildSummary } from './people.js';

/**
 * Satu angka di beranda (FR-8.8): setiap angka punya definisi tertulis, sumber data, dan waktu pembaruan
 * (generatedAt pada ringkasan).
 */
export interface DashboardMetric {
  key: string;
  label: string;
  /** null = belum ada data untuk dihitung (tampil "—"). */
  value: number | null;
  /** Satuan tampilan, mis. "%" untuk persentase. */
  unit?: '%';
  definition: string;
  source: string;
  href?: string;
  /** Angka > 0 perlu perhatian. */
  warn?: boolean;
  note?: string;
}

/** Ringkasan beranda. Setiap bagian hanya terisi bila peran aktif berhak melihatnya. */
export interface DashboardSummary {
  academicYear: AcademicYearView | null;
  /** Semester yang sedang berjalan menurut tanggal hari ini. */
  currentTermName: string | null;
  people?: {
    studentsActive: number;
    employeesActive: number;
    teachersActive: number;
    guardians: number;
    studentsWithoutVerifiedGuardian: number;
    pendingGuardianLinks: number;
  };
  pendingCorrections?: number;
  lastImport?: { id: string; fileName: string | null; createdAt: string; errorCount: number } | null;
  recentAudit?: { id: string; action: string; actorEmail: string | null; createdAt: string }[];
  children?: ChildSummary[];
  pendingMyCorrection?: boolean;
  myDocumentCount?: number;
  mfa?: { enabled: boolean; recommended: boolean };
  /** Angka R1 sesuai peran aktif (FR-8.1–8.7). */
  metrics?: DashboardMetric[];
  /** Waktu ringkasan dihitung (ISO). */
  generatedAt: string;
}
